import * as THREE from 'three';
import {createGpuCloudVolume} from './gpuCloudVolume.ts';
import type { SimulationConfig } from '../engine/collisions.ts';
import { createClothView } from './clothView.ts';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { SimulationClient } from '../engine/simulationClient.ts';
import { VOLUME_SIZE } from '../engine/simulation.ts';
import type { SimulationItem } from '../engine/evaluator.ts';

const volumeVertex=`
out vec3 rayOrigin;
out vec3 rayDirection;
void main(){
  rayOrigin=(inverse(modelMatrix)*vec4(cameraPosition,1.0)).xyz;
  rayDirection=position-rayOrigin;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const volumeFragment=`
precision highp float;
precision highp sampler3D;
uniform sampler3D densityMap;
uniform sampler2D densityAtlas;
uniform sampler3D noiseMap;
uniform float simulationTime;
uniform vec3 cloudColor;
uniform float masterOpacity;
in vec3 rayOrigin;
in vec3 rayDirection;
out vec4 fragColor;
float density(vec3 p){
  #ifdef USE_DENSITY_ATLAS
  vec3 q=clamp(p*48.0-.5,0.0,47.0);float z=floor(q.z),nextZ=min(47.0,z+1.0);
  vec2 a=(vec2(mod(z,8.0),floor(z/8.0))*48.0+q.xy+.5)/vec2(384.0,288.0);
  vec2 b=(vec2(mod(nextZ,8.0),floor(nextZ/8.0))*48.0+q.xy+.5)/vec2(384.0,288.0);
  float base=mix(texture(densityAtlas,a).r,texture(densityAtlas,b).r,fract(q.z));
  #else
  float base=texture(densityMap,p).r;
  #endif
  vec3 drift=vec3(simulationTime*0.008,simulationTime*0.004,0.0);
  float noise=texture(noiseMap,p*2.3-drift).r*0.7+texture(noiseMap,p*6.1+drift).r*0.3;
  return max(0.0,base-(1.0-noise)*0.42)*1.8;
}
void main(){
  vec3 direction=normalize(rayDirection);
  vec3 inverseRay=1.0/direction;
  vec3 a=(-vec3(0.5)-rayOrigin)*inverseRay,b=(vec3(0.5)-rayOrigin)*inverseRay;
  vec3 near=min(a,b),far=max(a,b);
  float start=max(max(near.x,near.y),max(near.z,0.0));
  float end=min(min(far.x,far.y),far.z);
  if(start>=end)discard;
  float stepSize=(end-start)/80.0;
  vec3 accumulated=vec3(0.0);float alpha=0.0;
  for(int i=0;i<80;i++){
    vec3 p=rayOrigin+direction*(start+(float(i)+0.5)*stepSize)+0.5;
    float d=smoothstep(0.025,0.38,density(p));
    if(d>0.002){
      float shadow=density(p+vec3(-0.035,0.06,0.025))*1.4+density(p+vec3(-0.07,0.12,0.05))*0.9;
      float light=0.18+1.0*exp(-shadow*2.6);
      vec3 color=mix(vec3(0.23,0.32,0.43),cloudColor,light);
      float opacity=1.0-exp(-d*stepSize*13.0);
      accumulated+=(1.0-alpha)*opacity*color;
      alpha+=(1.0-alpha)*opacity;
      if(alpha>0.985)break;
    }
  }
  if(alpha<0.005)discard;
  fragColor=vec4(pow(accumulated/max(alpha,0.001),vec3(1.0/2.2)),alpha*masterOpacity);
}`;

export function createSimulationView(item:SimulationItem,wire:boolean,config:SimulationConfig={},renderer?:THREE.WebGLRenderer){
  if(item.simulation==='paint')throw new Error('Use the GPU paint view for paint scenes.');
  if(item.simulation==='cloth')return createClothView(item,wire,config);
  const group=new THREE.Group();group.name=(item.simulation==='water'?'Water_':'Cloud_')+item.nodeId;
  group.position.set(Number(item.params.x),Number(item.params.y),Number(item.params.z));
  const count=Number(item.params.count),dummy=new THREE.Object3D(),color=new THREE.Color(String(item.params.color));
  const particles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshStandardMaterial({color,roughness:.22,metalness:.15,wireframe:wire}),count);
  particles.name='Simulation_particles_'+item.nodeId;particles.userData.node=item.nodeId;particles.userData.exportParticles=item.simulation==='cloud';particles.frustumCulled=false;
  particles.visible=String(item.params.display).includes('particles');group.add(particles);
  const gpuVolume=item.simulation==='cloud'&&renderer?createGpuCloudVolume(renderer,count,item.params):undefined;
  let surface:MarchingCubes|undefined,volume:THREE.Data3DTexture|undefined,noise:THREE.Data3DTexture|undefined,cloudMaterial:THREE.ShaderMaterial|undefined;
  if(item.simulation==='water'){
    const spacing=Math.cbrt(27/count);
    surface=new MarchingCubes(Math.min(80,Math.max(52,Math.ceil(52*Math.cbrt(count/1200)))),new THREE.MeshPhysicalMaterial({color,roughness:.14,metalness:.25,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.5,wireframe:wire}),false,false,count>2400?90000:45000);
    surface.name='Fluid_surface_'+item.nodeId;surface.scale.setScalar(5);surface.isolation=50;surface.frustumCulled=false;surface.userData.node=item.nodeId;surface.visible=item.params.display!=='particles';surface.userData.spacing=spacing;group.add(surface);
    const basinMaterial=new THREE.MeshStandardMaterial({color:'#273b46',roughness:.38,metalness:.35});
    const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),basinMaterial);mesh.position.set(x,y,z);mesh.receiveShadow=true;mesh.name='Basin';group.add(mesh);};
    box(0,-2.23,0,9,.3,6);box(-4.35,-1.92,0,.18,.38,5.65);box(4.35,-1.92,0,.18,.38,5.65);box(0,-1.92,-2.8,8.9,.38,.18);box(0,-1.92,2.8,8.9,.38,.18);
    if(Number(item.params.obstacle)>0){const obstacle=new THREE.Mesh(new THREE.SphereGeometry(Number(item.params.obstacle),32,20),new THREE.MeshStandardMaterial({color:'#a4b6bd',roughness:.27,metalness:.65}));obstacle.position.set(.8,-1.15,0);obstacle.name='Collision_sphere';obstacle.userData.node=item.nodeId;obstacle.userData.fixedAppearance=true;obstacle.castShadow=true;group.add(obstacle);}
  }else{
    volume=new THREE.Data3DTexture(new Uint8Array(VOLUME_SIZE**3),VOLUME_SIZE,VOLUME_SIZE,VOLUME_SIZE);volume.format=THREE.RedFormat;volume.type=THREE.UnsignedByteType;volume.minFilter=volume.magFilter=THREE.LinearFilter;volume.unpackAlignment=1;volume.needsUpdate=true;
    const noiseSize=64,noiseData=new Uint8Array(noiseSize**3);
    const hash=(x:number,y:number,z:number)=>{const t=Math.sin((x%8)*127.1+(y%8)*311.7+(z%8)*74.7)*43758.5453;return t-Math.floor(t);};
    const smooth=(v:number)=>v*v*(3-2*v),mix=(a:number,b:number,t:number)=>a+(b-a)*t;
    for(let z=0;z<noiseSize;z++)for(let y=0;y<noiseSize;y++)for(let x=0;x<noiseSize;x++){
      const X=Math.floor(x/8),Y=Math.floor(y/8),Z=Math.floor(z/8),u=smooth(x/8-X),v=smooth(y/8-Y),w=smooth(z/8-Z);
      noiseData[x+y*noiseSize+z*noiseSize**2]=255*mix(mix(mix(hash(X,Y,Z),hash(X+1,Y,Z),u),mix(hash(X,Y+1,Z),hash(X+1,Y+1,Z),u),v),mix(mix(hash(X,Y,Z+1),hash(X+1,Y,Z+1),u),mix(hash(X,Y+1,Z+1),hash(X+1,Y+1,Z+1),u),v),w);
    }
    noise=new THREE.Data3DTexture(noiseData,noiseSize,noiseSize,noiseSize);noise.format=THREE.RedFormat;noise.type=THREE.UnsignedByteType;noise.minFilter=noise.magFilter=THREE.LinearFilter;noise.wrapS=noise.wrapT=noise.wrapR=THREE.RepeatWrapping;noise.unpackAlignment=1;noise.needsUpdate=true;
    const mat=new THREE.ShaderMaterial({defines:gpuVolume?{USE_DENSITY_ATLAS:1}:{},glslVersion:THREE.GLSL3,vertexShader:volumeVertex,fragmentShader:volumeFragment,uniforms:{densityAtlas:{value:gpuVolume?.texture},densityMap:{value:volume},noiseMap:{value:noise},simulationTime:{value:0},cloudColor:{value:color},masterOpacity:{value:Number(item.params.opacity??1)}},transparent:true,side:THREE.BackSide,depthWrite:false});
    cloudMaterial=mat;const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);mesh.scale.set(18,10,10);mesh.position.y=2.5;mesh.name='Cloud_volume_'+item.nodeId;mesh.userData.node=item.nodeId;mesh.userData.volume=true;mesh.visible=item.params.display!=='particles';mesh.renderOrder=2;group.add(mesh);
  }
  const client=new SimulationClient(item.simulation,item.params,frame=>{
    for(let i=0;i<count;i++){const k=i*3;dummy.position.fromArray(frame.positions,k);dummy.rotation.set(0,0,0);dummy.scale.setScalar(item.simulation==='water'?Math.cbrt(27/count)*.26:.055);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);}
    particles.instanceMatrix.needsUpdate=true;particles.boundingSphere=null;
    if(surface&&surface.visible){surface.reset();const strength=1.05*(Number(surface.userData.spacing)/10)**2*62;
      for(let k=0;k<frame.positions.length;k+=3)surface.addBall(frame.positions[k]/10+.5,frame.positions[k+1]/10+.5,frame.positions[k+2]/10+.5,strength,12);
      surface.update();
    }
    if(gpuVolume){gpuVolume.update(frame.positions);if(cloudMaterial)cloudMaterial.uniforms.simulationTime.value=frame.time;}
    if(volume&&frame.volume){volume.image.data=frame.volume;volume.needsUpdate=true;if(cloudMaterial)cloudMaterial.uniforms.simulationTime.value=frame.time;}
  },{...config,gpuCloudVolume:!!gpuVolume});
  if(gpuVolume)group.userData.gpuDensity=true;else if(item.simulation==='cloud'&&renderer)group.userData.gpuFallback='GPU cloud density is unavailable; CPU density is active. Lower Cloud parcels for smoother playback.';
  return {group,client,dispose:()=>{client.dispose();gpuVolume?.dispose();volume?.dispose();noise?.dispose();}};
}
