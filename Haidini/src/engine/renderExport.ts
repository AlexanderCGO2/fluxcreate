// WebM single-track VP8/VP9 muxing. Explicit frame timestamps decouple delivery
// duration from preview and simulation speed. No audio track is synthesized.
export type EncodedFrame={timestamp:number;duration:number;key:boolean;data:Uint8Array};
export type RenderOptions={width?:number;height?:number;start?:number;end?:number};
export const MAX_RENDER_FRAMES=18000;
export function renderSchedule(duration:number,fps:number,options:RenderOptions={}){
 const start=options.start??0,end=options.end??duration;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>duration||end<=start)throw new Error('Choose an export range inside the scene, with End after Start.');
 if(!Number.isInteger(fps)||fps<12||fps>60)throw new Error('Use a frame rate between 12 and 60.');
 const count=Math.ceil((end-start)*fps-1.e-8);
 if(count>MAX_RENDER_FRAMES)throw new Error('Render at most 18,000 frames per file. Choose a shorter export range.');
 return {count,start,end,duration:count/fps,time:(index:number)=>start+index/fps,timestamp:(index:number)=>Math.round(index*1e6/fps),frameDuration:(index:number)=>Math.round((index+1)*1e6/fps)-Math.round(index*1e6/fps)};
}
const bytes=(...values:number[])=>new Uint8Array(values);
const concat=(parts:Uint8Array[])=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;};
const uint=(value:number)=>{let size=1;while(value>=2**(size*8))size++;const out=new Uint8Array(size);for(let i=size-1;i>=0;i--){out[i]=value%256;value=Math.floor(value/256);}return out;};
function size(value:number){for(let n=1;n<=8;n++)if(value<2**(7*n)-1){const out=new Uint8Array(n);let v=value;for(let i=n-1;i>=0;i--){out[i]=v%256;v=Math.floor(v/256);}out[0]|=1<<(8-n);return out;}throw new Error('Video exceeds the WebM size limit.');}
const element=(id:number,data:Uint8Array)=>concat([uint(id),size(data.length),data]);
const number=(id:number,value:number)=>element(id,uint(value));
const string=(id:number,value:string)=>element(id,new TextEncoder().encode(value));
const master=(id:number,children:Uint8Array[])=>element(id,concat(children));
const float=(id:number,value:number)=>{const data=new Uint8Array(8);new DataView(data.buffer).setFloat64(0,value);return element(id,data);};
export function muxWebM(frames:EncodedFrame[],width:number,height:number,fps:number,codec:'V_VP8'|'V_VP9'){
 if(!frames.length||!frames[0].key)throw new Error('The encoder did not produce an initial keyframe.');
 const header=master(0x1a45dfa3,[number(0x4286,1),number(0x42f7,1),number(0x42f2,4),number(0x42f3,8),string(0x4282,'webm'),number(0x4287,4),number(0x4285,2)]);
 const duration=(frames.at(-1)!.timestamp+frames.at(-1)!.duration)/1000;
 const info=master(0x1549a966,[number(0x2ad7b1,1000000),string(0x4d80,'Fluxini'),string(0x5741,'Fluxini'),float(0x4489,duration)]);
 const tracks=master(0x1654ae6b,[master(0xae,[number(0xd7,1),number(0x73c5,1),number(0x83,1),number(0x9c,0),string(0x86,codec),number(0x23e383,Math.round(1e9/fps)),master(0xe0,[number(0xb0,width),number(0xba,height)])])]);
 const clusters:Uint8Array[]=[];let base=-1,blocks:Uint8Array[]=[];
 const flush=()=>{if(blocks.length)clusters.push(master(0x1f43b675,[number(0xe7,base),...blocks]));blocks=[];};
 for(const frame of frames){const time=Math.round(frame.timestamp/1000);if(base<0||time-base>30000||frame.key&&blocks.length){flush();base=time;}const relative=time-base;const block=concat([bytes(0x81,relative>>8&255,relative&255,frame.key?0x80:0),frame.data]);blocks.push(element(0xa3,block));}flush();
 // Unknown-sized Segment permits Blob assembly without another full-video copy.
 return new Blob([header.buffer,bytes(0x18,0x53,0x80,0x67,0x01,0xff,0xff,0xff,0xff,0xff,0xff,0xff).buffer,info.buffer,tracks.buffer,...clusters.map(c=>c.buffer as ArrayBuffer)],{type:'video/webm'});
}
export function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted)return Promise.reject(new DOMException('Export cancelled.','AbortError'));
 return new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Export cancelled.','AbortError'));signal.addEventListener('abort',abort,{once:true});promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
}
export async function encodeVideo(canvas:HTMLCanvasElement,fps:number,schedule:ReturnType<typeof renderSchedule>,render:(time:number)=>Promise<void>,signal:AbortSignal,progress:(frame:number,total:number)=>void){
 if(typeof VideoEncoder==='undefined'||typeof VideoFrame==='undefined')throw new Error('Frame rendering needs WebCodecs. Open Fluxini in current Edge or Chrome.');
 let config:VideoEncoderConfig|undefined,codec:'V_VP8'|'V_VP9'='V_VP9';
 for(const candidate of ['vp09.00.10.08','vp8']){const proposal:VideoEncoderConfig={codec:candidate,width:canvas.width,height:canvas.height,framerate:fps,bitrate:Math.max(2000000,Math.min(24000000,canvas.width*canvas.height*fps*.16)),latencyMode:'realtime'};if((await VideoEncoder.isConfigSupported(proposal)).supported){config=proposal;codec=candidate==='vp8'?'V_VP8':'V_VP9';break;}}
 if(!config)throw new Error('No supported VP8/VP9 video encoder is available at this size.');
 const frames:EncodedFrame[]=[];let failure:Error|undefined,byteLength=0;
 const encoder=new VideoEncoder({output:chunk=>{const data=new Uint8Array(chunk.byteLength);chunk.copyTo(data);byteLength+=data.length;
  if(byteLength>512*1024**2){failure=new Error('The video reached the 512 MB in-memory limit. Render a shorter range.');return;}
  const index=Math.round(chunk.timestamp*fps/1e6);frames.push({timestamp:chunk.timestamp,duration:schedule.frameDuration(index),key:chunk.type==='key',data});
 },error:e=>{failure=e;}});
 const check=()=>{if(signal.aborted)throw new DOMException('Export cancelled.','AbortError');if(failure)throw failure;};
 try{encoder.configure(config);for(let i=0;i<schedule.count;i++){check();await abortable(render(schedule.time(i)),signal);check();
   const frame=new VideoFrame(canvas,{timestamp:schedule.timestamp(i),duration:schedule.frameDuration(i)});
   try{encoder.encode(frame,{keyFrame:i%(fps*2)===0});}finally{frame.close();}
   if(encoder.encodeQueueSize>3)await abortable(encoder.flush(),signal);progress(i+1,schedule.count);
   // Let cancellation, the UI and asynchronous codec output make progress.
   if(i%4===0)await new Promise(resolve=>setTimeout(resolve,0));
  }await abortable(encoder.flush(),signal);check();frames.sort((a,b)=>a.timestamp-b.timestamp);
  if(frames.length!==schedule.count)throw new Error('The encoder returned an incomplete frame sequence.');
  return muxWebM(frames,canvas.width,canvas.height,fps,codec);
 }finally{if(encoder.state!=='closed')encoder.close();}
}
