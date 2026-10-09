import * as THREE from 'three';
import {GpuParticleSimulation} from '../engine/gpuParticleSimulation.ts';
import type {SimulationConfig} from '../engine/collisions.ts';
import type {Params,SimulationItem} from '../engine/evaluator.ts';
import {createParticleMesh} from './particleMesh.ts';

const vertex=/* glsl */ `
attribute vec2 particleReference;
uniform sampler2D statePosition;
uniform sampler2D stateVelocity;
uniform sampler2D birthMetadata;
uniform mat3 billboardBasis;
uniform float particleSize,styleMode,streakLength,lifeTransition,lifeEasing,endSize,startOpacity,endOpacity,fadeIn,glow;
uniform vec3 startColor,endColor;
varying vec2 particleUv;
varying float particleAlpha,particleAge,particleSeed;
varying vec3 particleColor;
float eased(float t){t=clamp(t,0.0,1.0);if(lifeEasing<0.5)return t;if(lifeEasing<1.5)return t*t*t;if(lifeEasing<2.5)return 1.0-pow(1.0-t,3.0);if(lifeEasing<3.5)return t<0.5?4.0*t*t*t:1.0-pow(-2.0*t+2.0,3.0)/2.0;return 0.0;}
void main(){
 vec4 state=texture2D(statePosition,particleReference),velocity=texture2D(stateVelocity,particleReference),meta=texture2D(birthMetadata,particleReference);
 float age=state.w,progress=max(age,0.0)/max(0.02,velocity.w),t=lifeTransition>0.5?eased(progress):0.0;
 float fade=lifeTransition>0.5&&fadeIn>0.0?clamp(progress/fadeIn,0.0,1.0):1.0;
 particleAlpha=age<0.0?0.0:clamp(mix(startOpacity,endOpacity,t)*fade,0.0,1.0);particleAge=progress;particleSeed=meta.y;particleUv=uv;particleColor=mix(startColor,endColor,t)*(1.0+glow);
 float size=age<0.0?0.0:particleSize*mix(1.0,endSize,t)*meta.x;vec3 offset=position*size;
 if(styleMode>0.5){float angle=styleMode>3.5?meta.y*6.28318530718+age*0.12:0.0,stretch=styleMode>2.5&&styleMode<3.5?2.2:1.0;
  if(styleMode>1.5&&styleMode<2.5){vec3 viewVelocity=(viewMatrix*modelMatrix*vec4(velocity.xyz,0.0)).xyz;angle=atan(-viewVelocity.x,viewVelocity.y);stretch=1.0+min(11.0,length(velocity.xyz)*streakLength*0.2);}
  vec2 p=vec2(position.x,position.y*stretch)*size;float c=cos(angle),s=sin(angle);offset=billboardBasis*vec3(c*p.x-s*p.y,s*p.x+c*p.y,0.0);
 }
 gl_Position=projectionMatrix*modelViewMatrix*vec4(state.xyz+offset,1.0);
}
`;
const fragment=/* glsl */ `
uniform float styleMode,particleTime;
varying vec2 particleUv;
varying float particleAlpha,particleAge,particleSeed;
varying vec3 particleColor;
float particleHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float particleNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(particleHash(i),particleHash(i+vec2(1,0)),f.x),mix(particleHash(i+vec2(0,1)),particleHash(i+vec2(1,1)),f.x),f.y);}
void main(){
 float mask=1.0;vec2 p=particleUv*2.0-1.0;
 if(styleMode>0.5&&styleMode<2.5)mask=1.0-smoothstep(0.1,1.0,length(p));
 else if(styleMode<3.5&&styleMode>2.5){float top=clamp((p.y+1.0)*0.5,0.0,1.0),wave=sin(p.y*4.0+particleTime*5.0+particleSeed*31.0)*0.15*top,width=mix(0.88,0.06,top),noise=particleNoise(p*vec2(3,5)+vec2(particleSeed*31.0,-particleTime*3.0));mask=(1.0-smoothstep(width*0.2,width,abs(p.x+wave)))*(1.0-smoothstep(0.65,1.0,abs(p.y)))*(0.55+noise*0.45);}
 else if(styleMode>3.5){vec2 drift=p*2.5+vec2(particleSeed*19.0,particleTime*0.2);float noise=particleNoise(drift)*0.65+particleNoise(drift*2.1)*0.25+particleNoise(drift*4.3)*0.1;mask=(1.0-smoothstep(0.12,1.0,length(p)))*smoothstep(0.1,0.75,noise);}
 gl_FragColor=vec4(particleColor,particleAlpha*mask);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export function createGpuParticleView(item:SimulationItem,wire:boolean,config:SimulationConfig,style:(time:number)=>Params,camera:THREE.Camera,renderer:THREE.WebGLRenderer){
 const client=new GpuParticleSimulation(renderer,item.params,config),group=new THREE.Group(),count=Number(item.params.count),references=new Float32Array(count*2);
 for(let i=0;i<count;i++){references[i*2]=(i%client.width+.5)/client.width;references[i*2+1]=(Math.floor(i/client.width)+.5)/client.height;}
 const reference=new THREE.InstancedBufferAttribute(references,2),uniforms={statePosition:{value:client.positionTexture},stateVelocity:{value:client.velocityTexture},birthMetadata:{value:client.birthMetadata},billboardBasis:{value:new THREE.Matrix3()},particleSize:{value:.05},styleMode:{value:0},streakLength:{value:4},lifeTransition:{value:0},lifeEasing:{value:2},endSize:{value:1},startOpacity:{value:1},endOpacity:{value:0},fadeIn:{value:0},glow:{value:0},startColor:{value:new THREE.Color()},endColor:{value:new THREE.Color()},particleTime:{value:0}};
 function geometry(sprite:boolean){const source=sprite?new THREE.PlaneGeometry(2,2):new THREE.IcosahedronGeometry(1,0),geometry=new THREE.InstancedBufferGeometry();geometry.setIndex(source.index);for(const [key,value] of Object.entries(source.attributes))geometry.setAttribute(key,value);geometry.setAttribute('particleReference',reference);geometry.instanceCount=count;return geometry;}
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthWrite:false,wireframe:wire,forceSinglePass:true}),mesh=new THREE.Mesh(geometry(false),material),rotation=new THREE.Quaternion(),inverse=new THREE.Quaternion(),matrix=new THREE.Matrix4();let currentSprite=false,cpu:ReturnType<typeof createParticleMesh>|undefined;
 group.name='Particle_simulation_'+item.nodeId;mesh.name='Simulated_particles_'+item.nodeId;mesh.userData.node=item.nodeId;mesh.userData.gpuParticleId=mesh.uuid;mesh.frustumCulled=false;group.add(mesh);
 const update=(time:number)=>{const p=style(time),effect=String(p.particleStyle||'grains'),mode=Math.max(0,['grains','soft dots','sparks','flame','smoke'].indexOf(effect)),sprite=mode>0;if(sprite!==currentSprite){mesh.geometry.dispose();mesh.geometry=geometry(sprite);material.side=sprite?THREE.DoubleSide:THREE.FrontSide;material.needsUpdate=true;currentSprite=sprite;}
  uniforms.statePosition.value=client.positionTexture;uniforms.stateVelocity.value=client.velocityTexture;uniforms.styleMode.value=mode;uniforms.particleTime.value=client.time;uniforms.particleSize.value=Number(p.size);uniforms.streakLength.value=Number(p.streakLength||4);uniforms.lifeTransition.value=p.lifeTransition?1:0;uniforms.lifeEasing.value=Math.max(0,['linear','ease in','ease out','ease in out','hold'].indexOf(String(p.lifeEasing)));uniforms.endSize.value=Number(p.endSize);uniforms.startOpacity.value=Number(p.opacity);uniforms.endOpacity.value=Number(p.endOpacity);uniforms.fadeIn.value=Number(p.fadeIn);uniforms.glow.value=Number(p.glow||0);uniforms.startColor.value.set(String(p.color));uniforms.endColor.value.set(String(p.endColor));material.blending=uniforms.glow.value>0?THREE.AdditiveBlending:THREE.NormalBlending;
  group.getWorldQuaternion(inverse).invert();camera.getWorldQuaternion(rotation).premultiply(inverse);matrix.makeRotationFromQuaternion(rotation);uniforms.billboardBasis.value.setFromMatrix4(matrix);
 };
 client.onAdvance=()=>update(client.time);update(0);
 function materialize(){cpu??=createParticleMesh(item,wire,style,camera);group.getWorldQuaternion(cpu.group.quaternion);cpu.setFrame(client.frame());return cpu.mesh;}
 mesh.userData.exportFrame=()=>materialize().clone();
 mesh.userData.prepareBounds=()=>{const frame=client.frame(),box=new THREE.Box3(),point=new THREE.Vector3(),p=style(client.time);for(let i=0;i<count;i++)if((frame.ages?.[i]??-1)>=0)box.expandByPoint(point.fromArray(frame.positions,i*3));if(!box.isEmpty())box.expandByScalar(Number(p.size)*Math.max(1,Number(p.endSize))*Math.max(2.2,Number(p.streakLength||4)));mesh.geometry.boundingBox=box;mesh.geometry.boundingSphere=box.getBoundingSphere(new THREE.Sphere());};
 mesh.raycast=(raycaster,intersections)=>{const proxy=materialize();proxy.matrixWorld.copy(mesh.matrixWorld);const hits:THREE.Intersection[]=[];proxy.raycast(raycaster,hits);for(const hit of hits)intersections.push({...hit,object:mesh});};
 return {group,client,update,dispose:()=>{client.dispose();cpu?.dispose();}};
}
// Explicit exports alone read GPU state back; playback never copies particle state to the CPU.
export function materializeGpuParticles(source:THREE.Object3D,copy:THREE.Object3D){const originals=new Map<string,THREE.Object3D>();source.traverse(o=>{if(o.userData.gpuParticleId)originals.set(o.userData.gpuParticleId,o);});const targets:THREE.Object3D[]=[];copy.traverse(o=>{if(o.userData.gpuParticleId)targets.push(o);});for(const target of targets){const original=originals.get(target.userData.gpuParticleId),replacement=original?.userData.exportFrame?.() as THREE.Object3D|undefined;if(replacement){replacement.position.copy(target.position);replacement.quaternion.copy(target.quaternion);replacement.scale.copy(target.scale);replacement.visible=target.visible;target.parent?.add(replacement);target.removeFromParent();}}}
