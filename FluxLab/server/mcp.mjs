import {McpServer} from '@modelcontextprotocol/server';
import {registerAppTool,registerAppResource,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {z} from 'zod';
import {readFile} from 'node:fs/promises';
import {createLabService,LabError} from './service.mjs';
export const RESOURCE_URI='ui://fluxlab/studio.html';
export function videoStudioURL(ticket){
 let url;try{url=new URL(process.env.FLUXLAB_PUBLIC_URL||'http://localhost:4326/');}catch{throw new LabError('The FluxLab studio address is invalid.',503);}
 if(url.username||url.password||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new LabError('Use HTTPS or a local FluxLab studio address.',503);
 url.search='';url.hash=new URLSearchParams({video:ticket}).toString();return url.href;
}
function videoToolResult(data,ticket){
 const studioUrl=videoStudioURL(ticket),description=data.status==='completed'?'Your video is ready. Open FluxLab to preview, download, save it to your library, or send it to a motion editor.':data.status==='error'?'The video generation failed.': 'Video generation is running in the background. Check this job again or open it in FluxLab. Closing this view does not cancel provider work.';
 const content=[{type:'text',text:description},{type:'resource_link',uri:studioUrl,name:'Open video in FluxLab',mimeType:'text/html'}];
 return {content,structuredContent:{...data,ticket,studioUrl}};
}
export function createMcpServer({service=createLabService(),uiHtml}={}){
 const server=new McpServer({name:'FluxLab',version:'0.1.0'});
 const run=operation=>async(...args)=>{try{return await operation(...args);}catch(error){return {isError:true,content:[{type:'text',text:error instanceof LabError?error.message:'FluxLab could not complete this request.'}]};}};
 registerAppTool(server,'fluxlab_catalog',{title:'Explore FluxLab models',description:'Open FluxLab and list the live AI Gateway text, image, speech and text-to-video models. This read-only catalog call does not generate content or incur generation charges.',inputSchema:z.object({}).strict(),annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true},_meta:{ui:{resourceUri:RESOURCE_URI}}},run(async()=>{const [catalog,status]=await Promise.all([service.models(),service.status()]);return {content:[{type:'text',text:`FluxLab offers ${catalog.models.length} text, image, audio and video models. ${status.available?'Your Flux connection is configured.':status.reason}`}],structuredContent:{...catalog,status}};}));
 registerAppTool(server,'fluxlab_generate',{title:'Generate with FluxLab',description:'Generate text or one image using the explicitly selected AI Gateway model and prompt. This uses the configured Flux account and may incur provider charges. Invoke only for a user-requested generation.',inputSchema:z.object({kind:z.enum(['text','image']),model:z.string().max(250),prompt:z.string().min(1).max(12000),maxOutputTokens:z.number().int().min(128).max(4096).optional(),size:z.enum(['auto','1024x1024','1536x1024','1024x1536']).optional()}).strict(),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true},_meta:{ui:{resourceUri:RESOURCE_URI}}},run(async(args,extra)=>{
  const result=await service.generate(args,{signal:extra?.signal}),content=[{type:'text',text:result.text||`Generated an image with ${result.model}.`}];for(const image of result.images)content.push({type:'image',mimeType:image.mimeType,data:image.src.slice(image.src.indexOf(',')+1)});
  // Image bytes appear once in MCP content. Structured metadata stays small and nonduplicative.
  return {content,structuredContent:{...result,images:result.images.map(({src,...metadata})=>metadata)}};
 }));
 registerAppTool(server,'fluxlab_video_start',{title:'Create a video with FluxLab',description:'Start a paid background text-to-video generation using the configured Flux AI Gateway account. Invoke only for a user-requested generation. Supply a UUID requestId and reuse it unchanged when retrying this exact request to prevent duplicate charges. Keep the returned ticket to retrieve the result. Omit duration/aspectRatio for model defaults.',inputSchema:z.object({kind:z.literal('video').default('video'),model:z.string().max(250),prompt:z.string().min(1).max(12000),duration:z.number().positive().max(120).optional(),aspectRatio:z.string().max(20).optional(),requestId:z.string().uuid()}).strict(),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true},_meta:{ui:{resourceUri:RESOURCE_URI}}},run(async(args,extra)=>{
  // Validate the studio address before a paid submission.
  videoStudioURL('');const data=await service.startVideo(args,{signal:extra?.signal});return videoToolResult(data,data.ticket);
 }));
 registerAppTool(server,'fluxlab_video_status',{title:'Check a FluxLab video',description:'Retrieve a previously started video using its signed FluxLab ticket. This does not start another generation. Completed clips can be opened in the FluxLab studio for playback, persistent library storage, download and motion-editor handoff.',inputSchema:z.object({ticket:z.string().min(1).max(70000)}).strict(),annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true},_meta:{ui:{resourceUri:RESOURCE_URI}}},run(async(args,extra)=>videoToolResult(await service.videoStatus(args,{signal:extra?.signal}),args.ticket)));
 registerAppTool(server,'fluxlab_audio_generate',{title:'Create speech with FluxLab',description:'Generate spoken audio from a user-provided script using a live speech model and the configured Flux AI Gateway account. This may incur provider charges. Invoke only for a user-requested generation; do not retry automatically after an uncertain result. This produces speech, not music or sound effects.',inputSchema:z.object({kind:z.literal('audio').default('audio'),model:z.string().max(250),prompt:z.string().min(1).max(1500),voice:z.string().max(100).optional(),outputFormat:z.enum(['mp3','wav']).optional()}).strict(),annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true},_meta:{ui:{resourceUri:RESOURCE_URI}}},run(async(args,extra)=>{
  const result=await service.generateAudio(args,{signal:extra?.signal});return {content:[{type:'text',text:`Generated speech with ${result.model}.`},...result.audios.map(audio=>({type:'audio',mimeType:audio.mimeType,data:audio.src.slice(audio.src.indexOf(',')+1)}))],structuredContent:{...result,audios:result.audios.map(({src,...metadata})=>metadata)}};
 }));
 registerAppResource(server,'FluxLab Studio',RESOURCE_URI,{description:'Interactive FluxLab text, image, video and speech generation studio.'},async()=>({contents:[{uri:RESOURCE_URI,mimeType:RESOURCE_MIME_TYPE,text:uiHtml??await readFile(new URL('../dist/mcp-app.html',import.meta.url),'utf8'),_meta:{ui:{csp:{connectDomains:[],resourceDomains:[]},prefersBorder:true}}}]}));
 return server;
}
