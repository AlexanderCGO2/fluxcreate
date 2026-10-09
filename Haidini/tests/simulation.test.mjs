import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ParticleSimulation } from '../src/engine/simulation.ts';
import { defaults } from '../src/engine/catalog.ts';
import { createProject, applyPatch, edge, makeNode, validateGraph } from '../src/engine/project.ts';
import { GraphEvaluator } from '../src/engine/evaluator.ts';
const extent=(p,a)=>{const v=Array.from(p).filter((_,i)=>i%3===a);return [Math.min(...v),Math.max(...v)];};
test('fluid particles fall, spread, interact and remain outside colliders',()=>{
  const sim=new ParticleSimulation('water',defaults('water')),start=sim.positions.slice();const now=performance.now();sim.seek(2);
  assert(sim.positions.every(Number.isFinite));assert.notDeepEqual(sim.positions,start);
  const [xmin,xmax]=extent(sim.positions,0),[ymin,ymax]=extent(sim.positions,1);assert(xmin>=-4.2&&xmax<=4.2);assert(ymin>=-2&&ymax<4.5);
  assert(xmax-xmin>extent(start,0)[1]-extent(start,0)[0]+1,'Water must spread across the basin');
  for(let i=0;i<sim.count;i++){const k=i*3;assert(Math.hypot(sim.positions[k]-.8,sim.positions[k+1]+1.15,sim.positions[k+2])>=.85,'Sphere collision must exclude fluid');}
  console.log(JSON.stringify({waterSeconds:2,computeMs:Math.round(performance.now()-now),lastStepMs:+sim.lastStepMs.toFixed(2),bounds:[extent(sim.positions,0),extent(sim.positions,1),extent(sim.positions,2)]}));
});
test('seeking and playback produce exactly the same simulated frame',()=>{
  const params={...defaults('water'),count:400},a=new ParticleSimulation('water',params),b=new ParticleSimulation('water',params);
  a.seek(1.2);const expected=a.positions.slice();a.seek(.15);a.seek(1.2);assert.deepEqual(a.positions,expected);
  for(let t=0;t<1.2;t+=.1)b.seek(t);b.seek(1.2);assert.deepEqual(b.positions,expected);assert.deepEqual(b.velocities,a.velocities);
  assert.equal(a.seek(10,2),false);assert.equal(a.stepIndex,74,'Bounded work must not calculate the whole timeline in one burst');
});
test('water controls change physical outcomes and remain stable at high gravity',()=>{
  const p={...defaults('water'),count:400,obstacle:0},a=new ParticleSimulation('water',{...p,gravity:1}),b=new ParticleSimulation('water',{...p,gravity:20});a.seek(.5);b.seek(.5);
  const averageY=s=>s.positions.reduce((sum,x,i)=>sum+(i%3===1?x:0),0)/s.count;assert(averageY(b)<averageY(a)-.5);
  b.seek(3);assert(b.positions.every(Number.isFinite));assert(extent(b.positions,1)[0]>=-2);
});
test('cloud parcels advect with buoyancy and wind and generate a changing volume',()=>{
  const p={...defaults('cloud'),count:300},sim=new ParticleSimulation('cloud',p),before=sim.frame();sim.seek(2);const after=sim.frame();
  assert.notDeepEqual(before.positions,after.positions);assert.notDeepEqual(before.volume,after.volume);assert(after.volume.some(v=>v>80));assert(after.volume.some(v=>v===0));
  const avg=(s,a)=>s.reduce((sum,v,i)=>sum+(i%3===a?v:0),0)/sim.count;
  assert(avg(after.positions,1)>avg(before.positions,1));assert(avg(after.positions,0)>avg(before.positions,0));
  sim.seek(.1);sim.seek(2);assert.deepEqual(sim.frame().volume,after.volume);
  const calm=new ParticleSimulation('cloud',{...p,wind:0,buoyancy:0,turbulence:0});calm.seek(2);assert.notDeepEqual(calm.positions,after.positions);
});
test('simulation graph templates, edits and render amplification are validated',()=>{
  for(const kind of ['water','cloud']){const p=createProject(randomUUID(),kind),result=new GraphEvaluator().evaluate(p.graph);assert.equal(result.items[0].kind,'simulation');assert.equal(result.items[0].simulation,kind);assert.deepEqual(result.diagnostics,{});
    const edited=applyPatch(p,{baseRevision:0,summary:'Adjust simulation',commands:[{op:'set',nodeId:kind,param:'count',value:500}]});assert.equal(edited.graph.nodes[0].params.count,500);
  }
  const p=createProject(randomUUID(),'water');p.graph.nodes.push(makeNode('cloud','cloud'),makeNode('water2','water'));assert.throws(()=>validateGraph(p.graph),/two simulation/);
  const q=createProject(randomUUID(),'water');for(let i=0;i<3;i++){q.graph.nodes.push(makeNode('t'+i,'transform'));q.graph.edges.push(edge('water','t'+i,'scene'),edge('t'+i,'output','scene'));}assert.throws(()=>validateGraph(q.graph),/rendering budget/);
  const r=createProject(randomUUID(),'water');r.graph.nodes.push(makeNode('motion','motion'));r.graph.edges.push(edge('water','motion','particles'));assert.throws(()=>validateGraph(r.graph),/incompatible/);
});
