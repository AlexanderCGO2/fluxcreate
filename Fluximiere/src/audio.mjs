import {createMixer,mixSample,peakData} from './audio-math.mjs';

export const PCM_BUDGET=96*1024*1024;
const cancelled=signal=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
export const audioClips=project=>project.clips.filter(c=>['audio','video'].includes(c.type)&&!c.muted&&c.volume>0&&c.start<project.duration);
const audioContext=()=>{const Context=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Context)throw Error('Web Audio is unavailable. Use a current Chrome, Edge or Firefox browser.');return new Context({sampleRate:48000,latencyHint:'interactive'});};
async function sourceDuration(asset,signal){
  const element=document.createElement(asset.type==='video'?'video':'audio');element.preload='metadata';element.muted=true;
  try{return await new Promise((resolve,reject)=>{let timer,seeking=false;const finish=(error,duration)=>{clearTimeout(timer);element.onloadedmetadata=null;element.ondurationchange=null;element.onseeked=null;element.onerror=null;signal?.removeEventListener('abort',abort);error?reject(error):resolve(duration);},abort=()=>finish(Error('Export cancelled.')),read=()=>{if(Number.isFinite(element.duration)&&element.duration>0)finish(null,element.duration);else if(element.readyState>=1&&!seeking){seeking=true;try{element.currentTime=1e9;}catch{finish(Error(`Cannot measure ${asset.name}. Relink a source with a known duration.`));}}};timer=setTimeout(()=>finish(Error(`Cannot measure ${asset.name}. Relink a source with a known duration.`)),12000);element.onloadedmetadata=read;element.ondurationchange=read;element.onseeked=read;element.onerror=()=>finish(Error(`Cannot read ${asset.name}. Relink this source.`));signal?.addEventListener('abort',abort,{once:true});element.src=asset.src;if(signal?.aborted)abort();});}
  finally{element.removeAttribute('src');element.load();}
}

