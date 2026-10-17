import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject} from '../src/model.mjs';
import {createAutoeditPlan,validateAutoeditPlan} from '../src/autoedit/model.mjs';

test('binary video sources survive validation and structured-clone history without text embedding',()=>{
 const blob=new Blob([new Uint8Array(1024)],{type:'video/mp4'}),raw={...createProject(),clips:[],assets:[{id:'original',type:'video',name:'Original.mp4',blob,src:'',width:1920,height:1080,duration:10}]};
 const p=validateProject(structuredClone(raw));assert.ok(p.assets[0].blob instanceof Blob);assert.equal(p.assets[0].missing,false);assert.equal(p.assets[0].src,'');assert.equal(p.assets[0].blob.size,1024);
});
test('Autoedit accepts a 500 MiB original alongside 47 other sources',()=>{
 const p=createAutoeditPlan();p.footage=Array.from({length:48},(_,i)=>({assetId:`video-${i}`,hash:'a'.repeat(64),name:`${i}.mp4`,mime:'video/mp4',bytes:i===0?500*1024*1024:1024,duration:10,width:1920,height:1080,enabled:true,inPoint:0,outPoint:10,frames:[]}));
 assert.equal(validateAutoeditPlan(p).footage.length,48);
});
test('chunked fingerprints read bounded slices and detect changed content',async()=>{
 const {digestMedia}=await import('../src/local-media.mjs');
 const blob=new Blob([new Uint8Array(3*1024*1024)]);blob.arrayBuffer=()=>{throw Error('Whole-file allocation is forbidden');};
 const hash=await digestMedia(blob,'sha256-chunks-v1');assert.match(hash,/^[a-f0-9]{64}$/);
 assert.equal(hash,await digestMedia(new Blob([new Uint8Array(3*1024*1024)]),'sha256-chunks-v1'));
 assert.notEqual(hash,await digestMedia(new Blob([blob.slice(0,-1),new Uint8Array([1])]),'sha256-chunks-v1'));
 await assert.rejects(()=>digestMedia(blob,'sha256-chunks-v1',AbortSignal.abort()),/cancel/i);
});
test('binary projects preserve original bytes and reject truncated media',async()=>{
 const {encodeBinaryProject,decodeBinaryProject}=await import('../src/binary-project.mjs');
 const blob=new Blob([new Uint8Array([1,2,3,4])],{type:'video/mp4'}),raw={...createProject(),clips:[],assets:[{id:'original',type:'video',name:'Original.mp4',blob,src:'',width:1920,height:1080,duration:10}]};
 const file=await encodeBinaryProject(raw),p=await decodeBinaryProject(file);
 assert.equal(p.assets[0].name,'Original.mp4');assert.deepEqual([...new Uint8Array(await p.assets[0].blob.arrayBuffer())],[1,2,3,4]);
 await assert.rejects(()=>decodeBinaryProject(file.slice(0,-1)),/truncated|size/i);
 assert.equal(await decodeBinaryProject(new Blob(['{"legacy":true}'])),null);
});
test('large visual requests retain every source while staying below the HTTP body budget',async()=>{
 const {buildEditorRequest}=await import('../src/autoedit/request.mjs');
 const p=createAutoeditPlan();p.footage=Array.from({length:48},(_,i)=>({assetId:`v${i}`,hash:'a'.repeat(64),name:`${i}.mp4`,mime:'video/mp4',bytes:1000,duration:10,width:1920,height:1080,enabled:true,inPoint:0,outPoint:10,frames:Array.from({length:6},(_,n)=>({time:n,brightness:.5,motion:.1,dataUrl:'data:image/jpeg;base64,'+'A'.repeat(48000)}))}));
 const original=p.footage[0].frames.length,request=buildEditorRequest(p,0);assert.ok(Buffer.byteLength(JSON.stringify(request))<=3*1024*1024);assert.equal(request.plan.footage.length,48);assert.ok(request.plan.footage.every(v=>v.frames.length>=1));assert.equal(p.footage[0].frames.length,original);
});
test('small binary projects remain portable through Flux Exchange text conversion',async()=>{
 const {embedProjectMedia}=await import('../src/binary-project.mjs');
 const p={...createProject(),clips:[],assets:[{id:'a',type:'video',name:'Clip',blob:new Blob([new Uint8Array([1,2,3,4])],{type:'video/mp4'}),src:'',width:10,height:10,duration:1}]};
 const embedded=await embedProjectMedia(p);assert.equal(embedded.assets[0].src,'data:video/mp4;base64,AQIDBA==');assert.equal(embedded.assets[0].blob,undefined);
});
