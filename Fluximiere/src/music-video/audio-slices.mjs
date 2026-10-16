const MiB=1024*1024;
export const MUSIC_SLICE_LIMITS=Object.freeze({sourceBytes:96*MiB,workingBytes:8*MiB,duration:180});
const HASH=/^[a-f0-9]{64}$/i;
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;

/** Sample-exact IEEE float WAV from canonical decoded PCM. Context outside the
 * source is silence and explicitly described; the supplied master is never edited. */
export function cutAudioSlice(source, range) {
  const {channels,sampleRate,sourceHash}=source??{};
  if(!integer(sampleRate,8000,192000))throw new Error('Invalid canonical sample rate.');
  if(!Array.isArray(channels)||channels.length<1||channels.length>2||channels.some(c=>!(c instanceof Float32Array)))throw new Error('Canonical PCM must contain one or two Float32 channels.');
  const sourceCount=channels[0].length;
  if(!integer(sourceCount,sampleRate,sampleRate*MUSIC_SLICE_LIMITS.duration)||channels.some(c=>c.length!==sourceCount))throw new Error('Canonical channel duration must match and be between 1 and 180 seconds.');
  if(channels.reduce((n,c)=>n+c.byteLength,0)>MUSIC_SLICE_LIMITS.sourceBytes)throw new Error('Canonical PCM exceeds the 96 MiB budget.');
  if(!HASH.test(sourceHash??'')||!HASH.test(range?.sourceHash??'')||sourceHash.toLowerCase()!==range.sourceHash.toLowerCase())throw new Error('Canonical source hash does not match the cut request.');
  const {startSample,endSample,contextBeforeSamples=0,contextAfterSamples=0}=range;
  if(!integer(startSample,0,sourceCount-1)||!integer(endSample,startSample+1,sourceCount))throw new Error('Cut sample range must be increasing canonical sample integers.');
  if(!integer(contextBeforeSamples,0,Number.MAX_SAFE_INTEGER)||!integer(contextAfterSamples,0,Number.MAX_SAFE_INTEGER))throw new Error('Cut context must use nonnegative integer samples.');
  const sampleCount=endSample-startSample+contextBeforeSamples+contextAfterSamples;
  const dataBytes=sampleCount*channels.length*4;
  // fmt IEEE float + fact chunk + data header.
  const headerBytes=56;
  if(!Number.isSafeInteger(dataBytes)||dataBytes+headerBytes>MUSIC_SLICE_LIMITS.workingBytes)throw new Error('Audio excerpt exceeds the 8 MiB budget.');
  const firstSample=startSample-contextBeforeSamples, lastSample=endSample+contextAfterSamples;
  const from=Math.max(0,firstSample),to=Math.min(sourceCount,lastSample);
  for(let c=0;c<channels.length;c++)for(let i=from;i<to;i++)if(!Number.isFinite(channels[c][i]))throw new Error('Canonical samples must be finite.');
  const wav=new ArrayBuffer(headerBytes+dataBytes),view=new DataView(wav);
  const chars=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  chars(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);chars(8,'WAVE');
  chars(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,3,true);view.setUint16(22,channels.length,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*channels.length*4,true);view.setUint16(32,channels.length*4,true);view.setUint16(34,32,true);
  chars(36,'fact');view.setUint32(40,4,true);view.setUint32(44,sampleCount,true);
  chars(48,'data');view.setUint32(52,dataBytes,true);
  for(let i=from;i<to;i++)for(let c=0;c<channels.length;c++)view.setFloat32(headerBytes+((i-firstSample)*channels.length+c)*4,channels[c][i],true);
  return{wav,sliceMetadata:{sourceHash:sourceHash.toLowerCase(),sampleRate,startSample,endSample,contextBeforeSamples,contextAfterSamples,headPaddingSamples:Math.max(0,-firstSample),tailPaddingSamples:Math.max(0,lastSample-sourceCount),shotAnchorOffsetSamples:contextBeforeSamples,sampleCount,channelCount:channels.length}};
}
