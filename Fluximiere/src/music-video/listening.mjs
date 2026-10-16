const MiB=1024*1024;
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;

/** A bounded listening derivative, never a replacement for the original song. */
export function encodeListeningProxy(mono,sampleRate=8000) {
  if(!(mono instanceof Float32Array)||!integer(sampleRate,8000,48000))throw new Error('Listening audio needs a Float32 mono proxy and a valid sample rate.');
  if(mono.length/sampleRate<1||mono.length/sampleRate>180)throw new Error('Listening audio duration must be between 1 and 180 seconds.');
  const bytes=44+mono.length*2;
  if(bytes>3*MiB)throw new Error('Listening audio exceeds its request budget. Use an 8 kHz mono proxy for the complete song.');
  for(const value of mono){if(!Number.isFinite(value))throw new Error('Listening samples must be finite.');if(value < -1 || value > 1)throw new Error('Listening proxy amplitude would cause clipping. Normalize the listening derivative first.');}
  const buffer=new ArrayBuffer(bytes),view=new DataView(buffer);
  const chars=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  chars(0,'RIFF');view.setUint32(4,bytes-8,true);chars(8,'WAVE');chars(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);chars(36,'data');view.setUint32(40,mono.length*2,true);
  for(let i=0;i<mono.length;i++)view.setInt16(44+i*2,Math.round(mono[i]*(mono[i]<0?32768:32767)),true);
  return new Blob([buffer],{type:'audio/wav'});
}

/** Full-range manual musical anchors. Every position is computed from the absolute
 * time to avoid accumulating rounding error across a long song. */
export function createManualBeatGrid(analysis,bpm,firstBeatSeconds=0) {
  if(!analysis||!integer(analysis.sampleRate,8000,192000)||!integer(analysis.sampleCount,analysis.sampleRate,analysis.sampleRate*180)||!integer(analysis.revision,0,Number.MAX_SAFE_INTEGER-1))throw new Error('A valid canonical music analysis is required.');
  if(!Number.isFinite(bpm)||bpm<40||bpm>240)throw new Error('Manual tempo must be between 40 and 240 BPM.');
  const duration=analysis.sampleCount/analysis.sampleRate;
  if(!Number.isFinite(firstBeatSeconds)||firstBeatSeconds<0||firstBeatSeconds>=duration)throw new Error('The first beat offset must be inside the song.');
  const beats=[];
  for(let i=0;;i++){
    const sample=Math.round((firstBeatSeconds+i*60/bpm)*analysis.sampleRate);
    if(sample>=analysis.sampleCount)break;
    if(beats.length>=1500)throw new Error('The manual beat grid exceeds 1,500 anchors.');
    beats.push(sample);
  }
  if(!beats.length)throw new Error('The first beat offset must leave at least one sample in the song.');
  return[{id:`manual-r${analysis.revision+1}-full`,startSample:0,endSample:analysis.sampleCount,beats}];
}

/** Small raster-only references keep Gemini's full-song request under its transport
 * ceiling. Original images stay in the local reference board. */
export async function thumbnailReference(blob) {
  if(!(blob instanceof Blob)||!/^image\/(png|jpeg|webp|avif|gif)$/.test(blob.type))throw new Error('Use a PNG, JPEG, WebP, AVIF or GIF reference image.');
  if(blob.size===0||blob.size>32*MiB)throw new Error('Reference image size must be between 1 byte and 32 MiB.');
  if(typeof createImageBitmap!=='function'||typeof document==='undefined')throw new Error('Image thumbnails need this browser’s image decoder.');
  let bitmap;
  try { bitmap=await createImageBitmap(blob); }
  catch { throw new Error('The reference image could not be decoded.'); }
  try{
    if(!integer(bitmap.width,1,16384)||!integer(bitmap.height,1,16384)||bitmap.width*bitmap.height>32*1024*1024)throw new Error('Reference image dimensions exceed the thumbnail budget.');
    const canvas=document.createElement('canvas');
    for(const edge of [384,256]){
      const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');
      if(!context)throw new Error('Image thumbnails are unavailable in this browser.');
      context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [.82,.65,.45]){const data=canvas.toDataURL('image/jpeg',quality);if(data.startsWith('data:image/jpeg;base64,')&&data.length<64*1024)return data;}
    }
    throw new Error('The reference thumbnail exceeds the 64 KiB request budget.');
  }finally{bitmap.close();}
}
