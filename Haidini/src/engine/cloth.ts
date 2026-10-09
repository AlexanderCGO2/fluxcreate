import { clampSceneTime } from './timing.ts';
import { collideShapes, resolveColliders, type SimulationConfig } from './collisions.ts';
import type { Params } from './evaluator.ts';
import { STEP, type SimFrame } from './simulation.ts';
type Snapshot={positions:Float32Array;previous:Float32Array};
// Verlet integration with position constraints, fixed 60 Hz steps and seek checkpoints.
export class ClothSimulation {
  positions:Float32Array;previous:Float32Array;initial:Float32Array;count:number;stepIndex=0;lastStepMs=0;
  checkpoints=new Map<number,Snapshot>();constraints:{a:number;b:number;length:number;bend:boolean}[]=[];pinned:Set<number>;params:Params;config:SimulationConfig;
  constructor(params:Params,config:SimulationConfig={}){
    this.config=config;
    this.params={...params};const n=Number(params.resolution),w=Number(params.width),h=Number(params.height);this.count=(n+1)**2;this.positions=new Float32Array(this.count*3);this.pinned=new Set();
    for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){const i=row*(n+1)+col,k=i*3;this.positions[k]=(col/n-.5)*w;this.positions[k+1]=params.setup==='drape'?3:4-row/n*h;this.positions[k+2]=params.setup==='drape'?(row/n-.5)*h:0;if(params.setup==='flag'&&col===0||params.setup==='curtain'&&row===0)this.pinned.add(i);}
    this.initial=this.positions.slice();this.previous=this.positions.slice();
    const link=(a:number,b:number,bend=false)=>{const k=a*3,l=b*3;this.constraints.push({a,b,length:Math.hypot(this.positions[k]-this.positions[l],this.positions[k+1]-this.positions[l+1],this.positions[k+2]-this.positions[l+2]),bend});};
    for(let r=0;r<=n;r++)for(let c=0;c<=n;c++){const a=r*(n+1)+c;if(c<n)link(a,a+1);if(r<n)link(a,a+n+1);if(c<n&&r<n){link(a,a+n+2);link(a+1,a+n+1);}if(c<n-1)link(a,a+2,true);if(r<n-1)link(a,a+2*(n+1),true);}
    this.save();
  }
  save(){this.checkpoints.set(this.stepIndex,{positions:this.positions.slice(),previous:this.previous.slice()});const limit=Math.max(2,Math.min(121,Math.floor(32*1024**2/(this.count*24))));while(this.checkpoints.size>limit){const oldest=Math.min(...[...this.checkpoints.keys()].filter(k=>k!==0));this.checkpoints.delete(oldest);}}
  seek(time:number,maxSteps=Infinity){
    const target=Math.round(clampSceneTime(time)/STEP);if(target<this.stepIndex){let best=0;for(const k of this.checkpoints.keys())if(k<=target&&k>best)best=k;const snap=this.checkpoints.get(best)!;this.positions.set(snap.positions);this.previous.set(snap.previous);this.stepIndex=best;}
    let steps=0;while(this.stepIndex<target&&steps++<maxSteps){const now=performance.now();this.step();this.stepIndex++;this.lastStepMs=performance.now()-now;if(this.stepIndex%30===0)this.save();}return target===this.stepIndex;
  }
  step(){
    const p=this.positions,old=this.previous,t=this.stepIndex*STEP,damping=1-Number(this.params.damping),wind=Number(this.params.wind),gravity=Number(this.params.gravity);
    for(let i=0;i<this.count;i++){if(this.pinned.has(i))continue;const k=i*3;for(let a=0;a<3;a++){const x=p[k+a],acceleration=a===1?-gravity:a===2?wind*(1.5+Math.sin(t*2+p[k]*.7+p[k+1]*.4)):wind*.25*Math.sin(t);p[k+a]=x+(x-old[k+a])*damping+acceleration*STEP*STEP;old[k+a]=x;}}
    const colliders=resolveColliders(this.config,t),stiffness=Number(this.params.stiffness),radius=Number(this.params.obstacle)+.035;
    for(let iteration=0;iteration<8;iteration++){
      for(const c of this.constraints){const k=c.a*3,l=c.b*3,dx=p[l]-p[k],dy=p[l+1]-p[k+1],dz=p[l+2]-p[k+2],length=Math.hypot(dx,dy,dz)||1,wa=this.pinned.has(c.a)?0:1,wb=this.pinned.has(c.b)?0:1;if(!wa&&!wb)continue;const correction=(length-c.length)/length*stiffness*(c.bend?.25:1)/(wa+wb);for(let axis=0;axis<3;axis++){const delta=[dx,dy,dz][axis]*correction;p[k+axis]+=delta*wa;p[l+axis]-=delta*wb;}}
      for(let i=0;i<this.count;i++){const k=i*3;if(this.pinned.has(i)){p.set(this.initial.subarray(k,k+3),k);continue;}collideShapes(p,k,.035,colliders);p[k+1]=Math.max(-2,p[k+1]);if(Number(this.params.obstacle)>0){const x=p[k],y=p[k+1]+.3,z=p[k+2],d=Math.hypot(x,y,z);if(d<radius){if(d<1e-6){p[k+1]=radius-.3;}else{p[k]=x*radius/d;p[k+1]=y*radius/d-.3;p[k+2]=z*radius/d;}}}}
    }
  }
  frame():SimFrame{const speeds=new Float32Array(this.count);for(let i=0;i<this.count;i++){const k=i*3;speeds[i]=Math.hypot(this.positions[k]-this.previous[k],this.positions[k+1]-this.previous[k+1],this.positions[k+2]-this.previous[k+2])/STEP;}return {time:this.stepIndex*STEP,positions:this.positions.slice(),speeds,stepMs:this.lastStepMs};}
}
