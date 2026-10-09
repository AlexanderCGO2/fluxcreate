import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createProject,applyPatch,parseProject,edge} from '../src/engine/project.ts';
import {particleCapacityLimit} from '../src/engine/particleCapacity.ts';
const patch=(p,commands)=>applyPatch(p,{baseRevision:p.revision,summary:'Capacity test',commands});
const set=(nodeId,param,value)=>({op:'set',nodeId,param,value});
test('128k particle scenes save at the limit and reject excess without changing the input',()=>{
 const p=createProject(randomUUID(),'text-sparks'),large=patch(p,[set('sparks','count',128000),set('sparks','rate',32000),set('sparks','burstCount',128000)]);
 assert.deepEqual(parseProject(JSON.parse(JSON.stringify(large))),large);const saved=structuredClone(large);
 for(const command of [set('sparks','count',128001),set('sparks','rate',32001),set('sparks','burstCount',128001)])assert.throws(()=>patch(large,[command]));
 assert.deepEqual(large,saved);assert.equal(particleCapacityLimit(large.graph,'sparks'),128000);
});
test('capacity suggestions account for two emitters and duplicated render branches',()=>{
 let p=createProject(randomUUID(),'text-sparks');p=patch(p,[set('sparks','count',64000),{op:'duplicate',nodeId:'sparks',id:'second',x:0,y:0},{op:'connect',edge:edge('second','output','scene')}]);
 assert.equal(particleCapacityLimit(p.graph,'sparks'),64000);const uneven=patch(p,[set('sparks','count',1613),set('second','count',126387)]);assert.equal(particleCapacityLimit(uneven.graph,'sparks'),1613);assert.throws(()=>patch(p,[set('sparks','count',64010)]),/budget/);
 let branched=createProject(randomUUID(),'text-sparks');branched=patch(branched,[set('sparks','count',64000),{op:'add',id:'copy',type:'transform',x:0,y:0},{op:'connect',edge:edge('sparks','copy','scene')},{op:'connect',edge:edge('copy','output','scene')}]);assert.equal(particleCapacityLimit(branched.graph,'sparks'),64000);assert.throws(()=>patch(branched,[set('sparks','count',64010)]),/budget/);
});
test('higher GPU budgets do not remove CPU effect budgets; water and cloud maxima validate',()=>{
 const p=createProject(randomUUID(),'blank');assert.throws(()=>patch(p,Array.from({length:3},(_,i)=>[{op:'add',id:'e'+i,type:'emitter',x:0,y:0},set('e'+i,'count',5000)]).flat()),/budget/);
 for(const [template,id,max] of [['water','water',8000],['cloud','cloud',7200]]){const p=createProject(randomUUID(),template);assert.equal(patch(p,[set(id,'count',max)]).graph.nodes.find(n=>n.id===id).params.count,max);assert.throws(()=>patch(p,[set(id,'count',max+10)]));}
 for(const template of ['fire','explosion','sparks','fountain'])assert(createProject(randomUUID(),template).graph.nodes.some(n=>n.type==='particleSim'));
});
