import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/client';
import {StdioClientTransport} from '@modelcontextprotocol/client/stdio';
test('external MCP stdio entry initializes without stdout noise or a generation call',async()=>{
 const client=new Client({name:'FluxLab external-client test',version:'1.0.0'}),transport=new StdioClientTransport({command:process.execPath,args:[fileURLToPath(new URL('../server/mcp-stdio.mjs',import.meta.url))],stderr:'pipe'});
 try{await client.connect(transport);assert.deepEqual((await client.listTools()).tools.map(t=>t.name),['fluxlab_catalog','fluxlab_generate','fluxlab_video_start','fluxlab_video_status','fluxlab_audio_generate','fluxlab_music_status','fluxlab_generate_music']);const resources=await client.listResources();assert.equal(resources.resources[0].uri,'ui://fluxlab/studio.html');}finally{await client.close();}
});
