import test from 'node:test';
import assert from 'node:assert/strict';
import {createAIService as createEditor,connectionStatus} from '../../FluxCreate/server/ai.mjs';
import {createAIService as createMotion} from '../../Fluxiffects/server/ai-service.mjs';
import {createLabService} from '../../FluxLab/server/service.mjs';
import {modelStatus,planChange} from '../server/planner.mjs';
import {createProject} from '../src/engine/project.ts';
import {createDemoProject} from '../../Fluxoto/src/model.mjs';
import {createBlankProject} from '../../Fluxiffects/src/core.mjs';
import {fingerprint,transportProject} from '../../FluxCreate/shared/browser.mjs';

const A=Object.freeze({apiKey:'synthetic-personal-A',model:'test/model-a',scopeId:'same-label',mode:'personal',available:true});
const B=Object.freeze({...A,apiKey:'synthetic-personal-B',model:'test/model-b'});
const answer={summary:'Keep this composition.',commands:[],explanation:'The layout is already balanced.'};
const editorBody=()=>{const project=createDemoProject();return {project:transportProject(project),intent:'Explain this layout',mode:'explain',scope:'composition',selection:[],baseFingerprint:fingerprint(project)};};
const motionBody=()=>({project:createBlankProject(),intent:'Explain this layout',mode:'explain',scope:'composition',selection:[]});
const cases=[['shared editor',planner=>createEditor('fluxoto',{planner}),editorBody],['motion editor',planner=>createMotion({planner}),motionBody]];
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const language={id:'test/text',type:'language',modalities:{output:['text']}};
const speech={id:'openai/tts-1',type:'speech',modalities:{output:['audio']}};
const video={id:'test/video',type:'video',modalities:{output:['video']},video_capabilities:{supported_operations:['text-to-video']}};
const textRequest={kind:'text',model:language.id,prompt:'A synthetic test.'};
const videoRequest={kind:'video',model:video.id,prompt:'A synthetic video.',requestId:'6c5e7e4c-2a7a-4ec9-88b2-e2d48606e7f2'};

