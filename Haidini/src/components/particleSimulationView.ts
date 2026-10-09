import type * as THREE from 'three';
import {CPU_PARTICLE_PREVIEW} from '../engine/particleLimits.ts';
import {SimulationClient} from '../engine/simulationClient.ts';
import {GpuParticleSimulation} from '../engine/gpuParticleSimulation.ts';
import type {SimulationConfig} from '../engine/collisions.ts';
import type {Params,SimulationItem} from '../engine/evaluator.ts';
import {createParticleMesh} from './particleMesh.ts';
import {createGpuParticleView} from './gpuParticleView.ts';
export function createParticleSimulationView(item:SimulationItem,wire:boolean,config:SimulationConfig,style:(time:number)=>Params,camera:THREE.Camera,renderer?:THREE.WebGLRenderer){
 let fallback='';if(renderer&&item.params.simulationBackend!=='CPU'){
  if(GpuParticleSimulation.supported(renderer)){try{return createGpuParticleView(item,wire,config,style,camera,renderer);}catch(error){fallback=error instanceof Error?error.message:String(error);}}
  else fallback='Floating-point GPU simulation is unavailable on this device.';
 }
 if(Number(item.params.count)>CPU_PARTICLE_PREVIEW)fallback+=(fallback?' ':'')+'CPU particle preview: reduce capacity for smoother playback.';
 const view=createParticleMesh(item,wire,style,camera),client=new SimulationClient('particle',item.params,view.setFrame,config);view.group.userData.gpuFallback=fallback;return {...view,client,dispose:()=>client.dispose()};
}
