// Pure PCM math shared by offline export and the AudioWorklet transport.
export function createMixer(){
function clipGain(clip,time){
  const elapsed=time-clip.start,remaining=clip.duration-elapsed;
  if(clip.muted||elapsed<0||remaining<=0)return 0;
  return (clip.volume??1)*Math.min(1,clip.fadeIn?elapsed/clip.fadeIn:1)*Math.min(1,clip.fadeOut?remaining/clip.fadeOut:1);
}
function readSample(samples,position){
  if(position<0||position>=samples.length)return 0;
  const i=Math.floor(position),fraction=position-i;
  return samples[i]*(1-fraction)+(samples[i+1]??0)*fraction;
}
function mixSample(clips,buffers,time,channel){
  let value=0;
  for(const clip of clips){const gain=clipGain(clip,time);if(!gain)continue;const data=buffers[clip.assetId];if(!data)continue;
    value+=readSample(data.channels[Math.min(channel,data.channels.length-1)],(clip.sourceIn+(time-clip.start)*clip.playbackRate)*data.sampleRate)*gain;
  }
  return value;
}
return {clipGain,readSample,mixSample};
}
export const {clipGain,readSample,mixSample}=createMixer();
export function peakData(channels,bucketSize=256){
  const length=channels[0]?.length??0,peaks=new Float32Array(Math.ceil(length/bucketSize)*2);
  for(let b=0;b<peaks.length/2;b++){let low=0,high=0;for(const samples of channels)for(let i=b*bucketSize;i<Math.min(length,(b+1)*bucketSize);i++){low=Math.min(low,samples[i]);high=Math.max(high,samples[i]);}peaks[b*2]=low;peaks[b*2+1]=high;}
  return {peaks,bucketSize,length};
}
