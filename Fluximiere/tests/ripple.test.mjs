import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.mjs';
import {createMixer} from '../src/audio-math.mjs';
const clip=(id,start,duration,more={})=>model.makeClip('video',{id,name:id,start,duration,assetId:'source',...more});
const fixture=()=>({...model.createProject(),duration:8,assets:[{id:'source',name:'Original',type:'video',src:'data:video/webm;base64,AAAA',duration:30,width:320,height:180}],clips:[clip('before',0,2),clip('cut',2,2),clip('after',4,4,{sourceIn:6,playbackRate:2}),model.makeClip('audio',{id:'sound',name:'Sound',start:0,duration:8,assetId:'source',sourceIn:1,playbackRate:2,volume:.7,fadeIn:.5,fadeOut:1})]});

test('ripple deletion removes the same interval across tracks without changing surviving source samples',()=>{
 assert.equal(typeof model.planRippleEdit,'function','A shared ripple command must exist');
 const original=fixture(),snapshot=structuredClone(original),result=model.planRippleEdit(original,{clipId:'cut',operation:'delete',scope:'all'}),p=result.project;
 assert.equal(p.duration,6);assert.equal(p.clips.find(c=>c.id==='after').start,2);assert.equal(p.clips.find(c=>c.id==='after').sourceIn,6);
 const sound=p.clips.filter(c=>c.type==='audio').sort((a,b)=>a.start-b.start);assert.equal(sound.length,2);assert.deepEqual(sound.map(c=>[c.start,c.duration,c.sourceIn,c.playbackRate,c.fadeIn,c.fadeOut]),[[0,2,1,2,.5,0],[2,4,9,2,0,1]]);
 const {clipGain,readSample}=createMixer(),data={sampleRate:100,channels:[Float32Array.from({length:3000},(_,i)=>Math.sin(i*.11))]};
 for(const t of [.1,1.8,2.1,4,5.8]){const oldTime=t<2?t:t+2,newClip=sound.find(c=>t>=c.start&&t<c.start+c.duration),oldClip=original.clips.at(-1);assert.ok(Math.abs(clipGain(newClip,t)-clipGain(oldClip,oldTime))<1e-8);const actual=readSample(data.channels[0],(newClip.sourceIn+(t-newClip.start)*newClip.playbackRate)*data.sampleRate),expected=readSample(data.channels[0],(oldClip.sourceIn+(oldTime-oldClip.start)*oldClip.playbackRate)*data.sampleRate);assert.ok(Number.isFinite(actual));assert.ok(Math.abs(actual-expected)<1e-6);}
 assert.deepEqual(original,snapshot);assert.deepEqual(p.assets,model.validateProject(original).assets);
});
test('selected-track scope retains other tracks, their locked clips and sequence duration',()=>{
 const p=fixture();p.clips.at(-1).locked=true;const result=model.planRippleEdit(p,{clipId:'cut',operation:'delete',scope:'track'}).project;
 assert.equal(result.duration,8);assert.deepEqual(result.clips.find(c=>c.id==='sound'),model.validateProject(p).clips.at(-1));assert.equal(result.clips.find(c=>c.id==='after').start,2);
 assert.throws(()=>model.planRippleEdit(p,{clipId:'cut',operation:'delete',scope:'all'}),/locked/i);assert.equal(p.clips.length,4);
});
test('ripple trims use frame-aligned playhead, retain source offsets and reject boundaries or cut fades',()=>{
 const p=fixture();p.fps=30000/1001;const result=model.planRippleEdit(p,{clipId:'after',operation:'trim-start',scope:'track',time:5.01});const c=result.project.clips.find(c=>c.id==='after');assert.equal(c.start,4);assert.ok(Math.abs(c.sourceIn-(6+(150*1001/30000-4)*2))<1e-10);
 const out=model.planRippleEdit(fixture(),{clipId:'after',operation:'trim-end',scope:'all',time:6}).project;assert.equal(out.duration,6);assert.equal(out.clips.find(c=>c.id==='after').duration,2);
 assert.throws(()=>model.planRippleEdit(p,{clipId:'after',operation:'trim-end',scope:'all',time:4}),/inside/i);
 p.clips.at(-1).fadeIn=3;assert.throws(()=>model.planRippleEdit(p,{clipId:'cut',operation:'delete',scope:'all'}),/fade/i);
 assert.throws(()=>model.planRippleEdit(p,{clipId:'cut',operation:'delete',scope:'unknown'}),/scope/i);
});
test('all-track ripple retains clips outside the sequence and does not permit a zero-length sequence',()=>{
 const p=fixture();p.clips=[clip('cut',0,8),clip('tail',9,2)];const next=model.planRippleEdit(p,{clipId:'cut',operation:'delete',scope:'all'}).project;assert.equal(next.duration,3);assert.equal(next.clips[0].start,1);
 p.clips.pop();assert.throws(()=>model.planRippleEdit(p,{clipId:'cut',operation:'delete',scope:'all'}),/empty|duration/i);
});
