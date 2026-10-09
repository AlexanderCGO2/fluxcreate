import {ParticleSimulation} from '../src/engine/simulation.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createProject,applyPatch,parseProject,makeNode,edge,validateGraph} from '../src/engine/project.ts';import {MAX_SCENE_DURATION,clampSceneTime,continuousPreview,advancePlayback,previewSpan} from '../src/engine/timing.ts';import {ParticleDynamics} from '../src/engine/particleDynamics.ts';import {defaults} from '../src/engine/catalog.ts';import {ClothSimulation} from '../src/engine/cloth.ts';
test('Six-digit timelines accept late keyframes and reject overflow atomically',()=>{let p=createProject(randomUUID(),'paint-basin');const original=structuredClone(p),baseline=structuredClone(p);p=applyPatch(p,{baseRevision:0,summary:'Long composition',commands:[{op:'timeline',duration:999999,fps:30},{op:'animate',track:{nodeId:'paint',param:'colorA',keys:[{time:999998,value:'#00ffff',easing:'linear'},{time:999999,value:'#ff00ff',easing:'linear'}]}}]});assert.equal(p.timeline.duration,MAX_SCENE_DURATION);assert.deepEqual(parseProject(p),p);assert.throws(()=>applyPatch(original,{baseRevision:0,summary:'Invalid duration',commands:[{op:'timeline',duration:1000000,fps:30}]}));assert.deepEqual(original,baseline);assert.equal(clampSceneTime(Infinity),0);assert.equal(clampSceneTime(1e8),999999);});
test('Particle and cloth solvers continue beyond 30 seconds and at a late timeline position',()=>{const p=new ParticleDynamics({...defaults('particleSim'),count:100,rate:10,lifetime:2});p.seek(31);assert.equal(p.stepIndex,1860);assert(p.alive>0);p.stepIndex=999998*60;p.seek(999999,1);assert.equal(p.stepIndex,999998*60+1);const cloth=new ClothSimulation({...defaults('cloth'),resolution:12});cloth.stepIndex=999998*60;cloth.seek(999999,1);assert.equal(cloth.stepIndex,999998*60+1);for(let i=0;i<160;i++){cloth.stepIndex=i*30;cloth.save();}assert(cloth.checkpoints.size<=121);assert(cloth.checkpoints.has(0));});
test('Paint branches respect solver budgets and older tornado projects gain volume controls',()=>{const p=createProject(randomUUID(),'paint-basin');p.graph.nodes.push(makeNode('more','paint'),makeNode('third','paint'));assert.throws(()=>validateGraph(p.graph));const t=createProject(randomUUID(),'tornado');const motion=t.graph.nodes.find(n=>n.type==='motion');for(const k of ['tornadoRender','funnelHeight','coreWidth','volumeDensity','dust'])delete motion.params[k];assert.equal(parseProject(t).graph.nodes.find(n=>n.type==='motion').params.tornadoRender,'volume');});

test('Water and cloud retain bounded rewind caches with a time-zero anchor',()=>{for(const kind of ['water','cloud']){const sim=new ParticleSimulation(kind,{...defaults(kind),count:400});sim.stepIndex=999998*60;sim.seek(999999,1);assert.equal(sim.stepIndex,999998*60+1);for(let i=0;i<160;i++){sim.stepIndex=i*30;sim.save();}assert(sim.checkpoints.size<=121);assert(sim.checkpoints.has(0));}});


test('Continuous paint preview crosses clip boundaries while ordinary scenes retain loop and stop behavior',()=>{
 const p=createProject(randomUUID(),'paint-basin');assert(continuousPreview(p));
 assert.deepEqual(advancePlayback(29.9,.2,30,true,true),{time:30.099999999999998,stop:false});
 assert.deepEqual(advancePlayback(59,2,30,false,true),{time:61,stop:false});
 assert.deepEqual(advancePlayback(29,2,30,true,false),{time:1,stop:false});
 assert.deepEqual(advancePlayback(29,2,30,false,false),{time:30,stop:true});
 assert.deepEqual(advancePlayback(999998,2,30,true,true),{time:MAX_SCENE_DURATION,stop:true});
 assert(previewSpan(30,61,true)>=61);assert.equal(previewSpan(30,61,false),30);
 assert.equal(previewSpan(30,999999,true),MAX_SCENE_DURATION);
 const hidden=structuredClone(p);hidden.graph.nodes.find(n=>n.type==='paint').visible=false;assert(!continuousPreview(hidden));
 const detached=structuredClone(p);detached.graph.edges=[];assert(!continuousPreview(detached));
 const ordinary=createProject(randomUUID(),'water');ordinary.graph.nodes.push(makeNode('sparePaint','paint',{endlessMotion:true}));assert(!continuousPreview(ordinary));
});
