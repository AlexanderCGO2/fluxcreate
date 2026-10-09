import {Client,StreamableHTTPClientTransport} from '@modelcontextprotocol/client';

/** Official MCP client; credentials stay in same-origin HttpOnly cookies. */
export async function connectEditorMcp(endpoint,{signal,fetchImpl=globalThis.fetch,origin=globalThis.location?.origin}={}){
 const url=new URL(endpoint,origin);if(origin&&url.origin!==origin)throw Error('The AI endpoint must use this workspace origin.');
 const transport=new StreamableHTTPClientTransport(url,{requestInit:{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'x-fluxcreate-mcp':'1'}},fetch:async(input,init)=>fetchImpl(input,{...init,signal:signal&&init?.signal?AbortSignal.any([signal,init.signal]):signal||init?.signal})});
 const client=new Client({name:'FluxCreate Editor',version:'1.0.0'},{versionNegotiation:{mode:'auto'}});
 const abort=()=>{void client.close();};signal?.addEventListener('abort',abort,{once:true});
 try{await client.connect(transport);signal?.throwIfAborted();const {tools}=await client.listTools({}, {signal});return {
  tools,
  async call(name,args,{requestId,signal:callSignal=signal}={}){if(!tools.some(tool=>tool.name===name))throw Error('This action is unavailable on the connected FluxLab service.');const result=await client.callTool({name,arguments:args,...(requestId?{_meta:{'fluxcreate/requestId':requestId}}:{})},{signal:callSignal,timeout:125000});callSignal?.throwIfAborted();if(result.isError)throw Error(result.content?.find(c=>c.type==='text')?.text||'FluxLab could not complete this request.');return result;},
  close(){signal?.removeEventListener('abort',abort);return client.close();}
 };}catch(error){signal?.removeEventListener('abort',abort);await client.close().catch(()=>{});throw error;}
}
