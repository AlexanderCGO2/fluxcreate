import { ParticleSimulation } from './simulation.ts';
import { ParticleDynamics } from './particleDynamics.ts';
import { ClothSimulation } from './cloth.ts';
let sim:ParticleSimulation|ClothSimulation|ParticleDynamics|null=null,target=0,scheduled=false,previous=-1;
const scope=self as unknown as {onmessage:((e:MessageEvent)=>void)|null;postMessage:(data:unknown,transfer:Transferable[])=>void};
function pump(){
  scheduled=false;if(!sim)return;
  try{const done=sim.seek(target,4);if(done||sim.stepIndex-previous>=2){const frame=sim.frame();previous=sim.stepIndex;const transfer:Transferable[]=[frame.positions.buffer,frame.speeds.buffer];if(frame.volume)transfer.push(frame.volume.buffer);if(frame.ages)transfer.push(frame.ages.buffer);if(frame.lifetimes)transfer.push(frame.lifetimes.buffer);if(frame.sizes)transfer.push(frame.sizes.buffer);if(frame.particleSeeds)transfer.push(frame.particleSeeds.buffer);if(frame.velocities)transfer.push(frame.velocities.buffer);scope.postMessage({frame},transfer);}
    if(!done){scheduled=true;setTimeout(pump,0);}
  }catch(error){scope.postMessage({error:error instanceof Error?error.message:'Simulation failed.'},[]);}
}
scope.onmessage=e=>{try{if(e.data.kind){sim=e.data.kind==='particle'?new ParticleDynamics(e.data.params,e.data.config):e.data.kind==='cloth'?new ClothSimulation(e.data.params,e.data.config):new ParticleSimulation(e.data.kind,e.data.params,e.data.config);previous=-1;}target=e.data.time??target;if(!scheduled){scheduled=true;setTimeout(pump,0);}}catch(error){scope.postMessage({error:String(error)},[]);}};
