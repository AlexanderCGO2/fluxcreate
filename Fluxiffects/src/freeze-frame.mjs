import {getComp,uid,parseProject} from './core.mjs';

export const FREEZE_LIMITS=Object.freeze({side:4096,pixels:8847360,pngBytes:32*1024*1024,embeddedCharacters:140000000,duration:86400});
const abort=()=>new DOMException('Freeze-frame capture cancelled.','AbortError');
function check(signal){if(signal?.aborted)throw abort();}
function dimensions(width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>FREEZE_LIMITS.side||height>FREEZE_LIMITS.side||width*height>FREEZE_LIMITS.pixels)throw Error('Freeze frames require source dimensions up to 4096 per side and 8,847,360 pixels.');}
const pictureKeys=layer=>Object.fromEntries(Object.entries(layer.keyframes??{}).filter(([key])=>key!=='volume'));
const countKeys=keys=>Object.values(keys).reduce((sum,track)=>sum+track.length,0);
function budgets(project,comp,layer,extra=0){
  if(project.assets.length>=2000)throw Error('The project has reached its 2,000 assets limit.');
  if(comp.layers.length>=2000||project.compositions.reduce((n,c)=>n+c.layers.length,0)>=5000)throw Error('The project has reached its layers limit.');
  if(project.compositions.reduce((n,c)=>n+c.layers.reduce((sum,l)=>sum+countKeys(l.keyframes??{}),0),0)+countKeys(pictureKeys(layer))>100000)throw Error('The copy would exceed the 100,000 keys limit.');
  if(project.assets.reduce((n,a)=>n+(a.src??a.url??'').length,0)+extra>FREEZE_LIMITS.embeddedCharacters)throw Error('The copy would exceed the embedded media limit (about 100 MB).');
}

/** Capture plan retains the exact committed objects; no preview/cache state is read. */
export function prepareFreezeFrame(project,layerId,time){
  const comp=getComp(project),layer=comp?.layers.find(l=>l.id===layerId);
  if(!layer||layer.type!=='video')throw Error('Select a video layer to create a freeze-frame copy.');
  if(layer.locked)throw Error('Unlock the video layer before creating a freeze-frame copy.');
  if(layer.visible===false)throw Error('Show the video layer before creating a freeze-frame copy.');
  if(!Number.isFinite(time)||time<layer.start||time>=layer.end||time<0||time>=comp.duration)throw Error('Move the playhead inside the video layer to choose a frame.');
  const asset=project.assets.find(a=>a.id===layer.assetId);
  if(!asset||asset.missing||asset.type!=='video'||!asset.src)throw Error('The source video is missing. Import and relink it first.');
  if(!/^data:video\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i.test(asset.src))throw Error('Import and relink an embedded video before creating a freeze-frame copy. External or temporary URLs are not supported.');
  const sourceIn=layer.sourceIn??0,rate=layer.playbackRate??1;
  if(!Number.isFinite(sourceIn)||sourceIn<0||sourceIn>86400||!Number.isFinite(rate)||rate<.1||rate>16)throw Error('The video source timing is invalid.');
  const sourceTime=sourceIn+(time-layer.start)*rate;
  if(!Number.isFinite(sourceTime)||sourceTime<0||sourceTime>=FREEZE_LIMITS.duration)throw Error('The chosen frame is beyond the supported source duration.');
  budgets(project,comp,layer);
  return {project,comp,layer,asset,source:asset.src,sourceTime,time,layerState:JSON.stringify(layer)};
}

