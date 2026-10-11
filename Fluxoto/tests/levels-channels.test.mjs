import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLevels,applyLevels,hasActiveLevels,levelsTable} from '../src/levels.mjs';
import {validateProject,newLayer,toMotion,applyAICommands} from '../src/model.mjs';

test('channel-only and output-only Levels survive native validation and request portable rendering',()=>{
 const levels={channels:{red:{black:20,white:220,gamma:2}},outputBlack:10,outputWhite:240};
 const src='data:image/png;base64,eA==';
 const p=validateProject({format:'fluxoto-project',version:1,layers:[newLayer('image',{src,levels})]});
 assert.deepEqual(p.layers[0].levels.channels.red,{black:20,white:220,gamma:2});
 assert.equal(p.layers[0].levels.outputBlack,10);assert.equal(p.layers[0].src,src);
 assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);
 assert.ok(hasActiveLevels({enabled:true,channels:{blue:{gamma:2}}}));
 assert.ok(hasActiveLevels({enabled:true,outputWhite:200}));
 assert.match(toMotion(p).warnings.join(' '),/Levels/);
});
test('channel validation rejects malformed channels, coerced values and reversed output ranges',()=>{
 for(const bad of [{channels:[]},{channels:null},{channels:{cyan:{}}},{channels:{red:null}},{channels:{red:{gamma:'2'}}},{channels:{green:{black:20,white:20}}},{channels:{blue:{outputWhite:-1}}},{outputBlack:256},{outputBlack:200,outputWhite:100},{outputWhite:NaN}])assert.throws(()=>normalizeLevels(bad),JSON.stringify(bad));
 assert.equal(normalizeLevels({outputBlack:40,outputWhite:40}).outputWhite,40);
});
test('combined input and output precede independent channel input and output with untouched alpha',()=>{
 const pixels=new Uint8ClampedArray([20,120,220,128,120,120,120,255,0,255,0,0]);
 applyLevels(pixels,{black:20,white:220,gamma:2,channels:{red:{outputBlack:10,outputWhite:210},green:{black:30,white:230},blue:{outputBlack:40,outputWhite:40}}});
 assert.deepEqual([...pixels],[10,191,40,128,151,191,40,255,10,255,40,0]);
 const output=new Uint8ClampedArray([0,128,255,73]);applyLevels(output,{outputBlack:20,outputWhite:220,channels:{red:{black:20,white:220},green:{black:20,white:220},blue:{black:20,white:220}}});assert.deepEqual([...output],[0,128,255,73]);
});
test('neutral channels preserve every legacy LUT byte and do not activate extra rasterization',()=>{
 const legacy={black:20,white:220,gamma:2};
 const neutral={black:0,white:255,gamma:1,outputBlack:0,outputWhite:255};
 const a=new Uint8ClampedArray(Array.from({length:256},(_,i)=>[i,i,i,(i*7)%256]).flat()),b=a.slice();
 applyLevels(a,legacy);applyLevels(b,{...legacy,outputBlack:0,outputWhite:255,channels:{red:neutral,green:neutral,blue:neutral}});assert.deepEqual(a,b);
 assert.equal(hasActiveLevels({enabled:true,...neutral,channels:{red:neutral,green:neutral,blue:neutral}}),false);
 assert.equal(hasActiveLevels({enabled:false,channels:{red:{gamma:2}}}),false);
 const disabled=b.slice();applyLevels(b,{enabled:false,channels:{red:{gamma:2}}});assert.deepEqual(b,disabled);
 assert.deepEqual(normalizeLevels(legacy),{enabled:true,...legacy});assert.equal(levelsTable(legacy)[120],180);
});
test('AI channel edits preserve source, obey selection and locks, and reject invalid edits atomically',()=>{
 const p=validateProject({format:'fluxoto-project',version:1,layers:[newLayer('image',{id:'photo',src:'data:image/png;base64,eA=='})]});
 const edit={type:'updateLayer',id:'photo',values:{levels:{channels:{blue:{gamma:2}}}}};
 const result=applyAICommands(p,[edit],{scope:'selection',selection:['photo']});assert.equal(result.layers[0].levels.channels.blue.gamma,2);assert.equal(result.layers[0].src,p.layers[0].src);
 assert.throws(()=>applyAICommands(p,[edit],{scope:'selection',selection:[]}));assert.throws(()=>applyAICommands({...p,layers:[{...p.layers[0],locked:true}]},[edit]));
 assert.throws(()=>applyAICommands(p,[edit,{...edit,values:{levels:{channels:{red:{gamma:0}}}}}]));assert.equal(p.layers[0].levels,null);
});
