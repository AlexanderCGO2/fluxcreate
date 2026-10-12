import * as THREE from 'three';
import {createPaintView,materializePaintExport} from '../src/components/paintView.ts';
import {PaintSimulation} from '../src/engine/paintSimulation.ts';
import type {Params} from '../src/engine/evaluator.ts';
import {defaults} from '../src/engine/catalog.ts';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1024,900);renderer.setClearColor('#171f23');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1024/900,.1,100);camera.position.set(0,23,.001);camera.lookAt(0,0,0);scene.add(new THREE.HemisphereLight(0xffffff,0x555555,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-4,10,4);scene.add(light);
type PaintSnapshot=ReturnType<PaintSimulation['snapshot']>;
let view:ReturnType<typeof createPaintView>&{client:PaintSimulation};let params:Params;function setup(overrides:Params={}){if(view){scene.remove(view.group);view.dispose();view.group.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.Line){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});}params={...defaults('paint'),...overrides};const next=createPaintView({kind:'simulation',nodeId:'paint',simulation:'paint',params},renderer,()=>params);if(!(next.client instanceof PaintSimulation))throw Error(next.client.error||'Paint simulation unavailable');view={...next,client:next.client};scene.add(view.group);}
setup(new URLSearchParams(location.search).has('liquid')?{waveMachine:true,wavePattern:'parallel',waveHeight:.32,waveFrequency:.3,surfaceFinish:'paint',fillBasin:true,showInlets:false,colorA:'#fa340c',colorB:'#064baf',colorC:'#d2e2da',viscosity:.2,swirl:.45,drift:0,flow:.15}:new URLSearchParams(location.search).has('sculpture')?{waveMachine:true,wavePattern:'crossing',waveHeight:.28,waveFrequency:.35,surfaceFinish:'sculptural',fillBasin:true,showInlets:false,foldDepth:2.8,grainAmount:.7,colorA:'#fa340c',colorB:'#064baf',colorC:'#d2e2da',viscosity:.55,swirl:.35,drift:0,flow:.3}:new URLSearchParams(location.search).has('waves')?{waveMachine:true,surfaceFinish:'water',viscosity:.18,swirl:.12,drift:0}:{});function draw(){renderer.render(scene,camera);}function metrics(s:PaintSnapshot){let amount=0,speed=0,invalid=0,height=0,waveEnergy=0;for(let i=0;i<s.pigment.length;i+=4){amount+=s.pigment[i]+s.pigment[i+1]+s.pigment[i+2];speed+=Math.hypot(s.velocity[i],s.velocity[i+1]);height=Math.max(height,Math.abs(s.waves[i]-s.depth));waveEnergy+=(s.waves[i]-s.depth)**2;if(!Number.isFinite(s.waves[i])||!Number.isFinite(s.pigment[i])||!Number.isFinite(s.velocity[i]))invalid++;}return {amount,speed,invalid,height,waveEnergy,time:s.time};}
const paintCheck={async frame(t:number){await view.client.ready(t);view.update(t);draw();return metrics(view.client.snapshot());},setup,async rewind(){await view.client.ready(7);const reference=view.client.snapshot();await view.client.ready(10);await view.client.ready(3);await view.client.ready(7);const s=view.client.snapshot();return {pigment:s.pigment.every((v,i)=>v===reference.pigment[i]),velocity:s.velocity.every((v,i)=>v===reference.velocity[i]),pigmentError:s.pigment.reduce((m,v,i)=>Math.max(m,Math.abs(v-reference.pigment[i])),0),surfaceError:s.surface.reduce((m,v,i)=>Math.max(m,Math.abs(v-reference.surface[i])),0),waveError:s.waves.reduce((m,v,i)=>Math.max(m,Math.abs(v-reference.waves[i])),0),velocityError:s.velocity.reduce((m,v,i)=>Math.max(m,Math.abs(v-reference.velocity[i])),0)};},async glb(){const copy=view.group.clone(true),cleanup=materializePaintExport(copy);try{const data=await new GLTFExporter().parseAsync(copy,{binary:true});if(!(data instanceof ArrayBuffer))throw Error('Expected binary GLB output');return data.byteLength;}finally{cleanup();}},angle(){camera.position.set(14,14,18);camera.lookAt(0,0,0);draw();},arrows(){params.showFlow=true;view.update(view.client.time);draw();},async performance(){let frames=0,lag=0;const start=performance.now(),initial=view.client.time;await new Promise<void>(resolve=>{function tick(){const elapsed=(performance.now()-start)/1000;view.client.request(initial+elapsed);view.update(initial+elapsed);draw();frames++;lag=Math.max(lag,initial+elapsed-view.client.time);if(elapsed<3)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});return {fps:frames/((performance.now()-start)/1000),lag};}};

async function verifyLiquid(){
 const assert=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);};
 const base={waveMachine:true,surfaceFinish:'paint',fillBasin:true,flow:0,swirl:0,drift:0,viscosity:.25,liquidDepth:.8,forceDuration:4};
 function stats(s:PaintSnapshot){
  let volume=0,energy=0,min=Infinity,max=-Infinity,surfaceError=0;
  const depth=Number(params.liquidDepth),area=(12/s.resolution)**2;
  for(let i=0;i<s.waves.length;i+=4){const h=s.waves[i],eta=h-s.depth,u=s.waves[i+1]/Math.max(h,.00001),v=s.waves[i+2]/Math.max(h,.00001);
   assert(Number.isFinite(h+u+v)&&h>=0,'Invalid or negative liquid depth: '+h);
   volume+=h*area;energy+=(.5*9.81*eta*eta+.5*h*(u*u+v*v))*area;
   min=Math.min(min,eta);max=Math.max(max,eta);
   surfaceError=Math.max(surfaceError,Math.abs(s.surface[i]-eta),Math.abs(s.surface[i+1]),Math.abs(s.surface[i+2]));
  }
  return {volume,relativeVolumeError:Math.abs(volume-depth*144)/(depth*144),energy,min,max,surfaceError};
 }
 setup({...base,waveHeight:0});await view.client.ready(4);const quiet=view.client.snapshot();const rest=stats(quiet);assert(rest.energy===0,'Resting liquid moved without a force');
 setup({...base,waveHeight:.3});await view.client.ready(4);const moving=view.client.snapshot();const driven=stats(moving);
 let pigmentDifference=0;for(let i=0;i<moving.pigment.length;i+=4)pigmentDifference+=Math.abs(moving.pigment[i]-quiet.pigment[i]);
 assert(driven.max>.02&&pigmentDifference>30,'Wave forcing did not move liquid and pigments');
 await view.client.ready(12);const coasting=stats(view.client.snapshot());
 await view.client.ready(24);const settled=stats(view.client.snapshot());
 assert(settled.energy<driven.energy*.04,'Liquid fails to dissipate energy after forces stop');
 assert(settled.max-settled.min<(driven.max-driven.min)*.25,'Liquid does not return toward level');
 for(const [key,value] of Object.entries({rest,driven,coasting,settled})){assert(value.relativeVolumeError<.0001,'Closed basin lost water: '+key);assert(value.surfaceError<1.e-6,'Surface has displacement outside the liquid state');}
 const viscosity=[];
 for(const value of [0,1]){setup({...base,viscosity:value});await view.client.ready(10);viscosity.push(stats(view.client.snapshot()).energy);}assert(viscosity[1]<viscosity[0]*.5,'Higher viscosity does not damp motion');
 const arrivals=[];
 for(const depth of [.3,1.4]){setup({...base,liquidDepth:depth,viscosity:0,waveDamping:.04,forceDuration:0});await view.client.ready(2);const s=view.client.snapshot();let energy=0;for(let y=0;y<s.resolution/2;y++)for(let x=0;x<s.resolution;x++)energy+=(s.waves[(y*s.resolution+x)*4]-s.depth)**2;arrivals.push(energy);}assert(arrivals[1]>arrivals[0]+.001,'Deeper liquid does not propagate waves faster');
 const reflected=[];for(const waveDirection of ['far wall','near wall']){setup({...base,waveDirection,forceDuration:0});await view.client.ready(5);reflected.push(view.client.snapshot());}
 let symmetryError=0;const n=reflected[0].resolution;for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=(y*n+x)*4,b=((n-1-y)*n+x)*4;symmetryError=Math.max(symmetryError,Math.abs(reflected[0].waves[a]-reflected[1].waves[b]),Math.abs(reflected[0].waves[a+2]+reflected[1].waves[b+2]));}assert(symmetryError<.0001,'Opposing walls violate reflection symmetry');
 const extremes:{direction:string;depth:number;volume:number;relativeVolumeError:number;energy:number;min:number;max:number;surfaceError:number}[]=[];
 for(const [direction,depth] of [['far wall',.15],['left wall',1.6],['near wall',.15],['right wall',1.6]] as const){
  setup({...base,waveDirection:direction,liquidDepth:depth,waveHeight:.4,waveFrequency:1.5,viscosity:1,flow:3,swirl:4,drift:3,forceDuration:0,detail:'fine'});await view.client.ready(4);
  const value=stats(view.client.snapshot());assert(value.relativeVolumeError<.0001,'Extreme settings lost volume');extremes.push({direction,depth,...value});
 }
 setup({...base,liquidDepth:.15,waveHeight:.4,waveFrequency:1.5,viscosity:0,waveDamping:.04,flow:3,swirl:4,drift:3,forceDuration:0,detail:'fine'});await view.client.ready(20);const longExtreme=stats(view.client.snapshot());assert(longExtreme.relativeVolumeError<.0001,'Long high-force run lost water');
 setup({...base,waveMachine:false,flow:.3,swirl:.8,forceDuration:0});await view.client.ready(5);const stirred=stats(view.client.snapshot());assert(stirred.energy>0,'Stirring has no effect without the wave machine');
 return {rest,driven,coasting,settled,pigmentDifference,viscosity,depthArrival:arrivals,symmetryError,extremes,longExtreme,stirred};
}
Object.assign(paintCheck,{verifyLiquid,verifyWaves:verifyLiquid});

