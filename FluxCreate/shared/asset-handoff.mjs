import {acceptsArtifact} from './capabilities.mjs';
import {saveTransfer,listTransfers,updateTransfer} from './transfer-store.mjs';
import {appURL} from './registry.mjs';
import {isHosted} from './hosting.mjs';

export const LAB_VIDEO_LIMITS={bytes:64*1024*1024,dimension:8192,pixels:33554432,duration:86400};
export function validateLabTarget(appId,result){if(!acceptsArtifact(appId,result.kind))throw Error(appId==='fluxlab'?'Send text to FluxLab as a prompt draft.':['audio','video'].includes(result.kind)?'Send video and audio to FluxVideo or FluxMotion.':'Choose a compatible FluxCreate workspace.');return true;}
export function validateLabResult(value){
 if(!value||!['text','image','video','audio'].includes(value.kind)||typeof value.id!=='string'||!value.id.length||value.id.length>200)throw Error('This FluxLab result is not supported.');
 const result={id:value.id,kind:value.kind,model:String(value.model||'').slice(0,160),prompt:String(value.prompt||'').slice(0,6000),createdAt:String(value.createdAt||'').slice(0,50)};
 if(value.kind==='text'){if(typeof value.text!=='string'||!value.text.trim()||value.text.length>100000)throw Error('This text result is empty or too large.');result.text=value.text;}
 else if(value.kind==='image'){const im=value.images?.[0];if(!im||!['image/png','image/jpeg','image/webp'].includes(im.mimeType)||typeof im.src!=='string'||im.src.length>4000000||!im.src.startsWith(`data:${im.mimeType};base64,`)||!/^[A-Za-z0-9+/]*={0,2}$/.test(im.src.split(',')[1]))throw Error('Send one PNG, JPEG or WebP result smaller than 3 MB.');result.images=[{mimeType:im.mimeType,src:im.src}];}
 else if(value.kind==='video'){const video=value.videos?.[0];if(!Array.isArray(value.videos)||value.videos.length!==1||!video||!['video/mp4','video/webm'].includes(video.mimeType)||!(video.blob instanceof Blob)||video.blob.size<=0||video.blob.size>LAB_VIDEO_LIMITS.bytes||video.blob.type.split(';')[0].toLowerCase()!==video.mimeType)throw Error('Send one saved MP4 or WebM video up to 64 MiB.');if(![video.width,video.height].every(n=>Number.isInteger(n)&&n>0&&n<=LAB_VIDEO_LIMITS.dimension)||video.width*video.height>LAB_VIDEO_LIMITS.pixels||!Number.isFinite(video.duration)||video.duration<=0||video.duration>LAB_VIDEO_LIMITS.duration)throw Error('The video dimensions or duration are unsupported.');result.text='';result.images=[];result.videos=[{id:typeof video.id==='string'?video.id.slice(0,200):value.id,mimeType:video.mimeType,blob:video.blob,width:video.width,height:video.height,duration:video.duration}];}
 else{const audio=value.audios?.[0];if(!Array.isArray(value.audios)||value.audios.length!==1||!audio||!['audio/mpeg','audio/wav'].includes(audio.mimeType)||!(audio.blob instanceof Blob)||audio.blob.size<=0||audio.blob.size>LAB_VIDEO_LIMITS.bytes||audio.blob.type.split(';')[0].toLowerCase()!==audio.mimeType)throw Error('Send one saved MP3 or WAV audio file up to 64 MiB.');if(!Number.isFinite(audio.duration)||audio.duration<=0||audio.duration>LAB_VIDEO_LIMITS.duration)throw Error('The audio duration is unsupported.');result.text='';result.images=[];result.audios=[{id:typeof audio.id==='string'?audio.id.slice(0,200):value.id,mimeType:audio.mimeType,blob:audio.blob,duration:audio.duration}];}
 return result;
}
export function sendLabResult({targetApp,result}){
 let payload;try{payload=validateLabResult(result);validateLabTarget(targetApp,payload);}catch(e){return Promise.reject(e);}
 const nonce=crypto.randomUUID(),url=new URL(appURL(targetApp),location.href),sourceApp=location.port==='4327'||location.pathname.startsWith('/fluxagents')?'fluxagents':'fluxlab';url.hash=new URLSearchParams({fluxlab:nonce,from:location.origin}).toString();
 const child=window.open(url.href,'_blank');if(!child)return Promise.reject(Error('Allow this popup to send the result, or download it and import it into your editor.'));
 const saved=saveTransfer({id:nonce,direction:'out',sourceApp,targetApp,result:payload});
 return new Promise((resolve,reject)=>{
  let finished=false,sent=false;const timer=setTimeout(()=>finish(Error('The editor did not receive this result. Your saved output remains available; open the editor and try again.')),25000);
  function finish(error){if(finished)return;finished=true;clearTimeout(timer);removeEventListener('message',receive);if(error){saved.then(()=>updateTransfer(nonce,targetApp,'failed',{direction:'out',error:error.message})).catch(()=>{});reject(error);}else resolve({sent:true,transferId:nonce,status:'received'});}
  async function receive(e){if(e.source!==child||e.origin!==url.origin||e.data?.nonce!==nonce)return;
   if(e.data.type==='fluxlab-ready'&&!sent){sent=true;try{await saved;if(!finished)child.postMessage({type:'fluxlab-result',nonce,sourceApp,result:payload},url.origin);}catch(error){finish(Error('Could not save this transfer: '+error.message));}}
   if(e.data.type==='fluxlab-received'){try{await saved;await updateTransfer(nonce,targetApp,'received',{direction:'out'});finish();}catch(error){finish(Error('The editor received your result, but its receipt could not be saved. Check the editor before sending another copy.'));}}
   if(e.data.type==='fluxlab-rejected')finish(Error(typeof e.data.error==='string'?e.data.error.slice(0,300):'This editor cannot accept the result.'));
  }
  addEventListener('message',receive);saved.catch(error=>finish(Error('Could not save this transfer: '+error.message)));
 });
}
export function receiveLabResult(callback,{appId}={}){
 let active=true,currentId=null,recovering=false;const delivered=new Set();
 const show=record=>{if(!active||currentId||delivered.has(record.id))return;currentId=record.id;delivered.add(record.id);callback({...validateLabResult(record.result),transfer:{id:record.id,targetApp:record.targetApp,sourceApp:record.sourceApp,status:record.status}});};
 const recover=async()=>{if(!appId||!active||currentId||recovering)return;recovering=true;try{const records=await listTransfers({direction:'in',appId});const record=records.reverse().find(v=>['review','applying'].includes(v.status)&&v.result&&!delivered.has(v.id));if(record)show(record);}catch{}finally{recovering=false;}};
 const finished=e=>{if(e.detail?.id===currentId){currentId=null;recover();}};addEventListener('fluxcreate-transfer-finished',finished);recover();
 const params=new URLSearchParams(location.hash.slice(1)),nonce=params.get('fluxlab'),parent=window.opener;
 const canonical=new URL(appURL('fluxlab'),location.href).origin,allowed=new Set(isHosted()?[canonical]:['http://localhost:4326','http://127.0.0.1:4326','http://localhost:4327','http://127.0.0.1:4327']),origin=params.get('from')||canonical;
 let received=false,timer,expiry;
 const ready=()=>{if(active&&!received)parent.postMessage({type:'fluxlab-ready',nonce},origin);};
 const listener=async e=>{
  if(received||e.source!==parent||e.origin!==origin||e.data?.nonce!==nonce||e.data?.type!=='fluxlab-result')return;received=true;clearInterval(timer);
  try{
   const result=validateLabResult(e.data.result);validateLabTarget(appId,result);
   const sourceApp=e.data.sourceApp==='fluxagents'?'fluxagents':'fluxlab';
   const record=await saveTransfer({id:nonce,direction:'in',sourceApp,targetApp:appId,result});
   if(!active)return;if(record.result&&['review','applying'].includes(record.status))show(record);
   parent.postMessage({type:'fluxlab-received',nonce,status:record.status},origin);history.replaceState(null,'',location.pathname+location.search);
  }catch(error){if(active)parent.postMessage({type:'fluxlab-rejected',nonce,error:error.message},origin);}
 };
 if(nonce&&parent&&/^[\w-]{36}$/.test(nonce)&&allowed.has(origin)){addEventListener('message',listener);timer=setInterval(ready,400);ready();expiry=setTimeout(()=>clearInterval(timer),26000);}
 return()=>{active=false;removeEventListener('message',listener);removeEventListener('fluxcreate-transfer-finished',finished);clearInterval(timer);clearTimeout(expiry);};
}
export async function beginLabTransfer(result){if(result.transfer)await updateTransfer(result.transfer.id,result.transfer.targetApp,'applying');}
export async function resetLabTransfer(result){if(result.transfer)await updateTransfer(result.transfer.id,result.transfer.targetApp,'review');}
export async function finishLabTransfer(result,status){if(!result.transfer)return;await updateTransfer(result.transfer.id,result.transfer.targetApp,status);dispatchEvent(new CustomEvent('fluxcreate-transfer-finished',{detail:{id:result.transfer.id}}));}

export function labImageFile(result){const im=validateLabResult(result).images?.[0];if(!im)throw Error('Choose an image result.');const bytes=Uint8Array.from(atob(im.src.split(',')[1]),c=>c.charCodeAt(0));return new File([bytes],`FluxLab-${result.id.slice(0,40)}.${im.mimeType==='image/jpeg'?'jpg':im.mimeType.split('/')[1]}`,{type:im.mimeType});}
export function labVideoFile(result){const video=validateLabResult(result).videos?.[0];if(!video)throw Error('Choose a saved video result.');return new File([video.blob],`FluxLab-${result.id.slice(0,40).replace(/[^\w-]/g,'_')}.${video.mimeType.split('/')[1]}`,{type:video.mimeType});}
export function labAudioFile(result){const audio=validateLabResult(result).audios?.[0];if(!audio)throw Error('Choose a saved audio result.');return new File([audio.blob],`FluxLab-${result.id.slice(0,40).replace(/[^\w-]/g,'_')}.${audio.mimeType==='audio/mpeg'?'mp3':'wav'}`,{type:audio.mimeType});}
