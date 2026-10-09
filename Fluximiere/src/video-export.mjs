import {Output,WebMOutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,canEncodeVideo,canEncodeAudio} from 'mediabunny';
import {MediaPool,drawFrame,seekMedia} from './renderer.mjs';
import {AudioStore} from './audio.mjs';
import {mixSample} from './audio-math.mjs';
const check=signal=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
const delay=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function loadVisuals(project,pool,signal,time=0){
  pool.pruneActive(project,time);const visible=project.clips.filter(c=>['video','image'].includes(c.type)&&c.start<=time&&c.start+c.duration>time&&c.opacity>0);if(visible.length>64)throw Error('This frame exceeds the 64-source visual decoder budget. Simplify overlapping clips.');
  for(const clip of visible){
    check(signal);const asset=project.assets.find(a=>a.id===clip.assetId);if(!asset?.src)throw Error(`Relink ${clip.name} before exporting. Offline media cannot be rendered.`);
    const el=pool.get(asset,clip.id);if(el.readyState>=2||el.complete&&el.naturalWidth)continue;
    await new Promise((resolve,reject)=>{let timer;const event=asset.type==='image'?'load':'loadeddata',finish=error=>{clearTimeout(timer);el.removeEventListener(event,ready);el.removeEventListener('error',failed);signal?.removeEventListener('abort',abort);error?reject(error):resolve();},ready=()=>finish(),failed=()=>finish(Error(`Cannot decode ${asset.name}. Relink this source before exporting.`)),abort=()=>finish(Error('Export cancelled.'));timer=setTimeout(()=>finish(Error(`${asset.name} did not load.`)),12000);el.addEventListener(event,ready,{once:true});el.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});
  }
}
export async function drawExactFrame(ctx,project,time,pool,signal){
  await loadVisuals(project,pool,signal,time);
  for(const clip of project.clips.filter(c=>c.type==='video'&&c.opacity>0&&time>=c.start&&time<c.start+c.duration)){
    check(signal);const el=pool.get(project.assets.find(a=>a.id===clip.assetId),clip.id),source=clip.sourceIn+(time-clip.start)*clip.playbackRate;
    if(source>=el.duration)throw Error(`${clip.name} extends beyond its source. Shorten the edit or relink it.`);
    await seekMedia(el,source,signal);
  }
  drawFrame(ctx,project,time,pool,{silent:true});
}
export async function exportStill(project,time,signal){
  const canvas=document.createElement('canvas');canvas.width=project.width;canvas.height=project.height;const pool=new MediaPool();
  try{await loadVisuals(project,pool,signal);await drawExactFrame(canvas.getContext('2d'),project,time,pool,signal);return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('The frame could not be exported.')),'image/png'));}finally{pool.dispose();}
}
export async function exportPreciseWebM(project,onProgress=()=>{},signal){
  check(signal);
  const quality=new Quality({bitrate:Math.min(20000000,project.width*project.height*6)});
  const codec=await canEncodeVideo('vp9',{width:project.width,height:project.height,quality})?'vp9':await canEncodeVideo('vp8',{width:project.width,height:project.height,quality})?'vp8':null;
  if(!codec||!await canEncodeAudio('opus',{sampleRate:48000,numberOfChannels:2}))throw Error('Precise WebM encoding is unavailable in this browser. Choose real-time WebM export, or use a current Chrome or Edge browser.');
  const canvas=document.createElement('canvas');canvas.width=project.width;canvas.height=project.height;const ctx=canvas.getContext('2d'),pool=new MediaPool(),store=new AudioStore();let output;let bytes=0;
  const packetBudget=packet=>{bytes+=packet.data.byteLength;if(bytes>256*1024*1024)throw Error('This export exceeds the 256 MiB output budget. Export a shorter sequence or lower the resolution.');};
  try{
    onProgress(0);await loadVisuals(project,pool,signal);const {clips,buffers}=await store.prepare(project,signal,p=>onProgress(p*.05));check(signal);
    output=new Output({format:new WebMOutputFormat(),target:new BufferTarget()});
    const video=new CanvasSource(canvas,{codec,quality,keyFrameInterval:1,onEncodedPacket:packetBudget}),audio=new AudioBufferSource({codec:'opus',quality:new Quality({bitrate:192000}),onEncodedPacket:packetBudget});
    output.addVideoTrack(video,{frameRate:project.fps});output.addAudioTrack(audio);await output.start();
    const frameCount=Math.ceil(project.duration*project.fps),context=store.getContext();let sourceFrame=0;
    for(let index=0;index<frameCount;index++){
      check(signal);const time=index/project.fps,end=Math.min(project.duration,(index+1)/project.fps);
      await drawExactFrame(ctx,project,time,pool,signal);await video.add(time,end-time);
      const endFrame=Math.round(end*48000),frames=endFrame-sourceFrame;
      if(frames>0){const chunk=context.createBuffer(2,frames,48000),channels=[chunk.getChannelData(0),chunk.getChannelData(1)],active=clips.filter(c=>c.start<end&&c.start+c.duration>time);
        for(let i=0;i<frames;i++)for(let channel=0;channel<2;channel++){const sample=mixSample(active,buffers,(sourceFrame+i)/48000,channel);if(Math.abs(sample)>1.001)throw Error('The sound mix clips above full scale. Lower overlapping clip volumes before exporting.');channels[channel][i]=sample;}
        await audio.add(chunk);sourceFrame=endFrame;
      }
      onProgress(.05+.9*(index+1)/frameCount);if(index%8===0)await delay();
    }
    check(signal);video.close();audio.close();await output.finalize();check(signal);onProgress(1);return new Blob([output.target.buffer],{type:'video/webm'});
  }catch(error){if(output&&output.state!=='finalized')await output.cancel().catch(()=>{});throw error;}
  finally{pool.dispose();await store.dispose();}
}
