import 'dotenv/config';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';
import {MongoClient} from 'mongodb';
import {hashCode} from '../server/security.mjs';
const rl=createInterface({input:process.stdin,output:process.stdout});
try {
  if(!process.env.MONGODB_URI) throw Error('Missing MONGODB_URI. Add your private .env first.');
  const hash=hashCode((await rl.question('New access code (6–12 digits): ')).trim());
  const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});
  try {
    await client.connect();
    const db=client.db(process.env.MONGODB_DB||'obsidian_studio');
    await db.collection('settings').updateOne({_id:'auth'},{$set:{codeHash:hash,updatedAt:new Date()},$inc:{version:1}},{upsert:true});
  }finally{await client.close();}
  // Keep local fallback up to date too. Never print the hash or database URI.
  if(existsSync('.env')) {
    let env=readFileSync('.env','utf8');
    env=env.replace(/^ACCESS_CODE_HASH=.*$/m,'ACCESS_CODE_HASH='+hash);
    writeFileSync('.env',env,{mode:0o600});
  }
  console.log('Code updated in MongoDB; all prior sessions invalidated. Vercel does not need a redeploy.');
}catch(e){console.error('Could not reset access code:',e.message);process.exitCode=1}
finally{rl.close();}
