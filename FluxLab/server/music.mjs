import {randomUUID,createHash} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import https from 'node:https';
import {audioHeader} from './audio.mjs';
import {publicVideoURL,publicAddress} from './video-media.mjs';
import {cloudflareFor} from '../../FluxCreate/server/cloudflare-connection.mjs';

export const MUSIC_MODEL='elevenlabs/music-v2';
// Leave space for base64 expansion and metadata inside the hosted 4 MiB JSON ceiling.
export const MUSIC_MAX_BYTES=3*1024*1024-8192;
const TTL=24*60*60*1000,MAX_RECORDS=512,MAX_CACHE_BYTES=32*1024*1024;
const capability=()=>({id:MUSIC_MODEL,name:'ElevenLabs Music v2',provider:'elevenlabs',gateway:'cloudflare',type:'music',capabilities:['music'],music:{minDuration:3,maxDuration:60,maxPromptChars:2000,outputFormats:['mp3'],pricePerSecond:0.0025}});

/** Validate and pin every DNS hop. Never forward account credentials to returned media URLs. */
export async function fetchPublicMusic(value,{signal,maxBytes=MUSIC_MAX_BYTES,redirects=3,lookupImpl=lookup,requestImpl=https.get}={}){
 const url=publicVideoURL(value);signal?.throwIfAborted();
 const addresses=await lookupImpl(url.hostname,{all:true,verbatim:true});signal?.throwIfAborted();
 if(!addresses.length||addresses.some(item=>!publicAddress(item.address)))throw Error('The music address is not publicly accessible.');
 const pinned=addresses[0],requestSignal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(60000)]);
 return new Promise((resolve,reject)=>{
  const req=requestImpl(url,{signal:requestSignal,headers:{accept:'audio/mpeg'},lookup:(_host,options,callback)=>options.all?callback(null,[pinned]):callback(null,pinned.address,pinned.family)},response=>{
   if([301,302,303,307,308].includes(response.statusCode)){
    response.resume();if(!redirects||!response.headers.location){reject(Error('The music download redirected too many times.'));return;}
    let next;try{next=new URL(response.headers.location,url).href;}catch{reject(Error('Invalid music redirect.'));return;}
    fetchPublicMusic(next,{signal:requestSignal,maxBytes,redirects:redirects-1,lookupImpl,requestImpl}).then(resolve,reject);return;
   }
   if(response.statusCode!==200||Number(response.headers['content-length'])>maxBytes){response.destroy();reject(Error('The music download is unavailable or too large.'));return;}
   const chunks=[];let length=0;
   response.on('data',chunk=>{length+=chunk.length;if(length>maxBytes){response.destroy();reject(Error('The music download is too large.'));return;}chunks.push(chunk);});
   response.on('error',reject);response.on('aborted',()=>reject(Error('The music download was interrupted.')));
   response.on('end',()=>resolve(Buffer.concat(chunks,length)));
  });req.on('error',reject);
 });
}

