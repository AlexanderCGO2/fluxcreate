import test from 'node:test';
import assert from 'node:assert/strict';
import {serve} from '../server/index.mjs';
test('HTTP generation requires a same-origin session and bounds request bytes',async()=>{
 let calls=0,signal;const service={status:async()=>({available:true}),models:async()=>({models:[]}),generate:async(body,options)=>{calls++;signal=options.signal;return {text:body.prompt};}},server=await serve(0,{service}),base=`http://127.0.0.1:${server.address().port}`;
 const health=await fetch(base+'/api/health').then(r=>r.json());assert.deepEqual(health,{ok:true,app:'fluxlab'});
 try{const session=await fetch(base+'/api/session').then(r=>r.json());assert.equal(typeof session.token,'string');const headers={'content-type':'application/json','x-flux-token':session.token};assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,403);assert.equal((await fetch(base+'/api/generate',{method:'POST',headers:{...headers,origin:'https://unrelated.test'},body:'{}'})).status,403);assert.equal(calls,0);const response=await fetch(base+'/api/generate',{method:'POST',headers,body:JSON.stringify({prompt:'Hello'})});assert.equal((await response.json()).text,'Hello');assert.equal(calls,1);assert.ok(signal instanceof AbortSignal);assert.equal((await fetch(base+'/api/generate',{method:'POST',headers,body:'x'.repeat(66000)})).status,413);assert.equal((await fetch(base+'/api/status')).status,200);}finally{await new Promise(resolve=>server.close(resolve));}
});
