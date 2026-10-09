import * as THREE from 'three';
import { random } from '../engine/geometry.ts';
import type { FxItem } from '../engine/evaluator.ts';
export function createFxView(item:FxItem,wire:boolean){
 const p=item.params,preset=String(p.preset),amp=Number(p.amplitude),speed=Number(p.speed),seed=Number(p.seed),group=new THREE.Group(),dummy=new THREE.Object3D();group.name='FX_'+preset+'_'+item.nodeId;group.userData.node=item.nodeId;group.position.set(Number(p.x),Number(p.y),Number(p.z));group.scale.setScalar(Number(p.scale));
 const mat=new THREE.MeshStandardMaterial({color:String(p.color),roughness:Number(p.roughness),metalness:['ocean','ripples'].includes(preset)?.45:.2,envMapIntensity:.65,side:THREE.DoubleSide,wireframe:wire});
 let update=(time:number)=>{};
 const tag=(mesh:THREE.Mesh)=>{mesh.userData.node=item.nodeId;mesh.castShadow=true;mesh.frustumCulled=false;group.add(mesh);return mesh;};
 if(preset==='ocean'||preset==='ripples'){
  const geo=new THREE.PlaneGeometry(14,12,64,56);geo.rotateX(-Math.PI/2);tag(new THREE.Mesh(geo,mat));const attr=geo.getAttribute('position'),base=Float32Array.from(attr.array);
  update=time=>{const t=time*speed;for(let i=0;i<attr.count;i++){const x=base[i*3],z=base[i*3+2],r=Math.hypot(x,z);attr.setY(i,amp*(preset==='ripples'?Math.sin(r*3-t*3)*Math.exp(-r*.16):Math.sin(x*.8+z*.3-t*1.4)*.6+Math.sin(z*1.2-x*.2+t*1.8)*.28+Math.sin(x*2.4+z*.8-t*2.5)*.12));}attr.needsUpdate=true;geo.computeVertexNormals();};
 }else if(preset==='jelly'||preset==='balloon'){
  const geo=preset==='jelly'?new THREE.SphereGeometry(2,40,28):new THREE.SphereGeometry(2,40,28),attr=geo.getAttribute('position'),base=Float32Array.from(attr.array);tag(new THREE.Mesh(geo,mat));
  update=time=>{const t=time*speed;for(let i=0;i<attr.count;i++){const x=base[i*3],y=base[i*3+1],z=base[i*3+2],a=preset==='jelly'?amp*.12*Math.sin(y*2-t*4):amp*.08*Math.sin(t*3);attr.setXYZ(i,x*(1+a),y/(1+a)**2+(preset==='jelly'?Math.sin(t*2+x)*amp*.1:0),z*(1+a));}attr.needsUpdate=true;geo.computeVertexNormals();};
 }else if(preset==='shatter'){
  const count=96,mesh=tag(new THREE.InstancedMesh(new THREE.BoxGeometry(.72,.72,.45),mat,count)) as THREE.InstancedMesh;
  update=time=>{const t=(time*speed)%6,burst=Math.max(0,t-.6);for(let i=0;i<count;i++){const x=(i%12-5.5)*.75,y=(Math.floor(i/12)-3.5)*.75,dx=(random(seed,i*3)-.5)*amp*3,dy=(random(seed,i*3+1)+.4)*amp;let vertical=y+dy*burst-4.9*burst*burst;if(vertical<-3)vertical=-3+Math.abs(vertical+3)*Math.exp(-burst*2);dummy.position.set(x+dx*burst,vertical,(random(seed,i*3+2)-.5)*amp*burst*3);dummy.rotation.set(burst*dx,burst*dy,burst*.4);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.boundingBox=null;mesh.boundingSphere=null;};
 }else if(preset==='shockwave'){
  const rings=Array.from({length:3},(_,i)=>{const m=tag(new THREE.Mesh(new THREE.TorusGeometry(1,.08,8,80),mat));m.rotation.x=Math.PI/2;m.position.y=i*.15;return m;});
  update=time=>rings.forEach((m,i)=>{const t=((time*speed+i*.55)%3)/3;m.scale.setScalar(.15+t*amp*4);m.visible=t<.94;});
 }else{
  const count=preset==='strands'?288:preset==='growth'?63:90,geometry=new THREE.CylinderGeometry(1,1,1,6,1),mesh=tag(new THREE.InstancedMesh(geometry,preset==='lightning'?new THREE.MeshBasicMaterial({color:String(p.color),wireframe:wire}):mat,count)) as THREE.InstancedMesh;
  const up=new THREE.Vector3(0,1,0),a=new THREE.Vector3(),b=new THREE.Vector3(),delta=new THREE.Vector3(),tree:{a:THREE.Vector3;b:THREE.Vector3;depth:number}[]=[];
  if(preset==='growth')for(let i=0;i<count;i++){const parent=i?tree[Math.floor((i-1)/2)]:null,start=parent?parent.b.clone():new THREE.Vector3(0,-3,0),depth=Math.floor(Math.log2(i+1)),angle=(random(seed,i)-.5)*Math.PI*1.5;tree.push({a:start,b:start.clone().add(new THREE.Vector3(Math.sin(angle)*1.5/(depth+1),2.5/(depth+1),Math.cos(angle)*.8/(depth+1))),depth});}
  function segment(index:number,start:THREE.Vector3,end:THREE.Vector3,radius:number){delta.copy(end).sub(start);dummy.position.copy(start).add(end).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());dummy.scale.set(radius,Math.max(.0001,delta.length()),radius);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
  update=time=>{const t=time*speed;for(let i=0;i<count;i++){
   if(preset==='strands'){const strand=Math.floor(i/18),step=i%18,angle=strand/16*Math.PI*2;const point=(j:number,v:THREE.Vector3)=>v.set((strand-7.5)*.38+Math.sin(j*.24+t+angle)*amp*j/18,-3+j*.38,Math.cos(j*.25+t+angle)*amp);point(step,a);point(step+1,b);segment(i,a,b,.026);}
   else if(preset==='growth'){const branch=tree[i],reveal=Math.max(0,Math.min(1,t-branch.depth*.35));b.copy(branch.a).lerp(branch.b,reveal);segment(i,branch.a,b,.13/(branch.depth+1));}
   else{const strand=Math.floor(i/30),step=i%30,tick=Math.floor(t*9),point=(j:number,v:THREE.Vector3)=>{const fork=strand===0?0:Math.max(0,j-12)*.09*(strand===1?1:-1);return v.set(fork+(random(seed+tick,j*3+strand)-.5)*amp*.6,4-j*.26,(random(seed+tick,j*3+strand+1)-.5)*amp*.3);};point(step,a);point(step+1,b);segment(i,a,b,strand===0?.035:.018);}
  }mesh.instanceMatrix.needsUpdate=true;mesh.boundingBox=null;mesh.boundingSphere=null;};
 }
 return {group,update};
}