export function createMusicService({fetchImpl=globalThis.fetch,fetchMusic=fetchPublicMusic,controlled,boundedJSON,ErrorClass=Error,now=()=>Date.now()}={}){
 // This ledger is intentionally process-local: no durable or cross-instance idempotency claim.
 const ledger=new Map(),inFlight=new Set();let cachedBytes=0;
 const error=(message,status=400,outcome='rejected')=>Object.assign(new ErrorClass(message,status),{status,outcome});
 const clean=()=>{for(const [key,item]of ledger)if(item.state!=='submitting'&&now()-item.time>TTL){cachedBytes-=item.bytes||0;ledger.delete(key);}};
 function validate(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['model','prompt','durationSeconds','instrumental','requestId','expectedConnectionScope'].includes(k)))throw error('Include only the music model, prompt, duration, instrumental setting, connection scope and request ID.');
  if(body.model!==MUSIC_MODEL)throw error('Choose ElevenLabs Music v2.');
  if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>2000)throw error('Describe the music in 1–2,000 characters.');
  if(!Number.isInteger(body.durationSeconds)||body.durationSeconds<3||body.durationSeconds>60)throw error('Choose a music length from 3 to 60 whole seconds.');
  if(typeof body.instrumental!=='boolean')throw error('Choose whether the music must be instrumental.');
  if(body.expectedConnectionScope!==undefined&&(typeof body.expectedConnectionScope!=='string'||!body.expectedConnectionScope||body.expectedConnectionScope.length>200))throw error('Include a valid music connection scope.');
  if(typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))throw error('Include a valid UUID request ID.');
  return {...body,prompt:body.prompt.trim(),requestId:body.requestId.toLowerCase()};
 }
 return {
  musicStatus(connection){const cfg=cloudflareFor(connection),available=!!(cfg?.available&&cfg.allowMusic);return {available,mode:cfg?.mode||'none',scopeId:cfg?.scopeId||'',model:MUSIC_MODEL,gateway:'cloudflare',allowMusic:cfg?.allowMusic===true,models:[capability()],duplicateProtection:'process-local',duplicateProtectionHours:24,...(!available?{reason:'Connect Cloudflare and enable music in Settings.'}:{})};},
  async generateMusic(body,{connection,signal}={}){
   const request=validate(body),cfg=cloudflareFor(connection);
   if(!cfg?.available||!cfg.allowMusic)throw error('Connect Cloudflare and enable music in Settings before generating.',503);
   if(request.expectedConnectionScope!==undefined&&request.expectedConnectionScope!==cfg.scopeId)throw error('The Cloudflare connection changed. Review its settings before generating music.',409);
   if(signal?.aborted)throw error('Music generation cancelled before submission.',499);
   const scope=createHash('sha256').update([cfg.accountId,cfg.gatewayId,cfg.scopeId,cfg.apiToken].join('\0')).digest('hex'),key=scope+':'+request.requestId;
   const fingerprint=createHash('sha256').update(JSON.stringify([request.model,request.prompt,request.durationSeconds,request.instrumental])).digest('hex');
   clean();const previous=ledger.get(key);
   if(previous){if(previous.fingerprint!==fingerprint)throw error('This request ID already belongs to a different music request.',409,previous.state==='rejected'?'rejected':'uncertain');if(previous.result)return structuredClone(previous.result);throw error(previous.state==='rejected'?'This music request was rejected. Start a new request explicitly.':'This music request was already submitted. Its completion is uncertain; it will not be submitted again.',409,previous.state==='rejected'?'rejected':'uncertain');}
   if(inFlight.has(scope))throw error('Another music request is running for this connection.',409);
   if(inFlight.size>=64||ledger.size>=MAX_RECORDS)throw error('The music service is busy. Try again later.',429);
   const entry={fingerprint,state:'submitting',time:now()};ledger.set(key,entry);inFlight.add(scope);let submitted=false;
   try{
    const result=await controlled(async abortSignal=>{
     if(abortSignal.aborted)throw error('Music generation cancelled before submission.',499);
     submitted=true;
     const response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/ai/run`,{method:'POST',redirect:'error',signal:abortSignal,headers:{'content-type':'application/json',authorization:`Bearer ${cfg.apiToken}`,'cf-aig-gateway-id':cfg.gatewayId},body:JSON.stringify({model:MUSIC_MODEL,input:{prompt:request.prompt,music_length_ms:request.durationSeconds*1000,force_instrumental:request.instrumental,output_format:'mp3_44100_128'}})});
     if(!response.ok){await response.body?.cancel();const rejected=[400,401,402,403,404,422,429].includes(response.status);throw error(response.status===402?'Cloudflare needs available credits before generating music.':response.status===401||response.status===403?'Cloudflare did not accept this connection. Check Settings.':response.status===429?'Cloudflare is rate limited. Wait before starting a new music request.':'Cloudflare could not complete the music request.',rejected?response.status:502,rejected?'rejected':'uncertain');}
     const raw=await boundedJSON(response,256*1024);
     if(raw?.state!=='Completed'||typeof raw.result?.audio!=='string')throw error('Cloudflare did not return completed music. The submission may have incurred charges.',502,'uncertain');
     let bytes,header;try{publicVideoURL(raw.result.audio);bytes=await fetchMusic(raw.result.audio,{signal:abortSignal,maxBytes:MUSIC_MAX_BYTES});if(!Buffer.isBuffer(bytes)&&!(bytes instanceof Uint8Array))throw Error('Invalid bytes');bytes=Buffer.from(bytes);if(bytes.length>MUSIC_MAX_BYTES)throw Error('Too large');header=audioHeader(bytes);if(header.mimeType!=='audio/mpeg'||header.duration>65)throw Error('Unsupported music');}catch{throw error('The generated music could not be downloaded or verified. The submission may have incurred charges.',502,'uncertain');}
     if(abortSignal.aborted)throw error('Music generation was interrupted after submission.',499,'uncertain');
     const keySource=raw.gatewayMetadata?.keySource;
     const result={id:randomUUID(),kind:'audio',operation:'music',gateway:'cloudflare',provider:'elevenlabs',model:MUSIC_MODEL,prompt:request.prompt,requestId:request.requestId,requestedDuration:request.durationSeconds,durationSeconds:request.durationSeconds,instrumental:request.instrumental,createdAt:new Date(now()).toISOString(),text:'',images:[],audios:[{id:randomUUID(),...header,src:`data:audio/mpeg;base64,${bytes.toString('base64')}`}],usage:{},billing:{estimatedUsd:request.durationSeconds*0.0025,...(['Unified','BYOK'].includes(keySource)?{keySource}:{})},warnings:[],duplicateProtection:'process-local'};
     if(Buffer.byteLength(JSON.stringify(result))>4*1024*1024)throw error('The music is too large to transfer safely.',502,'uncertain');return result;
    },{signal});
    entry.state='completed';entry.time=now();entry.bytes=Buffer.byteLength(JSON.stringify(result));entry.result=structuredClone(result);cachedBytes+=entry.bytes;
    for(const item of ledger.values()){if(cachedBytes<=MAX_CACHE_BYTES)break;if(item.result&&item!==entry){cachedBytes-=item.bytes;delete item.result;item.bytes=0;}}
    return result;
   }catch(cause){entry.state=cause?.outcome==='rejected'||!submitted?'rejected':'uncertain';entry.time=now();throw error(cause instanceof ErrorClass?cause.message:'The music service could not confirm completion. Do not automatically submit it again.',Number.isInteger(cause?.status)?cause.status:502,entry.state);}
   finally{inFlight.delete(scope);}
  }
 };
}