export class AudioStore {
  constructor({budget=PCM_BUDGET,onChange=()=>{}}={}){this.budget=budget;this.entries=new Map();this.bytes=0;this.onChange=onChange;this.context=null;this.queue=Promise.resolve();this.peakQueue=Promise.resolve();this.closed=false;}
  getContext(){return this.context??=audioContext();}
  entry(asset){const entry=this.entries.get(asset?.id);return entry?.src===asset?.src?entry:null;}
  prune(assets){for(const [id,entry]of this.entries)if(!assets.some(a=>a.id===id&&a.src===entry.src)){this.bytes-=entry.bytes??0;this.entries.delete(id);}}
  async load(asset,signal){
    cancelled(signal);if(this.closed)throw Error('Audio workspace is closed.');
    if(!asset?.src)throw Error(`Relink ${asset?.name??'the audio source'} before playing or exporting sound.`);
    const existing=this.entry(asset);if(existing){if(existing.error)throw existing.error;return existing;}
    const operation=this.queue.then(async()=>{
      cancelled(signal);const cached=this.entry(asset);if(cached){if(cached.error)throw cached.error;return cached;}
      // Whole-file browser decode is deliberately bounded. Long sources need a shorter proxy.
      const measured=await sourceDuration(asset,signal),estimated=measured*48000*2*4;
      if(estimated>this.budget)throw Error(`${asset.name} exceeds the ${Math.round(this.budget/1048576)} MiB decoded-audio limit. Import a shorter audio proxy.`);
      while(this.bytes+estimated>this.budget&&this.entries.size){const [id,item]=this.entries.entries().next().value;this.entries.delete(id);this.bytes-=item.bytes??0;}
      let buffer;
      try{const response=await fetch(asset.src,{signal});const bytes=await response.arrayBuffer();cancelled(signal);buffer=await this.getContext().decodeAudioData(bytes);}
      catch(error){if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');const failure=Error(`Cannot decode sound in ${asset.name}. Relink a supported audio source, or explicitly mute this clip for a picture-only result.`);this.entries.set(asset.id,{src:asset.src,error:failure,bytes:0});this.onChange();throw failure;}
      cancelled(signal);if(this.closed)throw Error('Audio workspace is closed.');
      if(buffer.numberOfChannels>2)throw Error(`${asset.name} has ${buffer.numberOfChannels} channels. Supply a mono or stereo mix; surround routing is not supported.`);
      const size=buffer.length*buffer.numberOfChannels*4;if(size>this.budget)throw Error(`${asset.name} exceeds the decoded-audio budget. Import a shorter proxy.`);
      while(this.bytes+size>this.budget&&this.entries.size){const [id,item]=this.entries.entries().next().value;this.entries.delete(id);this.bytes-=item.bytes??0;}
      const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
      const item={src:asset.src,bytes:size,sampleRate:buffer.sampleRate,duration:buffer.duration,channels,buffer,peaks:null};
      this.entries.set(asset.id,item);this.bytes+=size;this.onChange();return item;
    });this.queue=operation.catch(()=>{});return operation;
  }
  peaks(asset){const operation=this.peakQueue.then(()=>this.analyzePeaks(asset));this.peakQueue=operation.catch(()=>{});return operation;}
  async analyzePeaks(asset){const data=await this.load(asset);if(data.peaks)return data.peaks;
    const source=`const peakData=${peakData.toString()};onmessage=e=>{const result=peakData(e.data.channels);postMessage(result,[result.peaks.buffer]);};`;
    const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
    try{data.peaks=await new Promise((resolve,reject)=>{const worker=new Worker(url);const finish=(error,result)=>{clearTimeout(timer);worker.terminate();error?reject(error):resolve(result);};const timer=setTimeout(()=>finish(Error('Waveform analysis timed out.')),20000);worker.onmessage=e=>finish(null,{...e.data,sampleRate:data.sampleRate});worker.onerror=()=>finish(Error('Waveform analysis is unavailable.'));worker.postMessage({channels:data.channels});});return data.peaks;}
    finally{URL.revokeObjectURL(url);}
  }
  async prepare(project,signal,onProgress=()=>{}){
    this.prune(project.assets);const clips=audioClips(project),ids=[...new Set(clips.map(c=>c.assetId))],buffers={};let total=0;
    let voices=0;for(const event of clips.flatMap(c=>[[c.start,1],[c.start+c.duration,-1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])){voices+=event[1];if(voices>64)throw Error('This mix exceeds the 64 simultaneous audio-clip limit. Simplify overlapping sound.');}
    for(let i=0;i<ids.length;i++){cancelled(signal);const asset=project.assets.find(a=>a.id===ids[i]);const data=await this.load(asset,signal);total+=data.bytes;if(total>this.budget)throw Error('The active sound sources exceed the 96 MiB audio budget. Use shorter proxies or a smaller sequence.');
      for(const clip of clips.filter(c=>c.assetId===ids[i]))if(clip.sourceIn+Math.min(clip.duration,project.duration-clip.start)*clip.playbackRate>data.duration+1/project.fps)throw Error(`${clip.name} extends beyond its sound source. Shorten the edit or relink it.`);
      buffers[ids[i]]=data;onProgress((i+1)/ids.length);}
    return {clips,buffers};
  }
  async dispose(){this.closed=true;this.entries.clear();this.bytes=0;if(this.context&&this.context.state!=='closed')await this.context.close();}
}

// The same pure sampler runs in the render thread. No decoding or allocation per sample.
export const processorSource=()=>`const {mixSample}=(${createMixer.toString()})();
class FluxAudio extends AudioWorkletProcessor {
 constructor(){super();this.clips=[];this.buffers={};this.position=0;this.rate=0;this.targetRate=0;this.remaining=0;this.level=0;this.report=0;this.cross=0;this.last=[0,0];this.anchor=[0,0];this.duration=0;this.meter=0;
 this.port.onmessage=({data:d})=>{if(d.type==='project'){this.clips=d.clips;this.buffers=d.buffers;this.duration=d.duration;this.port.postMessage({type:'ready',version:d.version});}if(d.type==='transport'){this.anchor=this.last.slice();this.cross=128;this.position=d.position;this.targetRate=d.rate;this.rate=d.smooth?this.rate:d.rate;this.remaining=d.frames??Infinity;}if(d.type==='stop'){this.targetRate=0;this.remaining=0;}if(d.type==='clear'){this.clips=[];this.buffers={};this.targetRate=0;this.rate=0;}};}
 process(inputs,outputs){const out=outputs[0],extent=out[0].length*4/sampleRate,clips=this.clips.filter(c=>c.start<this.position+extent&&c.start+c.duration>this.position-extent);for(let i=0;i<out[0].length;i++){
  const audible=this.remaining>0&&this.position>=0&&this.position<this.duration&&Math.abs(this.targetRate)>.001;this.level+=(Number(audible)-this.level)*.04;this.rate+=(this.targetRate-this.rate)*.015;
  for(let channel=0;channel<out.length;channel++){let sample=audible||this.level>.00001?mixSample(clips,this.buffers,this.position,channel):0;if(this.cross>0)sample=sample*(1-this.cross/128)+this.anchor[channel]*this.cross/128;sample=Math.max(-1,Math.min(1,sample*this.level));out[channel][i]=sample;this.last[channel]=sample;this.meter=Math.max(this.meter,Math.abs(sample));}
  if(this.cross>0)this.cross--;if(audible){this.position+=this.rate/sampleRate;this.remaining--;}
 }this.report+=out[0].length;if(this.report>=sampleRate/20){this.port.postMessage({type:'meter',peak:this.meter,position:this.position,active:this.remaining>0&&this.level>.01});this.report=0;this.meter=0;}return true;}
}registerProcessor('flux-audio',FluxAudio);`;

export class AudioEngine {
  constructor(onStatus=()=>{}){this.store=new AudioStore();this.onStatus=onStatus;this.node=null;this.loading=null;this.epoch=0;this.version=0;this.mode='stop';this.clock=null;this.project=null;this.disposed=false;}
  async init(){if(this.node)return this.node;if(this.loading)return this.loading;this.loading=(async()=>{const ctx=this.store.getContext();await ctx.resume();if(!ctx.audioWorklet)throw Error('Audible scrub requires AudioWorklet support in a secure browser window.');const url=URL.createObjectURL(new Blob([processorSource()],{type:'text/javascript'}));try{await ctx.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}if(this.disposed)return null;this.node=new AudioWorkletNode(ctx,'flux-audio',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});this.node.connect(ctx.destination);this.node.port.onmessage=({data})=>{if(data.type==='meter')this.onStatus(data);if(data.type==='ready')this.ready?.(data.version);};return this.node;})();try{return await this.loading;}finally{this.loading=null;}}
  async prepare(project){const token=++this.version;const node=await this.init();if(!node||token!==this.version)return false;if(this.project===project)return true;
    this.onStatus({type:'loading'});const {clips,buffers}=await this.store.prepare(project);if(token!==this.version||this.disposed)return false;
    await new Promise(resolve=>{this.ready=version=>{if(version===token)resolve();};node.port.postMessage({type:'project',clips,buffers:Object.fromEntries(Object.entries(buffers).map(([id,b])=>[id,{sampleRate:b.sampleRate,channels:b.channels}])),duration:project.duration,version:token});});this.project=project;return true;
  }
  async play(project,position,rate=1){const epoch=++this.epoch;this.mode='loading';if(!await this.prepare(project)||epoch!==this.epoch)return false;const ctx=this.store.getContext();await ctx.resume();if(epoch!==this.epoch)return false;this.mode='play';this.clock={start:ctx.currentTime,position,rate};this.node.port.postMessage({type:'transport',position,rate});return true;}
  currentTime(){return this.clock?this.clock.position+(this.store.getContext().currentTime-this.clock.start)*this.clock.rate:null;}
  async scrub(project,position,rate=1,scratch=false){const epoch=this.epoch;if(!await this.prepare(project)||epoch!==this.epoch)return;await this.store.getContext().resume();if(epoch!==this.epoch)return;this.mode='scrub';this.clock=null;this.node.port.postMessage({type:'transport',position,rate:Math.max(-4,Math.min(4,rate)),smooth:scratch,frames:Math.round(this.store.getContext().sampleRate*(scratch?.11:.075))});}
  stop(){this.epoch++;this.mode='stop';this.clock=null;this.node?.port.postMessage({type:'stop'});}
  invalidate(){this.stop();this.project=null;this.version++;this.node?.port.postMessage({type:'clear'});}
  async dispose(){this.disposed=true;this.invalidate();this.node?.disconnect();await this.store.dispose();}
}

export async function renderAudioMix(project,store,signal,onProgress=()=>{}){
  const {clips,buffers}=await store.prepare(project,signal,onProgress),sampleRate=48000;
  const frames=Math.ceil(project.duration*sampleRate);
  if(frames*8>128*1024*1024)throw Error('This real-time export supports up to 349 seconds of stereo mix. Export a shorter sequence.');
  const buffer=store.getContext().createBuffer(2,frames,sampleRate),channels=[buffer.getChannelData(0),buffer.getChannelData(1)];let peak=0;
  for(let start=0;start<frames;start+=8192){cancelled(signal);for(let i=start;i<Math.min(frames,start+8192);i++)for(let c=0;c<2;c++){const value=mixSample(clips,buffers,i/sampleRate,c);peak=Math.max(peak,Math.abs(value));channels[c][i]=Math.max(-1,Math.min(1,value));}if(start%131072===0){onProgress(start/frames);await new Promise(resolve=>setTimeout(resolve,0));}}
  return {buffer,peak};
}
