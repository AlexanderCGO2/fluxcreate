import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/core.mjs';
import {audioLayerGain} from '../src/audio.mjs';
const curve=[1/3,0,2/3,1/3];
function fixture(){let layer=core.createLayer('audio',{id:'audio',start:0,end:4,volume:.3});for(const [time,value,easing]of[[0,.2,'cubic-bezier'],[1,1,'linear'],[3,.5,'hold']])layer=core.setKeyframe(layer,'volume',time,value,easing,easing==='cubic-bezier'?curve:undefined);return core.setKeyframe(layer,'x',0,40,'ease-in');}
test('moving selected keys preserves spacing, outgoing curves, IDs, unrelated tracks and audio values',()=>{
 assert.equal(typeof core.editKeyframes,'function');const layer=fixture(),before=structuredClone(layer),ids=layer.keyframes.volume.slice(0,2).map(k=>k.id),next=core.editKeyframes(layer,'volume',ids,{type:'move',delta:.5},{duration:4});
 assert.deepEqual(next.keyframes.volume.map(k=>k.time),[.5,1.5,3]);assert.deepEqual(next.keyframes.volume.map(k=>k.id),layer.keyframes.volume.map(k=>k.id));assert.deepEqual(next.keyframes.volume[0].bezier,curve);assert.deepEqual(next.keyframes.x,layer.keyframes.x);assert.equal(audioLayerGain(next,1),audioLayerGain(layer,.5));assert.deepEqual(layer,before);
 const p=core.createBlankProject({duration:4});core.getComp(p).layers=[next];assert.deepEqual(core.getComp(core.parseProject(JSON.stringify(p)).project).layers[0].keyframes,next.keyframes);
});
test('a selection move rejects locks, stale IDs, ambiguity, collisions and range errors without removing keys',()=>{
 const layer=fixture(),id=layer.keyframes.volume[0].id,before=structuredClone(layer);
 for(const [target,ids,action,options]of[[{...layer,locked:true},[id],{type:'move',delta:.2},{duration:4}],[layer,['missing'],{type:'delete'},{duration:4}],[layer,[id],{type:'move',delta:1},{duration:4}],[layer,[id],{type:'move',delta:-.1},{duration:4}],[layer,[id],{type:'move',delta:5},{duration:4}],[layer,[id],{type:'move',delta:NaN},{duration:4}],[layer,[id],{type:'move',delta:1},{duration:NaN}]])assert.throws(()=>core.editKeyframes(target,'volume',ids,action,options));
 const ambiguous=structuredClone(layer);ambiguous.keyframes.volume[1].id=id;assert.throws(()=>core.editKeyframes(ambiguous,'volume',[id],{type:'delete'},{duration:4}),/ambiguous|unique/i);assert.deepEqual(layer,before);
});
test('deleting a selection is atomic and removing the last keys restores the base property',()=>{
 const layer=fixture(),ids=layer.keyframes.volume.map(k=>k.id),next=core.editKeyframes(layer,'volume',ids.slice(0,2),{type:'delete'},{duration:4});assert.deepEqual(next.keyframes.volume,[layer.keyframes.volume[2]]);assert.deepEqual(next.keyframes.x,layer.keyframes.x);
 const empty=core.editKeyframes(layer,'volume',ids,{type:'delete'},{duration:4});assert.equal(empty.keyframes.volume,undefined);assert.equal(audioLayerGain(empty,.5),.3);assert.equal(layer.keyframes.volume.length,3);assert.equal(core.editKeyframes(layer,'volume',ids,{type:'move',delta:0},{duration:4}),layer);
});
test('fractional frame steps move every key equally without quantizing existing subframe offsets',()=>{
 const layer=fixture(),ids=layer.keyframes.volume.map(k=>k.id),step=1001/30000,next=core.editKeyframes(layer,'volume',ids,{type:'move',delta:step},{duration:4});for(let i=0;i<ids.length;i++)assert.ok(Math.abs(next.keyframes.volume[i].time-layer.keyframes.volume[i].time-step)<1e-12);
});
