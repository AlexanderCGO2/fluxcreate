import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createProject,parseProject,applyPatch} from '../src/engine/project.ts';
import {PAINT_COLOR_KEYS,paintPaletteParams} from '../src/engine/paintPalette.ts';
import {animatedValue} from '../src/engine/animation.ts';

test('Legacy three-pigment paint keeps its palette and behavior during migration',()=>{
 const legacy=createProject(randomUUID(),'paint-basin'),paint=legacy.graph.nodes.find(n=>n.type==='paint');
 Object.assign(paint.params,{colorA:'#010203',colorB:'#abcdef',colorC:'#ffeedd',mixing:.23,flow:.45});
 for(const key of ['colorCount','separateColors','colorCycle','endlessMotion',...PAINT_COLOR_KEYS.slice(3)])delete paint.params[key];
 const before=JSON.stringify(legacy),migrated=parseProject(JSON.parse(before)),params=migrated.graph.nodes.find(n=>n.type==='paint').params;
 assert.equal(JSON.stringify(legacy),before);assert.equal(params.colorCount,3);assert.equal(params.separateColors,false);assert.equal(params.endlessMotion,false);
 assert.equal(params.colorA,'#010203');assert.equal(params.colorB,'#abcdef');assert.equal(params.colorC,'#ffeedd');assert.equal(params.mixing,.23);assert.equal(params.flow,.45);
 assert(PAINT_COLOR_KEYS.every(key=>/^#[0-9a-f]{6}$/i.test(params[key])));assert.deepEqual(parseProject(migrated),migrated);
});
test('A twelve-color palette is one atomic edit and protected colors prevent partial application',()=>{
 const p=createProject(randomUUID(),'paint-basin'),paint=p.graph.nodes.find(n=>n.type==='paint'),values=paintPaletteParams('Gallery'),commands=Object.entries(values).map(([param,value])=>({op:'set',nodeId:paint.id,param,value}));
 const next=applyPatch(p,{baseRevision:p.revision,summary:'Gallery palette',commands});assert.equal(next.revision,p.revision+1);
 for(const [key,value] of Object.entries(values))assert.equal(next.graph.nodes.find(n=>n.id===paint.id).params[key],value);
 p.locks.push({nodeId:paint.id,param:'colorL'});const baseline=structuredClone(p);
 assert.throws(()=>applyPatch(p,{baseRevision:p.revision,summary:'Locked palette',commands}));assert.deepEqual(p,baseline);
});
test('Additional pigments animate, persist and hold their last color beyond the export clip',()=>{
 let p=createProject(randomUUID(),'paint-basin');const id=p.graph.nodes.find(n=>n.type==='paint').id;
 p=applyPatch(p,{baseRevision:p.revision,summary:'Animate final pigment',commands:[{op:'animate',track:{nodeId:id,param:'colorL',keys:[{time:0,value:'#000000',easing:'linear'},{time:2,value:'#ffffff',easing:'linear'}]}}]});
 p=parseProject(JSON.parse(JSON.stringify(p)));assert.equal(animatedValue(p.animations,id,'colorL',1,'#ff0000'),'#bcbcbc');assert.equal(animatedValue(p.animations,id,'colorL',60,'#ff0000'),'#ffffff');
});
