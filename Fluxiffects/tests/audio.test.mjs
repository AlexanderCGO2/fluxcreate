import test from 'node:test';
import assert from 'node:assert/strict';
import {audioLayerGain} from '../src/audio.mjs';
import {createBlankProject,createLayer,getComp,parseProject,setKeyframe,evaluateLayer} from '../src/core.mjs';
test('native audio volume animation and fades survive project roundtrip and match evaluated easing',()=>{
  const project=createBlankProject();let layer=createLayer('audio',{start:1,end:4,opacity:0,volume:.8,fadeIn:.5,fadeOut:.5});layer=setKeyframe(layer,'volume',1,.2,'ease-in');layer=setKeyframe(layer,'volume',3,.8,'linear');getComp(project).layers.push(layer);const restored=getComp(parseProject(JSON.stringify(project)).project).layers[0];assert.deepEqual(restored,layer);assert.equal(audioLayerGain(restored,2),evaluateLayer(restored,2).volume);assert.equal(audioLayerGain(restored,0),0);assert.equal(audioLayerGain(restored,4),0);assert.equal(audioLayerGain({...restored,muted:true},2),0);assert.equal(audioLayerGain({...restored,visible:false},2),0);assert.ok(audioLayerGain(restored,1.25)<.15);
});
test('invalid volume automation and negative fades are rejected',()=>{
  assert.throws(()=>setKeyframe(createLayer('audio'),'volume',0,2),/Volume/);const project=createBlankProject();getComp(project).layers.push(createLayer('audio',{fadeIn:-1}));assert.throws(()=>parseProject(JSON.stringify(project)),/fadeIn/);
});
