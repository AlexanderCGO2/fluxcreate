import toolkit from './media-toolkit.cjs';
import {hasMedia} from './local-media.mjs';
const {Input,BlobSource,ALL_FORMATS,CanvasSink}=toolkit;
const check=signal=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
// One iterator per active cut decodes each needed packet once instead of seeking a video element for every frame.
export class SequentialVideoFrames {
 constructor(){this.entries=new Map();}
 async release(id){const entry=this.entries.get(id);if(!entry)return;this.entries.delete(id);entry.signal?.removeEventListener('abort',entry.abort);try{await entry.iterator?.return();}finally{entry.input?.dispose();}}
 async frame(project,index,signal){
  check(signal);const time=index/project.fps,clips=project.clips.filter(c=>c.type==='video'&&c.opacity>0&&time>=c.start&&time<c.start+c.duration),frames=new Map();if(clips.length>64)throw Error('This frame exceeds the 64-source visual decoder budget.');
  for(const id of this.entries.keys())if(!clips.some(c=>c.id===id))await this.release(id);
  for(const c of clips){
   check(signal);let entry=this.entries.get(c.id);
   if(!entry){const asset=project.assets.find(a=>a.id===c.assetId);if(!hasMedia(asset))throw Error(`Relink ${c.name} before exporting.`);const blob=asset.blob??await (await fetch(asset.src,{signal})).blob();check(signal);const input=new Input({source:new BlobSource(blob),formats:ALL_FORMATS});entry={input,signal,abort:()=>input.dispose()};this.entries.set(c.id,entry);signal?.addEventListener('abort',entry.abort,{once:true});check(signal);
    const track=await input.getPrimaryVideoTrack();if(!track||!await track.canDecode()){input.dispose();entry.input=null;entry.fallback=true;continue;}
    const duration=await track.computeDuration(),fps=project.fps,last=Math.min(Math.ceil((c.start+c.duration)*fps),Math.ceil(project.duration*fps));
    const timestamps=(function*(){for(let i=index;i<last;i++){check(signal);const t=c.sourceIn+(i/fps-c.start)*c.playbackRate;if(t>=duration)throw Error(`${c.name} extends beyond its source. Shorten the edit or relink it.`);yield t;}})();
    entry.iterator=new CanvasSink(track,{poolSize:2}).canvasesAtTimestamps(timestamps);
   }
   if(entry.fallback)continue;
   let timer;try{const next=await Promise.race([entry.iterator.next(),new Promise((_,reject)=>{timer=setTimeout(()=>{entry.input.dispose();reject(Error(`Video decoding stalled for ${c.name}. Try the real-time export option.`));},15000);})]);check(signal);if(next.done||!next.value)throw Error(`A frame is missing from ${c.name}.`);frames.set(c.id,next.value.canvas);}finally{clearTimeout(timer);}
  }
  return frames;
 }
 async dispose(){for(const id of [...this.entries.keys()])await this.release(id);}
}
