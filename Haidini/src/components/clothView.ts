import * as THREE from 'three';
import type { SimulationConfig } from '../engine/collisions.ts';
import { SimulationClient } from '../engine/simulationClient.ts';
import type { SimulationItem } from '../engine/evaluator.ts';
export function createClothView(item:SimulationItem,wire:boolean,config:SimulationConfig={}){
 const p=item.params,n=Number(p.resolution),group=new THREE.Group();group.name='Cloth_'+item.nodeId;group.position.set(Number(p.x),Number(p.y),Number(p.z));
 const geometry=new THREE.PlaneGeometry(Number(p.width),Number(p.height),n,n),mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:String(p.color),side:THREE.DoubleSide,roughness:.72,wireframe:wire}));mesh.name='Fabric_'+item.nodeId;mesh.userData.node=item.nodeId;mesh.frustumCulled=false;mesh.castShadow=true;group.add(mesh);
 const floor=new THREE.Mesh(new THREE.BoxGeometry(12,.12,10),new THREE.MeshStandardMaterial({color:'#26393e',roughness:.65}));floor.position.y=-2.1;floor.receiveShadow=true;group.add(floor);
 if(Number(p.obstacle)>0){const sphere=new THREE.Mesh(new THREE.SphereGeometry(Number(p.obstacle),32,20),new THREE.MeshStandardMaterial({color:'#9faeb7',metalness:.6,roughness:.25}));sphere.position.y=-.3;sphere.castShadow=true;group.add(sphere);}
 const client=new SimulationClient('cloth',p,frame=>{const attr=geometry.getAttribute('position');(attr.array as Float32Array).set(frame.positions);attr.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();},config);
 return {group,client,dispose:()=>client.dispose()};
}
