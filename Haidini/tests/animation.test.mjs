import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import * as THREE from 'three';
import { defaults } from '../src/engine/catalog.ts';
import { createProject, applyPatch, parseProject, edge } from '../src/engine/project.ts';
import { sampleKeys, mixColor } from '../src/engine/animation.ts';
import { ParticleDynamics } from '../src/engine/particleDynamics.ts';
import { ParticleSimulation } from '../src/engine/simulation.ts';
import { ClothSimulation } from '../src/engine/cloth.ts';
import { collideShapes, resolveColliders } from '../src/engine/collisions.ts';
import { particleLook, enableParticleAlpha, prepareParticleExport } from '../src/components/particleAppearance.ts';
import { ProjectStore } from '../server/projects.mjs';
const key=(time,value,easing='linear')=>({time,value,easing}),track=(param,keys,nodeId='title')=>({nodeId,param,keys});
const patch=(p,commands)=>applyPatch(p,{baseRevision:p.revision,summary:'Animation test',commands});
test('timeline samples endpoints, easing, hold, linear-light colors and nonuniform key spacing',()=>{
 assert.equal(sampleKeys([key(1,0),key(3,1)],0),0);assert.equal(sampleKeys([key(1,0),key(3,1)],2),.5);assert.equal(sampleKeys([key(1,0),key(3,1)],8),1);
 assert.equal(sampleKeys([key(0,0,'ease in'),key(2,1)],1),.125);
 assert.equal(sampleKeys([key(0,0,'ease out'),key(2,1)],1),.875);
 assert.equal(sampleKeys([key(0,0,'hold'),key(2,1)],1.99),0);assert.equal(sampleKeys([key(0,0,'hold'),key(2,1)],2),1);
 assert.equal(mixColor('#000000','#ffffff',.5),'#bcbcbc');assert.equal(sampleKeys([key(0,'#000000'),key(2,'#ffffff')],1),'#bcbcbc');
 assert.equal(sampleKeys([key(0,0),key(1,1),key(5,0)],3),.5);
});
test('animation edits are atomic, bounded and protected; duplication and removal preserve track identities',()=>{
 let p=createProject(randomUUID(),'title');const original=structuredClone(p),opacity=track('opacity',[key(0,0),key(2,1)]);
 assert.throws(()=>patch(p,[{op:'set',nodeId:'title',param:'text',value:'CHANGED'},{op:'animate',track:track('opacity',[key(0,2),key(2,0)])}]));assert.deepEqual(p,original);
 for(const invalid of [track('size',[key(0,1)]),track('color',[key(0,.5)]),track('opacity',[key(0,0),key(0,1)]),track('opacity',[key(10,1)]),track('opacity',[key(0,0)],'missing')])assert.throws(()=>patch(p,[{op:'animate',track:invalid}]));
 p=patch(p,[{op:'animate',track:opacity},{op:'duplicate',nodeId:'title',id:'copy',x:20,y:20}]);assert.equal(p.animations.length,2);assert.deepEqual(p.animations[1].keys,opacity.keys);
 p=patch(p,[{op:'remove',nodeId:'copy'}]);assert.equal(p.animations.length,1);
 p.locks=[{nodeId:'title',param:'opacity'}];assert.throws(()=>patch(p,[{op:'removeAnimation',nodeId:'title',param:'opacity'}]),e=>e.status===409);assert.throws(()=>patch(p,[{op:'animate',track:opacity}]),e=>e.status===409);
 const old=createProject(randomUUID(),'motion');delete old.animations;for(const n of old.graph.nodes)delete n.params.opacity;const migrated=parseProject(old);assert.deepEqual(migrated.animations,[]);assert.equal(migrated.graph.nodes.find(n=>n.type==='text').params.opacity,1);
 const a=edge('a'.repeat(64),'b'.repeat(64),'colliders'),b=edge('a'.repeat(64),'b'.repeat(63)+'c','colliders');assert(a.id.length<=64);assert.notEqual(a.id,b.id);
});
test('keyframes survive database restart, undo, redo and scene duplication',async()=>{
 const dir=await mkdtemp('.test-data/animation-'),memory={remember:()=>{}};let store=new ProjectStore(dir+'/scene.sqlite',memory),p=store.create(undefined,'title').project;
 const keys=track('opacity',[key(0,0),key(1,1)]);p=store.patch(p.id,{baseRevision:p.revision,summary:'Fade title',commands:[{op:'animate',track:keys}]}).project;
 store.close();store=new ProjectStore(dir+'/scene.sqlite',memory);assert.deepEqual(store.get(p.id).project.animations,[keys]);assert.deepEqual(store.duplicate(p.id,p.revision).project.animations,[keys]);
 const undone=store.move(p.id,p.revision,-1).project;assert.deepEqual(undone.animations,[]);const redone=store.move(p.id,undone.revision,1).project;assert.deepEqual(redone.animations,[keys]);store.close();
});
test('particles are deterministic through rewind and follow animated emission rates and source transforms',()=>{
 const params={...defaults('particleSim'),count:200,rate:60,gravity:0,speed:0,spread:0,drag:0,lifetime:6};
 const config={origin:{nodeId:'sim',params},source:{nodeId:'source',params:{...defaults('shape'),radius:0}},tracks:[track('rate',[key(0,60,'hold'),key(1,0)],'sim'),track('x',[key(0,0),key(1,3)],'source')]};
 const sim=new ParticleDynamics(params,config);sim.seek(2);assert.equal(sim.serial,60);assert.equal([...sim.ages].filter(a=>a>=0).length,60);assert(sim.positions[57*3]>2.8);assert.equal(sim.positions[1],0);
 const positions=sim.positions.slice(),ages=sim.ages.slice();sim.seek(.3);sim.seek(2);assert.deepEqual(sim.positions,positions);assert.deepEqual(sim.ages,ages);const direct=new ParticleDynamics(params,config);for(let t=0;t<=2;t+=1/30)direct.seek(t);direct.seek(2);assert.deepEqual(direct.positions,positions);
 const box=new ParticleDynamics(params,{source:{nodeId:'box',params:{...defaults('shape'),shape:'box',width:2,height:4,depth:6},shape:'box'}});box.seek(1/60);assert([Math.abs(box.positions[0])-1,Math.abs(box.positions[1])-2,Math.abs(box.positions[2])-3].some(v=>Math.abs(v)<1e-6));
 const text=new ParticleDynamics(params,{source:{nodeId:'text',params:{...defaults('text'),x:2},points:new Float32Array([1,0,0]),origins:new Float32Array([0]),glyphs:new Uint16Array([0])}});text.seek(1/60);assert.equal(text.positions[0],3);
});
test('sphere and box contacts project outside with restitution; animated colliders use simulation-local coordinates',()=>{
 const p=new Float32Array([0,.5,0]),v=new Float32Array([1,-2,0]),sphere={shape:'sphere',x:0,y:0,z:0,radius:1,half:[1,1,1]};collideShapes(p,0,.1,[sphere],v,.5,.2);assert(Math.abs(p[1]-1.1)<1e-6);assert.equal(v[1],1);assert(Math.abs(v[0]-.8)<1e-6);
 p.set([.9,0,0]);collideShapes(p,0,.1,[{...sphere,shape:'box'}]);assert(Math.abs(p[0]-1.1)<1e-6);
 const collider={nodeId:'box',params:{...defaults('shape'),shape:'box',x:5}},config={colliders:[collider],origin:{nodeId:'water',params:{x:2,y:0,z:0}},tracks:[track('x',[key(0,5),key(2,7)],'box')]};assert.equal(resolveColliders(config,1)[0].x,4);
 const params={...defaults('particleSim'),count:200,rate:100,radius:.1,y:2,speed:0,spread:0,gravity:-9.8,lifetime:6},floor={nodeId:'floor',params:{...defaults('shape'),shape:'box',width:20,depth:20,height:1,y:0}};
 const sim=new ParticleDynamics(params,{colliders:[floor]});sim.seek(3);for(let i=0;i<sim.count;i++)if(sim.ages[i]>=0)assert(sim.positions[i*3+1]>=.5+Number(params.size)*.6-1e-5);
});
test('water and cloth respond to external shape colliders',()=>{
 const spec={nodeId:'floor',params:{...defaults('shape'),shape:'box',width:16,depth:16,height:.5,y:-.6}};
 const wp={...defaults('water'),count:300,setup:'falling drop',obstacle:0},water=new ParticleSimulation('water',wp,{colliders:[spec]});water.seek(1.5);for(let i=0;i<water.count;i++)assert(water.positions[i*3+1]>=-.36,'Water rests on shared floor');
 const cp={...defaults('cloth'),setup:'drape',resolution:10,obstacle:0,wind:0},cloth=new ClothSimulation(cp,{colliders:[spec]});cloth.seek(2);for(let i=0;i<cloth.count;i++)assert(cloth.positions[i*3+1]>=-.32,'Cloth rests on shared floor');
});
test('particle lifetime ramps and GLB conversion preserve color, size and transparency',()=>{
 const params={...defaults('particleSim'),lifeTransition:true,color:'#ff0000',endColor:'#0000ff',endOpacity:0,endSize:.2,lifeEasing:'linear',fadeIn:0};
 const middle=particleLook(params,.5,'#ff0000',1),end=particleLook(params,1,'#ff0000',1);assert.equal(particleLook(params,0,'#ff0000',1).opacity,1);assert.equal(middle.opacity,.5);assert.equal(middle.color,'#bc00bc');assert(Math.abs(end.size-.2)<1e-10);assert.equal(end.opacity,0);
 assert.equal(particleLook({...params,lifeTransition:false},.5,'#ff0000',.7).opacity,.7);
 const mesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(),new THREE.MeshBasicMaterial(),3),alpha=enableParticleAlpha(mesh),group=new THREE.Group();alpha.setX(0,0);alpha.setX(1,.5);alpha.setX(2,1);group.add(mesh);const cleanup=prepareParticleExport(group);assert.equal(group.children[0].children.reduce((n,m)=>n+m.count,0),2);for(const part of group.children[0].children)assert.equal(part.geometry.getAttribute('instanceAlpha'),undefined);assert(group.children[0].children.some(m=>m.material.opacity===.5));cleanup();mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
});
