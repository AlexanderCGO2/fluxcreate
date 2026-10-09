import{removeTestDirectory}from'./helpers.mjs';
import test from'node:test';import assert from'node:assert/strict';import{mkdtemp,rm}from'node:fs/promises';import os from'node:os';import path from'node:path';import{randomUUID}from'node:crypto';import http from'node:http';import{serve}from'../scripts/serve.mjs';import{template}from'../src/model.mjs';import{createAgentsService}from'../server/hosted.mjs';
test('Hosted surface advertises simulation only and returns actionable validation errors',async()=>{const s=createAgentsService();assert.equal((await s.status()).live,false);assert.equal((await s.simulate({graph:template()})).mode,'simulation');await assert.rejects(()=>s.validate({graph:{}}),e=>e.status===400);assert.equal(s.start,undefined);});
test('Local API identifies app, rejects cross-site requests and requires explicit suite billing',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'fluxagents-api-'));
 const service={status:async()=>({available:false}),models:async()=>({models:[]})};
 const server=await serve(0,{service,storePath:path.join(dir,'runs.sqlite')});
 const url=`http://127.0.0.1:${server.address().port}`;
 const rawGet=headers=>new Promise((resolve,reject)=>{http.get(url+'/api/status',{headers},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));}).on('error',reject);});
 try{
  assert.equal((await(await fetch(url+'/api/health')).json()).app,'fluxagents');
  const post=body=>fetch(url+'/api/runs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post({graph:template('quiet'),requestId:randomUUID()})).status,400,'implicit billing rejected');
  assert.equal(await rawGet({'sec-fetch-site':'cross-site'}),403,'cross-site rejected');
  assert.equal(await rawGet({origin:'https://elsewhere.example'}),403,'foreign origin rejected');
  assert.equal(await rawGet({host:'localhost:1'}),403,'wrong host port rejected');
  const r=await post({graph:template('quiet'),requestId:randomUUID(),billing:'suite'});
  assert.equal(r.status,201);const run=await r.json();assert.equal(run.connectionScope,undefined);assert.equal(run.billing,'suite');
  assert.equal((await(await fetch(url+'/api/runs')).json()).runs.length,1);
 }finally{await new Promise(r=>server.close(r));await removeTestDirectory(dir);}
});
