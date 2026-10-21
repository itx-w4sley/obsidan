import 'dotenv/config';import {MongoClient} from 'mongodb';
if(!process.env.MONGODB_URI){console.error('Run npm run setup first.');process.exit(1)}
const c=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:8000});try{await c.connect();await c.db(process.env.MONGODB_DB||'obsidian_studio').command({ping:1});console.log('MongoDB connection successful.')}catch(e){console.error('MongoDB connection failed:',e.name);console.error('Check your database username/password, Atlas IP access list, URI and internet connection.');process.exitCode=1}finally{await c.close()}
