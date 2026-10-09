import { clampSceneTime } from './timing.ts';
import { collideShapes, resolveColliders, type SimulationConfig, type Collider } from './collisions.ts';
import type { Params } from './evaluator.ts';
import { random } from './geometry.ts';

export type SimulationKind = 'water' | 'cloud' | 'cloth' | 'particle';
export const STEP = 1 / 60;
export const VOLUME_SIZE = 48;
export type SimFrame = { time:number; positions:Float32Array; speeds:Float32Array; volume?:Uint8Array; ages?:Float32Array; lifetimes?:Float32Array; sizes?:Float32Array; particleSeeds?:Float32Array; velocities?:Float32Array; stepMs:number };
type Snapshot = { positions:Float32Array; velocities:Float32Array };
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

// Fixed steps and half-second checkpoints make seeks independent of playback history.
export class ParticleSimulation {
  config:SimulationConfig;colliders:Collider[]=[];
  kind:SimulationKind; params:Params; count:number; positions:Float32Array; velocities:Float32Array;
  stepIndex=0; checkpoints=new Map<number,Snapshot>(); lastStepMs=0;
  private predicted:Float32Array; private delta:Float32Array;
  private lambda:Float32Array; private neighbors:Int32Array; private neighborCount:Uint16Array;
  private head=new Int32Array(64**3); private next:Int32Array; spacing:number; support:number;
  constructor(kind:SimulationKind,params:Params,config:SimulationConfig={}){
    this.config=config;
    this.kind=kind;this.params={...params};this.count=Number(params.count);
    this.positions=new Float32Array(this.count*3);this.velocities=new Float32Array(this.count*3);
    this.predicted=new Float32Array(this.count*3);this.delta=new Float32Array(this.count*3);
    this.lambda=new Float32Array(this.count);this.neighbors=new Int32Array(this.count*128);this.neighborCount=new Uint16Array(this.count);this.next=new Int32Array(this.count);
    this.spacing=Math.cbrt(27/this.count);this.support=this.spacing*2;
    this.initialize();this.save();
  }
  private initialize(){
    const p=this.positions,v=this.velocities,seed=Number(this.params.seed);
    if(this.kind==='water'){
      const s=this.spacing;
      if(this.params.setup==='falling drop'){
        // Fill a sphere at rest spacing; compressing the lattice injects pressure and causes an explosion.
        const radius=Math.ceil(Math.cbrt(this.count*3/(4*Math.PI)))+2,candidates:{x:number;y:number;z:number;r2:number;tie:number}[]=[];
        for(let z=-radius;z<=radius;z++)for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++)candidates.push({x,y,z,r2:x*x+y*y+z*z,tie:random(seed,candidates.length)});
        candidates.sort((a,b)=>a.r2-b.r2||a.tie-b.tie);
        for(let i=0;i<this.count;i++){const k=i*3,c=candidates[i];p[k]=c.x*s;p[k+1]=2.2+c.y*s;p[k+2]=c.z*s;v[k]=Number(this.params.impulse);}
      }else{
        const nx=Math.ceil(Math.cbrt(this.count)),nz=nx;
        for(let i=0;i<this.count;i++){const k=i*3,x=i%nx,z=Math.floor(i/nx)%nz,y=Math.floor(i/(nx*nz));p[k]=-3.65+x*s+(random(seed,i*3)-.5)*s*.025;p[k+1]=-1.72+y*s;p[k+2]=(z-(nz-1)/2)*s;v[k]=Number(this.params.impulse);v[k+2]=(random(seed,i*3+1)-.5)*.03;}
      }
    }else{
      for(let i=0;i<this.count;i++){
        const k=i*3,a=random(seed,i*6)*Math.PI*2,r=Math.cbrt(random(seed,i*6+1)),lobe=i%9;
        p[k]=(lobe-4)*1.05+Math.cos(a)*r*1.35;p[k+1]=.6+random(seed,i*6+2)*1.5+Math.sin(lobe*1.8)*.8;p[k+2]=Math.sin(a)*r*1.25+Math.sin(lobe*2.5)*.65;
        v[k]=(random(seed,i*6+3)-.5)*.2;v[k+1]=.1+random(seed,i*6+4)*.2;v[k+2]=0;
      }
    }
  }
  private save(){this.checkpoints.set(this.stepIndex,{positions:this.positions.slice(),velocities:this.velocities.slice()});const limit=Math.max(2,Math.min(121,Math.floor(64*1024**2/(this.count*24))));while(this.checkpoints.size>limit){const oldest=Math.min(...[...this.checkpoints.keys()].filter(k=>k!==0));this.checkpoints.delete(oldest);}}
  seek(time:number,maxSteps=Infinity){
    const target=Math.round(clampSceneTime(time)/STEP);
    if(target<this.stepIndex||Math.floor(target/30)*30>this.stepIndex&&this.checkpoints.has(Math.floor(target/30)*30)){const key=Math.floor(target/30)*30;let best=0;for(const k of this.checkpoints.keys())if(k<=key&&k>best)best=k;const s=this.checkpoints.get(best)!;this.positions.set(s.positions);this.velocities.set(s.velocities);this.stepIndex=best;}
    let steps=0;while(this.stepIndex<target&&steps++<maxSteps){const start=performance.now();if(this.kind==='water')this.waterStep();else this.cloudStep();this.stepIndex++;this.lastStepMs=performance.now()-start;if(this.stepIndex%30===0)this.save();}
    return this.stepIndex===target;
  }
  private collide(p:Float32Array,k:number){
    const radius=this.spacing*.28;collideShapes(p,k,radius,this.colliders);p[k]=clamp(p[k],-4.2+radius,4.2-radius);p[k+1]=clamp(p[k+1],-2+radius,4.5-radius);p[k+2]=clamp(p[k+2],-2.65+radius,2.65-radius);
    const r=Number(this.params.obstacle)+radius;if(r>radius+.01){const x=p[k]-.8,y=p[k+1]+1.15,z=p[k+2],d=Math.hypot(x,y,z);if(d<r){const scale=r/Math.max(d,.0001);p[k]=.8+x*scale;p[k+1]=-1.15+y*scale;p[k+2]=z*scale;}}
  }
  private waterStep(){
    this.colliders=resolveColliders(this.config,this.stepIndex*STEP);
    const p=this.positions,v=this.velocities,q=this.predicted,h=this.support,h2=h*h,n=this.count;
    const rho0=1/this.spacing**3,poly=315/(64*Math.PI*h**3),grad=-45/(Math.PI*h**4)/rho0;
    for(let i=0;i<n;i++){const k=i*3;v[k+1]-=Number(this.params.gravity)*STEP;for(let a=0;a<3;a++)q[k+a]=p[k+a]+v[k+a]*STEP;this.collide(q,k);}
    this.head.fill(-1);
    const cell=(x:number,y:number,z:number)=>(x+24)+(y+24)*64+(z+24)*4096;
    for(let i=0;i<n;i++){const k=i*3,c=cell(Math.floor(q[k]/h),Math.floor(q[k+1]/h),Math.floor(q[k+2]/h));this.next[i]=this.head[c];this.head[c]=i;}
    for(let i=0;i<n;i++){const k=i*3,cx=Math.floor(q[k]/h),cy=Math.floor(q[k+1]/h),cz=Math.floor(q[k+2]/h);let count=0;
      for(let z=-1;z<=1;z++)for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){let j=this.head[cell(cx+x,cy+y,cz+z)];while(j!==-1){const l=j*3,dx=q[k]-q[l],dy=q[k+1]-q[l+1],dz=q[k+2]-q[l+2];if(j!==i&&dx*dx+dy*dy+dz*dz<h2&&count<128)this.neighbors[i*128+count++]=j;j=this.next[j];}}
      this.neighborCount[i]=count;
    }
    // PBF density constraints (Macklin & Müller), with Poly6 density and Spiky gradients.
    for(let iteration=0;iteration<3;iteration++){
      for(let i=0;i<n;i++){const k=i*3;let density=poly,gx=0,gy=0,gz=0,sum=0;
        for(let a=0;a<this.neighborCount[i];a++){const j=this.neighbors[i*128+a],l=j*3,dx=q[k]-q[l],dy=q[k+1]-q[l+1],dz=q[k+2]-q[l+2],r2=dx*dx+dy*dy+dz*dz;if(r2>=h2||r2<1e-10)continue;
          const r=Math.sqrt(r2),w=1-r2/h2,g=grad*(1-r/h)**2/r;density+=poly*w*w*w;gx+=dx*g;gy+=dy*g;gz+=dz*g;sum+=r2*g*g;
        }
        this.lambda[i]=-Math.max(0,density/rho0-1)/(sum+gx*gx+gy*gy+gz*gz+.12);
      }
      for(let i=0;i<n;i++){const k=i*3;let x=0,y=0,z=0;
        for(let a=0;a<this.neighborCount[i];a++){const j=this.neighbors[i*128+a],l=j*3,dx=q[k]-q[l],dy=q[k+1]-q[l+1],dz=q[k+2]-q[l+2],r2=dx*dx+dy*dy+dz*dz;if(r2>=h2||r2<1e-10)continue;
          const r=Math.sqrt(r2),kernel=1-r2/h2,w=kernel*kernel*kernel/(.91**3),w2=w*w,pressure=-.0004*w2*w2;
          const falloff=1-r/h,g=(this.lambda[i]+this.lambda[j]+pressure)*grad*falloff*falloff/r;x+=dx*g;y+=dy*g;z+=dz*g;
        }
        const limit=Math.min(1,h*.2/(Math.sqrt(x*x+y*y+z*z)||1));this.delta[k]=x*limit;this.delta[k+1]=y*limit;this.delta[k+2]=z*limit;
      }
      for(let k=0;k<n*3;k+=3){q[k]+=this.delta[k];q[k+1]+=this.delta[k+1];q[k+2]+=this.delta[k+2];this.collide(q,k);}
    }
    for(let k=0;k<n*3;k++)v[k]=clamp((q[k]-p[k])/STEP,-16,16);
    this.delta.set(v);
    const viscosity=Number(this.params.viscosity)*.16;
    for(let i=0;i<n;i++){const k=i*3;let x=0,y=0,z=0,weight=0;
      for(let a=0;a<this.neighborCount[i];a++){const l=this.neighbors[i*128+a]*3,r2=(q[k]-q[l])**2+(q[k+1]-q[l+1])**2+(q[k+2]-q[l+2])**2,kernel=Math.max(0,1-r2/h2),w=kernel*kernel*kernel;x+=(this.delta[l]-this.delta[k])*w;y+=(this.delta[l+1]-this.delta[k+1])*w;z+=(this.delta[l+2]-this.delta[k+2])*w;weight+=w;}
      const scale=viscosity/Math.max(1,weight);v[k]=(v[k]+x*scale)*.999;v[k+1]=(v[k+1]+y*scale)*.999;v[k+2]=(v[k+2]+z*scale)*.999;
    }
    p.set(q);
  }
  private cloudStep(){
    const p=this.positions,v=this.velocities,t=this.stepIndex*STEP,wind=Number(this.params.wind),turb=Number(this.params.turbulence),lift=Number(this.params.buoyancy);
    for(let i=0;i<this.count;i++){const k=i*3,x=p[k]*.7,y=p[k+1]*.7,z=p[k+2]*.7;
      // Curl of a smooth vector potential: a divergence-free turbulent velocity field.
      const cx=Math.cos(y+t*.31)-Math.sin(z-t*.23),cy=Math.cos(z+t*.27)-Math.sin(x+t*.19),cz=Math.cos(x-t*.21)-Math.sin(y+t*.17);
      const cooling=Math.exp(-Math.max(0,p[k+1])*.22),drag=.7;
      v[k]+=(wind+cx*turb-v[k]*drag)*STEP;v[k+1]+=(lift*cooling+cy*turb*.55-v[k+1]*drag-.06*Math.max(0,p[k+1]-2))*STEP;v[k+2]+=(cz*turb*.65-v[k+2]*drag-p[k+2]*.08)*STEP;
      for(let a=0;a<3;a++)p[k+a]+=v[k+a]*STEP;
      // A periodic wind tunnel recycles parcels outside the visible density boundary.
      if(p[k]>8.5)p[k]-=17;if(p[k]<-8.5)p[k]+=17;
      if(p[k+1]>7){p[k+1]=-.7;v[k+1]=.05;}if(p[k+1]<-1.5){p[k+1]=-1.5;v[k+1]=Math.abs(v[k+1])*.2;}
      if(Math.abs(p[k+2])>4.5){p[k+2]=Math.sign(p[k+2])*4.5;v[k+2]*=-.3;}
    }
  }
  frame():SimFrame{
    const speeds=new Float32Array(this.count);for(let i=0;i<this.count;i++)speeds[i]=Math.hypot(this.velocities[i*3],this.velocities[i*3+1],this.velocities[i*3+2]);
    return {time:this.stepIndex*STEP,positions:this.positions.slice(),speeds,stepMs:this.lastStepMs,...(this.kind==='cloud'&&!this.config.gpuCloudVolume?{volume:this.cloudVolume()}: {})};
  }
  private cloudVolume(){
    const size=VOLUME_SIZE,field=new Float32Array(size**3),p=this.positions,radius=Number(this.params.spread),seed=Number(this.params.seed);
    for(let i=0;i<this.count;i++){const k=i*3,cx=(p[k]/18+.5)*(size-1),cy=((p[k+1]-2.5)/10+.5)*(size-1),cz=(p[k+2]/10+.5)*(size-1),r=radius*(.75+random(seed,i+7000)*.5),rx=r/18*(size-1),ry=r/10*(size-1);
      const fade=clamp((8.5-Math.abs(p[k]))/1.4,0,1)*clamp((7-p[k+1])/1.3,0,1)*clamp((p[k+1]+1.5)/1.2,0,1);
      for(let z=Math.max(0,Math.floor(cz-ry));z<=Math.min(size-1,Math.ceil(cz+ry));z++)for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(size-1,Math.ceil(cy+ry));y++)for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(size-1,Math.ceil(cx+rx));x++){
        const d=((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/ry)**2;if(d<1){const w=1-d;field[x+y*size+z*size*size]+=w*w*w*fade;}
      }
    }
    const volume=new Uint8Array(field.length),density=Number(this.params.density)*220/this.count;
    for(let i=0;i<field.length;i++)volume[i]=Math.round(255*(1-Math.exp(-field[i]*density)));return volume;
  }
}
