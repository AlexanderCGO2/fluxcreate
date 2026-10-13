import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.mjs';
const fixture=()=>model.validateProject({...model.createProject(),fps:30,duration:8,assets:[{id:'media',name:'Source',type:'video',src:'data:video/webm;base64,AAAA',duration:12}],clips:[model.makeClip('video',{id:'left',name:'Left',assetId:'media',start:1,duration:2,sourceIn:.5,playbackRate:1.5}),model.makeClip('video',{id:'middle',name:'Selected',assetId:'media',start:3,duration:1,sourceIn:4,playbackRate:2,volume:.6,muted:true,opacity:.8}),model.makeClip('video',{id:'right',name:'Right',assetId:'media',start:4,duration:2,sourceIn:2,playbackRate:.5}),model.makeClip('audio',{id:'other',start:0,duration:8,locked:true})]});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10, a+' != '+b);
test('slide moves only selected placement while neighbours retain their surviving source samples',()=>{
 assert.equal(typeof model.planSlideEdit,'function');const p=fixture(),before=structuredClone(p),result=model.planSlideEdit(p,{clipId:'middle',startTime:3.4}),[left,middle,right,other]=result.project.clips;
 close(result.delta,.4);assert.equal(result.startTime,3.4);assert.deepEqual(middle,{...p.clips[1],start:3.4});close(left.duration,2.4);close(right.start,4.4);close(right.duration,1.6);close(right.sourceIn,2.2);assert.equal(left.start,1);assert.equal(right.start+right.duration,6);assert.equal(result.project.duration,8);assert.deepEqual(other,p.clips[3]);assert.deepEqual(p,before);
 for(const t of [4.5,5,5.9])close(right.sourceIn+(t-right.start)*right.playbackRate,2+(t-4)*.5);
 for(const t of [0,.25,.8])close(middle.sourceIn+t*middle.playbackRate,4+t*2);
 const earlier=model.planSlideEdit(p,{clipId:'middle',startTime:2.4}).project;close(earlier.clips[0].duration,1.4);close(earlier.clips[2].sourceIn,1.7);assert.deepEqual(earlier.clips[1],{...p.clips[1],start:2.4});
});
test('frame slides preserve fractional imported phase while numeric starts align to sequence frames',()=>{
 const p=fixture();p.fps=30000/1001;for(const c of p.clips.slice(0,3))c.start+=.007;
 const q=model.planSlideEdit(p,{clipId:'middle',deltaFrames:2});close(q.startTime,3.007+2*1001/30000);close(q.project.clips[2].sourceIn,2+1001/30000);assert.equal(q.project.clips[1].duration,1);
 close(model.planSlideEdit(p,{clipId:'middle',startTime:3.1}).startTime,Math.round(3.1*p.fps)/p.fps);
 for(const args of [{startTime:NaN},{startTime:'3.4'},{deltaFrames:.5},{deltaFrames:Infinity},{startTime:3,deltaFrames:1},{}])assert.throws(()=>model.planSlideEdit(p,{clipId:'middle',...args}));
});
test('slide bounds combine speed-aware left handles and right preroll using measured durations',()=>{
 const p=fixture(),b=model.slideBounds(p,'middle',{leftDuration:4,middleDuration:6,rightDuration:3});close(b.max,10/3);close(b.min,1+1/30);
 assert.throws(()=>model.planSlideEdit(p,{clipId:'middle',startTime:3.4,leftDuration:4,middleDuration:6,rightDuration:3}),/between/);
 for(const durations of [{leftDuration:3},{middleDuration:5},{rightDuration:2.9},{middleDuration:0},{rightDuration:NaN},{leftDuration:null}])assert.throws(()=>model.planSlideEdit(p,{clipId:'middle',deltaFrames:1,...durations}));
 p.clips[2].sourceIn=.25;close(model.slideBounds(p,'middle').min,2.5);const q=model.planSlideEdit(p,{clipId:'middle',startTime:2.5});assert.equal(q.project.clips[2].sourceIn,0);assert.throws(()=>model.planSlideEdit(p,{clipId:'middle',startTime:2.4}),/between/);
});
test('slide rejects all three locks, fades, transitions and ambiguous topology without mutation',()=>{
 assert.equal(typeof model.planSlideEdit,'function');const changes=[];for(const i of [0,1,2])for(const key of ['locked','fadeIn','fadeOut','transition'])changes.push(p=>p.clips[i][key]=key==='locked'?true:key==='transition'?{type:'dissolve'}:.1);
 changes.push(p=>p.clips[0].duration-=.001,p=>p.clips[2].start+=.001,p=>p.clips.push({...p.clips[0],id:'duplicate'}),p=>p.clips.push({...p.clips[2],id:'duplicate'}),p=>p.clips.push(model.makeClip('video',{id:'overlap',assetId:'media',start:1.5,duration:.1})),p=>p.clips.push(model.makeClip('video',{id:'overlap',assetId:'media',start:5,duration:.1})),p=>p.clips[0].type='image');
 for(const change of changes){const p=fixture();change(p);const before=structuredClone(p);assert.throws(()=>model.planSlideEdit(p,{clipId:'middle',deltaFrames:1}));assert.deepEqual(p,before);}
 for(const clipId of ['left','right','other','absent'])assert.throws(()=>model.planSlideEdit(fixture(),{clipId,deltaFrames:1}));
});
test('slide validates every source/rate and rejects invalid selected content although its window stays fixed',()=>{
 assert.equal(typeof model.planSlideEdit,'function');const changes=[p=>p.assets[0].src='',p=>p.assets[0].duration=0,p=>p.assets[0].type='image'];for(const i of [0,1,2])for(const key of ['sourceIn','playbackRate','assetId'])changes.push(p=>p.clips[i][key]=key==='sourceIn'?11.9:key==='playbackRate'?0:'missing');
 for(const change of changes){const p=fixture();change(p);const before=structuredClone(p);assert.throws(()=>model.planSlideEdit(p,{clipId:'middle',deltaFrames:1}));assert.deepEqual(p,before);}
});
test('slide accepts exact minimum edges and rejects sub-frame neighbours and selected clips',()=>{
 const p=fixture();p.fps=100;let q=model.planSlideEdit(p,{clipId:'middle',startTime:4.99});close(q.project.clips[2].duration,.01);close(q.project.clips[2].start+q.project.clips[2].duration,6);
 q=model.planSlideEdit(p,{clipId:'middle',startTime:1.01});close(q.project.clips[0].duration,.01);assert.throws(()=>model.planSlideEdit(p,{clipId:'middle',startTime:5}),/between/);
 const short=fixture();short.clips[1].duration=.01;short.clips[2].start=3.01;assert.throws(()=>model.planSlideEdit(short,{clipId:'middle',deltaFrames:1}),/frame/);
});
test('audio slides preserve native fields, source bytes and unchanged duration through save/open',()=>{
 const p=fixture();p.assets[0].type='audio';for(const c of p.clips.slice(0,3)){c.type='audio';c.track='A2';}const q=model.planSlideEdit(p,{clipId:'middle',deltaFrames:3}).project;
 assert.deepEqual(q.assets,p.assets);assert.deepEqual(q.clips[1],{...p.clips[1],start:3.1});assert.deepEqual(model.validateProject(JSON.parse(JSON.stringify(q))),q);assert.equal(q.duration,8);assert.deepEqual(q.clips[3],p.clips[3]);
});
