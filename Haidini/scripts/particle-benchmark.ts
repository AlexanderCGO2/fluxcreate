import * as THREE from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import fontData from '../src/assets/helvetiker_bold.typeface.json';
import {createSimulationView} from '../src/components/simulationView.ts';
import {buildEmissionSource} from '../src/components/emissionSource.ts';
import {defaults} from '../src/engine/catalog.ts';
import {PARTICLE_PRESETS} from '../src/engine/particleControls.ts';
import {createParticleSimulationView} from '../src/components/particleSimulationView.ts';

const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(1280,720);renderer.setClearColor('#171f23');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(38,1280/720,.1,400);camera.position.set(0,2,24);camera.lookAt(0,1,0);
const gl=renderer.getContext() as WebGL2RenderingContext,debug=gl.getExtension('WEBGL_debug_renderer_info'),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');
const stats=(values:number[])=>{const sorted=values.slice().sort((a,b)=>a-b);return {samples:values.length,mean:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),median:sorted[Math.floor(sorted.length*.5)]??null,p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]??null};};
const raf=()=>new Promise<number>(resolve=>requestAnimationFrame(resolve));
async function measure(duration:number,update:(elapsed:number)=>void){
 const frameMs:number[]=[],mainMs:number[]=[],gpuMs:number[]=[],pending:WebGLQuery[]=[];let start=0,last=0,frames=0;
 await new Promise<void>(resolve=>{function tick(now:number){if(!start){start=now;last=now;}else frameMs.push(now-last);last=now;const cpu=performance.now();update((now-start)/1000);
  if(timer){while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const query=pending.shift()!;if(!gl.getParameter(timer.GPU_DISJOINT_EXT))gpuMs.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}}
  const query=timer&&frames%4===0&&pending.length<12?gl.createQuery():null;if(query)gl.beginQuery(timer.TIME_ELAPSED_EXT,query);renderer.render(scene,camera);if(query){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push(query);}mainMs.push(performance.now()-cpu);frames++;
  if(now-start<duration)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
 for(const query of pending)gl.deleteQuery(query);
 return {fps:frameMs.length*1000/Math.max(1,frameMs.reduce((a,b)=>a+b,0)),frameMs:stats(frameMs),mainMs:stats(mainMs),gpuMs:stats(gpuMs),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
const hardware={renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:debug?gl.getParameter(debug.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),version:gl.getParameter(gl.VERSION),gpuTimerAvailable:!!timer,canvas:{width:1280,height:720,dpr:1},userAgent:navigator.userAgent};
async function run(count:number,style:string,backend='CPU'){
 const preset=style==='smoke'?PARTICLE_PRESETS.Smoke:style==='flame'?PARTICLE_PRESETS.Fire:PARTICLE_PRESETS.Sparks;
 const params={...defaults('particleSim'),...preset,count,simulationBackend:backend,emissionMode:'burst',burstCount:count,lifetime:12,lifetimeVariation:0,sizeVariation:.3,radius:3,speed:.4,spread:.7,gravity:0,buoyancy:0,turbulence:.2,drag:.4,direction:'up',size:style==='smoke'?.18:.055};
 const source={nodeId:'source',params:{...defaults('shape'),shape:'box',width:10,height:4,depth:.2},shape:'box' as const},colliders=[{nodeId:'floor',params:{...defaults('shape'),shape:'box',width:20,height:.5,depth:20,y:-3}}];
 const view=createParticleSimulationView({kind:'simulation',nodeId:'bench',simulation:'particle',params},false,{source,colliders,origin:{nodeId:'bench',params}},()=>params,camera,renderer);scene.add(view.group);
 const messageMs:number[]=[],workerStepMs:number[]=[],submissionMs:number[]=[],simLagMs:number[]=[];let collecting=false;
 if('worker' in view.client){const original=view.client.worker.onmessage!;view.client.worker.onmessage=function(event){const start=performance.now();original.call(this,event);if(collecting){messageMs.push(performance.now()-start);workerStepMs.push(view.client.stepMs);}};}else{const original=view.client.onAdvance;view.client.onAdvance=()=>{original();if(collecting)submissionMs.push(view.client.stepMs);};}
 try{
  const initial=performance.now();await view.client.ready(1);view.update(1);for(let i=0;i<12;i++){await raf();renderer.render(scene,camera);}const warmupMs=performance.now()-initial;
  const renderOnly=await measure(1500,()=>{});
  await measure(600,elapsed=>{view.client.request(1+elapsed);view.update(1+elapsed);});await view.client.ready(1.6);
  collecting=true;const playback=await measure(3000,elapsed=>{const time=1.6+elapsed;view.client.request(time);view.update(time);simLagMs.push(Math.max(0,time-view.client.time)*1000);});collecting=false;
  if(view.client.error)throw new Error(view.client.error);
  return {count,style,backend:view.client.backend,warmupMs,submissionMs:stats(submissionMs),renderOnly,playback,workerStepMs:stats(workerStepMs),messageMs:stats(messageMs),simLagMs:stats(simLagMs),simulatedSeconds:view.client.time-1.6,checkpointMiBAt30s:view.client.backend==='CPU'?count*40*61/1024**2:null};
 }finally{view.dispose();scene.remove(view.group);view.group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();if(o instanceof THREE.InstancedMesh)o.dispose();}});renderer.renderLists.dispose();}
}
async function continuousText(count:number,style:string,emitters=1,seconds=10){
 const font=new FontLoader().parse(fontData),text={kind:'text' as const,nodeId:'animated',styleId:'text',params:{...defaults('text'),text:'FLUXINI',size:1.4},animations:[{...defaults('textAnimate'),mode:'wave',amplitude:.3}]},source=buildEmissionSource(text,font,'outline');
 const views=Array.from({length:emitters},(_,index)=>{const params={...defaults('particleSim'),...(style==='smoke'?PARTICLE_PRESETS.Smoke:PARTICLE_PRESETS.Sparks),count,rate:count/4,simulationBackend:'GPU',emissionMode:'continuous',lifetime:4,lifetimeVariation:0,sizeVariation:.3,speed:.4,spread:.7,gravity:0,buoyancy:0,turbulence:.2,drag:.4,size:style==='smoke'?.18:.055,seed:19+index};const view=createParticleSimulationView({kind:'simulation',nodeId:'bench'+index,simulation:'particle',params},false,{source,origin:{nodeId:'bench'+index,params},colliders:[{nodeId:'floor',params:{...defaults('shape'),shape:'box',width:20,height:.5,depth:20,y:-3}}],tracks:[{nodeId:'text',param:'x',keys:[{time:0,value:0,easing:'linear'},{time:30,value:2,easing:'linear'}]}]},()=>params,camera,renderer);scene.add(view.group);if(view.client.backend!=='GPU')throw new Error('Capacity benchmark requires actual GPU simulation.');return view;});
 try{await Promise.all(views.map(v=>v.client.ready(5)));views.forEach(v=>v.update(5));for(let i=0;i<12;i++){await raf();renderer.render(scene,camera);}const simLagMs:number[]=[],submissionMs:number[]=[];
  const playback=await measure(seconds*1000,elapsed=>{const time=5+elapsed;for(const view of views){view.client.request(time);view.update(time);simLagMs.push(Math.max(0,time-view.client.time)*1000);submissionMs.push(view.client.stepMs);}});
  await Promise.all(views.map(v=>v.client.ready(5+seconds)));const alive=views.map(v=>v.client.backend==='GPU'&&'frame' in v.client?Array.from(v.client.frame().ages!).filter(a=>a>=0).length:0);
  return {count,style,emitters,totalCapacity:count*emitters,ratePerEmitter:count/4,backend:'GPU',seconds,alive,playback,simLagMs:stats(simLagMs),submissionMs:stats(submissionMs),workerStepMs:stats([])};
 }finally{for(const view of views){view.dispose();scene.remove(view.group);view.group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});}renderer.renderLists.dispose();}
}
async function fluid(kind:'water'|'cloud',count:number){
 const params={...defaults(kind),count},view=createSimulationView({kind:'simulation',nodeId:'fluid',simulation:kind,params},false,{},renderer),light=new THREE.HemisphereLight('#cce3ec','#26302b',3);scene.add(light);scene.add(view.group);camera.position.set(...(kind==='water'?[11,8,14]:[4,4.4,25]) as [number,number,number]);camera.lookAt(0,kind==='water'?-.4:2,0);
 const messageMs:number[]=[],workerStepMs:number[]=[],simLagMs:number[]=[];let collecting=false;const original=view.client.worker.onmessage!;view.client.worker.onmessage=function(event){const start=performance.now();original.call(this,event);if(collecting){messageMs.push(performance.now()-start);workerStepMs.push(view.client.stepMs);}};
 try{await view.client.ready(1);for(let i=0;i<12;i++){await raf();renderer.render(scene,camera);}collecting=true;const playback=await measure(5000,elapsed=>{const time=1+elapsed;view.client.request(time);simLagMs.push(Math.max(0,time-view.client.time)*1000);});collecting=false;if(view.client.error)throw Error(view.client.error);return {kind,count,gpuDensity:!!view.group.userData.gpuDensity,playback,workerStepMs:stats(workerStepMs),messageMs:stats(messageMs),simLagMs:stats(simLagMs)};}
 finally{view.dispose();scene.remove(view.group);scene.remove(light);view.group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();if(o instanceof THREE.InstancedMesh)o.dispose();}});renderer.renderLists.dispose();}
}
Object.assign(window,{particleBenchmark:{hardware,run,continuousText,fluid,baseline:()=>measure(1500,()=>{})}});
