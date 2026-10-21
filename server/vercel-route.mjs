/** Restore nested /api/* paths when Vercel rewrites the request to api/index. */
export function restoreApiRoute(url) {
  const parsed=new URL(url||'/', 'http://localhost');
  if(!parsed.searchParams.has('__studioRoute')) return url;
  const route=parsed.searchParams.get('__studioRoute')||'';
  parsed.searchParams.delete('__studioRoute');
  const query=parsed.searchParams.toString();
  return '/api/'+route.replace(/^\/+/, '')+(query?'?'+query:'');
}
