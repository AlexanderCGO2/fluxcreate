import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHostedHandler} from '../server/hosted.mjs';
import {template} from '../../FluxAgents/src/model.mjs';

test('hosted FluxAgents exposes honest capabilities and no-charge simulation without invoking generation',async()=>{
 let generationCalls=0;const lab={generate:async()=>{generationCalls++;throw Error('Must not generate');},models:async()=>({models:[]})};
 const server=http.createServer(createHostedHandler({lab}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const post=(route,body,origin=base)=>fetch(base+'/api/fluxagents/'+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  const status=await fetch(base+'/api/fluxagents/status').then(r=>r.json());assert.equal(status.mode,'hosted');assert.equal(status.live,false);
  assert.equal((await fetch(base+'/api/fluxagents/models')).status,200);
  const graph=template(),validated=await post('validate',{graph});assert.equal(validated.status,200);
  const result=await post('simulate',{graph}).then(r=>r.json());assert.equal(result.mode,'simulation');assert.equal(result.costUSD,0);assert.equal(result.events.length,graph.nodes.length);assert.ok(result.notice.includes('No AI model'));
  assert.equal((await post('validate',{graph:{format:'other'}})).status,400);
  assert.equal((await post('simulate',{graph},'https://foreign.invalid')).status,403);
  assert.equal((await post('runs',{graph,requestId:crypto.randomUUID(),billing:'suite'})).status,404);
  assert.equal(generationCalls,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