for(const [name,make,body] of cases){
 test(`${name}: concurrent connections are isolated, same scope is locked, cancellation cleans up`,async()=>{
  const entered=deferred(),hold=deferred();let calls=0;
  const service=make(async payload=>{assert.ok(!JSON.stringify(payload).includes('synthetic-personal'));if(++calls===1){entered.resolve();await hold.promise;}return answer;});
  const abort=new AbortController(),first=service.plan(body(),{connection:A,signal:abort.signal});await entered.promise;
  assert.equal((await service.status(A)).busy,true);assert.equal((await service.status(B)).busy,false);
  await service.plan(body(),{connection:B});await assert.rejects(service.plan(body(),{connection:A}),e=>e.status===409);
  abort.abort();await assert.rejects(first,e=>e.status===499);hold.resolve();assert.equal((await service.status(A)).busy,false);await service.plan(body(),{connection:A});
 });
 test(`${name}: explicit empty connections never use injected planner or owner environment`,async t=>{
  const old=process.env.AI_GATEWAY_API_KEY;process.env.AI_GATEWAY_API_KEY='synthetic-owner';t.after(()=>{if(old===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=old;});let calls=0;const service=make(async()=>{calls++;return answer;});
  for(const connection of [null,{}, {apiKey:''},{...A,available:false},{...A,apiKey:'invalid key'}]){assert.equal((await service.status(connection)).available,false);await assert.rejects(service.plan(body(),{connection}),e=>e.status===503);}
  assert.equal(calls,0);assert.equal(process.env.AI_GATEWAY_API_KEY,'synthetic-owner');assert.ok(!JSON.stringify(await service.status(A)).includes(A.apiKey));
 });
 test(`${name}: provider receives the captured personal key and model, never credentials in its prompt`,async t=>{
  const calls=[];t.mock.method(globalThis,'fetch',async(url,init)=>{calls.push({url,init});return json({content:[{type:'text',text:JSON.stringify({summary:answer.summary,commandsJson:'[]',explanation:answer.explanation})}],finishReason:'stop',usage:{inputTokens:1,outputTokens:1}});});
  const connection={...A},service=make(),pending=service.plan(body(),{connection});connection.apiKey=B.apiKey;connection.model=B.model;await pending;
  assert.ok(calls.length);for(const {init}of calls){const headers=new Headers(init.headers);assert.equal(headers.get('authorization'),'Bearer '+A.apiKey);if(init.body)assert.ok(!String(init.body).includes(A.apiKey));}
  const modelCall=calls.find(({init})=>new Headers(init.headers).has('ai-language-model-id'));assert.equal(new Headers(modelCall.init.headers).get('ai-language-model-id'),A.model);
 });
}

test('FluxEffects snapshot supplies the personal provider key/model and rejects explicit missing credentials',async t=>{
 const old=process.env.AI_GATEWAY_API_KEY;process.env.AI_GATEWAY_API_KEY='synthetic-owner';t.after(()=>{if(old===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=old;});
 const project=createProject(crypto.randomUUID(),'blank'),memory={assemble:()=>({tokenEstimate:0})};let calls=0;
 const generate=async args=>{calls++;assert.equal(args.model.modelId,A.model);const headers=await args.model.config.headers();assert.equal(headers.authorization,'Bearer '+A.apiKey);assert.ok(!args.prompt.includes(A.apiKey));return {object:{summary:'Name this study',commands:[{op:'projectName',name:'A personal study'}]}};};
 const connection={...A},pending=planChange(project,'Name this study',memory,generate,[],undefined,{connection});connection.apiKey=B.apiKey;await pending;
 for(const connection of [null,{}, {...A,available:false}]){assert.equal(modelStatus(connection).available,false);await assert.rejects(planChange(project,'Name this study',memory,generate,[],undefined,{connection}),e=>e.status===503);}
 assert.equal(calls,1);assert.equal(process.env.AI_GATEWAY_API_KEY,'synthetic-owner');assert.equal((await connectionStatus(null)).available,false);
});

test('Lab keeps simultaneous personal requests separate and retains a key snapshot through catalog loading',async()=>{
 const entered=deferred(),hold=deferred(),calls=[];let defaults=0;
 const service=createLabService({credential:async()=>{defaults++;return 'synthetic-owner';},fetchImpl:async(url,init)=>{if(url.endsWith('/models'))return json({data:[language]});calls.push(init);if(init.headers.authorization==='Bearer '+A.apiKey){entered.resolve();await hold.promise;}return json({choices:[{message:{content:'A saved result'}}]});}});
 const connection={...A},first=service.generate(textRequest,{connection});connection.apiKey=B.apiKey;await entered.promise;
 assert.equal((await service.status(A)).busy,true);assert.equal((await service.status(B)).busy,false);await service.generate(textRequest,{connection:B});await assert.rejects(service.generate(textRequest,{connection:A}),e=>e.status===409);
 hold.resolve();await first;assert.equal((await service.status(A)).busy,false);assert.deepEqual(calls.map(x=>x.headers.authorization),['Bearer '+A.apiKey,'Bearer '+B.apiKey]);assert.equal(defaults,0);
});

test('Lab explicit empty connections never call the default credential callback or provider for any media mode',async()=>{
 let defaults=0,network=0;const service=createLabService({credential:async()=>{defaults++;return 'synthetic-owner';},fetchImpl:async()=>{network++;throw Error('Unexpected network');}});
 for(const connection of [null,{}, {...A,available:false}]){
  assert.equal((await service.status(connection)).available,false);
  for(const [method,body]of [['generate',textRequest],['generateAudio',{kind:'audio',model:speech.id,prompt:'A script'}],['startVideo',videoRequest],['videoStatus',{ticket:'invalid'}],['videoContent',{ticket:'invalid'}]])await assert.rejects(service[method](body,{connection}),e=>e.status===503);
 }
 assert.equal(defaults,0);assert.equal(network,0);
});

test('Lab video job/media signatures and idempotency are credential scoped across cold services',async()=>{
 const calls=[],bytes=Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);
 const options={credential:async()=>{throw Error('Default connection must not run');},fetchImpl:async(url,init)=>{if(url.endsWith('/models'))return json({data:[video]});calls.push({url,init});if(url.endsWith('/start'))return json({operation:{gatewayJobId:init.headers.authorization.endsWith('A')?'job_personal_a':'job_personal_b'}});return json({status:'completed',videos:[{type:'base64',mediaType:'video/mp4',data:bytes.toString('base64')}]});}};
 const service=createLabService(options),first=await service.startVideo(videoRequest,{connection:A}),second=await service.startVideo(videoRequest,{connection:B});assert.notEqual(first.ticket,second.ticket);
 assert.deepEqual(await service.startVideo(videoRequest,{connection:A}),first);assert.equal(calls.filter(c=>c.url.endsWith('/start')).length,2);
 const cold=createLabService(options),before=calls.length;await assert.rejects(cold.videoStatus({ticket:first.ticket},{connection:B}),e=>e.status===403);assert.equal(calls.length,before);
 const completed=await cold.videoStatus({ticket:first.ticket},{connection:A}),ticket=completed.result.videos[0].contentTicket;
 await assert.rejects(cold.videoContent({ticket},{connection:B}),e=>e.status===403);assert.deepEqual((await cold.videoContent({ticket},{connection:A})).body,bytes);
 assert.ok(!JSON.stringify([first,second,completed]).includes(A.apiKey));assert.ok(calls.filter(c=>c.url.endsWith('/status')).every(c=>c.init.headers.authorization==='Bearer '+A.apiKey));
});

test('Lab speech isolates simultaneous personal callers and releases its per-connection lock on cancellation',async()=>{
 const entered=deferred(),hold=deferred(),calls=[];let first=true;
 const service=createLabService({credential:async()=>{throw Error('Default connection must not run');},fetchImpl:async(url,init)=>{if(url.endsWith('/models'))return json({data:[speech]});calls.push(init.headers.authorization);if(first){first=false;entered.resolve();await hold.promise;}return new Response('',{status:402});}});
 const request={kind:'audio',model:speech.id,prompt:'A short script'},controller=new AbortController(),pending=service.generateAudio(request,{connection:A,signal:controller.signal});await entered.promise;
 await assert.rejects(service.generateAudio(request,{connection:B}),e=>e.status===502);await assert.rejects(service.generateAudio(request,{connection:A}),e=>e.status===409);
 controller.abort();await assert.rejects(pending,e=>e.status===499);hold.resolve();await assert.rejects(service.generateAudio(request,{connection:A}),e=>e.status===502);
 assert.deepEqual(calls,['Bearer '+A.apiKey,'Bearer '+B.apiKey,'Bearer '+A.apiKey]);
});
