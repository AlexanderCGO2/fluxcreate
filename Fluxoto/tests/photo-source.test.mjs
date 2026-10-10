import test from 'node:test';import assert from 'node:assert/strict';
import {replacePhotoSource,checkPhotoFile,checkPhotoSize} from '../src/photo-source.mjs';
import {validateProject,newLayer} from '../src/model.mjs';
const src='data:image/png;base64,eA==',replacement='data:image/png;base64,eQ==';
test('Photo replacement preserves frame, mask, adjustments and original undo source',()=>{
 const p=validateProject({format:'fluxoto-project',version:1,id:'photo',layers:[newLayer('image',{id:'photo',src,x:17,rotation:42,width:100,height:50,opacity:.4,levels:{gamma:2},mask:{enabled:true,width:10,height:10,src:'',defaultAlpha:255,strokes:[]}})]});
 const next=replacePhotoSource(p,'photo',replacement);assert.deepEqual({...next.layers[0],src},p.layers[0]);assert.equal(p.layers[0].src,src);assert.equal(next.layers[0].src,replacement);
});
test('Photo replacement rejects invalid source, non-photo, missing and locked targets',()=>{
 const p=validateProject({format:'fluxoto-project',version:1,id:'photo',layers:[newLayer('image',{id:'photo',src})]});
 for(const id of ['', 'missing'])assert.throws(()=>replacePhotoSource(p,id,replacement));
 assert.throws(()=>replacePhotoSource({...p,layers:[{...p.layers[0],locked:true}]},'photo',replacement));
 assert.throws(()=>replacePhotoSource({...p,layers:[{...p.layers[0],type:'shape'}]},'photo',replacement));
 for(const value of ['https://example.com/image.png','',null])assert.throws(()=>replacePhotoSource(p,'photo',value));
});
test('Photo source size and supported file checks reject unbounded work',()=>{
 assert.equal(checkPhotoFile({name:'photo.PNG',type:'',size:100}),'image/png');
 assert.throws(()=>checkPhotoFile({name:'photo.exe',type:'',size:100}));assert.throws(()=>checkPhotoFile({name:'photo.png',size:45000001}));
 checkPhotoSize(8192,4096);for(const size of [[0,1],[16385,1],[8192,8192],[NaN,10]])assert.throws(()=>checkPhotoSize(...size));
});
