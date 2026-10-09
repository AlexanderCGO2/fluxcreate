import test from 'node:test';
import assert from 'node:assert/strict';
import {api,connect} from '../src/api.ts';
const session=token=>new Response(JSON.stringify({app:'fluxini',protocolVersion:1,token,model:{available:false,provider:'local',model:''}}));
const expired=()=>new Response(JSON.stringify({code:'SESSION_EXPIRED',error:'Session expired. Reload the workbench.'}),{status:403});
test('expired requests reconnect once, share renewal, and preserve mutation bodies',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let connections=0,accepted=0;const bodies=[];
 globalThis.fetch=async(url,options)=>{if(url==='/api/session'){connections++;await new Promise(resolve=>setTimeout(resolve,5));return session(connections===1?'old':'new');}bodies.push(options.body);if(options.headers['x-fluxini-token']==='old')return expired();accepted++;return new Response(JSON.stringify({saved:true}));};
 await connect();const payload={baseRevision:4,commands:[{op:'removeAnimation',nodeId:'title',param:'opacity'}]};const results=await Promise.all([api('/projects/example/patch',payload),api('/projects/example/patch',payload)]);assert.equal(connections,2);assert.equal(accepted,2);assert.equal(bodies.length,4);assert(bodies.every(body=>body===JSON.stringify(payload)));assert(results.every(r=>r.saved));
});
test('reconnection never retries unrelated denials, revision conflicts or network failures',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 for(const code of [403,409,500]){let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({error:'Rejected'}),{status:code});};await assert.rejects(api('/projects/example/patch',{}),/Rejected/);assert.equal(calls,1);}
 let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('Network failure');};await assert.rejects(api('/projects/example/patch',{}),/Network failure/);assert.equal(calls,1);
});
test('a second expiry fails without a retry loop',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);let renewals=0,requests=0;globalThis.fetch=async url=>{if(url==='/api/session'){renewals++;return session('still-rejected');}requests++;return expired();};await assert.rejects(api('/projects/example/patch',{}),/Session expired/);assert.equal(renewals,1);assert.equal(requests,2);
});
