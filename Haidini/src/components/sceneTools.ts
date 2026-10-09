import * as THREE from 'three';
import type { Params } from '../engine/evaluator.ts';

export function primitiveGeometry(p:Params){
 const size=Number(p.size),detail=Number(p.detail);
 switch(p.geometry){
  case 'box':return new THREE.BoxGeometry(size,size,size);
  case 'cylinder':return new THREE.CylinderGeometry(size*.5,size*.5,size,detail);
  case 'cone':return new THREE.ConeGeometry(size*.5,size,detail);
  case 'torus':return new THREE.TorusGeometry(size*.5,size*.18,Math.max(8,detail/2),detail);
  case 'plane':{const geometry=new THREE.PlaneGeometry(size,size,detail,detail);geometry.rotateX(-Math.PI/2);return geometry;}
  default:return new THREE.SphereGeometry(size*.5,detail,Math.max(8,detail/2));
 }
}
export function setSurfaceMaterial(material:THREE.MeshPhysicalMaterial,p:Params){
 material.color.set(String(p.color));material.roughness=Number(p.roughness);material.metalness=Number(p.metalness);
 const transmission=Number(p.transmission),coat=Number(p.clearcoat);
 if((material.transmission>0)!==(transmission>0)||(material.clearcoat>0)!==(coat>0))material.needsUpdate=true;
 material.transmission=transmission;material.ior=Number(p.ior);material.thickness=Number(p.thickness);material.clearcoat=coat;
 material.emissive.set(String(p.emissive));material.emissiveIntensity=Number(p.emission);
 material.opacity=Number(p.opacity);const transparent=material.opacity<.999;
 if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
 material.depthWrite=!transparent;material.visible=material.opacity>.001;
}
export function surfaceMaterials(group:THREE.Group,p:Params){
 const converted=new Map<THREE.Material,THREE.MeshPhysicalMaterial>();let skipped=0;
 group.traverse(o=>{if(!(o instanceof THREE.Mesh)||o.userData.fixedAppearance)return;
  const convert=(original:THREE.Material)=>{
   if(!(original instanceof THREE.MeshStandardMaterial)){skipped++;return original;}
   let material=converted.get(original);if(!material){material=new THREE.MeshPhysicalMaterial();THREE.MeshStandardMaterial.prototype.copy.call(material,original);
    // Standard.copy resets defines; transmission and IOR need the physical shader.
    Object.assign(material,{defines:{STANDARD:"",PHYSICAL:""}});material.userData.fluxiniMaterial=true;setSurfaceMaterial(material,p);converted.set(original,material);}return material;
  };
  o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 });
 // Previous materials were created for this branch and are no longer attached.
 converted.forEach((_,original)=>original.dispose());
 return {materials:[...converted.values()],skipped};
}
export function createSceneLight(p:Params){
 const group=new THREE.Group(),target=new THREE.Object3D();
 const light=p.kind==='point'?new THREE.PointLight():p.kind==='spot'?new THREE.SpotLight():new THREE.DirectionalLight();
 group.add(light,target);
 if(light instanceof THREE.DirectionalLight||light instanceof THREE.SpotLight)light.target=target;
 light.shadow.mapSize.set(1024,1024);light.shadow.bias=-.0003;light.shadow.normalBias=.02;
 if(light instanceof THREE.DirectionalLight)Object.assign(light.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:150});
 const update=(values:Params)=>{group.position.set(Number(values.x),Number(values.y),Number(values.z));light.color.set(String(values.color));light.intensity=Number(values.intensity);light.castShadow=!!values.shadows;
  target.position.set(Number(values.targetX)-Number(values.x),Number(values.targetY)-Number(values.y),Number(values.targetZ)-Number(values.z));
  if(light instanceof THREE.SpotLight){light.angle=Number(values.angle)*Math.PI/180;light.penumbra=Number(values.softness);}
 };
 update(p);return {group,light,update,dispose:()=>{light.shadow.map?.dispose();light.dispose();}};
}
export function setSceneCamera(camera:THREE.PerspectiveCamera,p:Params,parent?:THREE.Object3D){
 const position=new THREE.Vector3(Number(p.x),Number(p.y),Number(p.z)),target=new THREE.Vector3(Number(p.targetX),Number(p.targetY),Number(p.targetZ));
 const space=parent??camera.parent;if(space){space.updateWorldMatrix(true,false);space.localToWorld(target); }
 camera.position.copy(position);camera.up.set(0,1,0);if(position.distanceToSquared(target)<.000001)target.z-=1;
 camera.lookAt(target);camera.fov=Number(p.fov);camera.updateProjectionMatrix();return target;
}
