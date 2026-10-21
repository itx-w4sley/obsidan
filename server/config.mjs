export function getConfig({vercel=false}={}) {
  const uri=process.env.MONGODB_URI;
  const secret=process.env.SESSION_SECRET;
  const codeHash=process.env.ACCESS_CODE_HASH;
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri) || !secret || secret.length<32 || !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(codeHash || '')) {
    throw new Error('Missing MONGODB_URI, SESSION_SECRET (32+ characters) or ACCESS_CODE_HASH. Run npm run setup locally. On Vercel, configure them in Project Settings > Environment Variables.');
  }
  return {
    secret,codeHash,
    // On Vercel the same-origin check uses the actual deployment hostname,
    // which accommodates preview deployments and custom domains.
    origin:vercel ? '' : (process.env.APP_ORIGIN || 'http://localhost:3000'),
    secure:vercel || process.env.COOKIE_SECURE==='true',
    trustProxy:vercel ? 1 : Number(process.env.TRUST_PROXY || 0),
    uploadLimit:vercel ? 4*1024*1024 : 10*1024*1024
  };
}