let paletteReference:Uint8Array|undefined;
Object.assign(paintCheck,{paletteStats(){const s=view.client.snapshot(),count=Number(params.colorCount||3),occupancy=Array(count).fill(0),labels=new Uint8Array(s.resolution**2);let invalid=0,volume=0,total=0;for(let cell=0;cell<labels.length;cell++){let winner=0,maximum=-1;for(let color=0;color<count;color++){const value=s.pigments[Math.floor(color/4)][cell*4+color%4];if(!Number.isFinite(value)||value<-.00001)invalid++;total+=value;if(value>maximum){maximum=value;winner=color;}}occupancy[winner]++;labels[cell]=winner;volume+=s.waves[cell*4]*(12/s.resolution)**2;}let changed=0;if(paletteReference)for(let i=0;i<labels.length;i++)if(labels[i]!==paletteReference[i])changed++;paletteReference=labels;return {time:s.time,occupancy,invalid,volume,total,changedFraction:changed/labels.length,channels:s.pigments.length*4};},async paletteRewind(){await view.client.ready(12);const reference=view.client.snapshot();await view.client.ready(22);await view.client.ready(5);await view.client.ready(12);const s=view.client.snapshot();return Math.max(...s.pigments.map((p,index)=>p.reduce((m,v,i)=>Math.max(m,Math.abs(v-reference.pigments[index][i])),0)));}});

Object.assign(window,{paintCheck});
