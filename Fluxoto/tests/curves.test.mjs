import test from 'node:test';
import assert from 'node:assert/strict';
import {validateProject,newLayer,toMotion} from '../src/model.mjs';
const project=curves=>validateProject({format:'fluxoto-project',version:1,layers:[newLayer('image',{id:'photo',src:'data:image/png;base64,eA==',curves})]});
test('native Curves retain bounded ordered points, source bytes and portable warning',()=>{
 const curves={enabled:true,points:[[0,0],[128,192],[255,255]],channels:{red:[[0,255],[255,0]]}};
 const p=project(curves);assert.deepEqual(p.layers[0].curves,curves);assert.equal(p.layers[0].src,'data:image/png;base64,eA==');assert.deepEqual(validateProject(JSON.parse(JSON.stringify(p))),p);assert.match(toMotion(p).warnings.join(' '),/Curves/);
});
test('malformed, duplicate, unordered, nonfinite and unbounded curve data cannot enter native files',()=>{
 for(const curves of [[],{enabled:null},{enabled:1},{points:[]},{points:[[0,0],[255,256]]},{points:[[0,0],[255,'255']]},{points:[[0,0],[128,50],[128,90],[255,255]]},{points:[[0,0],[127.5,30],[255,255]]},{points:[[0,0],[200,0],[100,0],[255,255]]},{points:[[1,0],[255,255]]},{points:[[0,0],[254,255]]},{points:[[0,0],[255,NaN]]},{points:[[0,0,3],[255,255]]},{points:Array.from({length:17},(_,i)=>[i===16?255:i*10,i*10])},{channels:[]},{channels:null},{channels:{cyan:[[0,0],[255,255]]}},{channels:{red:null}},{interpolation:'spline'}])assert.throws(()=>project(curves),JSON.stringify(curves));
 assert.throws(()=>validateProject({format:'fluxoto-project',version:1,layers:[newLayer('shape',{curves:{}})]}),/photo/);
 assert.equal(Object.hasOwn(project(undefined).layers[0],'curves'),false);
});

test('linear RGB then channel lookup, Levels ordering, and unchanged alpha',async()=>{
 const module=await import('../src/curves.mjs').catch(()=>null);assert.ok(module,'Curves pixel operation must exist');
 const {applyCurves}=module,{applyLevels}=await import('../src/levels.mjs');
 const pixels=new Uint8ClampedArray([20,120,220,128,128,128,128,0]);
 const value={points:[[0,0],[128,192],[255,255]],channels:{red:[[0,255],[255,0]],blue:[[0,40],[255,40]]}};
 applyCurves(pixels,value);assert.deepEqual([...pixels],[225,180,40,128,63,192,40,0]);
 const ordered=new Uint8ClampedArray([20,120,220,73]);applyLevels(ordered,{black:20,white:220,gamma:2});applyCurves(ordered,value);assert.deepEqual([...ordered],[255,218,40,73]);
});
test('identity across all 256 inputs bypasses rasterization and disabled curves preserve bytes',async()=>{
 const module=await import('../src/curves.mjs').catch(()=>null);assert.ok(module,'Curves pixel operation must exist');
 const {applyCurves,hasActiveCurves,normalizeCurves}=module;
 const neutral={enabled:true,points:[[0,0],[64,64],[128,128],[255,255]],channels:{red:[[0,0],[255,255]],green:[[0,0],[255,255]],blue:[[0,0],[255,255]]}};
 const data=new Uint8ClampedArray(Array.from({length:256},(_,i)=>[i,i,i,(i*17)%256]).flat()),original=data.slice();applyCurves(data,neutral);assert.deepEqual(data,original);assert.equal(hasActiveCurves(neutral),false);assert.equal(hasActiveCurves(null),false);
 const disabled={enabled:false,points:[[0,255],[255,0]]};applyCurves(data,disabled);assert.deepEqual(data,original);assert.equal(hasActiveCurves(disabled),false);assert.deepEqual(normalizeCurves({}),{enabled:true,points:[[0,0],[255,255]]});
});
