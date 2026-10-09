import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {importModel,exportGLB} from '../src/formats.mjs';
import {createDemoProject} from '../src/model.mjs';
import {objectMesh} from '../src/geometry.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

// GLTFExporter uses FileReader even with binary output; the fixture stays entirely local.
globalThis.FileReader??=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(error=>this.onerror?.(error));}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:application/octet-stream;base64,'+Buffer.from(result).toString('base64');this.onloadend?.();}).catch(error=>this.onerror?.(error));}};
function sceneBounds(objects){const bounds=new THREE.Box3();for(const o of objects){const p=o.geometry.positions;for(let i=0;i<p.length;i+=3)bounds.expandByPoint(new THREE.Vector3(p[i]+o.position[0],p[i+1]+o.position[1],p[i+2]+o.position[2]));}return bounds;}
async function exportedBox({mirrored=false}={}){const root=new THREE.Group();root.position.set(3,2,-1);root.rotation.set(.3,.4,.2);root.scale.set(mirrored?-1.5:1.5,2,.75);const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,1,3),new THREE.MeshStandardMaterial({color:'#b78ea1',metalness:.25,roughness:.6}));mesh.name='Fluxini-style exported geometry';mesh.position.set(1,0,2);root.add(mesh);root.updateMatrixWorld(true);const bytes=await new GLTFExporter().parseAsync(root,{binary:true});return{bytes,expected:new THREE.Box3().setFromObject(root)};}
test('actual THREE GLTFExporter GLB preserves transformed parent hierarchy bounds',async()=>{const {bytes,expected}=await exportedBox(),result=await importModel(bytes,'fluxini-frame.glb'),bounds=sceneBounds(result.objects);assert.equal(result.objects.length,1);assert.equal(result.objects[0].name,'Fluxini-style exported geometry');for(const key of ['min','max'])for(const axis of ['x','y','z'])assert.ok(Math.abs(bounds[key][axis]-expected[key][axis])<1e-5);});
test('mirrored hierarchy imports with winding that agrees with transformed normals',async()=>{const {bytes}=await exportedBox({mirrored:true}),result=await importModel(bytes,'mirrored.glb');for(const o of result.objects){const g=o.geometry,index=g.indices??Array.from({length:g.positions.length/3},(_,i)=>i);for(let i=0;i<index.length;i+=3){const ia=index[i],ib=index[i+1],ic=index[i+2],a=new THREE.Vector3().fromArray(g.positions,ia*3),b=new THREE.Vector3().fromArray(g.positions,ib*3),c=new THREE.Vector3().fromArray(g.positions,ic*3),face=b.sub(a).cross(c.sub(a)),normal=new THREE.Vector3().fromArray(g.normals,ia*3);assert.ok(face.dot(normal)>0,'Reflected geometry must reverse triangle winding when transforms are baked.');}}});
test('glTF floating-point indices are rejected before integer conversion can truncate them',async()=>{const bytes=new Uint8Array(48);new Float32Array(bytes.buffer).set([0,0,0,1,0,0,0,1,0,0,1.9,2]);const g={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{uri:'data:application/octet-stream;base64,'+Buffer.from(bytes).toString('base64'),byteLength:48}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36},{buffer:0,byteOffset:36,byteLength:12}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3'},{bufferView:1,componentType:5126,count:3,type:'SCALAR'}]};await assert.rejects(()=>importModel(new TextEncoder().encode(JSON.stringify(g)),'float-index.gltf'),/index|indices|unsigned/i);});

async function exportedInstances(binary=true){
 const root=new THREE.Group();root.position.set(3,2,-1);root.rotation.set(0,.3,.1);
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.5,metalness:0}),mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,3);mesh.name='Fluxini particles';mesh.position.set(.5,1,-2);
 const positions=[[0,0,0],[3,1,0],[-2,2,1]],colors=['#ee3344','#55cc88','#7777ee'];
 positions.forEach((p,i)=>{mesh.setMatrixAt(i,new THREE.Matrix4().compose(new THREE.Vector3(...p),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,i*.25,0)),new THREE.Vector3(i===2?-1:1,1+i*.3,1)));mesh.setColorAt(i,new THREE.Color(colors[i]));});
 const child=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.3),material);child.name='Child marker';child.position.set(8,0,0);mesh.add(child);root.add(mesh);root.updateMatrixWorld(true);
 const expected=new THREE.Box3(),matrix=new THREE.Matrix4(),world=new THREE.Matrix4(),point=new THREE.Vector3();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);world.multiplyMatrices(mesh.matrixWorld,matrix);for(let v=0;v<mesh.geometry.attributes.position.count;v++)expected.expandByPoint(point.fromBufferAttribute(mesh.geometry.attributes.position,v).applyMatrix4(world));}for(let v=0;v<child.geometry.attributes.position.count;v++)expected.expandByPoint(point.fromBufferAttribute(child.geometry.attributes.position,v).applyMatrix4(child.matrixWorld));
 return {data:await new GLTFExporter().parseAsync(root,{binary}),expected,colors};
}
test('actual Fluxini-style GPU instance GLB expands bounded transforms, colors and children correctly',async()=>{
 const {data,expected,colors}=await exportedInstances(),result=await importModel(data,'fluxini-particles.glb');assert.equal(result.objects.length,4);assert.equal(result.objects.filter(o=>o.name==='Child marker').length,1);const instances=result.objects.filter(o=>o.name.startsWith('Fluxini particles'));assert.equal(instances.length,3);assert.deepEqual(instances.map(o=>o.color),colors);assert.match(result.warnings.join('\n'),/independently editable/);
 const bounds=sceneBounds(result.objects);for(const key of ['min','max'])for(const axis of ['x','y','z'])assert.ok(Math.abs(bounds[key][axis]-expected[key][axis])<1e-5,`${key}.${axis} should preserve the hierarchy and instance transform`);
 for(const o of instances){const g=o.geometry,index=g.indices;for(let i=0;i<index.length;i+=3){const a=new THREE.Vector3().fromArray(g.positions,index[i]*3),b=new THREE.Vector3().fromArray(g.positions,index[i+1]*3),c=new THREE.Vector3().fromArray(g.positions,index[i+2]*3),normal=new THREE.Vector3().fromArray(g.normals,index[i]*3);assert.ok(b.sub(a).cross(c.sub(a)).dot(normal)>0);}}
 const folder=new URL('../artifacts/interop/',import.meta.url);await mkdir(folder,{recursive:true});await writeFile(new URL('fluxini-instanced-fixture.glb',folder),new Uint8Array(data));
});
test('GPU instance counts and cumulative mesh budgets reject before accessor decoding',async()=>{
 const {data:source}=await exportedInstances(false);const importJSON=g=>importModel(new TextEncoder().encode(JSON.stringify(g)),'instances.gltf');
 let g=structuredClone(source),node=g.nodes.find(n=>n.extensions?.EXT_mesh_gpu_instancing),attributes=node.extensions.EXT_mesh_gpu_instancing.attributes;
 for(const id of Object.values(attributes))g.accessors[id].count=201;
 await assert.rejects(()=>importJSON(g),/200 mesh instances/);
 g=structuredClone(source);node=g.nodes.find(n=>n.extensions?.EXT_mesh_gpu_instancing);attributes=node.extensions.EXT_mesh_gpu_instancing.attributes;g.accessors[attributes.ROTATION].count=2;await assert.rejects(()=>importJSON(g),/same count/);
 g=structuredClone(source);node=g.nodes.find(n=>n.extensions?.EXT_mesh_gpu_instancing);const primitive=g.meshes[node.mesh].primitives[0];g.meshes[node.mesh].primitives=Array.from({length:67},()=>structuredClone(primitive));await assert.rejects(()=>importJSON(g),/200 expanded mesh/);
 g=structuredClone(source);node=g.nodes.find(n=>n.extensions?.EXT_mesh_gpu_instancing);attributes=node.extensions.EXT_mesh_gpu_instancing.attributes;for(const id of Object.values(attributes))g.accessors[id].count=4;const p=g.meshes[node.mesh].primitives[0];g.accessors[p.attributes.POSITION].count=500000;await assert.rejects(()=>importJSON(g),/vertex budget/);
});
test('accessors cannot read beyond a buffer declared byte length even when extra bytes exist',async()=>{const {data:g}=await exportedInstances(false);g.buffers[0].byteLength=1;await assert.rejects(()=>importModel(new TextEncoder().encode(JSON.stringify(g)),'bounds.gltf'),/bounds/);});
test('Flux3D GLB independently loads with standard THREE GLTFLoader, preserving materials and per-object world bounds',async()=>{
 const project=createDemoProject();project.objects.find(o=>o.id==='pearl').opacity=.35;
 const loaded=await new GLTFLoader().parseAsync(exportGLB(project),'');loaded.scene.updateMatrixWorld(true);const meshes=[];loaded.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});assert.equal(meshes.length,project.objects.length);
 for(const source of project.objects){const actual=meshes.find(mesh=>mesh.material.name===source.name);assert.ok(actual,`Standard loader should retain material name ${source.name}`);assert.equal(actual.material.color.getHexString(),source.color.slice(1));assert.ok(Math.abs(actual.material.metalness-source.metalness)<1e-6);assert.ok(Math.abs(actual.material.roughness-source.roughness)<1e-6);assert.ok(Math.abs(actual.material.opacity-source.opacity)<1e-6);if(source.opacity<1)assert.equal(actual.material.transparent,true);const original=objectMesh(source),expectedBounds=new THREE.Box3().setFromObject(original),actualBounds=new THREE.Box3().setFromObject(actual);for(const key of ['min','max'])for(const axis of ['x','y','z'])assert.ok(Math.abs(expectedBounds[key][axis]-actualBounds[key][axis])<1e-5,`${source.name} ${key}.${axis} world bounds`);original.geometry.dispose();original.material.dispose();}
 loaded.scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
});
