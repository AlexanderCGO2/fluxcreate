import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoeditService} from '../server/autoedit/service.mjs';
import {createAutoeditPlan,buildAutoedit} from '../../Fluximiere/src/autoedit/model.mjs';
import {readFileSync} from 'node:fs';
const key='test-connection-not-a-real-key',model='google/gemini-4-argon';
const catalog={data:[{id:model,modalities:{input:['text','image'],output:['text']}}]};
function input(){const p=createAutoeditPlan();p.music.song={assetId:'song',role:'song',hash:'a'.repeat(64),mime:'audio/wav',bytes:100,name:'Track',duration:10,sampleRate:8000,sampleCount:80000};p.music.analysis={sourceHash:'a'.repeat(64),revision:0,sampleRate:8000,sampleCount:80000,duration:10,proxySampleRate:8000,tempoCandidates:[],beats:Array.from({length:20},(_,i)=>({id:'b'+i,sample:i*4000,confidence:.8,manual:false})),changePoints:[],anchors:[],confidence:.8,status:'measured',warnings:[]};p.footage=[{assetId:'video',hash:'b'.repeat(64),mime:'video/webm',bytes:100,name:'Clip',duration:20,width:640,height:360,enabled:true,inPoint:0,outPoint:20,frames:[]}];return {plan:buildAutoedit(p),startIndex:0};}
test('Autoedit refuses missing visual samples before any paid call',async()=>{let calls=0;const service=createAutoeditService({credential:async()=>key,fetchImpl:async()=>{calls++;throw Error('unexpected request');}});await assert.rejects(service.edit(input()),/sample|frame/i);assert.equal(calls,0);});
test('personal invalid connections cannot silently charge the suite',async()=>{let calls=0;const service=createAutoeditService({credential:async()=>{calls++;return key;}});await assert.rejects(service.edit(input(),{connection:{available:false,apiKey:''}}),/Settings|connection|Gateway/);assert.equal(calls,0);});
test('malformed and oversized inputs fail without network access',async()=>{const service=createAutoeditService({credential:async()=>key,fetchImpl:()=>{throw Error('network must not run');}});await assert.rejects(service.edit({plan:{...input().plan,footage:[]},startIndex:0}));await assert.rejects(service.edit({plan:input().plan,startIndex:-1}));});
function visual(){const body=input();body.plan.footage[0].frames=[{time:1,...JSON.parse(readFileSync(new URL('./fixtures/autoedit-frame.json',import.meta.url))),brightness:.5,motion:.2}];return body;}
test('catalog mismatch blocks generation and provider failure is never automatically retried',async()=>{
 let paid=0;const wrong=createAutoeditService({credential:async()=>key,fetchImpl:async()=>Response.json({data:[{id:model,modalities:{input:['text']}}]})});await assert.rejects(wrong.edit(visual()),/catalog|image/i);
 const failed=createAutoeditService({credential:async()=>key,fetchImpl:async url=>{if(url.endsWith('/models'))return Response.json(catalog);paid++;return new Response('provider failed',{status:503});}});await assert.rejects(failed.edit(visual()),/Gateway/);assert.equal(paid,1);
});
test('editor output cannot introduce foreign media or change source boundaries',async()=>{
 const body=visual();for(const sourceIn of [-1,100]){const service=createAutoeditService({credential:async()=>key,fetchImpl:async url=>url.endsWith('/models')?Response.json(catalog):Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({cuts:body.plan.cuts.map(c=>({id:c.id,assetId:'video',sourceIn,reason:'Candidate'}))})}}]})});await assert.rejects(service.edit(body),/rejected|range/i);}
});
test('cancelled requests release the connection lock and do not retry generation',async()=>{
 let calls=0;const service=createAutoeditService({credential:async()=>key,fetchImpl:async(url,{signal})=>{if(url.endsWith('/models'))return Response.json(catalog);calls++;return new Promise((resolve,reject)=>{const stop=()=>reject(new DOMException('Aborted','AbortError'));signal.addEventListener('abort',stop,{once:true});if(signal.aborted)stop();});}}),controller=new AbortController();const task=service.edit(visual(),{signal:controller.signal});while(!calls)await new Promise(r=>setTimeout(r,1));await assert.rejects(service.edit(visual()),/already running/);controller.abort();await assert.rejects(task,/interrupted/);assert.equal(calls,1);
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(service.edit(visual(),{signal:cancelled.signal}));assert.equal(calls,1,'a pre-cancelled request must not reach generation');
});
