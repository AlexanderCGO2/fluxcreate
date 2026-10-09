import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {inspectSceneFile} from '../src/scene-loader.mjs';

globalThis.FileReader??=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();}).catch(error=>this.onerror?.(error));}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:application/octet-stream;base64,'+Buffer.from(result).toString('base64');this.onloadend?.();}).catch(error=>this.onerror?.(error));}};
const folder=new URL('../artifacts/interop/',import.meta.url);await mkdir(folder,{recursive:true});
async function save(name,scene,clip){const bytes=await new GLTFExporter().parseAsync(scene,{binary:true,animations:[clip]});const info=await inspectSceneFile(bytes,name);await writeFile(new URL(name,folder),new Uint8Array(bytes));console.log(JSON.stringify({name,bytes:bytes.byteLength,...info}));}
function coloredBox(name,color,size,position){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshBasicMaterial({color}));mesh.name=name;mesh.position.fromArray(position);return mesh;}

{
 const scene=new THREE.Scene();scene.add(coloredBox('Orange horizontal','#e66937',[2.8,.45,.3],[.5,0,0]),coloredBox('Blue upright','#377bdc',[.45,1.4,.3],[-.8,.7,0]));
 const camera=new THREE.PerspectiveCamera(40,4/3,.1,100);camera.name='RollCamera';camera.position.set(0,0,7);scene.add(camera);
 const quarter=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2),clip=new THREE.AnimationClip('Camera rolls ninety degrees',2,[new THREE.QuaternionKeyframeTrack('RollCamera.quaternion',[0,2],[0,0,0,1,...quarter.toArray()])]);
 await save('camera-roll.glb',scene,clip);
}
{
 const scene=new THREE.Scene(),geometry=new THREE.BoxGeometry(1.6,.85,.5),count=geometry.attributes.position.count,indices=new Uint16Array(count*4),weights=new Float32Array(count*4);for(let i=0;i<count;i++)weights[i*4]=1;geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial({color:'#b361d1'})),bone=new THREE.Bone();mesh.name='Traveling skin';bone.name='TravelBone';mesh.add(bone);scene.add(mesh);mesh.bind(new THREE.Skeleton([bone]));
 const camera=new THREE.PerspectiveCamera(40,4/3,.1,100);camera.name='FollowCamera';camera.position.set(0,0,6);scene.add(camera);
 const clip=new THREE.AnimationClip('Skin and camera travel together',2,[new THREE.VectorKeyframeTrack('TravelBone.position',[0,2],[0,0,0,0,12,0]),new THREE.VectorKeyframeTrack('FollowCamera.position',[0,2],[0,0,6,0,12,6])]);
 await save('skin-follow-camera.glb',scene,clip);
}
{
 const scene=new THREE.Scene(),mesh=coloredBox('BriefStep','#3c96a0',[8,8,8],[0,0,0]);scene.add(mesh);
 const clip=new THREE.AnimationClip('Brief step excursion',2,[new THREE.VectorKeyframeTrack('BriefStep.position',[0,.05,.1,2],[0,0,0,30,0,0,0,0,0,0,0,0],THREE.InterpolateDiscrete)]);
 await save('brief-step.glb',scene,clip);
}
