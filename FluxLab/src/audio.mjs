export async function materializeAudioResult(raw,{signal}={}){
 if(raw?.kind!=='audio'||!Array.isArray(raw.audios)||raw.audios.length!==1)throw Error('The speech service returned no usable audio.');
 const item=raw.audios[0];if(!['audio/mpeg','audio/wav'].includes(item.mimeType)||typeof item.src!=='string'||item.src.length>5600000||!item.src.startsWith(`data:${item.mimeType};base64,`)||!/^[A-Za-z0-9+/]*={0,2}$/.test(item.src.split(',')[1]))throw Error('The service returned an invalid or oversized audio file.');
 const bytes=Uint8Array.from(atob(item.src.split(',')[1]),c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:item.mimeType}),duration=await verifyAudioBlob(blob,{signal});
 return{...raw,images:[],videos:[],audios:[{id:item.id,mimeType:item.mimeType,blob,duration}]};
}
export async function verifyAudioBlob(blob,{signal}={}){
 if(!(blob instanceof Blob)||!blob.size||blob.size>64*1024*1024||!['audio/mpeg','audio/wav'].includes(blob.type))throw Error('Use an MP3 or WAV audio file under 64 MB.');
 if(signal?.aborted)throw new DOMException('Audio cancelled.','AbortError');
 const audio=document.createElement('audio'),url=URL.createObjectURL(blob);audio.preload='auto';
 try{return await new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>finish(Error('The generated audio could not be decoded.')),15000),abort=()=>finish(new DOMException('Audio cancelled.','AbortError'));
  function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);}
  audio.onloadeddata=()=>{if(!Number.isFinite(audio.duration)||audio.duration<=0||audio.duration>86400)return finish(Error('The generated audio has an unsupported duration.'));finish(null,audio.duration);};audio.onerror=()=>finish(Error('The model returned audio that could not be opened.'));signal?.addEventListener('abort',abort,{once:true});audio.src=url;audio.load();
 });}finally{audio.pause();audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);}
}
