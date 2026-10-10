import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {handleSettings,resolveRequestConnection,sealConnection} from '../server/settings.mjs';
const fixture={accountId:'a'.repeat(32),gatewayId:'default',apiToken:'fixture-cloudflare-token-only',allowMusic:true,allowTextFallback:false};
const wrapping=randomBytes(32),headers={host:'localhost:8800',origin:'http://localhost:8800','content-type':'application/json'};
async function send(method,route,body,cookie='',options={}){const req={method,headers:{...headers,cookie},body,socket:{remoteAddress:crypto.randomUUID()}};let code,result;const values={};const res={setHeader(k,v){values[k]=v;},writeHead(c,h){code=c;Object.assign(values,h);},end(v){result=JSON.parse(v);}};const handled=await handleSettings(req,res,route,{key:wrapping,status:async()=>({available:true}),...options});return{handled,code,result,headers:values};}
test('Cloudflare saves and removes its own encrypted cookie while old Vercel credentials remain readable',async()=>{
 const saved=await send('POST','/settings/cloudflare',fixture);assert.equal(saved.handled,true);assert.equal(saved.code,200);assert.equal(saved.result.configured,true);assert.equal(saved.result.verified,false);assert.ok(!JSON.stringify(saved.result).includes(fixture.apiToken));
 const cookie=saved.headers['Set-Cookie'];assert.match(cookie,/^fluxcreate_cloudflare=/);assert.match(cookie,/HttpOnly/);assert.ok(!cookie.includes(fixture.apiToken));
 const old=sealConnection({v:1,apiKey:'old-vercel-personal-fixture',expiresAt:Date.now()+30000},wrapping);
 const conn=await resolveRequestConnection({headers:{cookie:'fluxcreate_connection='+old+'; '+cookie.split(';')[0]}},{key:wrapping});assert.equal(conn.apiKey,'old-vercel-personal-fixture');assert.equal(conn.cloudflare.apiToken,fixture.apiToken);assert.ok(Object.isFrozen(conn)&&Object.isFrozen(conn.cloudflare));
 const removed=await send('DELETE','/settings/cloudflare',undefined,cookie.split(';')[0]);assert.match(removed.headers['Set-Cookie'],/^fluxcreate_cloudflare=.*Max-Age=0/);assert.equal(conn.cloudflare.apiToken,fixture.apiToken);
 const absent=await resolveRequestConnection({headers:{}},{key:wrapping});assert.equal(absent,undefined);
});
test('invalid Cloudflare cookies stay invalid and never expose suite credentials',async()=>{
 const saved=await send('POST','/settings/cloudflare',fixture);assert.equal(saved.handled,true);const cookie=saved.headers['Set-Cookie'].split(';')[0];
 for(const [value,now] of [[cookie,Date.now()+31*86400000],['fluxcreate_cloudflare=corrupt',Date.now()],[cookie+'; '+cookie,Date.now()]]){const conn=await resolveRequestConnection({headers:{cookie:value}},{key:wrapping,now});assert.equal(conn.cloudflare.mode,'invalid');assert.equal(conn.cloudflare.apiToken,'');}
});
test('Cloudflare settings enforce origin, bounded identifiers and boolean consent before saving',async()=>{
 const rejected=await send('POST','/settings/cloudflare',fixture,'',{hosted:true});assert.equal(rejected.handled,true);assert.equal(rejected.code,403);
 for(const bad of [{accountId:'../other'},{accountId:42},{gatewayId:42},{apiToken:42},{gatewayId:'../other'},{apiToken:'a\nb'},{allowMusic:'true'},{surprise:true}]){const result=await send('POST','/settings/cloudflare',{...fixture,...bad});assert.equal(result.code,400);assert.equal(result.headers['Set-Cookie'],undefined);}
});
test('request snapshots isolate credentials and explicit consent from environment changes',async()=>{
 const cf=await import('../server/cloudflare-connection.mjs');const env={CLOUDFLARE_ACCOUNT_ID:fixture.accountId,CLOUDFLARE_API_TOKEN:'suite-cloudflare-token',FLUXCREATE_CLOUDFLARE_MUSIC:'true',FLUXCREATE_CLOUDFLARE_FALLBACK:'false'};
 assert.equal(cf.cloudflareFor({mode:'personal'},{env}),undefined);assert.equal(cf.cloudflareFor({mode:'invalid'},{env}),undefined);
 assert.equal(cf.cloudflareFor({apiKey:'personal-without-mode'},{env}),undefined);
 const draft={...fixture,mode:'personal'},snapshot=cf.snapshotCloudflare(draft);draft.apiToken='replacement-token';draft.allowMusic=false;assert.equal(snapshot.apiToken,fixture.apiToken);assert.equal(snapshot.allowMusic,true);assert.ok(Object.isFrozen(snapshot));
 const suite=cf.cloudflareFor(undefined,{env});assert.equal(suite.mode,'suite');assert.equal(suite.gatewayId,'default');assert.equal(suite.allowMusic,true);assert.equal(suite.allowTextFallback,false);assert.notEqual(suite.scopeId,snapshot.scopeId);
 assert.equal(cf.cloudflareFor({mode:'suite',cloudflare:{mode:'invalid'}},{env}).mode,'invalid');assert.equal(cf.snapshotCloudflare({...fixture,accountId:'bad'}).mode,'invalid');
 assert.ok(!JSON.stringify(cf.publicCloudflareStatus(snapshot)).includes(fixture.apiToken));
});
test('Cloudflare check verifies token via non-inference API without claiming model or billing access',async()=>{
 const cf=await import('../server/cloudflare-connection.mjs');let calls=0;const result=await cf.checkCloudflareToken(fixture,{fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://api.cloudflare.com/client/v4/user/tokens/verify');assert.equal(options.headers.Authorization,'Bearer '+fixture.apiToken);assert.equal(options.redirect,'error');return Response.json({success:true,result:{status:'active'}});}});assert.equal(calls,1);assert.equal(result.verified,true);assert.equal(result.accessVerified,false);assert.equal(result.creditsVerified,false);
 await assert.rejects(cf.checkCloudflareToken(fixture,{fetchImpl:async()=>new Response(fixture.apiToken,{status:403})}),e=>e.status===401&&!e.message.includes(fixture.apiToken));
 const saved=await send('POST','/settings/cloudflare',fixture);const checked=await send('POST','/settings/cloudflare/check',{},saved.headers['Set-Cookie'].split(';')[0],{validateCloudflare:async()=>result});assert.equal(checked.code,200);assert.equal(checked.result.verified,true);assert.equal(checked.headers['Set-Cookie'],undefined);
});
test('suite Cloudflare credentials freeze at request entry before asynchronous body or primary work',async t=>{
 const names=['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_GATEWAY_ID','FLUXCREATE_CLOUDFLARE_MUSIC','FLUXCREATE_CLOUDFLARE_FALLBACK','AI_GATEWAY_API_KEY'];const before=Object.fromEntries(names.map(name=>[name,process.env[name]]));t.after(()=>{for(const name of names){if(before[name]===undefined)delete process.env[name];else process.env[name]=before[name];}});
 process.env.CLOUDFLARE_ACCOUNT_ID=fixture.accountId;process.env.CLOUDFLARE_API_TOKEN='suite-token-at-request-entry';process.env.CLOUDFLARE_GATEWAY_ID='default';process.env.FLUXCREATE_CLOUDFLARE_MUSIC='true';process.env.FLUXCREATE_CLOUDFLARE_FALLBACK='true';process.env.AI_GATEWAY_API_KEY='suite-vercel-request-fixture';
 const pending=resolveRequestConnection({headers:{}},{key:wrapping});process.env.CLOUDFLARE_API_TOKEN='suite-token-after-request-entry';process.env.FLUXCREATE_CLOUDFLARE_MUSIC='false';
 const context=await pending;assert.equal(context?.cloudflare?.apiToken,'suite-token-at-request-entry');assert.equal(context.cloudflare.allowMusic,true);assert.equal(context.mode,'suite');assert.equal(context.apiKey,'suite-vercel-request-fixture');assert.ok(Object.isFrozen(context)&&Object.isFrozen(context.cloudflare));
 const {cloudflareFor}=await import('../server/cloudflare-connection.mjs');assert.equal(cloudflareFor(context).apiToken,'suite-token-at-request-entry');
 const old=sealConnection({v:1,apiKey:'personal-vercel-request-fixture',expiresAt:Date.now()+30000},wrapping);const personal=await resolveRequestConnection({headers:{cookie:'fluxcreate_connection='+old}},{key:wrapping});assert.equal(personal.cloudflare,undefined);assert.equal(cloudflareFor(personal),undefined);
});
