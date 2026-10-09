import test from 'node:test';
import assert from 'node:assert/strict';
import {clipGain,readSample,mixSample,peakData} from '../src/audio-math.mjs';
import vm from 'node:vm';
import {processorSource} from '../src/audio.mjs';
import {createProject,makeClip,toMotion,fromMotion} from '../src/model.mjs';
const clip={start:1,duration:2,sourceIn:.5,playbackRate:2,volume:.5,opacity:0,fadeIn:.5,fadeOut:.5,muted:false,assetId:'a'};
test('audio envelopes ignore picture opacity and retain timing, volume, mute and fades',()=>{
  assert.equal(clipGain(clip,.9),0);assert.equal(clipGain(clip,1.25),.25);assert.equal(clipGain(clip,2),.5);assert.equal(clipGain(clip,2.75),.25);assert.equal(clipGain(clip,3),0);assert.equal(clipGain({...clip,muted:true},2),0);
});
test('source in, playback speed, stereo and mono mapping share exact interpolated samples',()=>{
  const buffers={a:{sampleRate:4,channels:[Float32Array.from([0,.1,.2,.3,.4,.5,.6,.7,.8,.9,1]),Float32Array.from([0,-.1,-.2,-.3,-.4,-.5,-.6,-.7,-.8,-.9,-1])]}};
  assert.ok(Math.abs(mixSample([clip],buffers,1.75,0)-.4)<1e-6);assert.ok(Math.abs(mixSample([clip],buffers,1.75,1)+.4)<1e-6);
  assert.equal(readSample(Float32Array.from([0,1]),.25),.25);assert.equal(readSample(Float32Array.from([1,1]),-1),0);assert.equal(readSample(Float32Array.from([1,1]),2),0);
  assert.equal(mixSample([{...clip,fadeIn:0,fadeOut:0}],{a:{sampleRate:1,channels:[Float32Array.of(1,1,1)]}},1.5,1),.5);
});
test('actual peak analysis retains silence, positive and negative impulses in each channel',()=>{
  const values=peakData([Float32Array.from([0,0,0,.7,0,0,0,0]),Float32Array.from([0,0,0,0,0,-.9,0,0])],2);
  assert.deepEqual(Array.from(values.peaks).map(x=>Math.round(x*10)/10),[0,0,0,.7,-.9,0,0,0]);
});
test('signed worklet cursor reverses, interpolates, stops and respects sequence bounds',()=>{
  let Processor;const messages=[];vm.runInNewContext(processorSource(),{AudioWorkletProcessor:class{constructor(){this.port={postMessage:value=>messages.push(value)};}},sampleRate:48000,registerProcessor:(_,type)=>Processor=type});
  const processor=new Processor(),send=data=>processor.port.onmessage({data}),samples=new Float32Array(48000);for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i/48000*440*Math.PI*2)*.5;
  send({type:'project',version:1,duration:1,clips:[{...clip,start:0,duration:1,sourceIn:0,playbackRate:1,fadeIn:0,fadeOut:0}],buffers:{a:{channels:[samples],sampleRate:48000}}});
  send({type:'transport',position:.5,rate:-1});const output=[new Float32Array(128),new Float32Array(128)];processor.process([], [output]);assert.ok(processor.position<.5);assert.ok(output[0].some(value=>value!==0));assert.deepEqual(output[0],output[1]);
  send({type:'stop'});for(let i=0;i<12;i++)processor.process([], [output]);assert.ok(output[0].every(value=>Math.abs(value)<1e-5));
  send({type:'transport',position:1.5,rate:4});for(let i=0;i<12;i++)processor.process([], [output]);assert.ok(output[0].every(value=>value===0));assert.ok(messages.some(m=>m.type==='ready'));
});
test('audio fade lengths survive the compatible native motion handoff',()=>{
  const project=createProject();project.clips=[makeClip('audio',{duration:2,fadeIn:.4,fadeOut:.3,volume:.6})];const motion=toMotion(project),restored=fromMotion(motion).project.clips[0];assert.equal(motion.compositions[0].layers[0].fadeIn,.4);assert.equal(restored.fadeIn,.4);assert.equal(restored.fadeOut,.3);assert.equal(restored.volume,.6);
});
