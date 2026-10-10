import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.mjs';
import {createMixer} from '../src/audio-math.mjs';
const fixture=()=>model.validateProject({...model.createProject(),fps:30000/1001,duration:5,assets:[{id:'media',name:'Original sound',type:'audio',src:'data:audio/wav;base64,AAAA',duration:12}],clips:[model.makeClip('audio',{id:'sound',assetId:'media',start:1,duration:2,sourceIn:1,playbackRate:1.5,volume:.6,opacity:.2,fadeIn:.25,fadeOut:.3}),model.makeClip('card',{id:'picture',start:0,duration:5,locked:true})]});
test('slip changes only the source window, preserves timing/gain and survives native/portable roundtrip',()=>{
 assert.equal(typeof model.planSlipEdit,'function');const original=fixture(),before=structuredClone(original),result=model.planSlipEdit(original,{clipId:'sound',sourceIn:2.5}),c=result.project.clips[0];
 assert.deepEqual(result.project,{...original,clips:[{...original.clips[0],sourceIn:2.5},original.clips[1]]});assert.deepEqual(original,before);assert.equal(result.sourceOut,5.5);assert.equal(result.delta,1.5);
 const {readSample,clipGain}=createMixer(),data=Float32Array.from({length:12000},(_,i)=>Math.sin(i*.01));
 for(const t of [1.1,1.7,2.8]){assert.equal(clipGain(c,t),clipGain(original.clips[0],t));const value=readSample(data,(c.sourceIn+(t-c.start)*c.playbackRate)*1000),expected=readSample(data,(2.5+(t-1)*1.5)*1000);assert.ok(Number.isFinite(value));assert.equal(value,expected);}
 assert.deepEqual(model.validateProject(JSON.parse(JSON.stringify(result.project))),result.project);assert.equal(model.fromMotion(model.toMotion(result.project)).project.clips.find(c=>c.id==='sound').sourceIn,2.5);
});
test('frame slips use the actual sequence rate and source speed while bounds reject atomically',()=>{
 const p=fixture(),range=model.slipBounds(p,'sound');assert.equal(range.max,9);assert.equal(range.frameStep,1.5/(30000/1001));
 const c=model.planSlipEdit(p,{clipId:'sound',deltaFrames:3}).project.clips[0];assert.ok(Math.abs(c.sourceIn-(1+3*range.frameStep))<1e-12);
 assert.throws(()=>model.planSlipEdit(p,{clipId:'sound',sourceIn:4,sourceDuration:6}),/between/,'A measured duration overrides stale native metadata');assert.equal(model.planSlipEdit(p,{clipId:'sound',sourceIn:3,sourceDuration:6}).sourceOut,6);
 assert.equal(model.planSlipEdit(p,{clipId:'sound',sourceIn:9}).sourceOut,12);for(const args of[{sourceIn:-.01},{sourceIn:9.001},{sourceIn:NaN},{deltaFrames:.5},{sourceIn:2,deltaFrames:1},{}])assert.throws(()=>model.planSlipEdit(p,{clipId:'sound',...args}));assert.equal(p.clips[0].sourceIn,1);
});
test('slip requires an unlocked timed clip and a present source with known usable duration',()=>{
 for(const change of [p=>p.clips[0].locked=true,p=>p.assets[0].src='',p=>p.assets[0].duration=0,p=>p.assets[0].duration=2,p=>p.assets=[],p=>p.clips[0].assetId=null]){const p=fixture();change(p);const before=structuredClone(p);assert.throws(()=>model.planSlipEdit(p,{clipId:'sound',sourceIn:0}));assert.deepEqual(p,before);}
 assert.throws(()=>model.planSlipEdit(fixture(),{clipId:'picture',sourceIn:0}),/video|audio|timed/i);
 const p=fixture();p.clips[0].sourceIn=11;assert.equal(model.planSlipEdit(p,{clipId:'sound',sourceIn:9}).project.clips[0].sourceIn,9,'An invalid prior range can be repaired within known handles');
});
