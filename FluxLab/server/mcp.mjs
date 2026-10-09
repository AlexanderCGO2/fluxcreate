import {McpServer} from '@modelcontextprotocol/server';
import {registerAppTool,registerAppResource,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import {createLabService,LabError} from './service.mjs';
export const RESOURCE_URI='ui://fluxlab/studio.html';
export function createMcpServer({service=createLabService(),uiHtml}={}){
 const server=new McpServer({name:'FluxLab',version:'0.1.0'});
 const run=operation=>async(...args)=>{try{return await operation(...args);}catch(error){return {isError:true,content:[{type:'text',text:error instanceof LabError?error.message:'FluxLab could not complete this request.'}]};}};
 registerAppTool(server,'fluxlab_catalog',{title:'Explore FluxLab models',description:'Open FluxLab and list the live AI Gateway text/image models. This read-only catalog call does not generate content or incur generation charges.',inputSchema:z.object({}).strict(),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true},_meta:{ui:{resourceUri:RESOURCE_URI}}},run(async()=>{const [catalog,status]=await Promise.all([service.models(),service.status()]);return {content:[{type:'text',text:`FluxLab offers ${catalog.models.length} text/image models. ${status.available?'Your Flux connection is configured.':status.reason}`}],structuredContent:{...catalog,status}};}));
 registerAppTool(server,'fluxlab_generate',{title:'Generate with FluxLab',description:'Generate text or one image using the explicitly selected AI Gateway model and prompt. This uses the configured Flux account and may incur provider charges. Invoke only for a user-requested generation.',inputSchema:z.object({kind:z.enum(['text','image']),model:z.string().max(250),prompt:z.string().min(1).max(12000),maxOutputTokens:z.number().int().min(128).max(4096).optional(),size:z.enum(['auto','1024x1024','1536x1024','1024x1536']).optional()}).strict(),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true},_meta:{ui:{resourceUri:RESOURCE_URI}}},run(async(args,extra)=>{
  const result=await service.generate(args,{signal:extra?.signal}),content=[{type:'text',text:result.text||`Generated an image with ${result.model}.`}];for(const image of result.images)content.push({type:'image',mimeType:image.mimeType,data:image.src.slice(image.src.indexOf(',')+1)});
  // Image bytes appear once in MCP content. Structured metadata stays small and nonduplicative.
  return {content,structuredContent:{...result,images:result.images.map(({src,...metadata})=>metadata)}};
 }));
 registerAppResource(server,'FluxLab Studio',RESOURCE_URI,{description:'Interactive FluxLab text and image generation studio.'},async()=>({contents:[{uri:RESOURCE_URI,mimeType:RESOURCE_MIME_TYPE,text:uiHtml??await readFile(new URL('../dist/mcp-app.html',import.meta.url),'utf8'),_meta:{ui:{csp:{connectDomains:[],resourceDomains:[]},prefersBorder:true}}}]}));
 return server;
}
