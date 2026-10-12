import * as THREE from 'three';
import {validateProject} from './model.mjs';
import {objectGeometry} from './geometry.mjs';
const fail=message=>{throw Error(message);};
function chosenObjects(project,ids){
 if(!Array.isArray(ids)||ids.length<2||new Set(ids).size!==ids.length)fail('Select at least two distinct objects.');
 const chosen=ids.map(id=>project.objects.find(o=>o.id===id));
 if(chosen.some(o=>!o))fail('A selected object is missing. Select the objects again.');
 if(chosen.some(o=>o.locked||!o.visible))fail('Every selected object must be visible and unlocked.');
 return chosen;
}
export function selectionBoundsCenter(project,ids){
 const bounds=new THREE.Box3(),point=new THREE.Vector3();
 for(const object of chosenObjects(project,ids)){
  const geometry=objectGeometry(object),matrix=new THREE.Matrix4().compose(new THREE.Vector3(...object.position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...object.rotation.map(n=>n*Math.PI/180))),new THREE.Vector3(...object.scale));
  try{const vertices=geometry.getAttribute('position'),indices=geometry.getIndex(),count=indices?indices.count:vertices?.count;if(!count)fail('The selection has no rendered bounds.');for(let i=0;i<count;i++){const index=indices?indices.getX(i):i;if(!Number.isInteger(index)||index<0||index>=vertices.count)fail('The selection has invalid rendered bounds.');point.fromBufferAttribute(vertices,index).applyMatrix4(matrix);if(!point.toArray().every(Number.isFinite))fail('The selection has invalid rendered bounds.');bounds.expandByPoint(point);}}finally{geometry.dispose();}
 }
 if(bounds.isEmpty())fail('The selection has no rendered bounds.');return bounds.getCenter(new THREE.Vector3()).toArray();
}
export function previewGroupTransform(raw,ids,action){
 const trustedGeometry=new Set(raw.objects.map(o=>o.geometry).filter(Boolean)),project=validateProject(raw,{trustedGeometry});chosenObjects(project,ids);
 const rotation=action?.rotation,scale=action?.scale;
 if(!Array.isArray(rotation)||rotation.length!==3||rotation.some(n=>!Number.isFinite(n)||Math.abs(n)>36000)||!Number.isFinite(scale)||scale<=0||scale>1000)fail('Use finite rotation angles and a positive uniform scale up to 1000.');
 const pivot=selectionBoundsCenter(project,ids),center=new THREE.Vector3(...pivot),turn=new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation.map(n=>n*Math.PI/180)));
 project.objects=project.objects.map(o=>{if(!ids.includes(o.id))return o;const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...o.rotation.map(n=>n*Math.PI/180))).premultiply(turn),euler=new THREE.Euler().setFromQuaternion(orientation,'XYZ');return {...o,position:new THREE.Vector3(...o.position).sub(center).multiplyScalar(scale).applyQuaternion(turn).add(center).toArray(),rotation:rotation.every(n=>n===0)?[...o.rotation]:[euler.x,euler.y,euler.z].map(n=>n*180/Math.PI),scale:o.scale.map(n=>n*scale)};});
 return {base:raw,selection:[...ids],pivot,project:validateProject(project,{trustedGeometry})};
}
export function applyGroupTransform(current,ids,draft){
 if(!draft||draft.base!==current||ids.length!==draft.selection.length||ids.some((id,i)=>id!==draft.selection[i]))fail('The scene or selection changed. Preview the transform again.');
 chosenObjects(current,ids);return draft.project;
}
