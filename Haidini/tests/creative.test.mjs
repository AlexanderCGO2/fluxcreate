import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createProject, applyPatch } from '../src/engine/project.ts';
import { CATALOG, defaults } from '../src/engine/catalog.ts';
import { creativeActions, effectCommands, PRIMARY_PARAMS } from '../src/engine/creative.ts';
import { GraphEvaluator } from '../src/engine/evaluator.ts';
import { ParticleSimulation } from '../src/engine/simulation.ts';

test('effect bundles add complete rendered branches within an atomic patch',()=>{
  for(const kind of ['title','particles','water','cloud','alpine']){
    const p=createProject(randomUUID(),'blank'),commands=effectCommands(p,kind,'added');
    assert(commands.length<=32,kind+' exceeds patch budget: '+commands.length);
    const next=applyPatch(p,{baseRevision:p.revision,summary:'Add '+kind,commands}),result=new GraphEvaluator().evaluate(next.graph);
    assert(result.items.length>0,kind+' should render immediately');assert.deepEqual(result.diagnostics,{});
    assert.equal(next.id,p.id);assert.equal(next.name,p.name);
  }
});
test('creative controls and suggestions match their selected operator and respect protection',()=>{
  for(const [type,params] of Object.entries(PRIMARY_PARAMS))for(const param of params)assert(CATALOG[type].params[param],type+'.'+param);
  for(const template of ['water','cloud','motion','alpine']){
    const p=createProject(randomUUID(),template);
    for(const node of p.graph.nodes)for(const action of creativeActions(p,node))assert.doesNotThrow(()=>applyPatch(p,{baseRevision:p.revision,summary:action.summary,commands:action.commands}));
  }
  const p=createProject(randomUUID(),'water'),water=p.graph.nodes[0];
  assert.deepEqual(creativeActions(p,water).map(a=>a.label),['Calmer water','Stronger splash']);
  p.locks=[{nodeId:water.id,param:'impulse'}];assert.deepEqual(creativeActions(p,water),[]);
});
test('project naming uses the same atomic validation as other edits',()=>{
  const p=createProject(randomUUID(),'water');
  const next=applyPatch(p,{baseRevision:p.revision,summary:'Rename',commands:[{op:'projectName',name:'Blue study'}]});
  assert.equal(next.name,'Blue study');assert.equal(next.id,p.id);assert.deepEqual(next.graph,p.graph);
  assert.throws(()=>applyPatch(p,{baseRevision:p.revision,summary:'Invalid name',commands:[{op:'projectName',name:' '}]}));
  assert.throws(()=>applyPatch(p,{baseRevision:p.revision,summary:'Invalid name',commands:[{op:'projectName',name:'x'.repeat(101)}]}));
});
test('falling drops start spherical at rest spacing and do not explode before impact',()=>{
  for(const count of [400,1200,2400])for(const gravity of [1,20]){
    const sim=new ParticleSimulation('water',{...defaults('water'),setup:'falling drop',count,gravity,impulse:0,obstacle:0});
    const extent=a=>{const x=Array.from(sim.positions).filter((_,i)=>i%3===a);return Math.max(...x)-Math.min(...x);};
    const widths=[extent(0),extent(1),extent(2)];assert(Math.max(...widths)-Math.min(...widths)<.001);
    const initial=sim.positions.slice(),radius=Math.max(...Array.from({length:count},(_,i)=>Math.hypot(initial[3*i],initial[3*i+1]-2.2,initial[3*i+2])));
    assert(radius<2,'Drop fits above the basin');
    sim.seek(.1);assert(sim.positions.every(Number.isFinite));
    const displacement=Math.max(...Array.from({length:count},(_,i)=>Math.hypot(sim.positions[3*i]-initial[3*i],sim.positions[3*i+2]-initial[3*i+2])));
    assert(displacement<.15,'No pressure explosion before collision: '+displacement);
    const expected=sim.positions.slice();sim.seek(0);sim.seek(.1);assert.deepEqual(sim.positions,expected);
  }
});
