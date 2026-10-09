/** Vercel's rewrite passes the app/path as query fields; retain actual API query parameters. */
export function dispatchURL(requestURL){
 const url=new URL(requestURL,'https://workspace.invalid');if(url.pathname!=='/api/dispatch')return requestURL;
 const app=url.searchParams.get('app')||'',path=url.searchParams.get('path')||'';url.searchParams.delete('app');url.searchParams.delete('path');
 const query=url.searchParams.toString();return `/api/${app}/${path}${query?'?'+query:''}`;
}
