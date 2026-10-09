import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/client';
import {InMemoryTransport} from '@modelcontextprotocol/server';
import {createMcpServer,videoStudioURL} from '../server/mcp.mjs';
import {LabError} from '../server/service.mjs';

test('MCP video start and status preserve tickets and never embed video bytes',async()=>{
 const calls=[],service={startVideo:async args=>{calls.push(args);return {status:'pending',ticket:'signed-job'};},videoStatus:async args=>{assert.equal(args.ticket,'signed-job');return {status:'completed',result:{id:'video-one',kind:'video',videos:[{mimeType:'video/mp4',contentTicket:'signed-content'}]}};}};
 const server=createMcpServer({service,uiHtml:'<title>FluxLab</title>'}),client=new Client({name:'Video test',version:'1.0.0'}),[ct,st]=InMemoryTransport.createLinkedPair();await server.connect(st);await client.connect(ct);
 try{
  const tools=(await client.listTools()).tools,start=tools.find(t=>t.name==='fluxlab_video_start'),status=tools.find(t=>t.name==='fluxlab_video_status');assert.equal(start.annotations.readOnlyHint,false);assert.equal(start.annotations.idempotentHint,true);assert.equal(status.annotations.readOnlyHint,true);
  const args={kind:'video',model:'test/video',prompt:'A paper bird takes flight',requestId:'928bfe9d-2cb4-4824-9648-f5144dbeb178',duration:5,aspectRatio:'16:9'};
  const first=await client.callTool({name:'fluxlab_video_start',arguments:args});assert.equal(first.structuredContent.status,'pending');assert.equal(first.structuredContent.ticket,'signed-job');assert.equal(new URL(first.structuredContent.studioUrl).hash,'#video=signed-job');assert.equal(first.content[1].type,'resource_link');assert.equal(calls[0].requestId,args.requestId);
  const done=await client.callTool({name:'fluxlab_video_status',arguments:{ticket:'signed-job'}});assert.equal(done.structuredContent.status,'completed');assert.equal(done.structuredContent.result.videos[0].contentTicket,'signed-content');assert.equal(done.content.some(c=>c.type==='image'||c.type==='audio'||c.type==='resource'),false);
  const invalid=await client.callTool({name:'fluxlab_video_start',arguments:{...args,requestId:'not-a-uuid'}});assert.equal(invalid.isError,true);assert.equal(calls.length,1);
  service.videoStatus=async()=>{throw new LabError('This video ticket has expired.',410);};const expired=await client.callTool({name:'fluxlab_video_status',arguments:{ticket:'signed-job'}});assert.equal(expired.isError,true);assert.match(expired.content[0].text,/expired/);
  service.videoStatus=async()=>{throw Error('private provider secret');};const failed=await client.callTool({name:'fluxlab_video_status',arguments:{ticket:'signed-job'}});assert.equal(failed.isError,true);assert.doesNotMatch(JSON.stringify(failed),/private provider secret/);
 }finally{await client.close();await server.close();}
});

test('MCP studio links use only configured HTTPS or loopback origins',()=>{
 const before=process.env.FLUXLAB_PUBLIC_URL;
 try{process.env.FLUXLAB_PUBLIC_URL='https://example.com/fluxlab/?discard=1#old';assert.equal(videoStudioURL('a&b'),'https://example.com/fluxlab/#video=a%26b');for(const url of['javascript:alert(1)','http://example.com','https://secret@example.com']){process.env.FLUXLAB_PUBLIC_URL=url;assert.throws(()=>videoStudioURL('ticket'),/HTTPS|invalid/);}}
 finally{if(before===undefined)delete process.env.FLUXLAB_PUBLIC_URL;else process.env.FLUXLAB_PUBLIC_URL=before;}
});
