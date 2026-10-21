import 'dotenv/config';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import express from 'express';
import {connectDatabase} from './db.mjs';
import {getConfig} from './config.mjs';
import {createApp} from './app.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dev=process.argv.includes('--dev');
let config;
try { config=getConfig(); }
catch(e){console.error(e.message);process.exit(1)}
let database;
try{database=await connectDatabase(process.env.MONGODB_URI,process.env.MONGODB_DB||'obsidian_studio')}catch(e){console.error('MongoDB connection failed. Check MONGODB_URI, database credentials, network access and DNS. Run npm run check-db. Error type:',e.name);process.exit(1)}
const app=createApp({...database,config,dev});
if(dev){const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares)}else{if(!existsSync(path.join(root,'dist/index.html'))){console.error('Frontend missing. Run npm run build first.');await database.client.close();process.exit(1)}app.use(express.static(path.join(root,'dist')));app.get('/{*path}',(req,res)=>res.sendFile(path.join(root,'dist/index.html')))}
const server=app.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Obsidian Studio Pro is ready at ${config.origin}. MongoDB connected.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(async()=>{await database.client.close();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()});
