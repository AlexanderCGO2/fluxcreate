import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/core.mjs';
import {audioLayerGain} from '../src/audio.mjs';
import {encodeExchange,decodeExchange,toFluxiffects} from '@flux-studio/exchange';
const quadratic=[1/3,0,2/3,1/3];
test('custom cubic easing solves time before value, with exact endpoints and bounded gain',()=>{
 assert.ok(Math.abs(core.ease(.5,'cubic-bezier',quadratic)-.25)<1e-7,'Custom control points must drive the evaluator');
 for(const [time,value]of[[0,0],[.25,.0625],[.75,.5625],[1,1]])assert.ok(Math.abs(core.ease(time,'cubic-bezier',quadratic)-value)<1e-7);
 for(const curve of [[0,0,0,1],[1,0,1,1],[1,1,0,0]])for(let n=0;n<=100;n++){const value=core.ease(n/100,'cubic-bezier',curve);assert.ok(Number.isFinite(value)&&value>=0&&value<=1);}
});
test('native custom curves survive parse, value edits and affect numeric, color and audio output',()=>{
 let layer=core.createLayer('audio',{id:'sound',start:0,end:2,volume:1});layer=core.setKeyframe(layer,'volume',0,.2,'cubic-bezier',quadratic);layer=core.setKeyframe(layer,'volume',1,1,'linear');
 assert.ok(Math.abs(audioLayerGain(layer,.5)-.4)<1e-7);assert.ok(Math.abs(core.evaluateLayer(layer,.5).volume-.4)<1e-7);
 layer=core.setKeyframe(layer,'volume',0,.1);assert.deepEqual(layer.keyframes.volume[0].bezier,quadratic);assert.equal(layer.keyframes.volume[0].easing,'cubic-bezier');
 const project=core.createBlankProject();core.getComp(project).layers=[layer];assert.deepEqual(core.getComp(core.parseProject(JSON.stringify(project)).project).layers[0].keyframes,layer.keyframes);
 const handoff=decodeExchange(encodeExchange({app:'fluxiffects',project}));assert.deepEqual(core.getComp(core.parseProject(JSON.stringify(toFluxiffects(handoff).project)).project).layers[0].keyframes,layer.keyframes);
 let shape=core.setKeyframe(core.createLayer('solid'),'fill',0,'#000000','cubic-bezier',quadratic);shape=core.setKeyframe(shape,'fill',1,'#ffffff');assert.equal(core.evaluateLayer(shape,.5).fill,'#404040');
});
test('malformed or overshooting curves reject atomically and locked keys cannot be changed',()=>{
 for(const curve of [[-1,0,1,1],[0,0,2,1],[0,-.1,1,1],[0,0,1,1.1],[0,0,1],null,[0,NaN,1,1]]){const p=core.createBlankProject();core.getComp(p).layers=[core.createLayer('rectangle',{keyframes:{x:[{id:'a',time:0,value:1,easing:'cubic-bezier',bezier:curve}]}})];assert.throws(()=>core.parseProject(JSON.stringify(p)),/curve|control|Bezier/i);}
 const layer=core.setKeyframe(core.createLayer('rectangle'),'x',0,10);const before=structuredClone(layer);assert.throws(()=>core.updateKeyframeEasing({...layer,locked:true},'x',layer.keyframes.x[0].id,'cubic-bezier',quadratic),/lock/i);assert.deepEqual(layer,before);
 const next=core.updateKeyframeEasing(layer,'x',layer.keyframes.x[0].id,'cubic-bezier',quadratic);assert.deepEqual(next.keyframes.x[0].bezier,quadratic);assert.equal(next.keyframes.x[0].id,layer.keyframes.x[0].id);assert.deepEqual(layer,before);
});
