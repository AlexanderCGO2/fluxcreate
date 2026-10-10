import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLevels,levelsTable,applyLevels,histogram} from '../src/levels.mjs';
import {validateProject,newLayer,toMotion,applyAICommands,getAIContext} from '../src/model.mjs';
test('Levels validates bounded RGB input points and gamma without accepting coercion',()=>{
 assert.equal(normalizeLevels(undefined),null);
 for(const bad of [{black:10,white:10},{black:-1},{white:256},{gamma:0},{gamma:11},{gamma:'2'},{enabled:1},[],{black:NaN}])assert.throws(()=>normalizeLevels(bad));
 assert.deepEqual(normalizeLevels({black:20,white:220,gamma:2}),{enabled:true,black:20,white:220,gamma:2});
});
test('RGB lookup clamps endpoints, applies gamma and leaves alpha unchanged',()=>{
 const table=levelsTable({black:20,white:220,gamma:2});
 assert.equal(table[20],0);assert.equal(table[220],255);assert.equal(table[120],180);
 const pixels=new Uint8ClampedArray([20,120,220,100,255,0,120,0]);
 applyLevels(pixels,{black:20,white:220,gamma:2});assert.deepEqual([...pixels],[0,180,255,100,255,0,180,0]);
 const identity=new Uint8ClampedArray(Array.from({length:1024},(_,i)=>i%256)),before=identity.slice();applyLevels(identity,null);assert.deepEqual(identity,before);
 applyLevels(identity,{enabled:false,black:20,white:220,gamma:2});assert.deepEqual(identity,before);
});
test('Histogram ignores transparent pixels and weights partial coverage',()=>{
 const result=histogram(new Uint8ClampedArray([0,128,255,255,0,128,255,0,0,128,255,128]));
 assert.equal(result.red[0],1+128/255);assert.equal(result.green[128],result.red[0]);assert.equal(result.blue[255],result.red[0]);assert.equal(result.coverage,result.red[0]);
 assert.throws(()=>histogram([1,2,3]));
});
test('Native validation preserves Levels and original photo bytes; direct portable conversion discloses limitation',()=>{
 const src='data:image/png;base64,eA==',p=validateProject({format:'fluxoto-project',version:1,id:'levels',layers:[newLayer('image',{src,levels:{black:20,white:220,gamma:2}})]});
 assert.equal(p.layers[0].src,src);assert.equal(p.layers[0].levels.gamma,2);assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 assert.match(toMotion(p).warnings.join(' '),/Levels/);
 assert.throws(()=>validateProject({...p,layers:[{...p.layers[0],type:'shape'}]}),/photo|image/i);
});

test('AI Levels edits obey target scope, locks and atomic validation without sharing photo bytes',()=>{
 const source='data:image/png;base64,eA==',p=validateProject({format:'fluxoto-project',version:1,id:'ai-levels',layers:[newLayer('image',{id:'photo',src:source})]});
 const commands=[{type:'updateLayer',id:'photo',values:{levels:{black:10,white:240,gamma:1.4}}}];
 const result=applyAICommands(p,commands,{scope:'selection',selection:['photo']});assert.equal(result.layers[0].levels.gamma,1.4);assert.equal(result.layers[0].src,source);assert.equal(p.layers[0].levels,null);
 assert.throws(()=>applyAICommands(p,commands,{scope:'selection',selection:[]}));assert.throws(()=>applyAICommands({...p,layers:[{...p.layers[0],locked:true}]},commands));
 assert.throws(()=>applyAICommands(p,[...commands,{type:'updateLayer',id:'photo',values:{levels:{black:250,white:10}}}]));assert.equal(p.layers[0].levels,null);
 const context=getAIContext(result,{scope:'selection',selection:['photo']});assert.equal(context.layers[0].levels.gamma,1.4);assert.ok(!JSON.stringify(context).includes(source));
});
