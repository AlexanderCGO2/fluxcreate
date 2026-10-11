import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../src/core.mjs';
const curve=[1/3,0,2/3,1/3];
function fixture(property='x',type='rectangle') { let layer=core.createLayer(type,{start:.1,end:4,sourceIn:.25,playbackRate:1.5,modelClip:2});layer=core.setKeyframe(layer,property,.2,property==='fill'?'#000000':.2,'cubic-bezier',curve);return core.setKeyframe(layer,property,1.25,property==='fill'?'#ffffff':1,'hold'); }
function copy(layer,property='x'){assert.equal(typeof core.copyKeyframes,'function');return core.copyKeyframes(layer,property,layer.keyframes[property].map(k=>k.id));}
test('paste anchors seconds at playhead with detached values, fresh IDs, outgoing easing and native persistence',()=>{
 const source=fixture(),before=structuredClone(source),clip=copy(source),target=core.createLayer('ellipse',{start:.5,end:4,sourceIn:.7,playbackRate:2}),pasted=core.pasteKeyframes(target,'x',clip,.75,{duration:4});
 assert.deepEqual(pasted.keyframes.x.map(k=>k.time),[.75,1.8]);assert.deepEqual(pasted.keyframes.x.map(k=>k.value),[.2,1]);assert.deepEqual(pasted.keyframes.x[0].bezier,curve);assert.equal(pasted.keyframes.x[1].easing,'hold');assert.ok(pasted.keyframes.x.every(k=>!source.keyframes.x.some(s=>s.id===k.id)));assert.deepEqual(source,before);assert.deepEqual({...pasted,keyframes:{}},target);
 source.keyframes.x[0].bezier[1]=1;assert.deepEqual(clip.keys[0].bezier,curve);pasted.keyframes.x[0].bezier[1]=.5;assert.deepEqual(clip.keys[0].bezier,curve);
 const again=core.pasteKeyframes(target,'x',clip,.75,{duration:4}),project=core.createBlankProject({duration:4,fps:24});core.getComp(project).layers=[again];const native=core.getComp(core.parseProject(JSON.stringify(project)).project).layers[0];assert.deepEqual(native.keyframes,again.keyframes);assert.ok(Math.abs(core.evaluateLayer(native,1.275).x-.4)<1e-7);
});
test('copy requires live unambiguous IDs and retains a locked source without modifying it',()=>{
 const source=fixture();copy(source);for(const ids of [[],['missing'],[source.keyframes.x[0].id,source.keyframes.x[0].id]])assert.throws(()=>core.copyKeyframes(source,'x',ids));const ambiguous=structuredClone(source);ambiguous.keyframes.x[1].id=ambiguous.keyframes.x[0].id;assert.throws(()=>core.copyKeyframes(ambiguous,'x',[ambiguous.keyframes.x[0].id]));assert.deepEqual(copy({...source,locked:true}),copy(source));
});
test('paste rejects the entire insertion for conflicts, invalid offsets, locks or property mismatches',()=>{
 const clip=copy(fixture()),target=core.setKeyframe(core.createLayer('rectangle'),'x',2,99),before=structuredClone(target);
 for(const [layer,property,time,duration]of [[target,'x',2,4],[target,'x',2-.5e-6,4],[target,'x',.95,4],[target,'x',-.1,4],[target,'x',3.5,4],[target,'x',NaN,4],[target,'x',1,NaN],[target,'y',1,4],[{...target,locked:true},'x',1,4]])assert.throws(()=>core.pasteKeyframes(layer,property,clip,time,{duration}));assert.deepEqual(target,before);
 const valid=core.pasteKeyframes(target,'x',clip,2+.000002,{duration:4});assert.equal(valid.keyframes.x.length,3);
 for(const keys of [[{...clip.keys[0],time:-1}], [{...clip.keys[0],value:Infinity}], [{...clip.keys[0],bezier:[0,2,1,1]}], [clip.keys[0],clip.keys[0]]])assert.throws(()=>core.pasteKeyframes(target,'x',{...clip,keys},0,{duration:4}));
});
test('property compatibility preserves scene animation and media settings and rejects silent unsupported animation',()=>{
 const scene=fixture('modelX','scene3d'),clip=copy(scene,'modelX'),target=core.createLayer('scene3d',{assetId:'different-scene',modelClip:3,sourceIn:.4,playbackRate:2}),next=core.pasteKeyframes(target,'modelX',clip,1,{duration:4});assert.equal(next.modelClip,3);assert.equal(next.assetId,'different-scene');assert.equal(next.sourceIn,.4);assert.equal(next.playbackRate,2);assert.throws(()=>core.pasteKeyframes(core.createLayer('rectangle'),'modelX',clip,1,{duration:4}));
 const sound=copy(fixture('volume','audio'),'volume');assert.equal(core.pasteKeyframes(core.createLayer('video'),'volume',sound,1,{duration:4}).keyframes.volume.length,2);assert.throws(()=>core.pasteKeyframes(core.createLayer('rectangle'),'volume',sound,1,{duration:4}));assert.throws(()=>core.pasteKeyframes(core.createLayer('audio'),'volume',{...sound,keys:[{...sound.keys[0],value:2}]},1,{duration:4}));
 const text=copy(fixture('letterSpacing','text'),'letterSpacing');assert.throws(()=>core.pasteKeyframes(core.createLayer('rectangle'),'letterSpacing',text,1,{duration:4}));
 const opacity=copy(fixture('opacity'),'opacity');assert.throws(()=>core.pasteKeyframes(core.createLayer('rectangle'),'opacity',{...opacity,keys:[{...opacity.keys[0],value:2}]},1,{duration:4}));
});
test('color and partial selections retain relative subframe timing without pulling in unselected keys',()=>{
 const source=fixture('fill'),clip=copy(source,'fill'),next=core.pasteKeyframes(core.createLayer('text'),'fill',clip,.123,{duration:4});assert.equal(next.keyframes.fill[1].time,1.173);assert.equal(core.evaluateLayer(next,.648).fill,'#404040');const partial=core.copyKeyframes(source,'fill',[source.keyframes.fill[1].id]);assert.equal(core.pasteKeyframes(source,'fill',partial,2,{duration:4}).keyframes.fill[2].time,2);
});

test('pasting cannot exceed native track or project capacity and leave an unsavable edit',()=>{
 const clip=copy(fixture()),target=core.createLayer('rectangle',{keyframes:{x:Array.from({length:9999},(_,i)=>({id:'existing-'+i,time:i/1000,value:40,easing:'linear'}))}}),before=structuredClone(target);
 assert.throws(()=>core.pasteKeyframes(target,'x',clip,11,{duration:20}),/limit|10,000|capacity/i);assert.deepEqual(target,before);
 assert.throws(()=>core.pasteKeyframes(core.createLayer('rectangle'),'x',clip,1,{duration:4,remainingKeys:1}),/limit|100,000|capacity/i);
});
