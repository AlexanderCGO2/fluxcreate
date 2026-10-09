import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {createProject,parseProject,applyPatch,validateProject,makeNode,edge} from '../src/engine/project.ts';
import {GraphEvaluator} from '../src/engine/evaluator.ts';
import {effectCommands} from '../src/engine/creative.ts';
import {manipulationCommands} from '../src/engine/manipulation.ts';
import {materialPresetCommands} from '../src/engine/materialControls.ts';
import * as THREE from 'three';
import {surfaceMaterials,setSceneCamera} from '../src/components/sceneTools.ts';
import {renderSchedule,muxWebM} from '../src/engine/renderExport.ts';
test('Studio geometry, shading, lights and cameras form a validated editable graph',()=>{
 const p=createProject(randomUUID(),'studio-turntable');const result=new GraphEvaluator().evaluate(p.graph);assert.deepEqual(result.diagnostics,{});
 assert.deepEqual(result.items.map(i=>i.kind),['material','primitive','light','camera']);assert.equal(result.items[0].items[0].kind,'primitive');
 const empty=createProject(randomUUID(),'blank');const inserted=applyPatch(empty,{baseRevision:0,summary:'Studio',commands:effectCommands(empty,'studio-turntable','studio')});validateProject(inserted);assert.equal(inserted.animations[0].param,'rotateY');
});
test('Viewport drags commit one bounded edit, keyframe animated properties and preserve locks',()=>{
 const p=createProject(randomUUID(),'studio-turntable');p.locks.push({nodeId:'model',param:'y'});
 const commands=manipulationCommands(p,'model',{x:100,y:5,rotateY:50,scale:2},2);
 assert.equal(commands.length,3);assert.equal(commands[0].value,50);assert.equal(commands[1].op,'animate');assert.equal(commands[1].track.keys[1].time,2);
 const changed=applyPatch(p,{baseRevision:0,summary:'Drag',commands});assert.equal(changed.revision,1);assert.equal(changed.graph.nodes[0].params.y,1.7);assert.equal(changed.graph.nodes[0].params.rotateY,0);
 assert.deepEqual(manipulationCommands(p,'missing',{x:1},0),[]);
});
test('Material presets respect locks and insert keys into existing appearance animation',()=>{
 const p=createProject(randomUUID(),'studio-turntable');p.animations.push({nodeId:'finish',param:'roughness',keys:[{time:0,value:.2,easing:'linear'}]});
 const commands=materialPresetCommands(p,'finish','Glass',2);const changed=applyPatch(p,{baseRevision:0,summary:'Glass',commands});
 assert.equal(changed.graph.nodes.find(n=>n.id==='finish').params.transmission,1);assert.equal(changed.animations.find(t=>t.param==='roughness').keys[1].value,.06);
 p.locks.push({nodeId:'finish',param:'roughness'});assert.throws(()=>materialPresetCommands(p,'finish','Glass',0));
});
test('Older transforms gain neutral rotations; lighting work has a bounded budget',()=>{
 const p=createProject(randomUUID(),'blank');p.graph.nodes.push(makeNode('move','transform',0,0));delete p.graph.nodes[1].params.rotateX;delete p.graph.nodes[1].params.rotateZ;
 const loaded=parseProject(p);assert.equal(loaded.graph.nodes[1].params.rotateX,0);assert.equal(loaded.graph.nodes[1].params.rotateZ,0);
 const lights=createProject(randomUUID(),'blank');for(let i=0;i<9;i++){lights.graph.nodes.push(makeNode('light'+i,'light',0,0));lights.graph.edges.push(edge('light'+i,'output','scene'));}assert.throws(()=>validateProject(lights));
});
test('Frame scheduling produces fixed-duration timestamped output independently of render latency',async()=>{
 const s=renderSchedule(8,30);assert.equal(s.count,240);assert.equal(s.duration,8);assert.equal(s.time(239),239/30);assert.equal(s.timestamp(239)+s.frameDuration(239),8000000);
 const range=renderSchedule(60,24,{start:5,end:7});assert.equal(range.count,48);assert.equal(range.time(0),5);assert.equal(range.timestamp(0),0);
 assert.throws(()=>renderSchedule(999999,30));assert.throws(()=>renderSchedule(8,30,{start:5,end:2}));assert.throws(()=>renderSchedule(8,30,{end:9}));
 const blob=muxWebM([{timestamp:0,duration:33333,key:true,data:new Uint8Array([1,2,3])},{timestamp:33333,duration:33334,key:false,data:new Uint8Array([4,5])}],1280,720,30,'V_VP9');const bytes=new Uint8Array(await blob.arrayBuffer());assert.deepEqual([...bytes.slice(0,4)],[0x1a,0x45,0xdf,0xa3]);assert.equal(blob.type,'video/webm');assert(new TextDecoder().decode(bytes).includes('V_VP9'));
});

test('Surface material conversion preserves physical shader defines for glass and IOR',()=>{
 const p=createProject(randomUUID(),'studio-turntable');const params={...p.graph.nodes.find(n=>n.id==='finish').params,transmission:1,ior:1.5};
 const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));
 const {materials}=surfaceMaterials(group,params);assert.equal(materials.length,1);assert.equal(materials[0].defines.PHYSICAL,'');assert.equal(materials[0].transmission,1);assert.equal(materials[0].ior,1.5);
});

test('Saved camera targets follow their parent transform',()=>{
 const parent=new THREE.Group();parent.position.set(4,2,-3);parent.rotation.y=.7;const camera=new THREE.PerspectiveCamera();parent.add(camera);
 setSceneCamera(camera,{x:2,y:1,z:5,targetX:0,targetY:0,targetZ:0,fov:38});parent.updateMatrixWorld(true);
 const position=camera.getWorldPosition(new THREE.Vector3()),direction=camera.getWorldDirection(new THREE.Vector3()),target=parent.localToWorld(new THREE.Vector3());
 assert(direction.distanceTo(target.sub(position).normalize())<1e-6);assert.deepEqual(camera.position.toArray(),[2,1,5]);
});
