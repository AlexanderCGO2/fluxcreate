import {Output,WebMOutputFormat,BufferTarget,CanvasSource,AudioBufferSource,Quality,canEncodeVideo,canEncodeAudio} from 'mediabunny';

export const checkExport = signal => { if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError'); };
const unavailable = () => new Error('Precise WebM encoding is unavailable in this browser. Choose the explicit real-time WebM fallback, or use a current Chrome or Edge browser.');

export function validateVideoExport(comp, precise = true) {
  if (!Number.isFinite(comp.duration) || comp.duration <= 0 || comp.duration > 60) throw new Error('Video export duration must be greater than 0 and at most 60 seconds.');
  if (!Number.isFinite(comp.fps) || comp.fps < 1 || comp.fps > 60) throw new Error('Video export frame rate must be between 1 and 60 fps.');
  if (precise && (!Number.isInteger(comp.width) || !Number.isInteger(comp.height) || comp.width < 1 || comp.height < 1 || comp.width > 4096 || comp.height > 4096 || comp.width * comp.height > 8847360)) throw new Error('Precise export supports up to 4096 pixels per side and 8,847,360 pixels. Reduce the composition resolution.');
  if (comp.layers.filter(l => ['image','video','scene3d'].includes(l.type) && l.visible !== false && l.start < comp.duration && l.end > 0).length > 64) throw new Error('Video export supports at most 64 visual source layers. Simplify the composition.');
}

export async function preciseCodec(comp, pictureOnly, signal) {
  checkExport(signal);
  if (typeof globalThis.VideoEncoder === 'undefined' || typeof globalThis.VideoFrame === 'undefined' || !pictureOnly && typeof globalThis.AudioEncoder === 'undefined') throw unavailable();
  const quality = new Quality({bitrate:Math.max(2500000, Math.min(20000000, comp.width * comp.height * comp.fps * .15))});
  const codec = await canEncodeVideo('vp9',{width:comp.width,height:comp.height,quality}) ? 'vp9' : await canEncodeVideo('vp8',{width:comp.width,height:comp.height,quality}) ? 'vp8' : null;
  checkExport(signal);
  if (!codec || !pictureOnly && !await canEncodeAudio('opus',{sampleRate:48000,numberOfChannels:2})) throw unavailable();
  return {codec,quality};
}

/** Await every source frame and encoder backpressure; wall-clock speed never sets timestamps. */
export async function encodeCompositionWebM({comp, canvas, mix, drawFrame, codec, quality, signal, onProgress}) {
  let output, video, audio, bytes = 0;
  const packetBudget = packet => { bytes += packet.data.byteLength; if (bytes > 256 * 1024 * 1024) throw new Error('This export exceeds the 256 MiB output budget. Use a shorter or smaller composition.'); };
  const abort = () => { output?.cancel().catch(()=>{}); };
  try {
    checkExport(signal);
    output = new Output({format:new WebMOutputFormat(),target:new BufferTarget()});
    video = new CanvasSource(canvas,{codec,quality,keyFrameInterval:1,onEncodedPacket:packetBudget});
    output.addVideoTrack(video,{frameRate:comp.fps});
    if (mix) { audio = new AudioBufferSource({codec:'opus',quality:new Quality({bitrate:192000}),onEncodedPacket:packetBudget}); output.addAudioTrack(audio); }
    signal?.addEventListener('abort',abort,{once:true});
    await output.start();
    const count = Math.ceil(comp.duration * comp.fps);
    let sampleIndex = 0;
    for (let frame = 0; frame < count; frame++) {
      checkExport(signal);
      const time = frame / comp.fps, end = Math.min(comp.duration,(frame + 1) / comp.fps);
      await drawFrame(time);checkExport(signal);
      await video.add(time,end-time);checkExport(signal);
      if (audio) {
        const endSample = Math.round(end * 48000), frames = endSample - sampleIndex;
        if (frames > 0) {
          const chunk = mix.context.createBuffer(2,frames,48000);
          for (let channel=0;channel<2;channel++) chunk.copyToChannel(mix.buffer.getChannelData(channel).subarray(sampleIndex,endSample),channel);
          await audio.add(chunk);sampleIndex=endSample;
        }
      }
      onProgress(.2 + .75 * (frame+1)/count);
      if (frame % 8 === 0) await new Promise(resolve=>setTimeout(resolve,0));
    }
    checkExport(signal);video.close();audio?.close();
    await output.finalize();checkExport(signal);
    if (output.target.buffer.byteLength > 256 * 1024 * 1024) throw new Error('This export exceeds the 256 MiB output budget. Use a shorter or smaller composition.');
    const blob = new Blob([output.target.buffer],{type:'video/webm'});
    onProgress(1);return {blob,mimeType:'video/webm',hasAudio:!!mix,mode:'precise'};
  } catch(error) {
    if (output && output.state !== 'finalized') await output.cancel().catch(()=>{});
    checkExport(signal);throw error;
  } finally {
    signal?.removeEventListener('abort',abort);
    video?.close();audio?.close();
  }
}
