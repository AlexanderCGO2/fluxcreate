import {hasMedia,mediaSource,openMediaURL} from './local-media.mjs';
import {AudioStore,renderAudioMix} from './audio.mjs';
export class MediaPool {
  constructor(onChange=()=>{}){this.items=new Map();this.onChange=onChange;}
  get(asset,clipId){
    if(!hasMedia(asset))return null;const key=asset.type==='image'?asset.id:clipId;
    let item=this.items.get(key);if(item?.source===mediaSource(asset))return item.element;
    if(item){item.element.pause?.();item.element.removeAttribute?.('src');item.element.load?.();item.release();}
    const el=asset.type==='image'?new Image():document.createElement(asset.type==='audio'?'audio':'video');
    if(asset.type==='image'){el.onload=this.onChange;}else{el.preload='auto';el.playsInline=true;el.onloadeddata=this.onChange;el.onseeked=this.onChange;}
    const opened=openMediaURL(asset);el.onerror=this.onChange;el.src=opened.url;this.items.set(key,{element:el,source:mediaSource(asset),release:opened.release});return el;
  }
  pause(){for(const {element}of this.items.values())element.pause?.();}
  pruneActive(project,time){const active=new Set(project.clips.filter(c=>c.type!=='audio'&&time>=c.start&&time<c.start+c.duration).map(c=>c.type==='image'?c.assetId:c.id));for(const [key,{element,release}]of this.items)if(!active.has(key)){element.pause?.();element.onload=null;element.onloadeddata=null;element.onseeked=null;element.onerror=null;element.removeAttribute('src');element.load?.();release();this.items.delete(key);}}
  dispose(){for(const {element,release}of this.items.values()){element.pause?.();element.onload=null;element.onloadeddata=null;element.onseeked=null;element.removeAttribute('src');element.load?.();release();}this.items.clear();}
}
export function activeOpacity(clip,time){let amount=clip.opacity,elapsed=time-clip.start,remaining=clip.duration-elapsed;if(clip.fadeIn)amount*=Math.min(1,elapsed/clip.fadeIn);if(clip.fadeOut)amount*=Math.min(1,remaining/clip.fadeOut);return Math.max(0,amount);}
export function drawFrame(ctx,project,time,pool,{playing=false,silent=false,videoFrames}={}){
  pool?.pruneActive(project,time);
  const {width:w,height:h}=project;ctx.save();ctx.setTransform(ctx.canvas.width/w,0,0,ctx.canvas.height/h,0,0);ctx.globalAlpha=1;ctx.fillStyle=project.background;ctx.fillRect(0,0,w,h);
  const active=new Set(),assets=new Map(project.assets.map(a=>[a.id,a]));const ordered=[...project.clips].sort((a,b)=>Number(a.track.slice(1))-Number(b.track.slice(1)));
  for(const clip of ordered){if(clip.type==='audio'||time<clip.start||time>=clip.start+clip.duration)continue;const asset=assets.get(clip.assetId),decoded=videoFrames?.get(clip.id),media=decoded?null:pool?.get(asset,clip.id),opacity=activeOpacity(clip,time);
    if(media&&asset.type!=='image'){
      active.add(media);const wanted=clip.sourceIn+(time-clip.start)*clip.playbackRate;
      if(Number.isFinite(media.duration)&&Math.abs(media.currentTime-wanted)>(playing?0.22:0.025))try{media.currentTime=Math.min(wanted,Math.max(0,media.duration-0.001));}catch{}
      media.playbackRate=clip.playbackRate;media.muted=true;media.volume=0;
      if(playing&&!media.ended)media.play().catch(()=>{});else if(!playing)media.pause();
    }
    if(clip.type==='audio')continue;
    ctx.save();ctx.globalAlpha=opacity;ctx.translate(clip.x,clip.y);ctx.rotate(clip.rotation*Math.PI/180);const x=-clip.width/2,y=-clip.height/2;
    if(clip.type==='title'){
      ctx.fillStyle=clip.color;ctx.font=`600 ${clip.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;ctx.textAlign=clip.align;ctx.textBaseline='middle';const lines=clip.text.split('\n'),lineHeight=clip.fontSize*1.12;
      ctx.shadowColor='rgba(30,20,50,.12)';ctx.shadowBlur=24;lines.forEach((line,i)=>ctx.fillText(line,clip.align==='left'?x:clip.align==='right'?-x:0,(i-(lines.length-1)/2)*lineHeight,clip.width));
    }else if(clip.type==='card'){
      const gradient=ctx.createLinearGradient(x,y,-x,-y);gradient.addColorStop(0,clip.color);gradient.addColorStop(1,clip.secondary);ctx.fillStyle=gradient;ctx.fillRect(x,y,clip.width,clip.height);
      // A gentle atmosphere is a built-in color-card treatment; all card controls stay editable.
      ctx.save();ctx.globalAlpha*=0.22;const glow=ctx.createRadialGradient(clip.width*.23, -clip.height*.16,0,clip.width*.23,-clip.height*.16,clip.width*.55);glow.addColorStop(0,'#ffffff');glow.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=glow;ctx.fillRect(x,y,clip.width,clip.height);ctx.restore();
    }else if(clip.type==='shape'){ctx.fillStyle=clip.color;ctx.fillRect(x,y,clip.width,clip.height);}
    else if(decoded){const scale=Math.min(clip.width/decoded.width,clip.height/decoded.height);ctx.drawImage(decoded,-decoded.width*scale/2,-decoded.height*scale/2,decoded.width*scale,decoded.height*scale);}
    else if(media&&((asset.type==='image'&&media.complete&&media.naturalWidth)||(asset.type==='video'&&media.readyState>=2))){
      const mw=media.videoWidth||media.naturalWidth,mh=media.videoHeight||media.naturalHeight,scale=Math.min(clip.width/mw,clip.height/mh);try{ctx.drawImage(media,-mw*scale/2,-mh*scale/2,mw*scale,mh*scale);}catch{}
    }else{ctx.fillStyle='#22212d';ctx.fillRect(x,y,clip.width,clip.height);ctx.fillStyle='#a4a0b4';ctx.font='32px sans-serif';ctx.textAlign='center';ctx.fillText(hasMedia(asset)?'Loading media…':'Media offline — relink source',0,0);}
    ctx.restore();
  }
  if(pool)for(const {element}of pool.items.values())if(element.pause&&!active.has(element))element.pause();ctx.restore();
}

export async function exportWebM(project,onProgress=()=>{},signal,options={}){
  if(options.mode==='realtime')return exportRecordedWebM(project,onProgress,signal);
  const {exportPreciseWebM}=await import('./video-export.mjs');return exportPreciseWebM(project,onProgress,signal);
}
export async function exportRecordedWebM(project,onProgress=()=>{},signal){
  const missing=project.clips.find(c=>['video','image'].includes(c.type)&&c.opacity>0&&c.start<project.duration&&!hasMedia(project.assets.find(a=>a.id===c.assetId)));
  if(missing)throw new Error(`Relink “${missing.name}” before exporting video. Offline media cannot be rendered.`);
  if(!globalThis.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('WebM export is unavailable in this browser. Try Chrome or Edge.');
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw new Error('This browser cannot record WebM with Opus sound. Use a current Chrome or Edge browser.');
  const canvas=document.createElement('canvas');canvas.width=project.width;canvas.height=project.height;const ctx=canvas.getContext('2d');const pool=new MediaPool();
  const video=project.clips.filter(c=>c.type==='video').map(c=>pool.get(project.assets.find(a=>a.id===c.assetId),c.id)).filter(Boolean);
  const images=project.clips.filter(c=>c.type==='image').map(c=>pool.get(project.assets.find(a=>a.id===c.assetId),c.id)).filter(Boolean);
  try{if(signal?.aborted)throw new Error('Export cancelled.');await Promise.all([...video,...images].map(el=>new Promise((resolve,reject)=>{if(el.readyState>=2||el.complete&&el.naturalWidth)return resolve();const event=el instanceof HTMLImageElement?'load':'loadeddata';let timer;const finish=error=>{clearTimeout(timer);el.removeEventListener(event,ready);el.removeEventListener('error',failed);signal?.removeEventListener('abort',cancel);error?reject(error):resolve();},ready=()=>finish(),failed=()=>finish(new Error('A media source could not be decoded.')),cancel=()=>finish(new Error('Export cancelled.'));timer=setTimeout(()=>finish(new Error('A media source did not load. Relink it before exporting.')),12000);el.addEventListener(event,ready,{once:true});el.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',cancel,{once:true});})));if(signal?.aborted)throw new Error('Export cancelled.');}catch(error){pool.dispose();throw error;}
  const store=new AudioStore();let stream,destination,source;
  try{
    const {buffer,peak}=await renderAudioMix(project,store,signal,value=>onProgress(value*.15));
    if(peak>1.001)throw Error('The sound mix clips above full scale. Lower overlapping clip volumes before exporting.');
    const audio=store.getContext();await audio.resume();if(audio.state!=='running')throw Error('Audio is suspended. Click Export again to enable sound.');
    for(const clip of project.clips.filter(c=>c.type==='video'&&c.start<=0)){const el=pool.get(project.assets.find(a=>a.id===c.assetId),clip.id);if(el)await seekMedia(el,clip.sourceIn,signal);}
    drawFrame(ctx,project,0,pool,{silent:true});stream=canvas.captureStream(project.fps);destination=audio.createMediaStreamDestination();destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
    source=audio.createBufferSource();source.buffer=buffer;source.connect(destination);
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.min(20000000,project.width*project.height*6),audioBitsPerSecond:192000}),chunks=[];
    return await new Promise((resolve,reject)=>{let frame=0,settled=false,started=0,timer;
      const cleanup=()=>{cancelAnimationFrame(frame);clearTimeout(timer);signal?.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',visibility);};
      const fail=error=>{if(settled)return;settled=true;cleanup();try{source.stop();}catch{}if(recorder.state!=='inactive')recorder.stop();reject(error);};
      const abort=()=>fail(new Error('Export cancelled.'));
      const visibility=()=>{if(document.hidden)fail(Error('Export stopped because this tab was hidden. Keep the editor visible and export again.'));};
      signal?.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',visibility);if(signal?.aborted)return abort();if(document.hidden)return visibility();
      recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>fail(Error('Video and audio recording failed.'));
      recorder.onstop=()=>{if(settled)return;settled=true;cleanup();const blob=new Blob(chunks,{type:'video/webm'});blob.size?resolve(blob):reject(Error('The recorder returned an empty file.'));};
      const tick=()=>{if(settled)return;const t=Math.min(project.duration,audio.currentTime-started);drawFrame(ctx,project,Math.min(t,project.duration-.001),pool,{playing:true,silent:true});onProgress(.15+.85*t/project.duration);if(t>=project.duration)recorder.stop();else frame=requestAnimationFrame(tick);};
      timer=setTimeout(()=>fail(Error('Export stalled. Check your audio output device and try again.')),(project.duration+20)*1000);recorder.start(200);started=audio.currentTime;source.start(started);tick();stream.getVideoTracks()[0]?.requestFrame?.();
    });
  }finally{try{source?.stop();}catch{}source?.disconnect();destination?.disconnect();pool.dispose();stream?.getTracks().forEach(t=>t.stop());await store.dispose();}
}

export async function seekMedia(element,time,signal){
  if(Math.abs(element.currentTime-time)<.00001&&element.readyState>=2)return;
  await new Promise((resolve,reject)=>{let timer;const finish=error=>{clearTimeout(timer);element.removeEventListener('seeked',ready);element.removeEventListener('error',failed);signal?.removeEventListener('abort',abort);error?reject(error):resolve();},ready=()=>finish(),failed=()=>finish(Error('A video frame could not be decoded.')),abort=()=>finish(Error('Export cancelled.'));timer=setTimeout(()=>finish(Error('A source frame could not be reached. Relink the source or shorten its edit.')),12000);element.addEventListener('seeked',ready,{once:true});element.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',abort,{once:true});element.currentTime=time;if(signal?.aborted)abort();});
}
