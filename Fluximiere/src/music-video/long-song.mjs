import {Input,BlobSource,ALL_FORMATS,Output,BufferTarget,WavOutputFormat,Conversion,AudioSample} from 'mediabunny';

// Resampling can flush one extra sample. Bound the PCM payload to the exact edit.
function exactExcerpt(buffer,channels){
 const view=new DataView(buffer),length=180*48000*channels*2;let data,format;
 for(let offset=12;offset+8<=buffer.byteLength;){
  const size=view.getUint32(offset+4,true),end=offset+8+size;if(end>buffer.byteLength)throw Error('Invalid prepared audio.');
  const id=view.getUint32(offset,false);if(id===0x666d7420)format=offset+8;if(id===0x64617461)data=new Uint8Array(buffer,offset+8,size);
  offset=end+(size%2);
 }
 if(format===undefined||!data||data.byteLength<length||view.getUint16(format,true)!==1||view.getUint16(format+2,true)!==channels||view.getUint32(format+4,true)!==48000||view.getUint16(format+14,true)!==16)throw Error('The song could not be prepared as a complete three-minute excerpt.');
 const header=new ArrayBuffer(44),h=new DataView(header),text=(offset,s)=>[...s].forEach((c,i)=>h.setUint8(offset+i,c.charCodeAt(0)));
 text(0,'RIFF');h.setUint32(4,36+length,true);text(8,'WAVEfmt ');h.setUint32(16,16,true);h.setUint16(20,1,true);h.setUint16(22,channels,true);h.setUint32(24,48000,true);h.setUint32(28,48000*channels*2,true);h.setUint16(32,channels*2,true);h.setUint16(34,16,true);text(36,'data');h.setUint32(40,length,true);
 return new Blob([header,data.subarray(0,length)],{type:'audio/wav'});
}

/** Decode only the first three minutes. The original upload is never rewritten. */
export async function makeSongExcerpt(blob,{signal}={}){
 const abort=()=>{if(signal?.aborted)throw new DOMException('Music import cancelled.','AbortError');};abort();
 const input=new Input({source:new BlobSource(blob),formats:ALL_FORMATS});let conversion;
 const cancel=()=>{conversion?.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
 try{
  const track=await input.getPrimaryAudioTrack();abort();if(!track||!await track.canDecode())throw Error('This long-song codec cannot be trimmed in your browser. Try WAV, MP3, or AAC.');
  const channels=await track.getNumberOfChannels();if(channels<1||channels>2)throw Error('Music-video mode needs a mono or stereo song.');
  const output=new Output({format:new WavOutputFormat(),target:new BufferTarget()});
  conversion=await Conversion.init({input,output,trim:{start:0,end:180},tags:{},video:{discard:true},audio:async t=>t===track?{codec:'pcm-s16',sampleRate:48000,numberOfChannels:channels,forceTranscode:true,process:sample=>{
   abort();if(sample.timestamp+sample.duration<=175)return sample;
   const buffer=sample.toAudioBuffer();for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++){const position=Math.round(sample.timestamp*48000)+i;const gain=Math.min(1,Math.max(0,(180*48000-1-position)/(5*48000)));data[i]*=gain;}}
   return AudioSample.fromAudioBuffer(buffer,sample.timestamp);
  }}:{discard:true}});
  abort();if(!conversion.isValid)throw Error('This song cannot be prepared for the music video.');await conversion.execute();abort();
  if(!output.target.buffer||output.target.buffer.byteLength>36*1024*1024)throw Error('The prepared song exceeds its audio budget.');
  return exactExcerpt(output.target.buffer,channels);
 }catch(error){abort();throw error;}finally{signal?.removeEventListener('abort',cancel);input.dispose();}
}
