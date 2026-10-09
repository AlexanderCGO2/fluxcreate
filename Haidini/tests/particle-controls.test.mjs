import test from 'node:test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {defaults} from '../src/engine/catalog.ts';
import {createProject,parseProject,applyPatch} from '../src/engine/project.ts';
import {ParticleDynamics} from '../src/engine/particleDynamics.ts';
import {PARTICLE_CONTROL_DEFAULTS,PARTICLE_PRESETS} from '../src/engine/particleControls.ts';
import {buildEmissionSource} from '../src/components/emissionSource.ts';
const base={...defaults('particleSim'),count:300,rate:60,speed:0,spread:0,gravity:0,drag:0,radius:0,lifetime:5};
const stableFrame=sim=>{const {stepMs,...frame}=sim.frame();return frame;};
test('timed continuous emission stops, burst occurs once, and rewind restores birth state',()=>{
 const p={...base,emitStart:.5,limitEmission:true,emitDuration:1,lifetimeVariation:.4,sizeVariation:.7,turbulence:.3};
 const sim=new ParticleDynamics(p);sim.seek(.5);assert.equal(sim.serial,0);sim.seek(2);assert.equal(sim.serial,60);
 const expected=stableFrame(sim);sim.seek(.2);sim.seek(2);assert.deepEqual(stableFrame(sim),expected);
 const stepped=new ParticleDynamics(p);for(let i=0;i<=120;i++)stepped.seek(i/60);assert.deepEqual(stableFrame(stepped),expected);
 const burst=new ParticleDynamics({...p,emissionMode:'burst',burstCount:47});burst.seek(.5);assert.equal(burst.serial,0);burst.seek(.5+1/60);assert.equal(burst.serial,47);burst.seek(3);assert.equal(burst.serial,47);const snapshot=stableFrame(burst);burst.seek(.1);burst.seek(3);assert.deepEqual(stableFrame(burst),snapshot);
});
test('direction, source normals, wind, buoyancy and birth variation change actual motion',()=>{
 const p={...base,emissionMode:'burst',burstCount:120,speed:2,speedVariation:0};
 for(const [direction,expected] of [['up',[0,2,0]],['down',[0,-2,0]],['forward',[0,0,2]],['backward',[0,0,-2]],['custom',[2,0,0]]]){
  const sim=new ParticleDynamics({...p,direction,azimuth:90,elevation:0});sim.seek(1/60);expected.forEach((v,i)=>assert(Math.abs(sim.velocities[i]-v)<1e-6,direction));
 }
 const source={nodeId:'title',params:defaults('text'),points:new Float32Array([1,0,0]),normals:new Float32Array([1,0,0])};
 const outward=new ParticleDynamics({...p,direction:'outward'},{source});outward.seek(1/60);assert.deepEqual(Array.from(outward.velocities.slice(0,3)),[2,0,0]);assert(outward.positions[0]>1);
 const forces=new ParticleDynamics({...p,speed:0,windX:2,windZ:-1,gravity:-1,buoyancy:3});forces.seek(1);assert(Math.abs(forces.velocities[0]-2)<1e-5);assert(Math.abs(forces.velocities[1]-2)<1e-5);assert(Math.abs(forces.velocities[2]+1)<1e-5);
 const varied=new ParticleDynamics({...p,speedVariation:.6,lifetimeVariation:.5,sizeVariation:.8});varied.seek(1/60);
 for(let i=0;i<120;i++){assert(varied.velocities[i*3+1]>=.8&&varied.velocities[i*3+1]<=2);assert(varied.lifetimes[i]>=2.5&&varied.lifetimes[i]<=5);assert(varied.sizes[i]>=.2&&varied.sizes[i]<=1);assert(varied.particleSeeds[i]>=0&&varied.particleSeeds[i]<1);}
 assert(new Set(varied.sizes.slice(0,120)).size>100);
 const noise=new ParticleDynamics({...base,emissionMode:'burst',burstCount:10,turbulence:1});noise.seek(1);assert([...noise.positions].some(v=>Math.abs(v)>.01));
});
test('text front faces and outlines provide consistent samples including counter contours',async()=>{
 const font=new FontLoader().parse(JSON.parse(await readFile(new URL('../src/assets/helvetiker_bold.typeface.json',import.meta.url),'utf8')));
 const params={...defaults('text'),text:'O',size:1,depth:.2,tracking:0},item={kind:'text',nodeId:'animate',styleId:'title',params};
 const front=buildEmissionSource(item,font,'front face'),outline=buildEmissionSource(item,font,'outline'),surface=buildEmissionSource(item,font);
 assert.equal(front.nodeId,'title');assert.equal(front.points.length,6144);assert.deepEqual(outline,buildEmissionSource(item,font,'outline'));
 for(let i=0;i<2048;i++){assert(Math.abs(front.points[i*3+2]-.2)<1e-6);assert(Math.abs(front.normals[i*3])<1e-6&&Math.abs(front.normals[i*3+1])<1e-6&&front.normals[i*3+2]===1);assert(Math.abs(outline.points[i*3+2]-.2)<1e-6);assert(Math.abs(Math.hypot(...outline.normals.slice(i*3,i*3+3))-1)<1e-6);assert.equal(outline.normals[i*3+2],0);}
 assert([...surface.normals].some(v=>v<-.9));
 const shape=font.generateShapes('O',1)[0].extractPoints(10),center=font.data.glyphs.O.ha/font.data.resolution/2;
 let holeHits=0,outerHits=0;
 const distance=(x,y,contour)=>{let result=Infinity;for(let j=0;j<contour.length;j++){const a=contour[j],b=contour[(j+1)%contour.length],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;if(l===0)continue;const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/l));result=Math.min(result,Math.hypot(x-a.x-t*dx,y-a.y-t*dy));}return result;};
 for(let i=0;i<2048;i++){const x=outline.points[i*3]+center,y=outline.points[i*3+1]+.4,outer=distance(x,y,shape.shape),inner=Math.min(...shape.holes.map(h=>distance(x,y,h)));assert(Math.min(outer,inner)<1e-6);if(inner<outer)holeHits++;else outerHits++;}
 assert(holeHits>100&&outerHits>100,'Both the letter perimeter and hole emit particles');
 assert.throws(()=>buildEmissionSource({...item,params:{...params,text:'   '}},font),/visible character/);
});
test('old particle scenes migrate without changing their existing look; effect presets are valid atomic edits',()=>{
 const p=createProject(randomUUID(),'text-sparks'),sim=p.graph.nodes.find(n=>n.type==='particleSim');sim.params.color='#e1ff00';sim.params.opacity=.11;
 for(const key of Object.keys(PARTICLE_CONTROL_DEFAULTS))delete sim.params[key];
 const old=structuredClone(p),migrated=parseProject(p),m=migrated.graph.nodes.find(n=>n.id===sim.id);assert.deepEqual(p,old);assert.equal(m.params.particleStyle,'grains');assert.equal(m.params.glow,0);assert.equal(m.params.color,'#e1ff00');assert.equal(m.params.opacity,.11);
 for(const values of Object.values(PARTICLE_PRESETS)){const commands=Object.entries(values).map(([param,value])=>({op:'set',nodeId:sim.id,param,value}));assert(commands.length<=32);const changed=applyPatch(migrated,{baseRevision:migrated.revision,summary:'Apply particle effect',commands});assert.equal(changed.graph.nodes.find(n=>n.id===sim.id).params.particleStyle,values.particleStyle);}
});

test('a full pool preserves twelve-second lifetimes instead of replacing sparks every second',()=>{
 const params={...base,count:1600,rate:1500,lifetime:12},sim=new ParticleDynamics(params);sim.seek(5);assert.equal(sim.serial,1600);assert.equal(sim.alive,1600);assert(Math.abs(sim.ages[0]-5)<.001);assert([...sim.ages].every(age=>age>3.9));
 const atFive=stableFrame(sim);sim.seek(.5);sim.seek(5);assert.deepEqual(stableFrame(sim),atFive);sim.seek(11);assert.equal(sim.serial,1600);assert(sim.ages[0]>10.99);sim.seek(12.5);assert(sim.serial>1600);assert(sim.ages[0]<.6);assert(sim.alive<=1600);
 const direct=new ParticleDynamics(params);direct.seek(12.5);assert.deepEqual(stableFrame(sim),stableFrame(direct));assert.equal(sim.alive,[...sim.ages].filter(age=>age>=0).length);
 const burst=new ParticleDynamics({...params,emissionMode:'burst',burstCount:4000});burst.seek(1);assert.equal(burst.serial,1600);assert.equal(burst.alive,1600);
});
