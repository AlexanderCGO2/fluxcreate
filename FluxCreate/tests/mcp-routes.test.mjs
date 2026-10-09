import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createHostedHandler} from '../server/hosted.mjs';
import {sealConnection} from '../server/settings.mjs';
import {connectEditorMcp} from '../../FluxLab/src/mcp-client.mjs';
import {LabError} from '../../FluxLab/server/service.mjs';
test('hosted MCP keeps encrypted personal-cookie credentials isolated and rejects expired credentials',async()=>{
 const previous=process.env.FLUXCREATE_CONNECTION_SECRET;process.env.FLUXCREATE_CONNECTION_SECRET='a'.repeat(64);const key=createHash('sha256').update(process.env.FLUXCREATE_CONNECTION_SECRET).digest(),seen=[];
 const service={status:async connection=>({available:connection?.available===true}),models:async()=>({models:[]}),generate:async(body,{connection})=>{if(!connection?.apiKey||!connection.available)throw new LabError('Reconnect personal account.',503);seen.push(connection);return {id:crypto.randomUUID(),kind:'text',text:connection.scopeId,images:[]};}};
 const app=http.createServer(createHostedHandler({lab:service}));await new Promise(r=>app.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${app.address().port}`,expected=origin.replace('http:','https:');
 const connect=async(apiKey,expiresAt=Date.now()+60000)=>connectEditorMcp(origin+'/api/fluxoto/mcp',{origin,fetchImpl:(url,init)=>fetch(url,{...init,headers:{...Object.fromEntries(new Headers(init.headers)),origin:expected,cookie:'__Host-fluxcreate_connection='+sealConnection({v:1,apiKey,expiresAt},key)}})});
 const clients=[];try{clients.push(await connect('personal-fixture-a'),await connect('personal-fixture-b'),await connect('expired-fixture-key',Date.now()-1000));const requestId=crypto.randomUUID(),args={kind:'text',model:'mock/text',prompt:'owner isolation'};const [a,b]=await Promise.all(clients.slice(0,2).map(c=>c.call('fluxlab_generate',args,{requestId})));assert.notEqual(a.structuredContent.text,b.structuredContent.text);assert.deepEqual(seen.map(c=>c.apiKey).sort(),['personal-fixture-a','personal-fixture-b']);assert.ok(seen.every(Object.isFrozen));await assert.rejects(clients[2].call('fluxlab_generate',args,{requestId}),/Reconnect personal/);assert.equal(seen.length,2);
  const rejected=await fetch(origin+'/api/fluxoto/mcp',{method:'POST',headers:{'content-type':'application/json','x-fluxcreate-mcp':'1',origin:'https://foreign.invalid'},body:'{}'});assert.equal(rejected.status,403);
 }finally{await Promise.all(clients.map(c=>c.close()));app.closeAllConnections();await new Promise(r=>app.close(r));if(previous===undefined)delete process.env.FLUXCREATE_CONNECTION_SECRET;else process.env.FLUXCREATE_CONNECTION_SECRET=previous;}
});
