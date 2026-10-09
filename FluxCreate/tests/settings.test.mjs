import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomBytes,createHash} from 'node:crypto';
import {handleSettings,resolveRequestConnection,sealConnection,openConnection,checkGatewayKey} from '../server/settings.mjs';
import {createHostedHandler} from '../server/hosted.mjs';
import {createLabService} from '../../FluxLab/server/service.mjs';
import {createDemoProject} from '../../Fluxoto/src/model.mjs';
import {createBlankProject} from '../../Fluxiffects/src/core.mjs';
import {createProject} from '../../Haidini/src/engine/project.ts';
import {fingerprint,transportProject} from '../shared/browser.mjs';

const keyA='fixture-gateway-key-for-person-a',keyB='fixture-gateway-key-for-person-b';
test('sealed browser credentials authenticate payload, reject tampering and expire without fallback',async()=>{
 const wrapping=randomBytes(32),expiresAt=Date.now()+30000,token=sealConnection({v:1,apiKey:keyA,expiresAt},wrapping);
 assert.ok(!token.includes(keyA));assert.equal(openConnection(token,wrapping).apiKey,keyA);
 assert.equal(openConnection(token,randomBytes(32)),null);assert.equal(openConnection(token,wrapping,expiresAt+1),null);
 const bytes=Buffer.from(token,'base64url');bytes[15]^=1;assert.equal(openConnection(bytes.toString('base64url'),wrapping),null);
 const request=cookie=>({headers:{cookie}});
 assert.equal(await resolveRequestConnection(request(''),{key:wrapping}),undefined);
 const connection=await resolveRequestConnection(request('fluxcreate_connection='+token),{key:wrapping});assert.equal(connection.apiKey,keyA);assert.ok(Object.isFrozen(connection));
 const invalid=await resolveRequestConnection(request('fluxcreate_connection=bad'),{key:wrapping});assert.equal(invalid.available,false);assert.equal(invalid.apiKey,'');
 assert.equal((await resolveRequestConnection(request('fluxcreate_connection='+token+'; fluxcreate_connection=second'),{key:wrapping})).mode,'invalid');
});
test('settings save/check/remove uses secure cookies, exact origin, sanitized responses and isolated connections',async()=>{
 const wrapping=randomBytes(32),seen=[],before=process.env.AI_GATEWAY_API_KEY;
 const server=http.createServer(async(req,res)=>{const route=new URL(req.url,'http://local').pathname;if(route==='/resolve'){const connection=await resolveRequestConnection(req,{hosted:true,key:wrapping});seen.push(connection);res.end(JSON.stringify({mode:connection?.mode||'suite'}));return;}await handleSettings(req,res,route,{hosted:true,key:wrapping,status:async()=>({available:true}),validate:async key=>{if(key==='invalid-fixture-gateway-key')throw Object.assign(Error('Key rejected.'),{status:401});return{valid:true,credits:0};}});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,origin=base.replace('http:','https:');
 const send=(method,path='/settings/connection',body,headers={})=>fetch(base+path,{method,headers:{origin,'Content-Type':'application/json',...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await send('POST',undefined,{apiKey:keyA},{origin:'https://elsewhere.invalid'})).status,403);
  assert.equal((await send('POST',undefined,{apiKey:keyA},{origin:base})).status,403);
  const first=await send('POST',undefined,{apiKey:keyA}),safe=await first.json(),cookieA=first.headers.get('set-cookie');
  assert.equal(first.status,200);assert.equal(safe.mode,'personal');assert.equal(safe.credits,0);assert.ok(!JSON.stringify(safe).includes(keyA));assert.match(cookieA,/^__Host-fluxcreate_connection=/);for(const attr of ['HttpOnly','Secure','SameSite=Strict','Path=/'])assert.ok(cookieA.includes(attr));
  const cookieB=(await send('POST',undefined,{apiKey:keyB})).headers.get('set-cookie');
  await Promise.all([send('GET','/resolve',undefined,{cookie:cookieA.split(';')[0]}),send('GET','/resolve',undefined,{cookie:cookieB.split(';')[0]})]);
  assert.deepEqual(new Set(seen.map(c=>c.apiKey)),new Set([keyA,keyB]));assert.notEqual(seen[0].scopeId,seen[1].scopeId);assert.equal(process.env.AI_GATEWAY_API_KEY,before);
  const read=await send('GET',undefined,undefined,{cookie:cookieA.split(';')[0]});const status=await read.json();assert.equal(status.mode,'personal');assert.ok(!JSON.stringify(status).includes(keyA));
  const rejected=await send('POST',undefined,{apiKey:'invalid-fixture-gateway-key'},{cookie:cookieA.split(';')[0]});assert.equal(rejected.status,401);assert.equal(rejected.headers.get('set-cookie'),null);
  const checked=await send('POST','/settings/connection/check',{}, {cookie:cookieA.split(';')[0]});assert.equal(checked.status,200);assert.equal(checked.headers.get('set-cookie'),null);
  const removed=await send('DELETE',undefined,undefined,{cookie:cookieA.split(';')[0]});assert.match(removed.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await removed.json()).mode,'suite');
  assert.equal((await send('POST',undefined,{apiKey:keyA,extra:'ignored?'})).status,400);
  assert.equal((await send('POST',undefined,{apiKey:123})).status,400);
  assert.equal((await send('POST',undefined,{apiKey:'x'.repeat(5000)})).status,413);
  assert.equal((await send('GET',undefined,undefined,{'sec-fetch-site':'cross-site'})).status,403);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('Gateway connection check is a bounded non-inference request; zero balance is valid and errors do not leak',async()=>{
 let calls=0;
 const result=await checkGatewayKey(keyA,{fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://ai-gateway.vercel.sh/v1/credits');assert.equal(options.headers.Authorization,'Bearer '+keyA);assert.equal(options.redirect,'error');return Response.json({balance:'0.00',total_used:'10'});}});
 assert.equal(result.valid,true);assert.equal(result.credits,0);assert.equal(calls,1);
 await assert.rejects(checkGatewayKey(keyA,{fetchImpl:async()=>new Response('sensitive upstream detail '+keyA,{status:401})}),error=>error.status===401&&!error.message.includes(keyA));
 await assert.rejects(checkGatewayKey(keyA,{fetchImpl:async()=>new Response('x'.repeat(70000))}),error=>error.status===502);
 await assert.rejects(checkGatewayKey(keyA,{fetchImpl:async()=>{throw Error(keyA);}}),error=>error.status===502&&!error.message.includes(keyA));
 await assert.rejects(checkGatewayKey('bad\nkey'),error=>error.status===400);
});

test('credit checks reject malformed balance values and release rejected provider responses',async()=>{
 for(const balance of [null,false,true,[],{},'', ' ', '0x10'])await assert.rejects(checkGatewayKey(keyA,{fetchImpl:async()=>Response.json({balance})}),error=>error.status===502);
 let cancelled=false;const body=new ReadableStream({cancel(){cancelled=true;}});
 await assert.rejects(checkGatewayKey(keyA,{fetchImpl:async()=>new Response(body,{status:401})}),error=>error.status===401);
 assert.equal(cancelled,true);
});

test('maximum accepted keys fit browser cookies and hosted secret failure never selects the owner connection',async t=>{
 const wrapping=randomBytes(32),apiKey='x'.repeat(1024),expiresAt=Date.now()+30000,token=sealConnection({v:1,apiKey,expiresAt},wrapping);
 assert.ok(Buffer.byteLength(`__Host-fluxcreate_connection=${token}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=31536000`)<4096);
 assert.equal(openConnection(token,wrapping).apiKey,apiKey);
 const previous=process.env.FLUXCREATE_CONNECTION_SECRET;delete process.env.FLUXCREATE_CONNECTION_SECRET;t.after(()=>{if(previous===undefined)delete process.env.FLUXCREATE_CONNECTION_SECRET;else process.env.FLUXCREATE_CONNECTION_SECRET=previous;});
 const req={headers:{cookie:'__Host-fluxcreate_connection='+token}};
 assert.equal((await resolveRequestConnection(req,{hosted:true})).mode,'invalid');
 process.env.FLUXCREATE_CONNECTION_SECRET='invalid-configuration';assert.equal((await resolveRequestConnection(req,{hosted:true})).mode,'invalid');
 assert.equal(await resolveRequestConnection({headers:{}},{hosted:true}),undefined);
});

test('hosted personal cookies isolate real editor and media services through save, plan, status and download',async t=>{
 const previous=process.env.FLUXCREATE_CONNECTION_SECRET,owner=process.env.AI_GATEWAY_API_KEY,secret=randomBytes(32).toString('hex');process.env.FLUXCREATE_CONNECTION_SECRET=secret;
 t.after(()=>{if(previous===undefined)delete process.env.FLUXCREATE_CONNECTION_SECRET;else process.env.FLUXCREATE_CONNECTION_SECRET=previous;});
 const realFetch=globalThis.fetch,calls=[],sceneCalls=[],videoCalls=[],mp4=Buffer.from([0,0,0,20,102,116,121,112,105,115,111,109,0,0,0,0,105,115,111,109]);let defaults=0,startedA,releaseA;
 const beganA=new Promise(resolve=>startedA=resolve),holdA=new Promise(resolve=>releaseA=resolve);
 const response=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  if(!String(url).startsWith('https://ai-gateway.vercel.sh/'))return realFetch(url,init);
  const headers=new Headers(init.headers),authorization=headers.get('authorization');calls.push({url:String(url),authorization,signal:init.signal,body:init.body});
  if(String(url).endsWith('/credits'))return response({balance:'0.00'});
  assert.ok(String(url).endsWith('/language-model'),'Unexpected provider route');
  if(authorization==='Bearer '+keyA&&String(init.body).includes('Wait for first plan')){startedA();await holdA;}
  return response({content:[{type:'text',text:JSON.stringify({summary:'A considered layout',commandsJson:'[]',explanation:'The elements are editable.'})}],finishReason:'stop',usage:{inputTokens:1,outputTokens:1}});
 });
 const lab=createLabService({credential:async()=>{defaults++;return 'unused-owner-credential';},fetchImpl:async(url,init)=>{
  if(url.endsWith('/models')){assert.equal(init.headers,undefined);return response({data:[{id:'test/video',type:'video',video_capabilities:{supported_operations:['text-to-video']}}]});}
  videoCalls.push({url,authorization:init.headers.authorization,signal:init.signal});assert.ok(init.signal instanceof AbortSignal);
  if(url.endsWith('/start'))return response({operation:{gatewayJobId:init.headers.authorization==='Bearer '+keyA?'job_person_a':'job_person_b'}});
  assert.ok(url.endsWith('/status'));return response({status:'completed',videos:[{type:'base64',mediaType:'video/mp4',data:mp4.toString('base64')}]});
 }});
 const handler=createHostedHandler({lab,scenePlanner:async(_project,_intent,_memory,_generate,_selection,signal,{connection})=>{sceneCalls.push({signal,connection});return {patch:{commands:[]}};}}),server=http.createServer(handler);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,origin=base.replace('http:','https:');
 const send=(route,{cookie,body,method=body===undefined?'GET':'POST',signal}={})=>fetch(base+'/api/'+route,{method,signal,headers:{origin,'Content-Type':'application/json',...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 try{
  const cookieFor=async apiKey=>{const result=await send('fluxcreate/settings/connection',{body:{apiKey}});assert.equal(result.status,200);assert.ok(!JSON.stringify(await result.json()).includes(apiKey));return result.headers.get('set-cookie').split(';')[0];};
  const cookieA=await cookieFor(keyA),cookieB=await cookieFor(keyB),project=createDemoProject(),body={project:transportProject(project),intent:'Wait for first plan',mode:'explain',scope:'composition',selection:[],baseFingerprint:fingerprint(project)};
  const first=send('fluxoto/ai/plan',{cookie:cookieA,body});await beganA;
  assert.equal((await(await send('fluxoto/ai/status',{cookie:cookieA})).json()).busy,true);assert.equal((await(await send('fluxoto/ai/status',{cookie:cookieB})).json()).busy,false);
  const second=await send('fluxoto/ai/plan',{cookie:cookieB,body:{...body,intent:'Explain the second layout'}});assert.equal(second.status,200);releaseA();assert.equal((await first).status,200);
  const motion=await send('fluxiffects/ai/plan',{cookie:cookieB,body:{project:createBlankProject(),intent:'Explain the motion',mode:'explain',scope:'composition',selection:[]}});assert.equal(motion.status,200);
  assert.equal((await send('fluxini/plan',{cookie:cookieA,body:{project:createProject(crypto.randomUUID(),'blank'),intent:'Explain this scene'}})).status,200);assert.equal(sceneCalls[0].connection.apiKey,keyA);assert.ok(sceneCalls[0].signal instanceof AbortSignal);assert.ok(Object.isFrozen(sceneCalls[0].connection));
  const request={kind:'video',model:'test/video',prompt:'A paper boat',requestId:'62339b7a-1ccb-45a7-81b0-a7b410c77a69'};
  const start=async cookie=>{const reply=await send('fluxlab/video/start',{cookie,body:request});assert.equal(reply.status,200);return reply.json();};
  const [jobA,jobB]=await Promise.all([start(cookieA),start(cookieB)]);assert.notEqual(jobA.ticket,jobB.ticket);assert.equal((await start(cookieA)).ticket,jobA.ticket);
  const before=videoCalls.length;assert.equal((await send('fluxlab/video/status',{cookie:cookieB,body:{ticket:jobA.ticket}})).status,403);assert.equal(videoCalls.length,before);
  const completed=await(await send('fluxlab/video/status',{cookie:cookieA,body:{ticket:jobA.ticket}})).json(),ticket=completed.result.videos[0].contentTicket;
  assert.equal((await send('fluxlab/video/content?ticket='+encodeURIComponent(ticket),{cookie:cookieB})).status,403);
  const content=await send('fluxlab/video/content?ticket='+encodeURIComponent(ticket),{cookie:cookieA});assert.equal(content.status,200);assert.deepEqual(Buffer.from(await content.arrayBuffer()),mp4);
  const expired=sealConnection({v:1,apiKey:keyA,expiresAt:Date.now()-1},createHash('sha256').update(secret).digest()),badCookies=['__Host-fluxcreate_connection=bad','__Host-fluxcreate_connection='+expired,cookieA+'; '+cookieB];
  const providerCount=calls.length,mediaCount=videoCalls.length;
  for(const cookie of badCookies){assert.equal((await send('fluxoto/ai/plan',{cookie,body})).status,503);assert.equal((await send('fluxlab/video/status',{cookie,body:{ticket:jobA.ticket}})).status,503);}
  assert.equal(calls.length,providerCount);assert.equal(videoCalls.length,mediaCount);assert.equal(defaults,0);assert.equal(process.env.AI_GATEWAY_API_KEY,owner);
  const modelCalls=calls.filter(c=>c.url.endsWith('/language-model'));assert.deepEqual(modelCalls.map(c=>c.authorization),['Bearer '+keyA,'Bearer '+keyB,'Bearer '+keyB]);assert.ok(modelCalls.every(c=>c.signal instanceof AbortSignal&&!String(c.body).includes(keyA)&&!String(c.body).includes(keyB)));
  assert.deepEqual(videoCalls.filter(c=>c.url.endsWith('/start')).map(c=>c.authorization).sort(),['Bearer '+keyA,'Bearer '+keyB].sort());
 }finally{releaseA();await new Promise(resolve=>server.close(resolve));}
});
