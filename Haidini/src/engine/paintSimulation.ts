import {waveSubsteps,liquidDepth} from './paintWaves.ts';
import * as THREE from 'three';
import type { Params } from './evaluator.ts';
import type { SimulationController } from './simulationController.ts';
import { clampSceneTime } from './timing.ts';
import { paintCommon, paintPasses, paintVertex } from './paintShaders.ts';

const STEP=1/60;
type Pair={read:THREE.WebGLRenderTarget;write:THREE.WebGLRenderTarget};
type Checkpoint={pigments:THREE.WebGLRenderTarget[];waves:THREE.WebGLRenderTarget};
export class PaintSimulation implements SimulationController {
 readonly backend='GPU' as const;
 readonly resolution:number;readonly depth:number;
 time=0;error='';stepMs=0;stepIndex=0;onAdvance:()=>void=()=>{};
 private renderer:THREE.WebGLRenderer;
 private velocity:THREE.WebGLRenderTarget;private pigments:Pair[];private waves:Pair;private waveSteps:number;
 private surface:THREE.WebGLRenderTarget;private advectedPigment:THREE.WebGLRenderTarget;
 private scene=new THREE.Scene();private camera=new THREE.Camera();private quad:THREE.Mesh;
 private materials:Record<keyof typeof paintPasses,THREE.ShaderMaterial>;
 private checkpoints=new Map<number,Checkpoint>();private checkpointLimit:number;
 private normalizeColors:boolean;
 private requested=0;private disposed=false;private timer:ReturnType<typeof setTimeout>|null=null;
 private waiters:{step:number;resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}[]=[];
 constructor(renderer:THREE.WebGLRenderer,params:Params){
  if(!renderer.extensions.has('EXT_color_buffer_float'))throw new Error('Paint mixing needs floating-point GPU rendering. Enable hardware acceleration.');
  this.normalizeColors=Number(params.colorCount??3)>3||Boolean(params.separateColors);
  this.renderer=renderer;this.resolution=params.detail==='fine'?384:256;this.depth=Math.fround(liquidDepth(params));
  const pair=():Pair=>({read:this.target(),write:this.target()});
  this.waveSteps=waveSubsteps(this.resolution,Math.sqrt(9.81*liquidDepth(params)));this.waves=pair();this.velocity=this.target();this.pigments=Array.from({length:Math.ceil(Number(params.colorCount??3)/4)},pair);this.surface=this.target();this.advectedPigment=this.target();
  this.materials=Object.fromEntries(Object.entries(paintPasses).map(([name,code])=>[name,new THREE.ShaderMaterial({vertexShader:paintVertex,fragmentShader:paintCommon+code,depthTest:false,depthWrite:false,toneMapped:false,uniforms:{pack0:{value:null},pack1:{value:null},pack2:{value:null},filledBasin:{value:params.fillBasin?1:0},state:{value:null},velocity:{value:null},rhs:{value:null},resolution:{value:this.resolution},dt:{value:STEP},clock:{value:0},waves:{value:null},sculptural:{value:params.surfaceFinish==='sculptural'?1:0},foldDepth:{value:Number(params.foldDepth??2.8)},waveEnabled:{value:1},waveDrive:{value:params.waveMachine?1:0},forceDuration:{value:Number(params.forceDuration??0)},waveDt:{value:STEP/this.waveSteps},waveClock:{value:0},waveAmplitude:{value:Number(params.waveHeight??.24)},waveFrequency:{value:Number(params.waveFrequency??.55)},depth:{value:this.depth},waveDamping:{value:Number(params.waveDamping??.12)},waveDirection:{value:['far wall','left wall','near wall','right wall'].indexOf(String(params.waveDirection||'far wall'))},wavePattern:{value:params.wavePattern==='crossing'?1:0},viscosity:{value:Number(params.viscosity)},flow:{value:Number(params.flow)},swirl:{value:Number(params.swirl)},drift:{value:Number(params.drift)},mixing:{value:params.separateColors?0:Number(params.mixing)},streamWidth:{value:Number(params.streamWidth)},paletteCount:{value:Number(params.colorCount??3)},pigmentGroup:{value:0},separateColors:{value:params.separateColors?1:0},colorCycle:{value:Number(params.colorCycle??7)}}})])) as typeof this.materials;
  this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.materials.zero);this.quad.frustumCulled=false;this.scene.add(this.quad);
  this.checkpointLimit=Math.max(2,Math.floor(32*1024**2/(this.resolution**2*16*(this.pigments.length+1))));
  this.withRenderer(()=>{for(const target of [this.waves.read,this.waves.write,this.velocity,...this.pigments.flatMap(p=>[p.read,p.write])])this.pass('zero',target);this.pass('initialLiquid',this.waves.read);if(params.fillBasin)this.pigments.forEach((p,i)=>{this.materials.filledPigment.uniforms.pigmentGroup.value=i;this.pass('filledPigment',p.read);});this.renderSurface();this.save();});
 }
 private target(){return new THREE.WebGLRenderTarget(this.resolution,this.resolution,{type:THREE.FloatType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,stencilBuffer:false});}
 get surfaceTexture(){return this.surface.texture;}
 private renderSurface(){this.pass('flowVelocity',this.velocity);this.pass('sculptSurface',this.surface);}
 get waveTexture(){return this.waves.read.texture;}
 get pigmentTexture(){return this.pigments[0].read.texture;}
 get pigmentTextures(){return this.pigments.map(p=>p.read.texture);}
 get velocityTexture(){return this.velocity.texture;}
 private withRenderer(job:()=>void){const r=this.renderer,target=r.getRenderTarget(),auto=r.autoClear,xr=r.xr.enabled;try{r.xr.enabled=false;r.autoClear=false;job();}finally{r.setRenderTarget(target);r.autoClear=auto;r.xr.enabled=xr;}}
 private pass(name:keyof typeof paintPasses,target:THREE.WebGLRenderTarget,state?:THREE.Texture){const m=this.materials[name];m.uniforms.state.value=state||this.velocity.texture;m.uniforms.velocity.value=this.velocity.texture;m.uniforms.clock.value=this.time;m.uniforms.waves.value=this.waveTexture;this.quad.material=m;this.renderer.setRenderTarget(target);this.renderer.render(this.scene,this.camera);}
 private swap(pair:Pair){[pair.read,pair.write]=[pair.write,pair.read];}
 private step(){
  const start=performance.now();
  for(let i=0;i<this.waveSteps;i++){this.materials.waveStep.uniforms.waveClock.value=this.time+(i+.5)*STEP/this.waveSteps;this.pass('waveStep',this.waves.write,this.waves.read.texture);this.swap(this.waves);}
  this.pigments.forEach((pigment,index)=>{
   this.pass('advectPigment',this.advectedPigment,pigment.read.texture);
   this.materials.correctPigment.uniforms.rhs.value=pigment.read.texture;this.pass('correctPigment',pigment.write,this.advectedPigment.texture);this.swap(pigment);
   this.materials.pigment.uniforms.pigmentGroup.value=index;this.pass('pigment',pigment.write,pigment.read.texture);this.swap(pigment);
  });
  if(this.normalizeColors){
   const m=this.materials.normalizePigment;m.uniforms.pack0.value=this.pigmentTextures[0];m.uniforms.pack1.value=this.pigmentTextures[1]||this.pigmentTextures[0];m.uniforms.pack2.value=this.pigmentTextures[2]||this.pigmentTextures[0];
   // Bind the same complete old state for every pack before swapping any target.
   this.pigments.forEach(p=>this.pass('normalizePigment',p.write,p.read.texture));this.pigments.forEach(p=>this.swap(p));
  }
  this.stepIndex++;this.time=this.stepIndex*STEP;this.stepMs=performance.now()-start;
  if(this.stepIndex%120===0&&!this.checkpoints.has(this.stepIndex))this.save();
 }
 private copyState(target:THREE.WebGLRenderTarget,source:THREE.Texture){this.renderer.initRenderTarget(target);this.renderer.copyTextureToTexture(source,target.texture);}
 private save(){const snapshot={pigments:this.pigments.map(()=>this.target()),waves:this.target()};snapshot.pigments.forEach((target,i)=>this.copyState(target,this.pigmentTextures[i]));this.copyState(snapshot.waves,this.waveTexture);this.checkpoints.set(this.stepIndex,snapshot);while(this.checkpoints.size>this.checkpointLimit){const oldest=Math.min(...[...this.checkpoints.keys()].filter(k=>k!==0));const entry=this.checkpoints.get(oldest)!;entry.pigments.forEach(p=>p.dispose());entry.waves.dispose();this.checkpoints.delete(oldest);}}
 private rewind(target:number){let best=0;for(const key of this.checkpoints.keys())if(key<=target&&key>best)best=key;const snapshot=this.checkpoints.get(best)!;snapshot.pigments.forEach((target,i)=>this.copyState(this.pigments[i].read,target.texture));this.copyState(this.waves.read,snapshot.waves.texture);this.stepIndex=best;this.time=best*STEP;}
 private pump=()=>{this.timer=null;if(this.disposed)return;try{if(this.renderer.getContext().isContextLost())throw new Error('Graphics context lost. Reload to restore paint simulation.');this.withRenderer(()=>{if(this.requested<this.stepIndex)this.rewind(this.requested);const start=performance.now();let steps=0;while(this.stepIndex<this.requested&&steps++<2&&performance.now()-start<6)this.step();this.renderSurface();});this.onAdvance();for(const w of this.waiters.slice())if(w.step===this.stepIndex){clearTimeout(w.timer);w.resolve();this.waiters.splice(this.waiters.indexOf(w),1);}if(this.requested!==this.stepIndex)this.timer=setTimeout(this.pump,0);}catch(e){this.fail(e instanceof Error?e.message:String(e));}};
 request(time:number){if(this.disposed||this.error)return;this.requested=Math.round(clampSceneTime(time)/STEP);if(this.requested!==this.stepIndex&&this.timer===null)this.timer=setTimeout(this.pump,0);}
 async ready(time:number){if(this.disposed)throw new Error('Scene changed during simulation.');if(this.error)throw new Error(this.error);this.request(time);if(this.requested===this.stepIndex)return;await new Promise<void>((resolve,reject)=>{const waiter={step:this.requested,resolve,reject,timer:setTimeout(()=>{this.waiters=this.waiters.filter(w=>w!==waiter);reject(new Error('Paint is still calculating. Pause playback, wait for the target frame, then export again.'));},60000)};this.waiters.push(waiter);});}
 // Readbacks are reserved for explicit export and verification, never playback.
 snapshot(){const n=this.resolution,pigments=this.pigments.map(()=>new Float32Array(n*n*4)),pigment=pigments[0],velocity=new Float32Array(n*n*4),waves=new Float32Array(n*n*4),surface=new Float32Array(n*n*4);this.pigments.forEach((pair,i)=>this.renderer.readRenderTargetPixels(pair.read,0,0,n,n,pigments[i]));this.renderer.readRenderTargetPixels(this.velocity,0,0,n,n,velocity);this.renderer.readRenderTargetPixels(this.waves.read,0,0,n,n,waves);this.renderer.readRenderTargetPixels(this.surface,0,0,n,n,surface);return {resolution:n,depth:this.depth,pigment,pigments,velocity,waves,surface,time:this.time};}
 private fail(message:string){this.error=message;for(const w of this.waiters){clearTimeout(w.timer);w.reject(new Error(message));}this.waiters=[];}
 dispose(){if(this.disposed)return;this.disposed=true;if(this.timer!==null)clearTimeout(this.timer);this.fail('Scene changed during simulation.');for(const pair of [...this.pigments,this.waves]){pair.read.dispose();pair.write.dispose();}this.surface.dispose();this.advectedPigment.dispose();this.velocity.dispose();this.quad.geometry.dispose();Object.values(this.materials).forEach(m=>m.dispose());for(const entry of this.checkpoints.values()){entry.pigments.forEach(p=>p.dispose());entry.waves.dispose();}this.checkpoints.clear();}
}
