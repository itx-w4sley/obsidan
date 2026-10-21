import test from 'node:test';
import assert from 'node:assert/strict';
import {restoreApiRoute} from '../server/vercel-route.mjs';
import {preferencesSchema} from '../server/schema.mjs';
import {getConfig} from '../server/config.mjs';

test('Vercel rewrite restores nested record URLs and asset query parameters',()=>{
  assert.equal(restoreApiRoute('/api/index?__studioRoute=session'),'/api/session');
  assert.equal(restoreApiRoute('/api/index?__studioRoute=records%2Fabc%2Frestore'),'/api/records/abc/restore');
  assert.equal(restoreApiRoute('/api/index?__studioRoute=assets%2Fabc&download=1'),'/api/assets/abc?download=1');
  assert.equal(restoreApiRoute('/api/index?__studioRoute='),'/api/');
  assert.equal(restoreApiRoute('/api/workspace'),'/api/workspace');
});
test('studio appearance rejects unknown fields and invalid colours',()=>{
  const good={workspaceName:'Obsidian Studio Pro',userName:'Joshua Wasley',tagline:'Creative workspace',accent:'#BBA6FF'};
  assert.equal(preferencesSchema.parse(good).workspaceName,good.workspaceName);
  assert.throws(()=>preferencesSchema.parse({...good,accent:'red'}));
  assert.throws(()=>preferencesSchema.parse({...good,admin:true}));
});
test('Vercel origin and cookie handling require HTTPS, independent of localhost config',()=>{
  const old=Object.fromEntries(['MONGODB_URI','SESSION_SECRET','ACCESS_CODE_HASH','APP_ORIGIN'].map(k=>[k,process.env[k]]));
  try{
    process.env.MONGODB_URI='mongodb://127.0.0.1:27017';
    process.env.SESSION_SECRET='x'.repeat(32);
    process.env.ACCESS_CODE_HASH='a'.repeat(32)+':'+'b'.repeat(128);
    process.env.APP_ORIGIN='http://localhost:3000';
    const result=getConfig({vercel:true});
    assert.equal(result.origin,'');assert.equal(result.secure,true);assert.equal(result.trustProxy,1);assert.equal(result.uploadLimit,4*1024*1024);
  }finally{for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
