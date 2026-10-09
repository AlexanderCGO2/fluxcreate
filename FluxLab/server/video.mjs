import {createHmac,timingSafeEqual,createHash} from 'node:crypto';
import {MAX_VIDEO_BYTES,fetchPublicVideo,publicVideoURL,videoSignature} from './video-media.mjs';

const ENDPOINT='https://ai-gateway.vercel.sh/v4/ai/video-model',MODEL=/^[a-z0-9][a-z0-9._-]{0,79}\/[a-z0-9][a-z0-9._:-]{0,160}$/i,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,TTL=7*86400000;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
// Wire format matches Vercel's GatewayVideoModel v4 doStart/doStatus implementation:
// https://github.com/vercel/ai/blob/main/packages/gateway/src/gateway-video-model.ts
export function videoModelOptions(model){
 const raw=model.video_capabilities;if(model.type!=='video'||!Array.isArray(raw?.supported_operations)||!raw.supported_operations.includes('text-to-video'))return null;
 const durations=[...new Set((Array.isArray(raw.supported_durations_seconds)?raw.supported_durations_seconds:[]).filter(n=>Number.isFinite(n)&&n>=1&&n<=60))].slice(0,60).sort((a,b)=>a-b),aspectRatios=[...new Set((Array.isArray(raw.supported_aspect_ratios)?raw.supported_aspect_ratios:[]).filter(s=>typeof s==='string'&&/^\d{1,2}:\d{1,2}$/.test(s)&&s.split(':').every(n=>Number(n)>0)))].slice(0,30),limit=raw.input_limits?.text?.max_chars;
 return {durations,aspectRatios,maxPromptChars:Number.isInteger(limit)&&limit>0?Math.min(limit,12000):12000};
}
export function createVideoService({fetchImpl,credential,snapshotConnection,models,controlled,boundedJSON,providerFailure,fail,now,fetchMedia=fetchPublicVideo}){
 const requests=new Map();
 function validate(body){
  if(!plain(body)||Object.keys(body).some(k=>!['kind','model','prompt','requestId','duration','aspectRatio'].includes(k)))fail('Include only the video model, prompt, request ID, duration and aspect ratio.');
  if(body.kind!=='video'||typeof body.model!=='string'||!MODEL.test(body.model))fail('Choose a text-to-video model from the live catalog.');
  if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>12000)fail('Describe your video in 1–12,000 characters.');
  if(typeof body.requestId!=='string'||!UUID.test(body.requestId))fail('A unique request ID is required to prevent duplicate video generations.');
  if(body.duration!==undefined&&(!Number.isFinite(body.duration)||body.duration<1||body.duration>60))fail('Choose a video duration between 1 and 60 seconds.');
  if(body.aspectRatio!==undefined&&(typeof body.aspectRatio!=='string'||!/^\d{1,2}:\d{1,2}$/.test(body.aspectRatio)||!body.aspectRatio.split(':').every(n=>Number(n)>0)))fail('Choose a supported video aspect ratio.');
  return {kind:'video',model:body.model,prompt:body.prompt.trim(),requestId:body.requestId.toLowerCase(),...(body.duration===undefined?{}:{duration:body.duration}),...(body.aspectRatio===undefined?{}:{aspectRatio:body.aspectRatio})};
 }
 async function keyFor(connection){let key;try{key=await credential(connection);}catch{fail('The existing Flux connection is unavailable. Check its settings in Fluxini.',503);}if(!key)fail('Connect Fluxini to AI Gateway before generating.',503);return key;}
 const signature=(key,value)=>createHmac('sha256',createHmac('sha256',key).update('fluxlab-video-ticket-v1').digest()).update(value).digest();
 function sign(key,value){const body=Buffer.from(JSON.stringify(value)).toString('base64url');return body+'.'+signature(key,body).toString('base64url');}
 function verify(key,ticket,kind){
  if(typeof ticket!=='string'||ticket.length>70000||!/^[-_a-z0-9]+\.[-_a-z0-9]{43}$/i.test(ticket))fail('This video ticket is invalid.',400);
  const [encoded,mac]=ticket.split('.'),expected=signature(key,encoded),actual=Buffer.from(mac,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))fail('This video ticket is invalid or belongs to another connection.',403);
  let data;try{data=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));}catch{fail('This video ticket is invalid.');}
  if(data.v!==1||data.kind!==kind||!Number.isFinite(data.expires)||data.expires<now())fail('This video ticket has expired. Download finished videos within seven days.',410);
  if(!MODEL.test(data.model)||typeof data.job!=='string'||!/^job_[a-z0-9_-]{1,180}$/i.test(data.job)||!UUID.test(data.requestId))fail('This video ticket is invalid.');return data;
 }
 function ticketBody(body){if(!plain(body)||Object.keys(body).some(k=>k!=='ticket'))fail('Include only the video ticket.');return body.ticket;}
 const safeWarnings=raw=>Array.isArray(raw)&&raw.length?['The provider adjusted or ignored one or more optional video settings.']:[];
 async function call(route,body,key,model,signal,requestId){
  const response=await fetchImpl(`${ENDPOINT}/${route}`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`,'ai-gateway-protocol-version':'0.0.1','ai-gateway-auth-method':'api-key','ai-video-model-specification-version':'4','ai-model-id':model,...(requestId?{'idempotency-key':`fluxlab-video-${requestId}`}:{})},body:JSON.stringify(body),signal,redirect:'error'});
  if(!response.ok){await response.body?.cancel();if(response.status===404||response.status===410)fail('This video job or its retained media is no longer available.',410);if(response.status===409)fail('This request ID was already used with different video settings. Start a new request.',409);providerFailure(response.status);}
  return boundedJSON(response,route==='start'?1024*1024:Math.ceil(MAX_VIDEO_BYTES*4/3)+1024*1024);
 }
 function firstVideo(raw){
  if(!Array.isArray(raw.videos)||!raw.videos.length)fail('The provider completed the job without a video.',502);const video=raw.videos[0];if(!plain(video)||!['video/mp4','video/webm'].includes(video.mediaType))fail('The provider returned an unsupported video format.',502);
  if(video.type==='url'){try{publicVideoURL(video.url);}catch{fail('The provider returned an unsupported video address.',502);}return {mimeType:video.mediaType,url:video.url};}
  if(video.type==='base64'&&typeof video.data==='string'&&video.data.length>0&&video.data.length<=Math.ceil(MAX_VIDEO_BYTES/3)*4&&video.data.length%4===0&&/^[a-z0-9+/]*={0,2}$/i.test(video.data)){
   const bytes=Buffer.from(video.data,'base64');if(bytes.length>MAX_VIDEO_BYTES)fail('The video exceeds the 64 MiB download limit.',502);if(!videoSignature(bytes,video.mediaType))fail('The provider returned invalid video content.',502);return {mimeType:video.mediaType,bytes};
  }fail('The provider video is missing, invalid or larger than 64 MiB.',502);
 }
 return {
  async startVideo(body,{signal,connection}={}){connection=snapshotConnection(connection);const request=validate(body);return controlled(async signal=>{
   const key=await keyFor(connection),catalog=await models({signal}),model=catalog.models.find(m=>m.id===request.model);if(!model?.capabilities.includes('video')||!model.video)fail('Choose a catalog model that supports text-to-video.');
   if(request.prompt.length>model.video.maxPromptChars)fail(`This model accepts video prompts up to ${model.video.maxPromptChars.toLocaleString('en-US')} characters.`);
   if(request.duration!==undefined&&model.video.durations.length&&!model.video.durations.includes(request.duration))fail('Choose a duration supported by this video model.');
   if(request.aspectRatio!==undefined&&model.video.aspectRatios.length&&!model.video.aspectRatios.includes(request.aspectRatio))fail('Choose an aspect ratio supported by this video model.');
   const hash=createHash('sha256').update(JSON.stringify(request)).digest('hex'),requestKey=createHash('sha256').update(key).digest('hex')+request.requestId,known=requests.get(requestKey);if(known&&known.hash!==hash)fail('This request ID was already used with different video settings. Start a new request.',409);if(known?.result)return known.result;
   requests.set(requestKey,{hash});if(requests.size>256)requests.delete(requests.keys().next().value);
   const raw=await call('start',{prompt:request.prompt,n:1,...(request.duration===undefined?{}:{duration:request.duration}),...(request.aspectRatio===undefined?{}:{aspectRatio:request.aspectRatio})},key,request.model,signal,request.requestId),job=raw.operation?.gatewayJobId;
   if(typeof job!=='string'||!/^job_[a-z0-9_-]{1,180}$/i.test(job))fail('AI Gateway returned an unreadable video job. Retry with the same request ID.',502);
   const createdAt=new Date(now()).toISOString(),ticket=sign(key,{v:1,kind:'job',job,model:request.model,prompt:request.prompt,requestId:request.requestId,createdAt,expires:now()+TTL});
   const result={status:'pending',ticket,requestId:request.requestId,createdAt,warnings:[...(catalog.stale?[catalog.warning]:[]),...safeWarnings(raw.warnings)]};requests.set(requestKey,{hash,result});return result;
  },{signal,timeout:45000});},
  async videoStatus(body,{signal,connection}={}){connection=snapshotConnection(connection);const ticket=ticketBody(body);return controlled(async signal=>{
   const key=await keyFor(connection),job=verify(key,ticket,'job'),raw=await call('status',{operation:{gatewayJobId:job.job}},key,job.model,signal);
   if(raw.status==='pending')return {status:'pending',ticket,warnings:safeWarnings(raw.warnings)};
   if(raw.status==='error'||raw.status==='cancelled')return {status:'error',error:raw.status==='cancelled'?'The provider cancelled this video job.':'The provider could not finish this video. Try another prompt or model.'};
   if(raw.status!=='completed')fail('The provider returned an unreadable video status.',502);const video=firstVideo(raw),warnings=safeWarnings(raw.warnings);
   if(raw.videos.length>1)warnings.push('Only the first returned video is included.');warnings.push('Download this video to keep it. Provider media links can expire.');
   const contentTicket=sign(key,{v:1,kind:'content',job:job.job,model:job.model,requestId:job.requestId,expires:job.expires});
   return {status:'completed',result:{id:job.requestId,kind:'video',model:job.model,prompt:job.prompt,createdAt:job.createdAt,text:'',images:[],videos:[{id:job.requestId+'-video',mimeType:video.mimeType,...(video.url?{url:video.url}:{}),contentTicket}],warnings}};
  },{signal,timeout:60000});},
  async videoContent(body,{signal:requestSignal,connection}={}){connection=snapshotConnection(connection);const ticket=ticketBody(body);return controlled(async signal=>{
   const key=await keyFor(connection),job=verify(key,ticket,'content'),raw=await call('status',{operation:{gatewayJobId:job.job}},key,job.model,signal);if(raw.status!=='completed')fail('This video is not ready or is no longer available.',409);const video=firstVideo(raw);
   if(video.bytes)return {body:video.bytes,mimeType:video.mimeType,length:video.bytes.length};
   try{return await fetchMedia(video.url,{signal:requestSignal?AbortSignal.any([signal,requestSignal]):signal,mimeType:video.mimeType,maxBytes:MAX_VIDEO_BYTES});}catch(error){if(signal.aborted)throw error;fail('The video could not be downloaded, has expired, or exceeds 64 MiB. Try checking the job again.',502);}
  },{signal:requestSignal,timeout:60000});}
 };
}
