import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import multer from 'multer';
import {randomUUID,createHash,randomBytes} from 'node:crypto';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {ObjectId} from 'mongodb';
import {verifyCode,hashCode} from './security.mjs';
import {recordSchema,idSchema,preferencesSchema} from './schema.mjs';
const publicRecord=({_id,...r})=>r;
export function createApp({db,bucket,client,config,dev=false}){
 const app=express();app.disable('x-powered-by');if(config.trustProxy)app.set('trust proxy',config.trustProxy);
 app.use(helmet({contentSecurityPolicy:dev?false:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],imgSrc:["'self'",'data:','blob:'],connectSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:config.secure?[]:null}},strictTransportSecurity:config.secure?undefined:false}));
 app.use('/api',rateLimit({windowMs:60000,limit:250,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Try again shortly.'}}));
 app.use(express.json({limit:'1mb'}));
 app.use(session({name:'obsidian.sid',secret:config.secret,resave:false,saveUninitialized:false,store:MongoStore.create({client,dbName:db.databaseName,collectionName:'sessions',ttl:43200}),cookie:{httpOnly:true,sameSite:'strict',secure:config.secure,maxAge:12*60*60*1000}}));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method)){const expected=config.origin || `${req.protocol}://${req.get('host')}`;if(req.headers.origin!==expected)return res.status(403).json({error:'Request origin does not match this application address.'});}next()});
 const records=db.collection('records'),activity=db.collection('activity'),attempts=db.collection('attempts'),settings=db.collection('settings');
 const defaultPrefs={workspaceName:'Obsidian Studio Pro',userName:'Joshua Wasley',tagline:'Your personal creative workspace',accent:'#BBA6FF'};
 const getPrefs=async()=>({...defaultPrefs,...(await settings.findOne({_id:'preferences'}))?.data});
 const getAuth=async()=>{const doc=await settings.findOne({_id:'auth'});return {codeHash:doc?.codeHash||config.codeHash,version:doc?.version||0}};
 const log=async(action,record)=>{await activity.insertOne({id:randomUUID(),at:new Date().toISOString(),action,title:record.title,type:record.type,recordId:record.id})};
 const logged=async(req,res,next)=>{
  try{const auth=await getAuth();if(req.session.unlocked&&req.session.authVersion===auth.version)return next();return res.status(401).json({error:'Workspace locked. Enter your code.'});}
  catch(err){next(err)}
 };
 app.get('/api/branding',async(req,res)=>{const p=await getPrefs();res.json({workspaceName:p.workspaceName,tagline:p.tagline,accent:p.accent})});
 app.get('/api/session',async(req,res)=>{const auth=await getAuth();const unlocked=!!req.session.unlocked&&req.session.authVersion===auth.version;res.json({unlocked,csrf:unlocked?req.session.csrf:null})});
 app.post('/api/unlock',rateLimit({windowMs:300000,limit:15,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many login requests. Try again in five minutes.'}}),async(req,res)=>{
  const key=createHash('sha256').update(String(req.ip)).digest('hex');const now=new Date();const a=await attempts.findOne({_id:key});if(a?.expires>now&&a.count>=8)return res.status(429).json({error:'Too many incorrect codes. Try again in five minutes.'});
  const auth=await getAuth();
  if(!verifyCode(req.body?.code,auth.codeHash)){if(a?.expires>now)await attempts.updateOne({_id:key},{$inc:{count:1}});else await attempts.updateOne({_id:key},{$set:{count:1,expires:new Date(Date.now()+300000)}},{upsert:true});return res.status(401).json({error:'Incorrect access code.'});}
  await attempts.deleteOne({_id:key});await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.unlocked=true;req.session.authVersion=auth.version;req.session.csrf=randomBytes(32).toString('hex');await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));res.json({ok:true,csrf:req.session.csrf});
 });
 app.use('/api',logged,(req,res,next)=>{if(!['GET','HEAD'].includes(req.method)&&req.headers['x-csrf-token']!==req.session.csrf)return res.status(403).json({error:'Session token expired. Refresh and unlock again.'});next()});
 app.post('/api/lock',async(req,res)=>{await new Promise((resolve,reject)=>req.session.destroy(e=>e?reject(e):resolve()));res.clearCookie('obsidian.sid',{path:'/',httpOnly:true,sameSite:'strict',secure:config.secure});res.json({ok:true})});
 app.get('/api/workspace',async(req,res)=>{const [items,events]=await Promise.all([records.find({}).limit(10000).toArray(),activity.find({}).sort({at:-1}).limit(100).toArray()]);res.json({items:items.map(publicRecord),activity:events.map(publicRecord),preferences:await getPrefs(),database:'connected'})});
 app.put('/api/preferences',async(req,res)=>{
  const data=preferencesSchema.parse(req.body);
  await settings.updateOne({_id:'preferences'},{$set:{data,updatedAt:new Date()}},{upsert:true});
  res.json({ok:true,preferences:data});
 });
 app.post('/api/account/change-code',rateLimit({windowMs:300000,limit:8,standardHeaders:'draft-8',legacyHeaders:false}),async(req,res)=>{
  const body=req.body||{};
  if(typeof body.currentCode!=='string'||typeof body.newCode!=='string'||!/^\d{6,12}$/.test(body.newCode))return res.status(400).json({error:'Enter your current code and a new 6–12 digit code.'});
  if(body.currentCode===body.newCode)return res.status(400).json({error:'Choose a different new code.'});
  const auth=await getAuth();
  if(!verifyCode(body.currentCode,auth.codeHash))return res.status(403).json({error:'Current access code is incorrect.'});
  const newHash=hashCode(body.newCode);
  // Compare-and-set protects against simultaneous code changes.
  const updated=await settings.findOneAndUpdate(
    {_id:'auth',version:auth.version===0?{$in:[0,null]}:auth.version},
    {$set:{codeHash:newHash,updatedAt:new Date()},$inc:{version:1}},
    {upsert:false,returnDocument:'after'}
  );
  let version=updated?.version;
  if(!updated&&auth.version===0){
    try{await settings.insertOne({_id:'auth',codeHash:newHash,version:1,updatedAt:new Date()});version=1}
    catch(e){if(e.code===11000)return res.status(409).json({error:'Code was changed elsewhere. Refresh and retry.'});throw e}
  }else if(!updated)return res.status(409).json({error:'Code was changed elsewhere. Refresh and retry.'});
  req.session.authVersion=version;
  req.session.csrf=randomBytes(32).toString('hex');
  await new Promise((resolve,reject)=>req.session.save(e=>e?reject(e):resolve()));
  res.json({ok:true,csrf:req.session.csrf,message:'Access code updated. Other sessions have been locked.'});
 });
 app.post('/api/records',async(req,res)=>{const d=recordSchema.parse(req.body);if(d.type==='asset')return res.status(400).json({error:'Use the upload button to add assets.'});if(d.projectId&&!await records.findOne({id:d.projectId,type:'project',deletedAt:null}))return res.status(400).json({error:'Project not found.'});const now=new Date().toISOString();const item={...d,id:randomUUID(),createdAt:now,updatedAt:now,deletedAt:null,version:1};await records.insertOne(item);await log('Created',item);res.status(201).json(publicRecord(item))});
 app.put('/api/records/:id',async(req,res)=>{const id=idSchema.parse(req.params.id);const {version,...input}=req.body;const d=recordSchema.parse(input);const old=await records.findOne({id});if(!old)return res.status(404).json({error:'Record not found.'});if(old.deletedAt)return res.status(409).json({error:'Restore this record from Trash before editing.'});if(d.type!==old.type)return res.status(400).json({error:'Record type cannot be changed.'});if(d.projectId&&!await records.findOne({id:d.projectId,type:'project',deletedAt:null}))return res.status(400).json({error:'Project not found.'});const updated=await records.findOneAndUpdate({id,version},{$set:{...d,updatedAt:new Date().toISOString()},$inc:{version:1}},{returnDocument:'after'});if(!updated)return res.status(409).json({error:'This item changed in another tab. Refresh and try again.'});await log('Updated',updated);res.json(publicRecord(updated))});
 app.delete('/api/records/:id',async(req,res)=>{const id=idSchema.parse(req.params.id);const d=await records.findOneAndUpdate({id,deletedAt:null},{$set:{deletedAt:new Date().toISOString()},$inc:{version:1}},{returnDocument:'after'});if(!d)return res.status(404).json({error:'Record not found.'});await log('Moved to trash',d);res.json({ok:true})});
 app.post('/api/records/:id/restore',async(req,res)=>{const id=idSchema.parse(req.params.id);const d=await records.findOneAndUpdate({id,deletedAt:{$ne:null}},{$set:{deletedAt:null},$inc:{version:1}},{returnDocument:'after'});if(!d)return res.status(404).json({error:'Record not found in Trash.'});await log('Restored',d);res.json({ok:true})});
 const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:config.uploadLimit,files:1,fields:2}});
 app.post('/api/assets',upload.single('file'),async(req,res)=>{const f=req.file;if(!f)return res.status(400).json({error:'Choose an image file.'});const b=f.buffer;const detected=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':b[0]===255&&b[1]===216&&b[2]===255?'image/jpeg':/^GIF8[79]a$/.test(b.subarray(0,6).toString())?'image/gif':b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP'?'image/webp':null;if(!detected)return res.status(400).json({error:'Use a PNG, JPEG, GIF or WebP image (within the hosting upload limit).'});const title=f.originalname.replace(/[^\w. ()-]/g,'_').slice(0,150)||'asset';const stream=bucket.openUploadStream(title,{metadata:{mime:detected}});await pipeline(Readable.from(b),stream);const d={...recordSchema.parse({type:'asset',title,folder:String(req.body.folder||'General')}),id:randomUUID(),fileId:stream.id.toString(),mime:detected,size:f.size,version:1,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),deletedAt:null};try{await records.insertOne(d)}catch(e){await bucket.delete(stream.id);throw e}await log('Uploaded',d);res.status(201).json(publicRecord(d))});
 app.get('/api/assets/:id',async(req,res)=>{const id=idSchema.parse(req.params.id);const d=await records.findOne({id,type:'asset',deletedAt:null});if(!d)return res.status(404).json({error:'Asset not found.'});const objectId=new ObjectId(d.fileId);if(!await db.collection('assets.files').findOne({_id:objectId}))return res.status(404).json({error:'Stored file is missing.'});res.set('Content-Type',d.mime);res.set('Content-Disposition',`${req.query.download==='1'?'attachment':'inline'}; filename="${d.title.replace(/[^\w. ()-]/g,'_')}"`);const stream=bucket.openDownloadStream(objectId);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res)});
 app.get('/api/export',async(req,res)=>{const data=(await records.find({}).toArray()).map(publicRecord);res.attachment('obsidian-records.json').json({format:'obsidian-records-v2',exportedAt:new Date().toISOString(),notice:'Record export only. Binary images are stored separately in GridFS. Use mongodump for a full backup.',records:data})});
 app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found.'}));
 app.use((err,req,res,next)=>{if(res.headersSent)return next(err);if(err.name==='ZodError')return res.status(400).json({error:err.issues.map(x=>`${x.path.join('.')}: ${x.message}`).join('; ')});if(err instanceof multer.MulterError)return res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?`File too large. Maximum ${Math.floor(config.uploadLimit/1048576)} MB.`:'Invalid upload.'});if(err.type==='entity.parse.failed')return res.status(400).json({error:'Invalid JSON.'});if(err.type==='entity.too.large')return res.status(413).json({error:'Request is too large.'});console.error('Request failed:',err.name);res.status(503).json({error:'Unable to save or load data. Check the server and MongoDB connection, then retry.'})});return app;
}