/** All validation precedes construction; callers commit this result once or discard it. */
export function applyFreezeFrame(project,request,frame){
  if(project!==request.project||getComp(project)!==request.comp||!request.comp.layers.includes(request.layer)||!project.assets.includes(request.asset)||request.asset.src!==request.source||JSON.stringify(request.layer)!==request.layerState)throw Error('The project or source changed while capturing. Create the copy again.');
  prepareFreezeFrame(project,request.layer.id,request.time);
  dimensions(frame.width,frame.height);
  if(typeof frame.src!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(frame.src))throw Error('The captured frame is not an embedded PNG.');
  if((frame.src.length-'data:image/png;base64,'.length)*.75>FREEZE_LIMITS.pngBytes+2)throw Error('The captured PNG exceeds the 32 MiB limit.');
  budgets(project,request.comp,request.layer,frame.src.length);
  const layer=structuredClone(request.layer);layer.id=uid();layer.type='image';layer.name=(layer.name+' · Freeze frame').slice(0,1000);layer.assetId=uid();
  for(const key of ['sourceIn','playbackRate','volume','muted','fadeIn','fadeOut'])delete layer[key];
  layer.keyframes=pictureKeys(layer);for(const track of Object.values(layer.keyframes))for(const key of track)key.id=uid();for(const effect of layer.effects??[])effect.id=uid();
  const asset={id:layer.assetId,name:layer.name+'.png',type:'image',src:frame.src,width:frame.width,height:frame.height};
  const layers=request.comp.layers.flatMap(item=>item===request.layer?[layer,{...item,visible:false,muted:true}]:[item]);
  const next={...project,assets:[...project.assets,asset],compositions:project.compositions.map(c=>c===request.comp?{...c,layers}:c)};
  // Reuse the native whitelist and 200M-character serialized-project budget before commit.
  parseProject(JSON.stringify(next));
  return {layerId:layer.id,project:next};
}

function waitForMedia(video,ready,events,signal,action){
  check(signal);
  return new Promise((resolve,reject)=>{
    const clean=()=>{clearTimeout(timer);for(const event of events)video.removeEventListener(event,done);video.removeEventListener('error',failed);signal?.removeEventListener('abort',cancel);};
    const done=()=>{if(ready()){clean();resolve();}},failed=()=>{clean();reject(Error('This video could not be decoded. Import a browser-supported video.'));},cancel=()=>{clean();reject(abort());};
    const timer=setTimeout(()=>{clean();reject(Error('The video frame did not finish decoding. Try a smaller, browser-supported source.'));},15000);
    for(const event of events)video.addEventListener(event,done);video.addEventListener('error',failed);signal?.addEventListener('abort',cancel,{once:true});
    try{action?.();done();}catch(error){clean();reject(error);}
  });
}

/** Isolated raw-source capture: never transforms, plays, or seeks preview media. */
export async function captureFreezeFrame(request,{signal}={}){
  check(signal);
  const video=document.createElement('video'),canvas=document.createElement('canvas');video.muted=true;video.preload='auto';video.playsInline=true;
  try{
    await waitForMedia(video,()=>video.readyState>=2,['loadeddata','canplay'],signal,()=>{video.src=request.source;video.load();});
    check(signal);
    if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>FREEZE_LIMITS.duration)throw Error('Freeze frames require a video with a known duration of at most 24 hours.');
    if(request.sourceTime<0||request.sourceTime>=video.duration)throw Error('The chosen frame is beyond the decoded video duration. Move the playhead earlier or change Source in.');
    dimensions(video.videoWidth,video.videoHeight);
    if(Math.abs(video.currentTime-request.sourceTime)>1e-7||video.seeking)await waitForMedia(video,()=>!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-request.sourceTime)<1e-6,['seeked','loadeddata'],signal,()=>{video.currentTime=request.sourceTime;});
    check(signal);canvas.width=video.videoWidth;canvas.height=video.videoHeight;const context=canvas.getContext('2d');if(!context)throw Error('The browser could not create the freeze-frame canvas.');context.drawImage(video,0,0);
    const blob=await new Promise((resolve,reject)=>{const cancel=()=>{signal?.removeEventListener('abort',cancel);reject(abort());};signal?.addEventListener('abort',cancel,{once:true});canvas.toBlob(value=>{signal?.removeEventListener('abort',cancel);value?resolve(value):reject(Error('The browser could not create the freeze-frame PNG.'));},'image/png');});
    check(signal);if(blob.size>FREEZE_LIMITS.pngBytes)throw Error('The captured PNG exceeds the 32 MiB limit.');
    const src=await new Promise((resolve,reject)=>{const reader=new FileReader(),clean=()=>signal?.removeEventListener('abort',cancel),cancel=()=>{clean();reader.abort();reject(abort());};reader.onload=()=>{clean();resolve(reader.result);};reader.onerror=()=>{clean();reject(Error('The freeze-frame PNG could not be read.'));};signal?.addEventListener('abort',cancel,{once:true});reader.readAsDataURL(blob);});
    check(signal);return {src,width:canvas.width,height:canvas.height};
  }finally{video.pause();video.removeAttribute('src');video.load();canvas.width=canvas.height=1;}
}
