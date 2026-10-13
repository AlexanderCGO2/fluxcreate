import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.mjs';
const fixture=()=>model.validateProject({...model.createProject(),fps:30,duration:6,assets:[{id:'media',name:'Source',type:'video',src:'data:video/webm;base64,AAAA',duration:12}],clips:[model.makeClip('video',{id:'left',name:'Left',assetId:'media',start:1,duration:2,sourceIn:.5,playbackRate:1.5}),model.makeClip('video',{id:'right',name:'Right',assetId:'media',start:3,duration:2,sourceIn:2,playbackRate:.5}),model.makeClip('audio',{id:'other',start:0,duration:6,locked:true})]});
test('rolling moves the shared cut only, keeps outer endpoints and surviving source placement',()=>{
 assert.equal(typeof model.planRollingEdit,'function');const p=fixture(),before=structuredClone(p),result=model.planRollingEdit(p,{clipId:'left',cutTime:3.4}),[left,right,other]=result.project.clips;
 assert.equal(result.cutTime,3.4);assert.ok(Math.abs(result.delta-.4)<1e-10);assert.deepEqual(left,{...p.clips[0],duration:2.4});assert.deepEqual(right,{...p.clips[1],start:3.4,duration:1.6,sourceIn:2.2});assert.deepEqual(other,p.clips[2]);assert.equal(result.project.duration,p.duration);assert.deepEqual(p,before);
 for(const t of [3.4,4,4.8])assert.ok(Math.abs(right.sourceIn+(t-right.start)*right.playbackRate-(p.clips[1].sourceIn+(t-p.clips[1].start)*p.clips[1].playbackRate))<1e-10);
 assert.deepEqual(model.validateProject(JSON.parse(JSON.stringify(result.project))),result.project);
 const earlier=model.planRollingEdit(p,{clipId:'left',cutTime:2.4}).project;assert.ok(Math.abs(earlier.clips[1].sourceIn-1.7)<1e-10);assert.equal(earlier.clips[1].start+earlier.clips[1].duration,5);
});
test('rolling bounds combine speed-aware source handles and minimum frames at fractional rates',()=>{
 const p=fixture();p.fps=30000/1001;const bounds=model.rollingBounds(p,'left',{leftDuration:4,rightDuration:3});assert.ok(Math.abs(bounds.max-(1+(4-.5)/1.5))<1e-10);assert.equal(bounds.min,1+1/p.fps);
 const result=model.planRollingEdit(p,{clipId:'left',deltaFrames:2});assert.ok(Math.abs(result.delta-2/p.fps)<1e-10);assert.ok(Math.abs(result.project.clips[1].sourceIn-(2+1/p.fps))<1e-10);
 for(const args of [{cutTime:3.9,leftDuration:4},{cutTime:1},{cutTime:5},{cutTime:NaN},{deltaFrames:.1},{cutTime:3,deltaFrames:1},{}])assert.throws(()=>model.planRollingEdit(p,{clipId:'left',...args}));
 const exact=fixture();exact.clips[0].sourceIn=0;exact.clips[0].playbackRate=1;exact.clips[1].sourceIn=0;assert.equal(model.rollingBounds(exact,'left').min,3);assert.throws(()=>model.planRollingEdit(exact,{clipId:'left',deltaFrames:-1}),/between/);
});
test('rolling rejects locks, nonadjacency, ambiguity, overlap, fades and invalid sources atomically',()=>{
 for(const change of [p=>p.clips[0].locked=true,p=>p.clips[1].locked=true,p=>p.clips[1].start+=.001,p=>p.clips.push({...p.clips[1],id:'duplicate'}),p=>p.clips.push(model.makeClip('video',{id:'overlap',assetId:'media',start:2,duration:.1})),p=>p.clips[0].fadeOut=.1,p=>p.clips[1].fadeIn=.1,p=>p.clips[0].fadeIn=.1,p=>p.assets[0].src='',p=>p.assets[0].duration=0,p=>p.clips[1].sourceIn=11.5,p=>p.clips[0].sourceIn=11,p=>p.clips[1].type='image']){
  const p=fixture();change(p);const before=structuredClone(p);assert.throws(()=>model.planRollingEdit(p,{clipId:'left',deltaFrames:1}));assert.deepEqual(p,before);
 }
 assert.throws(()=>model.planRollingEdit(fixture(),{clipId:'right',deltaFrames:1}),/adjacent/);
 assert.throws(()=>model.planRollingEdit(fixture(),{clipId:'left',deltaFrames:1,leftDuration:3}),/source range/);
 const p=fixture();p.clips[0].transition={type:'dissolve'};assert.throws(()=>model.planRollingEdit(p,{clipId:'left',deltaFrames:1}),/transition/i);
});
test('rolling supports audio pairs, exact source zero/end handles and the model minimum at 120 fps',()=>{
 const p=fixture();p.assets[0].type='audio';for(const c of p.clips.slice(0,2)){c.type='audio';c.track='A2';}p.clips[1].sourceIn=.25;
 const result=model.planRollingEdit(p,{clipId:'left',cutTime:2.5});assert.equal(result.project.clips[1].sourceIn,0);assert.equal(result.project.clips[1].start+result.project.clips[1].duration,5);
 p.fps=120;p.clips[1].sourceIn=2;assert.throws(()=>model.planRollingEdit(p,{clipId:'left',cutTime:5-1/120}),/between/);
 const end=fixture();end.assets[0].duration=4;end.clips[1].sourceIn=2;const q=model.planRollingEdit(end,{clipId:'left',cutTime:10/3});assert.ok(Math.abs(q.project.clips[0].sourceIn+q.project.clips[0].duration*q.project.clips[0].playbackRate-4)<1e-10);
});

test('rolling accepts exact minimum boundaries despite binary floating-point subtraction',()=>{
 const p=fixture();p.fps=100;const result=model.planRollingEdit(p,{clipId:'left',cutTime:4.99});assert.ok(Math.abs(result.project.clips[1].duration-.01)<1e-12);assert.ok(Math.abs(result.project.clips[1].start+result.project.clips[1].duration-5)<1e-12);
});
