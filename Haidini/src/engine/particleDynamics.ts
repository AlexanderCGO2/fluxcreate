import { clampSceneTime } from './timing.ts';
import { random } from './geometry.ts';
import { glyphPose } from './motion.ts';
import { animatedValue } from './animation.ts';
import { collideShapes, resolveColliders, type SimulationConfig } from './collisions.ts';
import { PARTICLE_CONTROL_DEFAULTS } from './particleControls.ts';
import type { Params } from './evaluator.ts';
import { STEP, type SimFrame } from './simulation.ts';
type Snapshot={positions:Float32Array;velocities:Float32Array;ages:Float32Array;lifetimes:Float32Array;sizes:Float32Array;particleSeeds:Float32Array;credit:number;serial:number;cursor:number;alive:number};
export class ParticleDynamics {
 params:Params;config:SimulationConfig;count:number;positions:Float32Array;velocities:Float32Array;ages:Float32Array;lifetimes:Float32Array;sizes:Float32Array;particleSeeds:Float32Array;
 stepIndex=0;lastStepMs=0;credit=0;serial=0;cursor=0;alive=0;checkpoints=new Map<number,Snapshot>();
 constructor(params:Params,config:SimulationConfig={}){this.params={...PARTICLE_CONTROL_DEFAULTS,...params};this.config=config;this.count=Number(params.count);this.positions=new Float32Array(this.count*3);this.velocities=new Float32Array(this.count*3);this.ages=new Float32Array(this.count).fill(-1);this.lifetimes=new Float32Array(this.count);this.sizes=new Float32Array(this.count).fill(1);this.particleSeeds=new Float32Array(this.count);this.save();}
 save(){this.checkpoints.set(this.stepIndex,{positions:this.positions.slice(),velocities:this.velocities.slice(),ages:this.ages.slice(),lifetimes:this.lifetimes.slice(),sizes:this.sizes.slice(),particleSeeds:this.particleSeeds.slice(),credit:this.credit,serial:this.serial,cursor:this.cursor,alive:this.alive});const limit=Math.max(2,Math.min(61,Math.floor(64*1024**2/(this.count*40))));while(this.checkpoints.size>limit){const oldest=[...this.checkpoints.keys()].filter(step=>step!==0).sort((a,b)=>a-b)[0];this.checkpoints.delete(oldest);}}
 seek(time:number,maxSteps=Infinity){const target=Math.round(clampSceneTime(time)/STEP);if(target<this.stepIndex){let best=0;for(const step of this.checkpoints.keys())if(step<=target&&step>best)best=step;const s=this.checkpoints.get(best)!;this.positions.set(s.positions);this.velocities.set(s.velocities);this.ages.set(s.ages);this.lifetimes.set(s.lifetimes);this.sizes.set(s.sizes);this.particleSeeds.set(s.particleSeeds);this.credit=s.credit;this.serial=s.serial;this.cursor=s.cursor;this.alive=s.alive;this.stepIndex=best;}let steps=0;while(this.stepIndex<target&&steps++<maxSteps){const now=performance.now();this.step();this.stepIndex++;this.lastStepMs=performance.now()-now;if(this.stepIndex%30===0)this.save();}return target===this.stepIndex;}
 birth(time:number){
  // A full pool pauses emission; never recycle a particle before its lifetime ends.
  if(this.alive>=this.count)return;
  let index=this.cursor%this.count;while(this.ages[index]>=0)index=(index+1)%this.count;
  const p=this.params,source=this.config.source,tracks=this.config.tracks||[],seed=Number(p.seed),serial=this.serial++,k=index*3,r=(a:number)=>random(seed,serial*11+a),angle=r(0)*Math.PI*2;
  let x=0,y=0,z=0,nx=0,ny=1,nz=0;
  if(source?.points){
   const point=Math.min(source.points.length/3-1,Math.floor(r(1)*source.points.length/3)),a=point*3;
   [x,y,z]=Array.from(source.points.subarray(a,a+3));if(source.normals)[nx,ny,nz]=Array.from(source.normals.subarray(a,a+3));
   if(source.animations?.length){let lift=0,depth=0,rotation=0,scale=1;for(const animation of source.animations){const pose=glyphPose(source.glyphs?.[point]||0,time,animation);lift+=pose.y;depth+=pose.z;rotation+=pose.rotation;scale*=pose.scale;}if(scale<=.001)return;const origin=source.origins?.[point]||0,localX=(x-origin)*scale,localY=(y+Number(source.params.size)*.4)*scale;x=origin+localX*Math.cos(rotation)-localY*Math.sin(rotation);y=localX*Math.sin(rotation)+localY*Math.cos(rotation)+lift-Number(source.params.size)*.4;z=z*scale+depth;const normalX=nx;nx=normalX*Math.cos(rotation)-ny*Math.sin(rotation);ny=normalX*Math.sin(rotation)+ny*Math.cos(rotation);}
  }else if(source?.shape==='box'){
   const half=[Number(source.params.width)/2,Number(source.params.height)/2,Number(source.params.depth)/2],point=[(r(1)*2-1)*half[0],(r(2)*2-1)*half[1],(r(3)*2-1)*half[2]],face=Math.floor(r(4)*6),axis=Math.floor(face/2),normal=[0,0,0];normal[axis]=face%2?1:-1;point[axis]=half[axis]*normal[axis];[x,y,z]=point;[nx,ny,nz]=normal;
  }else{
   const radius=Number(source?.params.radius??p.radius),vertical=r(1)*2-1,radial=Math.sqrt(1-vertical*vertical);nx=Math.cos(angle)*radial;ny=vertical;nz=Math.sin(angle)*radial;x=nx*radius;y=ny*radius;z=nz*radius;
  }
  if(source){const value=(key:string)=>Number(animatedValue(tracks,source.nodeId,key,time,Number(source.params[key]??(key==='scale'?1:0)))),scale=value('scale');x=x*scale+value('x');y=y*scale+value('y');z=z*scale+value('z');}
  this.positions[k]=x+Number(p.x);this.positions[k+1]=y+Number(p.y);this.positions[k+2]=z+Number(p.z);
  let dx=0,dy=1,dz=0;
  if(p.direction==='down')dy=-1;else if(p.direction==='forward'){dy=0;dz=1;}else if(p.direction==='backward'){dy=0;dz=-1;}else if(p.direction==='outward'){dx=nx;dy=ny;dz=nz;}else if(p.direction==='custom'){const yaw=Number(p.azimuth)*Math.PI/180,pitch=Number(p.elevation)*Math.PI/180;dx=Math.sin(yaw)*Math.cos(pitch);dy=Math.sin(pitch);dz=Math.cos(yaw)*Math.cos(pitch);}
  const length=Math.hypot(dx,dy,dz)||1;dx/=length;dy/=length;dz/=length;
  // A stable tangent basis retains the original upward emitter's seeded motion.
  let tx=1,ty=0,tz=0;if(Math.abs(dx)>.00001){const inv=1/Math.hypot(dy,dz);if(Number.isFinite(inv)){tx=0;ty=dz*inv;tz=-dy*inv;}else{tx=0;ty=1;}}
  const bx=ty*dz-tz*dy,by=tz*dx-tx*dz,bz=tx*dy-ty*dx,spread=Number(p.spread),a=(r(5)-.5)*spread*2,b=(r(7)-.5)*spread*2,speed=Number(p.speed)*(1-Number(p.speedVariation)+r(6)*Number(p.speedVariation));
  this.velocities[k]=dx*speed+tx*a+bx*b;this.velocities[k+1]=dy*speed+ty*a+by*b;this.velocities[k+2]=dz*speed+tz*a+bz*b;
  this.lifetimes[index]=Math.max(.02,Number(p.lifetime)*(1-Number(p.lifetimeVariation)*r(100003)));this.sizes[index]=1-Number(p.sizeVariation)*r(200003);this.particleSeeds[index]=r(300003);this.ages[index]=0;this.cursor=(index+1)%this.count;this.alive++;return index;
 }
 emit(time:number){
  const p=this.params,t=time,start=Number(p.emitStart),startStep=Math.round(start/STEP);
  if(p.emissionMode==='burst'){if(this.stepIndex===startStep)for(let i=0;i<Number(p.burstCount);i++)this.birth(t);}
  else if(this.stepIndex>=startStep&&(!p.limitEmission||t<start+Number(p.emitDuration)-1e-8)){const rate=Number(animatedValue(this.config.tracks||[],this.config.origin?.nodeId||'','rate',t,Number(p.rate)));this.credit+=rate*STEP;const births=Math.floor(this.credit+1e-9);this.credit-=births;for(let i=0;i<births;i++)this.birth(t);}
 }
 step(){
  const p=this.params,t=this.stepIndex*STEP;this.emit(t);
  const dt=STEP/4,drag=Math.exp(-Number(p.drag)*dt),radius=Number(p.size)*.6,noise=Number(p.turbulence),detail=Number(p.noiseScale),seedPhase=Number(p.seed)*.01;
  for(let sub=0;sub<4;sub++){const colliders=resolveColliders({...this.config,origin:undefined},t+sub*dt);for(let i=0;i<this.count;i++){
   if(this.ages[i]<0)continue;const k=i*3,x=this.positions[k]*detail,y=this.positions[k+1]*detail,z=this.positions[k+2]*detail,phase=t*1.2+seedPhase;
   this.velocities[k]+=(Number(p.windX)+noise*(Math.sin(y+phase)-Math.cos(z-phase)))*dt;
   this.velocities[k+1]+=(Number(p.gravity)+Number(p.buoyancy)+Number(p.windY)+noise*(Math.sin(z+phase)-Math.cos(x-phase)))*dt;
   this.velocities[k+2]+=(Number(p.windZ)+noise*(Math.sin(x+phase)-Math.cos(y-phase)))*dt;
   for(let a=0;a<3;a++){this.velocities[k+a]*=drag;this.positions[k+a]+=this.velocities[k+a]*dt;}
   collideShapes(this.positions,k,radius*this.sizes[i],colliders,this.velocities,Number(p.bounce),Number(p.friction));
  }}
  for(let i=0;i<this.count;i++)if(this.ages[i]>=0){this.ages[i]+=STEP;if(this.ages[i]>=this.lifetimes[i]){this.ages[i]=-1;this.alive--;}}
 }
 frame():SimFrame{const speeds=new Float32Array(this.count);for(let i=0;i<this.count;i++)speeds[i]=Math.hypot(...this.velocities.subarray(i*3,i*3+3));return {time:this.stepIndex*STEP,positions:this.positions.slice(),velocities:this.velocities.slice(),speeds,ages:this.ages.slice(),lifetimes:this.lifetimes.slice(),sizes:this.sizes.slice(),particleSeeds:this.particleSeeds.slice(),stepMs:this.lastStepMs};}
}
