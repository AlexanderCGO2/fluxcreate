import { clampSceneTime } from './timing.ts';
import type { SimulationConfig } from './collisions.ts';
import type { Params } from './evaluator.ts';
import type { SimFrame, SimulationKind } from './simulation.ts';
export class SimulationClient {
  readonly backend='CPU' as const;
  worker:Worker; time=-1; error=''; stepMs=0; requested=-1; disposed=false;
  private waiters:{time:number;resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}[]=[];
  constructor(kind:SimulationKind,params:Params,onFrame:(frame:SimFrame)=>void,config:SimulationConfig={}){
    this.worker=new Worker(new URL('./engine/simulation.worker.js',window.location.href),{type:'module'});
    this.worker.onmessage=e=>{if(e.data.error){this.fail(e.data.error);return;}const f=e.data.frame as SimFrame;this.time=f.time;this.stepMs=f.stepMs;onFrame(f);this.waiters=this.waiters.filter(w=>{if(Math.abs(w.time-f.time)<1/120){clearTimeout(w.timer);w.resolve();return false;}return true;});};
    this.worker.onerror=()=>this.fail('Simulation worker could not start. Reload the workbench.');
    this.worker.postMessage({kind,params,config,time:0});
  }
  private fail(message:string){this.error=message;for(const w of this.waiters){clearTimeout(w.timer);w.reject(new Error(message));}this.waiters=[];}
  request(time:number){const t=Math.round(clampSceneTime(time)*60)/60;if(this.disposed||this.error||t===this.requested)return;this.requested=t;this.worker.postMessage({time:t});}
  async ready(time:number){if(this.disposed)throw new Error('Scene changed during simulation.');if(this.error)throw new Error(this.error);const t=Math.round(time*60)/60;this.request(t);if(Math.abs(t-this.time)<1/120)return;await new Promise<void>((resolve,reject)=>{const waiter={time:t,resolve,reject,timer:setTimeout(()=>{this.waiters=this.waiters.filter(w=>w!==waiter);reject(new Error('Simulation is still calculating. Try a shorter timeline or fewer particles.'));},60000)};this.waiters.push(waiter);});}
  dispose(){this.disposed=true;this.worker.terminate();this.fail('Scene changed during simulation.');}
}
