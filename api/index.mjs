import 'dotenv/config';
import {connectDatabase} from '../server/db.mjs';
import {createApp} from '../server/app.mjs';
import {getConfig} from '../server/config.mjs';
import {restoreApiRoute} from '../server/vercel-route.mjs';

// Cached per warm function instance. No app.listen() and no dependency on local files.
let appPromise;
async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const config = getConfig({vercel:true});
      const connection = await connectDatabase(process.env.MONGODB_URI, process.env.MONGODB_DB || 'obsidian_studio');
      return createApp({...connection,config,dev:false,serverless:true});
    })().catch(error => { appPromise = undefined; throw error; });
  }
  return appPromise;
}

export default async function handler(req,res) {
  // Vercel rewrites every /api/* request to this one function. Preserve the
  // original route even where the runtime exposes the rewritten destination.
  req.url = restoreApiRoute(req.url);
  try {
    const app = await getApp();
    return app(req,res);
  } catch (error) {
    console.error('API unavailable:',error.name, error.code || '');
    if (!res.headersSent) res.status(503).json({error:'Server configuration or MongoDB connection is unavailable. Check your Vercel environment variables and Atlas access.'});
  }
}
