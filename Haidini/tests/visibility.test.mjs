import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp} from 'node:fs/promises';
import {createProject,applyPatch,parseProject,makeNode,edge} from '../src/engine/project.ts';
import {GraphEvaluator} from '../src/engine/evaluator.ts';
import {renderVisibilityIds,isAppearanceVisible,canToggleVisibility} from '../src/engine/visibility.ts';
import {ProjectStore} from '../server/projects.mjs';
const patch=(p,commands)=>applyPatch(p,{baseRevision:p.revision,summary:'Visibility edit',commands});
const hide=(p,nodeId)=>patch(p,[{op:'visibility',nodeId,visible:false}]);
const visible=(p,item)=>isAppearanceVisible(p.graph,renderVisibilityIds(p.graph,item));
test('visibility defaults to shown and edits preserve parameters, animation and protected values',()=>{
 const p=createProject(randomUUID(),'color-fade');p.locks=[{nodeId:'title',param:'opacity'}];
 assert.equal(parseProject(JSON.parse(JSON.stringify(p))).graph.nodes[0].visible,undefined);
 const hidden=hide(p,'title');assert.equal(hidden.graph.nodes[0].visible,false);assert.deepEqual(hidden.graph.nodes[0].params,p.graph.nodes[0].params);assert.deepEqual(hidden.animations,p.animations);assert.deepEqual(hidden.graph.edges,p.graph.edges);assert.equal(p.graph.nodes[0].visible,undefined);
 assert.throws(()=>patch(p,[{op:'visibility',nodeId:'title',visible:false},{op:'visibility',nodeId:'output',visible:false}]));
 assert.throws(()=>patch(p,[{op:'visibility',nodeId:'missing',visible:false}]));
 assert.throws(()=>patch(p,[{op:'visibility',nodeId:'title',visible:'false'}]));
 const copy=patch(hidden,[{op:'duplicate',nodeId:'title',id:'copy',x:0,y:100}]);assert.equal(copy.graph.nodes.find(n=>n.id==='copy').visible,false);
 assert.deepEqual(parseProject(JSON.parse(JSON.stringify(hidden))),hidden);
 assert.equal(canToggleVisibility('curve'),false);assert.equal(canToggleVisibility('merge'),true);
});
test('hiding source text and colliders changes appearance without invalidating evaluated simulation inputs',()=>{
 const p=createProject(randomUUID(),'text-sparks'),evaluator=new GraphEvaluator(),first=evaluator.evaluate(p.graph);
 const hidden=patch(p,[{op:'visibility',nodeId:'title',visible:false},{op:'visibility',nodeId:'floor',visible:false}]),next=evaluator.evaluate(hidden.graph);
 assert.equal(next.computed,0);assert.equal(next.cached,p.graph.nodes.length);
 assert.equal(visible(hidden,next.items.find(i=>i.kind==='text')),false);assert.equal(visible(hidden,next.items.find(i=>i.kind==='shape')),false);
 const sim=next.items.find(i=>i.kind==='simulation');assert.equal(visible(hidden,sim),true);assert.deepEqual(sim,first.items.find(i=>i.kind==='simulation'));assert.equal(sim.source.nodeId,'title');assert.equal(sim.colliders[0].nodeId,'floor');
 const motion=createProject(randomUUID(),'motion'),result=new GraphEvaluator().evaluate(motion.graph),text=result.items.find(i=>i.kind==='text'),particles=result.items.find(i=>i.kind==='particles');
 assert.equal(visible(hide(motion,'title'),text),false);assert.equal(visible(hide(motion,'letterMotion'),text),false);assert.equal(visible(hide(motion,'title'),particles),true);assert.equal(visible(hide(motion,'sparks'),particles),false);
});
test('visibility follows visual modifiers and merge routes without hiding independent render branches',()=>{
 let p=createProject(randomUUID(),'title');p.graph.nodes.push(makeNode('merge','merge'));p.graph.edges.push(edge('animate','merge','scene'),edge('merge','output','scene'));
 const items=new GraphEvaluator().evaluate(p.graph).items;assert.equal(items.length,2);const hidden=hide(p,'merge');assert.equal(items.filter(i=>visible(hidden,i)).length,1);assert.equal(items.filter(i=>visible(hide(p,'title'),i)).length,0);
 const landscape=createProject(randomUUID(),'alpine'),render=new GraphEvaluator().evaluate(landscape.graph).items,withoutSurface=hide(landscape,'grid');assert(render.some(i=>i.kind==='surface'&&!visible(withoutSurface,i)));assert(render.filter(i=>i.kind==='instances').every(i=>visible(withoutSurface,i)));
});
test('visibility persists through restart, undo/redo and scene duplication',async()=>{
 const dir=await mkdtemp('.test-data/visibility-'),memory={remember:()=>{}};let store=new ProjectStore(dir+'/projects.sqlite',memory),p=store.create(undefined,'text-sparks').project;
 p=store.patch(p.id,{baseRevision:p.revision,summary:'Hide collision floor',commands:[{op:'visibility',nodeId:'floor',visible:false}]}).project;store.close();
 store=new ProjectStore(dir+'/projects.sqlite',memory);assert.equal(store.get(p.id).project.graph.nodes.find(n=>n.id==='floor').visible,false);
 assert.equal(store.duplicate(p.id,p.revision).project.graph.nodes.find(n=>n.id==='floor').visible,false);
 p=store.move(p.id,p.revision,-1).project;assert.notEqual(p.graph.nodes.find(n=>n.id==='floor').visible,false);p=store.move(p.id,p.revision,1).project;assert.equal(p.graph.nodes.find(n=>n.id==='floor').visible,false);store.close();
});
