import * as THREE from 'three';
import {random} from '../engine/geometry.ts';
import {VOLUME_SIZE} from '../engine/simulation.ts';
import type {Params} from '../engine/evaluator.ts';

// Splat parcels into tiled volume slices. Playback never reads the density volume back.
export function createGpuCloudVolume(renderer:THREE.WebGLRenderer,count:number,params:Params){
 if(!renderer.extensions.has('EXT_color_buffer_float')||!renderer.extensions.has('EXT_float_blend'))return undefined;
 const size=VOLUME_SIZE,width=size*8,height=size*6,spread=Number(params.spread);
 const field=new THREE.WebGLRenderTarget(width,height,{type:THREE.FloatType,format:THREE.RGBAFormat,depthBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
 const density=new THREE.WebGLRenderTarget(width,height,{depthBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
 const slices=Math.ceil(spread*1.25/10*(size-1))+1,vertices:number[]=[];
 for(let z=-slices;z<=slices;z++)for(const [x,y] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]])vertices.push(x,y,z);
 const geometry=new THREE.InstancedBufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 const positions=new THREE.InstancedBufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage),radii=new Float32Array(count);
 for(let i=0;i<count;i++)radii[i]=spread*(.75+random(Number(params.seed),i+7000)*.5);
 geometry.setAttribute('parcelPosition',positions);geometry.setAttribute('parcelRadius',new THREE.InstancedBufferAttribute(radii,1));geometry.instanceCount=count;
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,transparent:true,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendEquation:THREE.AddEquation,toneMapped:false,vertexShader:`
attribute vec3 parcelPosition;attribute float parcelRadius;
varying vec3 distanceToParcel;varying float fade;
void main(){
 vec3 center=vec3(parcelPosition.x/18.0+.5,(parcelPosition.y-2.5)/10.0+.5,parcelPosition.z/10.0+.5)*47.0;
 vec3 radius=parcelRadius*vec3(47.0/18.0,47.0/10.0,47.0/10.0);
 float slice=floor(center.z)+position.z;
 vec2 lo=max(vec2(0.0),floor(center.xy-radius.xy)),hi=min(vec2(48.0),ceil(center.xy+radius.xy)+1.0);
 vec2 voxel=mix(lo,hi,position.xy),tile=vec2(mod(slice,8.0),floor(slice/8.0));
 distanceToParcel=vec3((voxel-.5-center.xy)/radius.xy,(slice-center.z)/radius.z);
 fade=clamp((8.5-abs(parcelPosition.x))/1.4,0.0,1.0)*clamp((7.0-parcelPosition.y)/1.3,0.0,1.0)*clamp((parcelPosition.y+1.5)/1.2,0.0,1.0);
 if(slice<0.0||slice>=48.0||hi.x<=lo.x||hi.y<=lo.y){gl_Position=vec4(2.0,2.0,0.0,1.0);return;}
 gl_Position=vec4((tile*48.0+voxel)/vec2(384.0,288.0)*2.0-1.0,0.0,1.0);
}`,fragmentShader:`varying vec3 distanceToParcel;varying float fade;void main(){float d=dot(distanceToParcel,distanceToParcel);if(d>=1.0)discard;float w=1.0-d;gl_FragColor=vec4(w*w*w*fade,0.0,0.0,0.0);}`});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;const scene=new THREE.Scene();scene.add(mesh);
 const camera=new THREE.Camera(),quadGeometry=new THREE.PlaneGeometry(2,2),normalize=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms:{field:{value:field.texture},amount:{value:Number(params.density)*220/count}},vertexShader:'varying vec2 sampleUv;void main(){sampleUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:'uniform sampler2D field;uniform float amount;varying vec2 sampleUv;void main(){float d=1.0-exp(-texture2D(field,sampleUv).r*amount);gl_FragColor=vec4(vec3(floor(d*255.0+.5)/255.0),1.0);}'});
 const normalizedScene=new THREE.Scene();normalizedScene.add(new THREE.Mesh(quadGeometry,normalize));
 return {texture:density.texture,target:density,update(values:Float32Array){positions.array.set(values);positions.needsUpdate=true;const target=renderer.getRenderTarget(),clear=renderer.getClearColor(new THREE.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear,xr=renderer.xr.enabled;try{renderer.xr.enabled=false;renderer.autoClear=false;renderer.setClearColor(0,0);renderer.setRenderTarget(field);renderer.clear();renderer.render(scene,camera);renderer.setRenderTarget(density);renderer.clear();renderer.render(normalizedScene,camera);}finally{renderer.setRenderTarget(target);renderer.setClearColor(clear,alpha);renderer.autoClear=auto;renderer.xr.enabled=xr;}},dispose(){field.dispose();density.dispose();geometry.dispose();material.dispose();quadGeometry.dispose();normalize.dispose();}};
}
