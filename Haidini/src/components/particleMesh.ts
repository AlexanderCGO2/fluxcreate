import * as THREE from 'three';
import type { Params, SimulationItem } from '../engine/evaluator.ts';
import type { SimFrame } from '../engine/simulation.ts';
import { enableParticleAlpha, particleLook } from './particleAppearance.ts';
export function createParticleMesh(item:SimulationItem,wire:boolean,style:(time:number)=>Params,camera:THREE.Camera){
 const group=new THREE.Group(),count=Number(item.params.count),material=new THREE.MeshBasicMaterial({color:'#ffffff',wireframe:wire,forceSinglePass:true}),mesh=new THREE.InstancedMesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>(new THREE.IcosahedronGeometry(1,0),material,count),alpha=enableParticleAlpha(mesh),ageAttribute=mesh.geometry.getAttribute('instanceAge'),seedAttribute=mesh.geometry.getAttribute('instanceSeed'),dummy=new THREE.Object3D(),color=new THREE.Color(),viewRotation=new THREE.Quaternion(),inverseGroup=new THREE.Quaternion(),groupRotation=new THREE.Quaternion(),cameraInverse=new THREE.Quaternion(),spin=new THREE.Quaternion(),zAxis=new THREE.Vector3(0,0,1),velocity=new THREE.Vector3();
 mesh.name='Simulated_particles_'+item.nodeId;mesh.userData.node=item.nodeId;mesh.frustumCulled=false;group.name='Particle_simulation_'+item.nodeId;group.add(mesh);mesh.count=0;let latest:SimFrame|undefined,currentStyle='grains';
 const update=(time:number)=>{
  if(!latest)return;mesh.count=count;const p=style(time),effect=String(p.particleStyle||'grains'),sprite=effect!=='grains',glow=Number(p.glow||0);
  if(effect!==currentStyle){mesh.geometry.dispose();mesh.geometry=sprite?new THREE.PlaneGeometry(2,2):new THREE.IcosahedronGeometry(1,0);mesh.geometry.setAttribute('instanceAlpha',alpha);mesh.geometry.setAttribute('instanceAge',ageAttribute);mesh.geometry.setAttribute('instanceSeed',seedAttribute);currentStyle=effect;const side=sprite?THREE.DoubleSide:THREE.FrontSide;if(material.side!==side){material.side=side;material.needsUpdate=true;}}
  mesh.userData.particleSoftness.value=effect==='flame'?2:effect==='smoke'?3:sprite?1:0;mesh.userData.particleTime.value=latest.time;material.blending=glow>0?THREE.AdditiveBlending:THREE.NormalBlending;
  camera.getWorldQuaternion(viewRotation);cameraInverse.copy(viewRotation).invert();group.getWorldQuaternion(groupRotation);inverseGroup.copy(groupRotation).invert();viewRotation.premultiply(inverseGroup);
  for(let i=0;i<count;i++){
   const age=latest.ages?.[i]??-1,progress=Math.max(0,age)/(latest.lifetimes?.[i]||Number(item.params.lifetime)),look=particleLook(p,progress,String(p.color),Number(p.opacity)),seed=latest.particleSeeds?.[i]??0,size=age<0?0:Number(p.size)*look.size*(latest.sizes?.[i]??1);
   dummy.position.fromArray(latest.positions,i*3);dummy.quaternion.identity();dummy.scale.setScalar(size);
   if(sprite){dummy.quaternion.copy(viewRotation);let angle=effect==='smoke'?seed*Math.PI*2+age*.12:0,stretch=effect==='flame'?2.2:1;
    if(effect==='sparks'){velocity.fromArray(latest.velocities||latest.positions,i*3);velocity.applyQuaternion(groupRotation).applyQuaternion(cameraInverse);angle=Math.atan2(-velocity.x,velocity.y);stretch=1+Math.min(11,latest.speeds[i]*Number(p.streakLength||4)*.2);}
    spin.setFromAxisAngle(zAxis,angle);dummy.quaternion.multiply(spin);dummy.scale.y*=stretch;
   }
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);color.set(look.color).multiplyScalar(1+glow);mesh.setColorAt(i,color);alpha.setX(i,age<0?0:look.opacity);ageAttribute.setX(i,progress);seedAttribute.setX(i,seed);
  }
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;alpha.needsUpdate=true;ageAttribute.needsUpdate=true;seedAttribute.needsUpdate=true;mesh.boundingBox=null;mesh.boundingSphere=null;
 };
 return {group,mesh,update,setFrame:(frame:SimFrame)=>{latest=frame;update(frame.time);},dispose:()=>{mesh.geometry.dispose();material.dispose();mesh.dispose();}};
}
