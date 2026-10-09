export class MediaPool {
  constructor(onChange=()=>{}){this.items=new Map();this.onChange=onChange;}
  get(asset,clipId){
    if(!asset?.src)return null;const key=asset.type==='image'?asset.id:clipId;
    let item=this.items.get(key);if(item?.source===asset.src)return item.element;
    if(item){item.element.pause?.();item.element.removeAttribute?.('src');}
    const el=asset.type==='image'?new Image():document.createElement(asset.type==='audio'?'audio':'video');
    if(asset.type==='image'){el.onload=this.onChange;}else{el.preload='auto';el.playsInline=true;el.onloadeddata=this.onChange;el.onseeked=this.onChange;}
    el.onerror=this.onChange;el.src=asset.src;this.items.set(key,{element:el,source:asset.src});return el;
  }
  pause(){for(const {element}of this.items.values())element.pause?.();}
  dispose(){for(const {element}of this.items.values()){element.pause?.();element.onload=null;element.onloadeddata=null;element.onseeked=null;element.removeAttribute('src');element.load?.();}this.items.clear();}
}
export function activeOpacity(clip,time){let amount=clip.opacity,elapsed=time-clip.start,remaining=clip.duration-elapsed;if(clip.fadeIn)amount*=Math.min(1,elapsed/clip.fadeIn);if(clip.fadeOut)amount*=Math.min(1,remaining/clip.fadeOut);return Math.max(0,amount);}
export function drawFrame(ctx,project,time,pool,{playing=false,silent=false}={}){
  const {width:w,height:h}=project;ctx.save();ctx.setTransform(ctx.canvas.width/w,0,0,ctx.canvas.height/h,0,0);ctx.globalAlpha=1;ctx.fillStyle=project.background;ctx.fillRect(0,0,w,h);
  const active=new Set(),assets=new Map(project.assets.map(a=>[a.id,a]));const ordered=[...project.clips].sort((a,b)=>Number(a.track.slice(1))-Number(b.track.slice(1)));
  for(const clip of ordered){if(time<clip.start||time>=clip.start+clip.duration)continue;const asset=assets.get(clip.assetId),media=pool?.get(asset,clip.id),opacity=activeOpacity(clip,time);
    if(media&&asset.type!=='image'){
      active.add(media);const wanted=clip.sourceIn+(time-clip.start)*clip.playbackRate;
      if(Number.isFinite(media.duration)&&Math.abs(media.currentTime-wanted)>(playing?0.22:0.025))try{media.currentTime=Math.min(wanted,Math.max(0,media.duration-0.001));}catch{}
      media.playbackRate=clip.playbackRate;media.muted=silent||clip.muted;media.volume=Math.min(1,clip.volume*opacity);
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
    else if(media&&((asset.type==='image'&&media.complete&&media.naturalWidth)||(asset.type==='video'&&media.readyState>=2))){
      const mw=media.videoWidth||media.naturalWidth,mh=media.videoHeight||media.naturalHeight,scale=Math.min(clip.width/mw,clip.height/mh);try{ctx.drawImage(media,-mw*scale/2,-mh*scale/2,mw*scale,mh*scale);}catch{}
    }else{ctx.fillStyle='#22212d';ctx.fillRect(x,y,clip.width,clip.height);ctx.fillStyle='#a4a0b4';ctx.font='32px sans-serif';ctx.textAlign='center';ctx.fillText(asset?.src?'Loading media…':'Media offline — relink source',0,0);}
    ctx.restore();
  }
  if(pool)for(const {element}of pool.items.values())if(element.pause&&!active.has(element))element.pause();ctx.restore();
}

export async function exportWebM(project,onProgress=()=>{},signal){
  const missing=project.clips.find(c=>['video','image'].includes(c.type)&&c.opacity>0&&c.start<project.duration&&!project.assets.find(a=>a.id===c.assetId)?.src);
  if(missing)throw new Error(`Relink “${missing.name}” before exporting video. Offline media cannot be rendered.`);
  if(!globalThis.MediaRecorder||!HTMLCanvasElement.prototype.captureStream)throw new Error('WebM export is unavailable in this browser. Try Chrome or Edge.');
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw new Error('This browser cannot record WebM.');
  const canvas=document.createElement('canvas');canvas.width=project.width;canvas.height=project.height;const ctx=canvas.getContext('2d');const pool=new MediaPool();
  const video=project.clips.filter(c=>c.type==='video').map(c=>pool.get(project.assets.find(a=>a.id===c.assetId),c.id)).filter(Boolean);
  const images=project.clips.filter(c=>c.type==='image').map(c=>pool.get(project.assets.find(a=>a.id===c.assetId),c.id)).filter(Boolean);
  try{if(signal?.aborted)throw new Error('Export cancelled.');await Promise.all([...video,...images].map(el=>new Promise((resolve,reject)=>{if(el.readyState>=2||el.complete&&el.naturalWidth)return resolve();const event=el instanceof HTMLImageElement?'load':'loadeddata';let timer;const finish=error=>{clearTimeout(timer);el.removeEventListener(event,ready);el.removeEventListener('error',failed);signal?.removeEventListener('abort',cancel);error?reject(error):resolve();},ready=()=>finish(),failed=()=>finish(new Error('A media source could not be decoded.')),cancel=()=>finish(new Error('Export cancelled.'));timer=setTimeout(()=>finish(new Error('A media source did not load. Relink it before exporting.')),12000);el.addEventListener(event,ready,{once:true});el.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',cancel,{once:true});})));if(signal?.aborted)throw new Error('Export cancelled.');}catch(error){pool.dispose();throw error;}
  drawFrame(ctx,project,0,pool,{silent:true});const stream=canvas.captureStream(project.fps),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:Math.min(20000000,project.width*project.height*6)}),chunks=[];
  try{return await new Promise((resolve,reject)=>{let frame=0,started=performance.now();const abort=()=>{cancelAnimationFrame(frame);if(recorder.state!=='inactive')recorder.stop();reject(new Error('Export cancelled.'));};signal?.addEventListener('abort',abort,{once:true});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>reject(new Error('Video recording failed.'));recorder.onstop=()=>{signal?.removeEventListener('abort',abort);resolve(new Blob(chunks,{type:'video/webm'}));};recorder.start(200);const tick=()=>{const t=Math.min(project.duration,(performance.now()-started)/1000);drawFrame(ctx,project,Math.min(t,project.duration-0.001),pool,{playing:true,silent:true});onProgress(t/project.duration);if(t>=project.duration)recorder.stop();else frame=requestAnimationFrame(tick);};tick();});}finally{pool.dispose();stream.getTracks().forEach(t=>t.stop());}
}
