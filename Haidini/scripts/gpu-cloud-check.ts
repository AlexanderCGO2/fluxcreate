import * as THREE from 'three';
import {createGpuCloudVolume} from '../src/components/gpuCloudVolume.ts';
import {ParticleSimulation,VOLUME_SIZE} from '../src/engine/simulation.ts';
import {defaults} from '../src/engine/catalog.ts';
const renderer=new THREE.WebGLRenderer();renderer.setSize(500,300);document.body.appendChild(renderer.domElement);
async function verify(){const comparisons=[];for(const [count,spread,time] of [[700,.7,0],[1800,1.35,2],[7200,2,10]]){
 const params={...defaults('cloud'),count,spread},cpu=new ParticleSimulation('cloud',params);cpu.seek(time);const frame=cpu.frame(),gpu=createGpuCloudVolume(renderer,count,params);if(!gpu)throw Error('GPU cloud volume unavailable on test hardware');
 try{const target=renderer.getRenderTarget();gpu.update(frame.positions);if(renderer.getRenderTarget()!==target)throw Error('Density rendering did not restore viewport target');const data=new Uint8Array(384*288*4);renderer.readRenderTargetPixels(gpu.target,0,0,384,288,data);let maxError=0,different=0;
 for(let z=0;z<VOLUME_SIZE;z++)for(let y=0;y<VOLUME_SIZE;y++)for(let x=0;x<VOLUME_SIZE;x++){const expected=frame.volume![x+y*48+z*48*48],actual=data[((z%8)*48+x+(Math.floor(z/8)*48+y)*384)*4];const error=Math.abs(expected-actual);maxError=Math.max(maxError,error);if(error)different++;}if(maxError>2)throw Error('GPU cloud density diverged: '+maxError);comparisons.push({count,spread,time,maxError,differentVoxels:different});
 const workerMode=new ParticleSimulation('cloud',params,{gpuCloudVolume:true});workerMode.seek(time);const withoutVolume=workerMode.frame();if(withoutVolume.volume||!withoutVolume.positions.every((v,i)=>v===frame.positions[i]))throw Error('GPU volume mode changed parcel physics or built a CPU volume');
 }finally{gpu.dispose();}
 }return {checks:['GPU density matches the CPU reference within two intensity levels at up to 7,200 cloud parcels','GPU density mode skips CPU volume building without changing parcel physics','Offscreen cloud passes restore the viewport render target'],comparisons};}
Object.assign(window,{gpuParticleCheck:{verify}});
