import test from 'node:test';import assert from 'node:assert/strict';
import * as model from '../src/model.mjs';
import {encodeProject,decodeProject} from '../../FluxCreate/shared/browser.mjs';
import {makeSuiteSource} from '../../FluxCreate/shared/suite-source.mjs';
import {exportGLTF} from '../src/formats.mjs';
const scene=()=>model.validateProject({...model.createDemoProject(),objects:[model.newObject('box',{id:'a',name:'Left',position:[-2,1,3]}),model.newObject('sphere',{id:'b',name:'Right',position:[4,2,-1]}),model.newObject('box',{id:'locked',name:'Protected',position:[0,0,0],locked:true})]});
const apply=(...args)=>{assert.equal(typeof model.applyObjectBatch,'function','Batch edits must use one validated scene operation');return model.applyObjectBatch(...args);};
test('batch translation preserves relative spacing and unselected objects without mutating the input',()=>{
 const p=scene(),before=JSON.stringify(p),result=apply(p,['a','b'],{type:'translate',delta:[3,-1,2]});
 assert.deepEqual(result.project.objects.map(o=>o.position),[[1,0,5],[7,1,1],[0,0,0]]);assert.deepEqual(result.selection,['a','b']);assert.equal(JSON.stringify(p),before);
});
test('a locked, missing or out-of-bounds member rejects the entire batch',()=>{
 const p=scene(),before=JSON.stringify(p);for(const action of [{type:'translate',delta:[1,0,0]},{type:'duplicate'},{type:'delete'}]){assert.throws(()=>apply(p,['a','locked'],action),/locked|Unlock/i);assert.throws(()=>apply(p,['a','missing'],action),/not found|missing/i);}
 assert.throws(()=>apply(p,['a','b'],{type:'translate',delta:[10000,0,0]}));assert.throws(()=>apply(p,['a','b'],{type:'translate',delta:[NaN,0,0]}));assert.equal(JSON.stringify(p),before);
});
test('duplicate returns a new selection with independent transforms; delete removes exactly that selection',()=>{
 const p=scene(),result=apply(p,['a','b','a'],{type:'duplicate'});assert.equal(result.project.objects.length,5);assert.equal(new Set(result.selection).size,2);assert.ok(result.selection.every(id=>!p.objects.some(o=>o.id===id)));
 assert.deepEqual(result.project.objects.slice(3).map(o=>o.position),[[-1,1,3],[5,2,-1]]);result.project.objects[3].position[0]=99;assert.equal(p.objects[0].position[0],-2);
 const removed=apply(result.project,result.selection,{type:'delete'});assert.deepEqual(removed.project.objects,p.objects);assert.deepEqual(removed.selection,[]);
});
test('batch duplication is atomic when the existing object or source budgets would be exceeded',()=>{
 const p=scene();p.objects=Array.from({length:199},(_,i)=>model.newObject('box',{id:`o${i}`}));const before=JSON.stringify(p);assert.throws(()=>apply(p,['o0','o1'],{type:'duplicate'}),/200/);assert.equal(JSON.stringify(p),before);
});
test('batch edits preserve retained sources and mesh data across native reload and portable export',()=>{
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',source=makeSuiteSource({app:'fluxoto',name:'Poster',filename:'poster.fluxoto',text:'{"retained":"exact original"}',kind:'native',view:{}});
 const p=model.validateProject({...scene(),objects:[model.newObject('plane',{id:'p',studioObject:{suiteSource:source,preview:{src:png}}}),model.newObject('mesh',{id:'m',geometry:{positions:[0,0,0,1,0,0,0,1,0],indices:[0,1,2]}})]}),geometry=p.objects[1].geometry;
 const result=apply(p,['p','m'],{type:'duplicate'},{trustedGeometry:new Set([geometry])}),moved=apply(result.project,result.selection,{type:'translate',delta:[2,0,-3]},{trustedGeometry:new Set([geometry])});
 assert.equal(moved.project.objects[3].geometry,geometry);assert.equal(moved.project.objects[2].studioObject.suiteSource.text,source.text);assert.equal(moved.project.objects[2].studioObject.preview.src,png);
 const reopened=model.validateProject(decodeProject(encodeProject('flux3d',moved.project,null)).project);assert.deepEqual(reopened,moved.project);const portable=JSON.parse(exportGLTF(reopened));assert.equal(portable.nodes.length,4);assert.ok(portable.images.length>=1);assert.ok(!JSON.stringify(portable).includes('exact original'));
});
