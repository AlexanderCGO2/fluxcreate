import {AudioStore} from '../../Fluximiere/src/audio.mjs';
import {clipGain,readSample} from '../../Fluximiere/src/audio-math.mjs';
import {ease} from './core.mjs';

export function audioLayerGain(layer,time){
  if(layer.visible===false)return 0;
  let volume=layer.volume??1;const keys=layer.keyframes?.volume;
  if(keys?.length){if(time<=keys[0].time)volume=keys[0].value;else if(time>=keys.at(-1).time)volume=keys.at(-1).value;else{let low=0,high=keys.length-1;while(low+1<high){const mid=(low+high)>>>1;if(keys[mid].time<=time)low=mid;else high=mid;}const a=keys[low],b=keys[high];volume=a.value+(b.value-a.value)*ease((time-a.time)/(b.time-a.time),a.easing);}}
  return clipGain({start:layer.start??0,duration:layer.end-(layer.start??0),volume,muted:layer.muted,fadeIn:layer.fadeIn??0,fadeOut:layer.fadeOut??0},time);
}

/** Shared bounded decode; the native layer volume curve is evaluated at every output sample. */
export async function renderCompositionAudio(comp,assets,signal,onProgress=()=>{}){
  const layers=comp.layers.filter(l=>['audio','video'].includes(l.type)&&l.visible!==false&&!l.muted&&l.start<comp.duration&&l.end>0),store=new AudioStore();
  try{
    const project={duration:comp.duration,fps:comp.fps,assets:(Array.isArray(assets)?assets:Object.values(assets??{})).map(a=>({...a,src:a.src??a.url})),clips:layers.map(l=>({id:l.id,name:l.name,type:l.type,assetId:l.assetId,start:l.start??0,duration:l.end-(l.start??0),sourceIn:l.sourceIn??0,playbackRate:l.playbackRate??1,volume:Math.max(l.volume??1,...(l.keyframes?.volume??[]).map(k=>k.value)),muted:!!l.muted}))};
    const {buffers}=await store.prepare(project,signal,onProgress),context=store.getContext(),frames=Math.ceil(comp.duration*48000);
    if(frames*8>128*1024*1024)throw Error('The composition exceeds the 128 MiB audio mix budget. Export a shorter composition.');
    const buffer=context.createBuffer(2,frames,48000),channels=[buffer.getChannelData(0),buffer.getChannelData(1)];
    for(let start=0;start<frames;start+=4096){if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');const end=Math.min(frames,start+4096),active=layers.filter(l=>l.start<end/48000&&l.end>start/48000);
      for(let i=start;i<end;i++){const time=i/48000;for(const layer of active){const data=buffers[layer.assetId],gain=audioLayerGain(layer,time);if(!data||!gain)continue;const source=((layer.sourceIn??0)+(time-(layer.start??0))*(layer.playbackRate??1))*data.sampleRate;for(let c=0;c<2;c++)channels[c][i]+=readSample(data.channels[Math.min(c,data.channels.length-1)],source)*gain;}
        if(Math.abs(channels[0][i])>1.001||Math.abs(channels[1][i])>1.001)throw Error('The sound mix clips above full scale. Lower overlapping layer volumes before exporting.');
      }
      if(start%65536===0){onProgress(start/frames);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    return {store,context,buffer};
  }catch(error){await store.dispose();throw error;}
}
