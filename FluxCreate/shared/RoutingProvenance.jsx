import React from 'react';

/** Show response provenance, never infer the completed route from connection settings. */
export function RoutingProvenance({routing,className=''}) {
 if (!routing || typeof routing.gateway !== 'string' || typeof routing.model !== 'string') return null;
 const attempts=Array.isArray(routing.attempts)?routing.attempts.slice(0,2):[];
 const fallback=routing.gateway==='Cloudflare AI Gateway' && attempts.length===2 && attempts[0]?.outcome==='rejected';
 return <p className={className} aria-label="AI response source" style={{overflowWrap:'anywhere'}}>
  {fallback?'Cloudflare fallback':routing.gateway.slice(0,200)} · {routing.model.slice(0,200)}
  {attempts.length>0&&` · ${attempts.length} ${attempts.length===1?'attempt':'attempts'}`}
  {fallback&&<><br/><span>Vercel rejected the first attempt. Cloudflare completed this result.</span></>}
 </p>;
}
