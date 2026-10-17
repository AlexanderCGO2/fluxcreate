import {digestMedia} from '../local-media.mjs';
import {AUTOEDIT_LIMITS} from './model.mjs';
import {seekMedia} from '../renderer.mjs';
import {Input,BlobSource,ALL_FORMATS} from 'mediabunny';
export const digest=(blob,signal)=>digestMedia(blob,'sha256-chunks-v1',signal);
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Autoedit cancelled.','AbortError');};
export async function importFootage(file,{signal}={}){
 aborted(signal);if(!(file instanceof Blob)||!file.size||file.size>AUTOEDIT_LIMITS.fileBytes)throw Error('Choose videos up to 512 MiB each.');
 const mime=file.type?.split(';')[0]||({mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm',ogv:'video/ogg'}[file.name?.split('.').pop().toLowerCase()]);if(!['video/mp4','video/webm','video/quicktime','video/ogg'].includes(mime))throw Error('Choose an MP4, WebM, MOV or Ogg video supported by your browser.');
 const blob=new Blob([file],{type:mime}),url=URL.createObjectURL(blob),video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
 try{
  await new Promise((resolve,reject)=>{let timer;const finish=e=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);video.onloadeddata=video.onerror=null;e?reject(e):resolve();},cancel=()=>finish(new DOMException('Autoedit cancelled.','AbortError'));timer=setTimeout(()=>finish(Error('Video decoding timed out. Try MP4 H.264 or WebM.')),15000);video.onloadeddata=()=>finish();video.onerror=()=>finish(Error('This video codec cannot be decoded in your browser.'));signal?.addEventListener('abort',cancel,{once:true});video.src=url;if(signal?.aborted)cancel();});
  aborted(signal);const {duration,videoWidth:width,videoHeight:height}=video;if(!Number.isFinite(duration)||duration<.1||duration>600||!width||!height||width>8192||height>8192)throw Error('Use a readable video between 0.1 seconds and 10 minutes, up to 8192 pixels.');
  const canvas=document.createElement('canvas'),scale=Math.min(1,384/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true}),tiny=document.createElement('canvas');tiny.width=tiny.height=16;const small=tiny.getContext('2d',{willReadFrequently:true});let previous=null;const frames=[];
  for(let i=0;i<AUTOEDIT_LIMITS.frames;i++){
   aborted(signal);const time=(i+.1)/AUTOEDIT_LIMITS.frames*Math.max(0,duration-.05);await seekMedia(video,time,signal);aborted(signal);ctx.drawImage(video,0,0,canvas.width,canvas.height);small.drawImage(canvas,0,0,16,16);const pixels=small.getImageData(0,0,16,16).data;let brightness=0,motion=0;for(let j=0;j<pixels.length;j+=4){const gray=(pixels[j]+pixels[j+1]+pixels[j+2])/3/255;brightness+=gray;if(previous)motion+=Math.abs(gray-previous[j/4]);}const values=Array.from({length:256},(_,j)=>(pixels[j*4]+pixels[j*4+1]+pixels[j*4+2])/3/255);previous=values;let dataUrl=canvas.toDataURL('image/jpeg',.55);if(dataUrl.length>48*1024)dataUrl=canvas.toDataURL('image/jpeg',.25);if(dataUrl.length>48*1024)throw Error('A video sample exceeds the thumbnail budget.');frames.push({time,dataUrl,brightness:brightness/256,motion:Math.min(1,motion/256)});
  }
  const input=new Input({source:new BlobSource(blob),formats:ALL_FORMATS});let hasAudio;try{hasAudio=!!await input.getPrimaryAudioTrack();}finally{input.dispose();}
  const hash=await digest(blob,signal);aborted(signal);const ref={assetId:`video-${crypto.randomUUID()}`,hash,hashAlgorithm:'sha256-chunks-v1',mime,bytes:blob.size,name:String(file.name||'Video').slice(0,240),duration,width,height,hasAudio,enabled:true,inPoint:0,outPoint:duration,frames};return {ref,asset:{...ref,blob}};
 }finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
export async function measureMusic(pcm,{signal}={}){
 aborted(signal);const worker=new Worker(new URL('music-analysis-worker.js',document.baseURI),{type:'module'});
 try{return await new Promise((resolve,reject)=>{let timer;const finish=(e,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);e?reject(e):resolve(value);},cancel=()=>finish(new DOMException('Autoedit cancelled.','AbortError'));timer=setTimeout(()=>finish(Error('Music analysis timed out. Try again.')),30000);worker.onmessage=({data})=>data.type==='result'?finish(null,data.analysis):finish(Error(data.error||'Music analysis failed.'));worker.onerror=()=>finish(Error('Music analysis could not start. Refresh the page.'));worker.onmessageerror=()=>finish(Error('Music analysis returned unreadable data.'));signal?.addEventListener('abort',cancel,{once:true});worker.postMessage({type:'analyze',id:pcm.sourceHash,input:{mono:pcm.mono,sampleRate:pcm.proxySampleRate,sourceHash:pcm.sourceHash,canonicalSampleRate:pcm.sampleRate,canonicalSampleCount:pcm.sampleCount}});if(signal?.aborted)cancel();});}finally{worker.terminate();}
}

export async function isDuplicateFootage(footage,result,signal){
 if(footage.some(v=>v.hash===result.ref.hash&&v.hashAlgorithm===result.ref.hashAlgorithm))return true;
 const legacy=footage.filter(v=>v.bytes===result.ref.bytes&&(!v.hashAlgorithm||v.hashAlgorithm==='sha256'));
 if(!legacy.length)return false;
 const hash=await digestMedia(result.asset.blob,'sha256',signal);return legacy.some(v=>v.hash===hash);
}
