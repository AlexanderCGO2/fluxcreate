import { clampSceneTime } from './timing.ts';
import * as THREE from 'three';
import {GPUComputationRenderer,type Variable} from 'three/addons/misc/GPUComputationRenderer.js';
import {ParticleDynamics} from './particleDynamics.ts';
import {resolveColliders,type SimulationConfig} from './collisions.ts';
import {particleCompute} from './gpuParticleShaders.ts';
import type {Params} from './evaluator.ts';
import type {SimulationController} from './simulationController.ts';
import {STEP,type SimFrame} from './simulation.ts';

// Match the CPU reference's Float32 lifetime boundary without scanning every particle each step.
const ageSteps=new Float32Array(1802);for(let i=1;i<ageSteps.length;i++)ageSteps[i]=ageSteps[i-1]+STEP;
export function particleLifetimeSteps(lifetime:number){let lo=1,hi=ageSteps.length-1;while(lo<hi){const middle=(lo+hi)>>1;if(ageSteps[middle]<lifetime)lo=middle+1;else hi=middle;}return lo;}
type Cache={position:THREE.WebGLRenderTarget;velocity:THREE.WebGLRenderTarget;expiry:Map<number,number[]>};
export class GpuParticleSimulation implements SimulationController {
 readonly backend='GPU' as const;readonly width:number;readonly height:number;
 renderer:THREE.WebGLRenderer;gpu:GPUComputationRenderer;position:Variable;velocity:Variable;emitter:ParticleDynamics;
 birthPosition:THREE.DataTexture;birthVelocity:THREE.DataTexture;birthMetadata:THREE.DataTexture;
 time=0;error='';stepMs=0;stepIndex=0;requested=0;disposed=false;onAdvance:()=>void=()=>{};
 private timer:ReturnType<typeof setTimeout>|null=null;private expiry=new Map<number,number[]>();private cache=new Map<number,Cache>();private limit:number;
 private waiters:{step:number;resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}[]=[];
 constructor(renderer:THREE.WebGLRenderer,params:Params,config:SimulationConfig={}){
  if(!GpuParticleSimulation.supported(renderer))throw new Error('Floating-point GPU simulation is unavailable.');
  this.renderer=renderer;this.emitter=new ParticleDynamics(params,config);this.width=Math.ceil(Math.sqrt(this.emitter.count));this.height=Math.ceil(this.emitter.count/this.width);
  this.gpu=new GPUComputationRenderer(this.width,this.height,renderer);this.birthPosition=this.gpu.createTexture();this.birthVelocity=this.gpu.createTexture();this.birthMetadata=this.gpu.createTexture();
  const initialPosition=this.gpu.createTexture(),initialVelocity=this.gpu.createTexture();for(let i=0;i<this.width*this.height;i++){initialPosition.image.data[i*4+3]=-1;this.birthPosition.image.data[i*4+3]=-1;}
  this.position=this.gpu.addVariable('statePosition',particleCompute,initialPosition);this.velocity=this.gpu.addVariable('stateVelocity',particleCompute,initialVelocity);this.velocity.material.defines.OUTPUT_VELOCITY=1;
  for(const variable of [this.position,this.velocity]){this.gpu.setVariableDependencies(variable,[this.position,this.velocity]);Object.assign(variable.material.uniforms,{birthPosition:{value:this.birthPosition},birthVelocity:{value:this.birthVelocity},birthMetadata:{value:this.birthMetadata},simulationStep:{value:0},simulationEpoch:{value:0},simulationPhase:{value:0},particleCount:{value:this.emitter.count},acceleration:{value:new THREE.Vector3(Number(params.windX||0),Number(params.gravity)+Number(params.buoyancy||0)+Number(params.windY||0),Number(params.windZ||0))},dragFactor:{value:Math.exp(-Number(params.drag)*STEP/4)},particleRadius:{value:Number(params.size)*.6},turbulence:{value:Number(params.turbulence||0)},noiseScale:{value:Number(params.noiseScale||1)},seedPhase:{value:Number(params.seed)*.01},bounce:{value:Number(params.bounce)},friction:{value:Number(params.friction)},colliderCount:{value:0},colliderA:{value:Array.from({length:32},()=>new THREE.Vector4())},colliderB:{value:Array.from({length:32},()=>new THREE.Vector4())}});}
  const failure=this.gpu.init();if(failure){this.gpu.dispose();this.birthPosition.dispose();this.birthVelocity.dispose();this.birthMetadata.dispose();throw new Error(failure);}
  this.limit=Math.max(2,Math.min(61,Math.floor(64*1024**2/(this.width*this.height*32+this.emitter.count*48))));
  const birth=this.emitter.birth.bind(this.emitter);this.emitter.birth=time=>{const index=birth(time);if(index!==undefined){const death=this.stepIndex+particleLifetimeSteps(this.emitter.lifetimes[index]),bucket=this.expiry.get(death)||[];bucket.push(index);this.expiry.set(death,bucket);this.packBirth(index,this.stepIndex,death);}return index;};
  this.save();
 }
 static supported(renderer:THREE.WebGLRenderer){return !renderer.getContext().isContextLost()&&renderer.capabilities.maxVertexTextures>=3&&renderer.extensions.has('EXT_color_buffer_float');}
 get positionTexture(){return this.gpu.getCurrentRenderTarget(this.position).texture;}
 get velocityTexture(){return this.gpu.getCurrentRenderTarget(this.velocity).texture;}
 private packBirth(i:number,born:number,death:number){const e=this.emitter,k=i*4,a=i*3,p=this.birthPosition.image.data as Float32Array,v=this.birthVelocity.image.data as Float32Array,m=this.birthMetadata.image.data as Float32Array;p.set([e.positions[a],e.positions[a+1],e.positions[a+2],born%65536],k);v.set([e.velocities[a],e.velocities[a+1],e.velocities[a+2],e.lifetimes[i]],k);m.set([e.sizes[i],e.particleSeeds[i],death-born,Math.floor(born/65536)],k);}
 private uploadBirths(){this.birthPosition.needsUpdate=true;this.birthVelocity.needsUpdate=true;this.birthMetadata.needsUpdate=true;}
 private step(){const started=performance.now(),e=this.emitter;
  for(const index of this.expiry.get(this.stepIndex)||[]){e.ages[index]=-1;e.alive--;}this.expiry.delete(this.stepIndex);
  const serial=e.serial;e.stepIndex=this.stepIndex;e.emit(this.time);if(e.serial!==serial)this.uploadBirths();
  for(const variable of [this.position,this.velocity]){const u=variable.material.uniforms;u.simulationStep.value=this.stepIndex%65536;u.simulationEpoch.value=Math.floor(this.stepIndex/65536);u.simulationPhase.value=(this.time*1.2+Number(e.params.seed)*.01)%(Math.PI*2);for(let sub=0;sub<4;sub++){const colliders=resolveColliders({...e.config,origin:undefined},this.time+sub*STEP/4);u.colliderCount.value=colliders.length;colliders.forEach((c,i)=>{u.colliderA.value[sub*8+i].set(c.x,c.y,c.z,c.shape==='sphere'?0:1);u.colliderB.value[sub*8+i].set(...c.half,c.radius);});}}
  this.gpu.compute();this.stepIndex++;this.time=this.stepIndex*STEP;e.stepIndex=this.stepIndex;this.stepMs=performance.now()-started;if(this.stepIndex%30===0&&!this.cache.has(this.stepIndex))this.save();
 }
 private target(){return new THREE.WebGLRenderTarget(this.width,this.height,{type:THREE.FloatType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false});}
 private save(){const position=this.target(),velocity=this.target();this.gpu.renderTexture(this.positionTexture,position);this.gpu.renderTexture(this.velocityTexture,velocity);this.emitter.save();this.cache.set(this.stepIndex,{position,velocity,expiry:new Map([...this.expiry].map(([step,indices])=>[step,indices.slice()]))});while(this.cache.size>this.limit){const oldest=[...this.cache.keys()].filter(step=>step!==0).sort((a,b)=>a-b)[0];const entry=this.cache.get(oldest)!;entry.position.dispose();entry.velocity.dispose();this.cache.delete(oldest);this.emitter.checkpoints.delete(oldest);}}
 private rewind(target:number){let best=0;for(const step of this.cache.keys())if(step<=target&&step>best)best=step;const entry=this.cache.get(best)!;this.emitter.seek(best*STEP,0);this.stepIndex=best;this.time=best*STEP;this.expiry=new Map([...entry.expiry].map(([step,indices])=>[step,indices.slice()]));for(const [variable,texture] of [[this.position,entry.position.texture],[this.velocity,entry.velocity.texture]] as [Variable,THREE.Texture][]){this.gpu.renderTexture(texture,this.gpu.getCurrentRenderTarget(variable));this.gpu.renderTexture(texture,this.gpu.getAlternateRenderTarget(variable));}
  const p=this.birthPosition.image.data as Float32Array;for(let i=0;i<this.width*this.height;i++)p[i*4+3]=-1;for(const [death,indices] of this.expiry)for(const index of indices)this.packBirth(index,death-particleLifetimeSteps(this.emitter.lifetimes[index]),death);this.uploadBirths();
 }
 private pump=()=>{this.timer=null;if(this.disposed)return;try{if(this.renderer.getContext().isContextLost())throw new Error('Graphics context lost. Reload to restore GPU simulation.');if(this.requested<this.stepIndex)this.rewind(this.requested);const start=performance.now();let steps=0;while(this.stepIndex<this.requested&&steps++<4&&performance.now()-start<6)this.step();this.onAdvance();for(const waiter of this.waiters.slice())if(waiter.step===this.stepIndex){clearTimeout(waiter.timer);waiter.resolve();this.waiters.splice(this.waiters.indexOf(waiter),1);}if(this.stepIndex!==this.requested)this.timer=setTimeout(this.pump,0);}catch(error){this.fail(error instanceof Error?error.message:String(error));}};
 request(time:number){if(this.disposed||this.error)return;this.requested=Math.round(clampSceneTime(time)/STEP);if(this.requested!==this.stepIndex&&this.timer===null)this.timer=setTimeout(this.pump,0);}
 async ready(time:number){if(this.disposed)throw new Error('Scene changed during simulation.');if(this.error)throw new Error(this.error);this.request(time);if(this.requested===this.stepIndex)return;await new Promise<void>((resolve,reject)=>{const waiter={step:this.requested,resolve,reject,timer:setTimeout(()=>{this.waiters=this.waiters.filter(w=>w!==waiter);reject(new Error('GPU simulation timed out. Reduce the particle count.'));},60000)};this.waiters.push(waiter);});}
 frame():SimFrame{if(this.disposed)throw new Error('Scene changed during simulation.');const pixels=this.width*this.height*4,p=new Float32Array(pixels),v=new Float32Array(pixels);this.renderer.readRenderTargetPixels(this.gpu.getCurrentRenderTarget(this.position),0,0,this.width,this.height,p);this.renderer.readRenderTargetPixels(this.gpu.getCurrentRenderTarget(this.velocity),0,0,this.width,this.height,v);const count=this.emitter.count,positions=new Float32Array(count*3),velocities=new Float32Array(count*3),ages=new Float32Array(count),lifetimes=new Float32Array(count),speeds=new Float32Array(count);for(let i=0;i<count;i++){positions.set(p.subarray(i*4,i*4+3),i*3);velocities.set(v.subarray(i*4,i*4+3),i*3);ages[i]=p[i*4+3];lifetimes[i]=v[i*4+3];speeds[i]=Math.hypot(v[i*4],v[i*4+1],v[i*4+2]);}return {time:this.time,positions,velocities,ages,lifetimes,speeds,sizes:this.emitter.sizes.slice(),particleSeeds:this.emitter.particleSeeds.slice(),stepMs:this.stepMs};}
 private fail(message:string){this.error=message;for(const w of this.waiters){clearTimeout(w.timer);w.reject(new Error(message));}this.waiters=[];}
 dispose(){if(this.disposed)return;this.disposed=true;if(this.timer!==null)clearTimeout(this.timer);this.fail('Scene changed during simulation.');this.gpu.dispose();this.birthPosition.dispose();this.birthVelocity.dispose();this.birthMetadata.dispose();for(const entry of this.cache.values()){entry.position.dispose();entry.velocity.dispose();}this.cache.clear();this.emitter.checkpoints.clear();}
}
