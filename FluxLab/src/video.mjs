import {apiURL,isHosted} from '../../FluxCreate/shared/hosting.mjs';
import {sessionHeaders} from './client.mjs';
export const MAX_VIDEO_BYTES=64*1024*1024;
export async function fetchVideoBlob(asset,{signal}={}){
 if(typeof asset?.contentTicket!=='string'||!asset.contentTicket||asset.contentTicket.length>70000)throw Error('This video has no valid download ticket. Check the job again.');
 const response=await fetch(apiURL('fluxlab','/video/content')+'?ticket='+encodeURIComponent(asset.contentTicket),{headers:await sessionHeaders(),signal});
 if(!response.ok)throw Error('The video is ready, but it could not be downloaded. Resume checking to retry this job without generating again.');
 if(Number(response.headers.get('content-length'))>MAX_VIDEO_BYTES){await response.body?.cancel();throw Error('This video is larger than 64 MB. Your job is kept for recovery.');}
 const reader=response.body?.getReader();if(!reader)throw Error('The video download was empty.');let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_VIDEO_BYTES){await reader.cancel();throw Error('This video is larger than 64 MB. Your job is kept for recovery.');}chunks.push(value);}}finally{reader.releaseLock();}
 const mimeType=asset.mimeType||response.headers.get('content-type')?.split(';')[0];if(!['video/mp4','video/webm'].includes(mimeType)||!size)throw Error('The provider returned an unsupported or empty video.');
 return new Blob(chunks,{type:mimeType});
}
export async function verifyVideoBlob(blob,{signal}={}){
 if(!(blob instanceof Blob)||!blob.size||blob.size>MAX_VIDEO_BYTES||!['video/mp4','video/webm'].includes(blob.type))throw Error('Use an MP4 or WebM video under 64 MB.');
 const bytes=new Uint8Array(await blob.slice(0,16).arrayBuffer());if(blob.type==='video/webm'?bytes[0]!==26||bytes[1]!==69||bytes[2]!==223||bytes[3]!==163:String.fromCharCode(...bytes.slice(4,8))!=='ftyp')throw Error('The downloaded video has an invalid format.');
 if(signal?.aborted)throw new DOMException('Video checking paused.','AbortError');
 const video=document.createElement('video'),url=URL.createObjectURL(blob);video.preload='auto';video.muted=true;let probed=false,decoded=false;
 try{return await new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>finish(Error('This video could not be decoded. Your generation job is kept for retry.')),15000),abort=()=>finish(new DOMException('Video checking paused.','AbortError'));
  function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);}
  function inspect(){if(!video.videoWidth||!video.videoHeight)return;if(video.videoWidth>8192||video.videoHeight>8192||video.videoWidth*video.videoHeight>33554432)return finish(Error('The generated video dimensions exceed the suite limit.'));
   if(!Number.isFinite(video.duration)){if(!probed){probed=true;video.currentTime=1e9;}return;}
   if(video.duration<=0||video.duration>86400)return finish(Error('The generated video has an unsupported duration.'));if(decoded)finish(null,{width:video.videoWidth,height:video.videoHeight,duration:video.duration});
  }
  video.onloadedmetadata=inspect;video.ondurationchange=inspect;video.onloadeddata=()=>{decoded=true;inspect();};video.onseeked=()=>{decoded=video.readyState>=2;inspect();};video.onerror=()=>finish(Error('The model returned a video that could not be opened. Your job is kept for retry.'));signal?.addEventListener('abort',abort,{once:true});video.src=url;video.load();
 });}finally{video.pause();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
export async function materializeVideoResult(raw,jobId,{signal}={}){
 if(raw?.kind!=='video'||!Array.isArray(raw.videos)||raw.videos.length!==1)throw Error('The video service returned no usable result.');
 const asset=raw.videos[0],blob=await fetchVideoBlob(asset,{signal}),metadata=await verifyVideoBlob(blob,{signal});
 return{...raw,jobId,images:[],videos:[{id:asset.id,mimeType:blob.type,blob,...metadata}]};
}
