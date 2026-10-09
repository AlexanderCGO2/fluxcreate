import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/client';
import {InMemoryTransport} from '@modelcontextprotocol/server';
import {createMcpServer} from '../server/mcp.mjs';

test('speech tool returns standard MCP audio without duplicating media in metadata',async()=>{
 let calls=0;const service={generateAudio:async args=>{calls++;assert.equal(args.voice,'Kore');assert.equal(args.outputFormat,'wav');return{id:'voice',kind:'audio',model:args.model,prompt:args.prompt,text:'',images:[],audios:[{id:'sound',mimeType:'audio/wav',src:'data:audio/wav;base64,UklGRg=='}],warnings:[]};}};
 const server=createMcpServer({service,uiHtml:'<title>FluxLab</title>'}),client=new Client({name:'Speech test',version:'1.0.0'}),[ct,st]=InMemoryTransport.createLinkedPair();await server.connect(st);await client.connect(ct);
 try{const args={kind:'audio',model:'test/tts',prompt:'Welcome to FluxCreate.',voice:'Kore',outputFormat:'wav'},result=await client.callTool({name:'fluxlab_audio_generate',arguments:args});assert.equal(result.content[1].type,'audio');assert.equal(result.content[1].mimeType,'audio/wav');assert.equal(result.content[1].data,'UklGRg==');assert.equal(result.structuredContent.audios[0].src,undefined);assert.equal(calls,1);const bad=await client.callTool({name:'fluxlab_audio_generate',arguments:{...args,outputFormat:'pcm'}});assert.equal(bad.isError,true);assert.equal(calls,1);}finally{await client.close();await server.close();}
});
