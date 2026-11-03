import {randomUUID,createHash} from 'node:crypto';
import {loadConnection} from '../../Haidini/server/connection.mjs';
import {fileURLToPath} from 'node:url';
import {imageEditCapability} from './pixel-capabilities.mjs';
import {imageHeader} from './image-header.mjs';
import {createVideoService,videoModelOptions} from './video.mjs';
import {createAudioService,audioModelOptions} from './audio.mjs';
import {createMusicService} from './music.mjs';
import {snapshotCloudflare,cloudflareFor} from '../../FluxCreate/server/cloudflare-connection.mjs';
import {fetchRoutedText} from '../../FluxCreate/server/ai-routing.mjs';
const GATEWAY='https://ai-gateway.vercel.sh/v1',MODEL_ID=/^[a-z0-9][a-z0-9._-]{0,79}\/[a-z0-9][a-z0-9._:-]{0,160}$/i;
export const LAB_LIMITS={prompt:12000,outputTokens:4096,imageBase64:3500000,responseBytes:4*1024*1024,upstreamBytes:8*1024*1024};
export class LabError extends Error{constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status)=>{throw new LabError(message,status);};
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
async function existingCredential(){await loadConnection(process.env.FLUXINI_DATA_DIR||fileURLToPath(new URL('../../Haidini/.data',import.meta.url)));return process.env.AI_GATEWAY_API_KEY||'';}
function cleanString(value,max=1000){return typeof value==='string'?value.slice(0,max):'';}
export function validateGeneration(body){
 if(!plain(body)||Object.keys(body).some(k=>!['kind','model','prompt','maxOutputTokens','size'].includes(k)))fail('Include only the generation type, model, prompt and supported settings.');
 const {kind,model,prompt,maxOutputTokens=2048,size='auto'}=body;
 if(!['text','image'].includes(kind))fail('Choose text or image generation.');
 if(typeof model!=='string'||!MODEL_ID.test(model))fail('Choose a model from the current catalog.');
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>LAB_LIMITS.prompt)fail('Describe your idea in 1–12,000 characters.');
 if(!Number.isInteger(maxOutputTokens)||maxOutputTokens<128||maxOutputTokens>4096)fail('Text output must be limited to 128–4,096 tokens.');
 if(!['auto','1024x1024','1536x1024','1024x1536'].includes(size))fail('Choose a supported image size.');
 return {kind,model,prompt:prompt.trim(),maxOutputTokens,size};
}
async function boundedJSON(response,maxBytes){
 if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();fail('The provider response is too large. Request a smaller result.',502);}
 const reader=response.body?.getReader();if(!reader)fail('The provider returned an empty response.',502);let length=0;const parts=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>maxBytes){await reader.cancel();fail('The provider response is too large. Request a smaller result.',502);}parts.push(value);}}finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(parts,length).toString('utf8'));}catch{fail('The provider returned an unreadable response. Try again.',502);}
}
function providerFailure(status){if(status===401||status===403)fail('AI Gateway did not accept the configured connection. Check its access in FluxEffects.',503);if(status===402)fail('AI Gateway needs available credits. Check its billing before generating again.',502);if(status===429)fail('This model is busy or rate limited. Wait a moment or choose another model.',429);if(status===400||status===422)fail('This model rejected the prompt or settings. Check the selected settings or choose another model.',502);fail('The AI provider could not complete this request. Try again or choose another model.',502);}
function imageResult(encoded,mimeType){
 if(typeof encoded!=='string'||!encoded||encoded.length>LAB_LIMITS.imageBase64||encoded.length%4||!/^[a-z0-9+/]*={0,2}$/i.test(encoded))fail('The generated image is missing, invalid or too large. Request a smaller image.',502);
 let header;try{header=imageHeader(Buffer.from(encoded,'base64'));}catch(error){fail(error.message,502);}
 return {id:randomUUID(),...header,src:`data:${header.mimeType};base64,${encoded}`};
}
function usageOf(raw){const usage={};for(const [out,key]of [['inputTokens','prompt_tokens'],['outputTokens','completion_tokens'],['totalTokens','total_tokens']]){const value=raw?.[key]??raw?.[{prompt_tokens:'input_tokens',completion_tokens:'output_tokens'}[key]];if(typeof value==='number'&&Number.isFinite(value)&&value>=0)usage[out]=value;}return usage;}
function normalizeModels(body){
 if(!Array.isArray(body?.data)||body.data.length>2000)fail('The live model catalog is unavailable.',502);
 const models=[];for(const model of body.data){if(!plain(model)||!MODEL_ID.test(model.id)||!['language','image','video','speech'].includes(model.type))continue;const outputs=Array.isArray(model.modalities?.output)?model.modalities.output:[],capabilities=[],video=videoModelOptions(model),audio=audioModelOptions(model);if(model.type==='language'&&outputs.includes('text'))capabilities.push('text');if(model.type==='image'||outputs.includes('image'))capabilities.push('image');if(video)capabilities.push('video');if(audio)capabilities.push('audio');if(!capabilities.length)continue;const pricing={};for(const key of ['input','output']){const v=model.pricing?.[key];if((typeof v==='string'||typeof v==='number')&&Number.isFinite(Number(v))&&Number(v)>=0)pricing[key]=String(v);}
  models.push({...(imageEditCapability(model)?{imageEdit:imageEditCapability(model)}:{}),id:model.id,name:cleanString(model.name,160)||model.id,provider:cleanString(model.owned_by,100)||model.id.split('/')[0],type:model.type,capabilities,description:cleanString(model.description,1200),contextWindow:Number.isFinite(model.context_window)?model.context_window:0,maxTokens:Number.isFinite(model.max_tokens)?model.max_tokens:0,pricing,...(video?{video}:{}),...(audio?{audio}:{})});
 }
 if(!models.length)fail('No supported models were found in the live catalog.',502);return models;
}
const snapshotConnection=value=>value===undefined?undefined:Object.freeze({apiKey:typeof value?.apiKey==='string'&&value.apiKey.length<=4096&&!/\s/.test(value.apiKey)?value.apiKey:'',model:typeof value?.model==='string'&&value.model.length<=200&&value.model?value.model:'anthropic/claude-sonnet-5',scopeId:typeof value?.scopeId==='string'?value.scopeId.slice(0,200):'',available:value?.available!==false,mode:value?.mode,cloudflare:snapshotCloudflare(value?.cloudflare)});
const connectionScope=value=>value===undefined?'suite':createHash('sha256').update(value.apiKey+'\0'+value.scopeId).digest('hex');
export function createLabService({fetchImpl=globalThis.fetch,credential=existingCredential,timeoutMs=120000,catalogTimeoutMs=10000,now=()=>Date.now(),fetchMedia,fetchMusic}={}){
 let cache=null;const inFlight=new Set();
 const resolveCredential=async connection=>{if(connection!==undefined){if(!connection.apiKey||!connection.available)fail('Connect your AI Gateway account in Settings before generating.',503);return connection.apiKey;}return credential();};
 async function controlled(operation,{signal,timeout=timeoutMs}={}){
  if(signal?.aborted)fail('Generation cancelled.',499);const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,timeout);signal?.addEventListener('abort',abort,{once:true});let rejectAbort;
  const cancelled=new Promise((_,reject)=>{rejectAbort=()=>reject(new LabError(signal?.aborted?'Generation cancelled.':'The request timed out. Try a shorter prompt or another model.',signal?.aborted?499:504));controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  try{return await Promise.race([operation(controller.signal),cancelled]);}catch(error){if(error instanceof LabError)throw error;if(controller.signal.aborted)fail(signal?.aborted?'Generation cancelled.':'The request timed out.',signal?.aborted?499:504);fail('The AI service is unavailable. Check the connection and try again.',502);}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);}
 }
 async function models({signal,refresh=false}={}){if(cache&&!refresh&&now()-cache.time<300000)return {models:cache.models,fetchedAt:cache.fetchedAt,stale:false};
  try{return await controlled(async signal=>{const response=await fetchImpl(`${GATEWAY}/models`,{signal,redirect:'error'});if(!response.ok){await response.body?.cancel();providerFailure(response.status);}const models=normalizeModels(await boundedJSON(response,LAB_LIMITS.upstreamBytes));cache={models,time:now(),fetchedAt:new Date(now()).toISOString()};return {models,fetchedAt:cache.fetchedAt,stale:false};},{signal,timeout:catalogTimeoutMs});}catch(error){if(cache&&now()-cache.time<86400000&&error.status!==499)return {models:cache.models,fetchedAt:cache.fetchedAt,stale:true,warning:'Using the last available catalog. Model availability and pricing may have changed.'};throw error;}
 }
 return {models,...createVideoService({fetchImpl,credential:resolveCredential,snapshotConnection,models,controlled,boundedJSON,providerFailure,fail,now,fetchMedia}),...createAudioService({fetchImpl,credential:resolveCredential,snapshotConnection,connectionScope,models,controlled,boundedJSON,providerFailure,fail,now}),...createMusicService({fetchImpl,fetchMusic,controlled,boundedJSON,ErrorClass:LabError,now}),async status(connection){connection=snapshotConnection(connection);const busy=inFlight.has(connectionScope(connection));try{const key=await resolveCredential(connection);return {available:!!key,provider:'Flux / AI Gateway',busy,...(!key?{reason:'Connect FluxEffects to AI Gateway to enable FluxLab.'}:{})};}catch{return {available:false,provider:'Flux / AI Gateway',busy,reason:'The existing Flux connection is unavailable. Check its settings in FluxEffects.'};}},
 async editImage(body,options={}){
  if(!plain(body)||Object.keys(body).some(k=>!['model','prompt','referenceImage'].includes(k)))fail('Include a model, prompt and one source image.');
  const src=body.referenceImage;if(typeof src!=='string'||src.length>LAB_LIMITS.imageBase64+40||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(src))fail('Choose one PNG, JPEG or WebP source image.');
  let reference;try{reference=imageResult(src.slice(src.indexOf(',')+1));}catch{fail('The reference image is invalid, too large or has unsupported dimensions.');}
  return this.generate({kind:'image',model:body.model,prompt:body.prompt},{...options,referenceImage:reference.src});
 },
 async generate(body,{signal,connection,referenceImage}={}){
  connection=snapshotConnection(connection);const scope=connectionScope(connection),routingConnection=Object.freeze({cloudflare:cloudflareFor(connection)});
  const request=validateGeneration(body);if(inFlight.has(scope))fail('Another generation is running. Cancel it or wait for it to finish.',409);if(inFlight.size>=64)fail('The AI service is busy. Try again shortly.',429);inFlight.add(scope);
  try{return await controlled(async abortSignal=>{
   let key;try{key=await resolveCredential(connection);}catch{fail('The existing Flux connection is unavailable. Check its settings in FluxEffects.',503);}if(!key)fail('Connect FluxEffects to AI Gateway before generating.',503);
   const catalog=await models({signal:abortSignal}),model=catalog.models.find(m=>m.id===request.model);if(!model||!model.capabilities.includes(request.kind))fail('Choose a catalog model that supports this generation type.');
   let endpoint,payload;if(referenceImage){if(request.kind!=='image'||!model.imageEdit?.supported)fail('This model has no verified reference-image integration in the current catalog.');endpoint='images/edits';payload={model:request.model,prompt:request.prompt,images:[{image_url:referenceImage}],n:1,response_format:'b64_json'};}
   else if(request.kind==='image'&&model.type==='image'){endpoint='images/generations';payload={model:request.model,prompt:request.prompt,n:1,response_format:'b64_json',...(request.size==='auto'?{}:{size:request.size})};}
   else{endpoint='chat/completions';payload={model:request.model,messages:[{role:'user',content:request.prompt}],stream:false,max_tokens:request.maxOutputTokens,...(request.kind==='image'?{modalities:['text','image']}:{} )};if(request.kind==='image'&&request.size!=='auto')fail('This multimodal model selects image dimensions automatically. Choose Automatic size.');}
   const primary=async()=>{const response=await fetchImpl(`${GATEWAY}/${endpoint}`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:abortSignal,redirect:'error'});if(!response.ok){await response.body?.cancel();try{providerFailure(response.status);}catch(error){if(response.status===429)Object.assign(error,{statusCode:429,outcome:'rejected',partialOutput:false});throw error;}}return boundedJSON(response,LAB_LIMITS.upstreamBytes);};
   const routed=request.kind==='text'?await fetchRoutedText(payload,{primary,connection:routingConnection,signal:abortSignal,fetchImpl}):null;
   const raw=routed?routed.value:await primary(),message=raw.choices?.[0]?.message,text=typeof message?.content==='string'?message.content:Array.isArray(message?.content)?message.content.filter(p=>p.type==='text').map(p=>p.text).join('\n'):'';
   if(text.length>200000)fail('The generated text is too large. Request a shorter result.',502);
   const warnings=catalog.stale?[catalog.warning]:[],images=[];if(request.kind==='image'){
    if(endpoint==='images/generations'||endpoint==='images/edits'){if(!Array.isArray(raw.data)||!raw.data.length)fail('The provider returned no image. Refine your prompt or choose another model.',502);if(raw.data.length>1)warnings.push('Only the first returned image is included.');images.push(imageResult(raw.data[0].b64_json));}
    else{const image=message?.images?.[0]?.image_url?.url;if(typeof image!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(image))fail('The model returned no embedded image. Refine your prompt or choose an image model.',502);images.push(imageResult(image.slice(image.indexOf(',')+1)));if(message.images.length>1)warnings.push('Only the first returned image is included.');}
   }else if(!text.trim())fail('The model returned no text. Try a clearer prompt or another model.',502);
   if(raw.choices?.[0]?.finish_reason==='length')warnings.push('The response reached its token limit. Increase the limit or continue with a new prompt.');
   if(referenceImage)warnings.push('Generated from your selected image. Insert as a new copy to preserve the original. No mask or AI upscaling was applied.');
   const result={id:randomUUID(),kind:request.kind,...(referenceImage?{operation:'image-edit'}:{}),model:routed?.model||request.model,...(routed?{routing:routed.routing}:{}),prompt:request.prompt,createdAt:new Date(now()).toISOString(),text,images,usage:usageOf(raw.usage),warnings};
   if(Buffer.byteLength(JSON.stringify(result))>LAB_LIMITS.responseBytes)fail('The result is too large to transfer. Request a smaller image or shorter text.',502);if(abortSignal.aborted)fail('Generation cancelled.',499);return result;
  },{signal});}finally{inFlight.delete(scope);}
 }};
}
