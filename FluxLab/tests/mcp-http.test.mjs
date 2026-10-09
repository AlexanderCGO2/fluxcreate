import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';
import {createEditorMcpHandler,createRequestLedger} from '../server/mcp-http.mjs';
import {connectEditorMcp} from '../src/mcp-client.mjs';
const connection=key=>({apiKey:key,scopeId:key,available:true,mode:'personal'});
async function fixture(t,{service={},editor}={}){
 const calls=[];const handle=createEditorMcpHandler({appId:'fluxoto',service:{status:async()=>({available:true}),models:async()=>({models:[]}),generate:async(args,{connection,signal})=>{calls.push({args,connection});if(args.prompt==='wait')await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));return {id:randomUUID(),kind:'text',text:connection.apiKey,images:[]};},...service},editor:editor||{appId:'fluxoto',plan:async(input,{connection})=>({summary:connection.apiKey,commands:[],baseFingerprint:input.baseFingerprint})}});
 const server=http.createServer((req,res)=>handle(req,res,{connection:connection(req.headers['x-test-key']||'user-a')}));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));const origin=`http://127.0.0.1:${server.address().port}`,endpoint=origin+'/api/mcp';
 const client=async(key='user-a',mode='auto')=>{const c=new Client({name:'test',version:'1'},{versionNegotiation:{mode}});await c.connect(new StreamableHTTPClientTransport(new URL(endpoint),{requestInit:{headers:{'x-fluxcreate-mcp':'1','x-test-key':key,origin},redirect:'error'}}));t.after(()=>c.close());return c;};return {client,calls,origin,endpoint};
}
test('official SDK discovers, lists and calls the real dispatcher in modern and legacy modes',async t=>{
 const {client}=await fixture(t);for(const mode of ['auto','legacy']){const c=await client('private-user',mode);const list=await c.listTools();assert.ok(list.tools.some(t=>t.name==='fluxcreate_edit'));const catalog=await c.callTool({name:'fluxlab_catalog',arguments:{}});assert.equal(catalog.structuredContent.status.available,true);const planned=await c.callTool({name:'fluxcreate_edit',arguments:{request:{baseFingerprint:'revision-one'}},_meta:{'fluxcreate/requestId':randomUUID()}});assert.equal(planned.structuredContent.summary,'private-user');assert.equal(planned.structuredContent.baseFingerprint,'revision-one');}
});
test('paid request IDs deduplicate within a connection, reject reuse, and isolate users',async t=>{
 const {client,calls}=await fixture(t),a=await client('a'),b=await client('b'),id=randomUUID(),args={kind:'text',model:'test/text',prompt:'hello'},call=(c,args)=>c.callTool({name:'fluxlab_generate',arguments:args,_meta:{'fluxcreate/requestId':id}});
 const [r1,r2,r3]=await Promise.all([call(a,args),call(a,args),call(b,args)]);assert.equal(calls.length,2);assert.equal(r1.structuredContent.id,r2.structuredContent.id);assert.equal(r1.structuredContent.text,'a');assert.equal(r3.structuredContent.text,'b');assert.ok(Object.isFrozen(calls[0].connection));assert.equal((await call(a,{...args,prompt:'different'})).isError,true);assert.equal(calls.length,2);
});
test('origin, JSON bounds, missing request IDs and tool schema fail before provider work',async t=>{
 const {client,endpoint,origin,calls}=await fixture(t);assert.equal((await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,403);assert.equal((await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-fluxcreate-mcp':'1',origin:'https://evil.invalid'},body:'{}'})).status,403);
 assert.equal((await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json','x-fluxcreate-mcp':'1',origin},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'fluxlab_generate',arguments:{kind:'text'}}})})).status,400);
 const c=await client();const result=await c.callTool({name:'fluxlab_generate',arguments:{kind:'text',model:'test/text',prompt:'x'.repeat(12001)},_meta:{'fluxcreate/requestId':randomUUID()}});assert.equal(result.isError,true);assert.equal(calls.length,0);
});
test('browser client uses the official transport and cancellation reaches request-scoped service',async t=>{
 let aborted=false;const {endpoint,origin}=await fixture(t,{service:{generate:async(args,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>{aborted=true;reject(Error('cancelled'));},{once:true});})}});const controller=new AbortController();const client=await connectEditorMcp(endpoint,{origin,signal:controller.signal,fetchImpl:(url,init)=>fetch(url,{...init,headers:{...Object.fromEntries(new Headers(init.headers)),origin}})});const request=client.call('fluxlab_generate',{kind:'text',model:'test/text',prompt:'wait'},{requestId:randomUUID()});setTimeout(()=>controller.abort(),30);await assert.rejects(request);await new Promise(r=>setTimeout(r,50));assert.equal(aborted,true);await client.close();
});
test('ledger retains uncertain failures and rejects bounded overflow',async()=>{const once=createRequestLedger({maxEntries:1});let count=0;const run=()=>{count++;throw Error('uncertain');};await assert.rejects(once('one',{},run));await assert.rejects(once('one',{},run));assert.equal(count,1);await assert.rejects(once('two',{},()=>1),/cache is full/);});
