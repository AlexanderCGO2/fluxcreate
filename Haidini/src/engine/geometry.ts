import type { LandscapeParams } from './project.ts';

export const SIZE = 48;
export const RESOLUTION = 128;
export function random(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x45d9f3b)) | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function noise(x: number, z: number, seed: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const at = (a: number, b: number) => random(seed, Math.imul(a, 73856093) ^ Math.imul(b, 19349663));
  return mix(mix(at(ix, iz), at(ix+1, iz), fx), mix(at(ix, iz+1), at(ix+1, iz+1), fx), fz);
}
export const trailPoints = Array.from({length: 65}, (_, i) => {
  const z = -SIZE/2 + SIZE * i/64;
  return { x: Math.sin(z * 0.13) * 4.5 + Math.sin(z * 0.28) * 1.2, z };
});
export function distanceToTrail(x: number, z: number, points=trailPoints) {
  let best = Infinity;
  for (let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    best=Math.min(best,(x-a.x-t*dx)**2+(z-a.z-t*dz)**2);
  }
  return Math.sqrt(best);
}
export function heightAt(x: number, z: number, params: LandscapeParams, distance = distanceToTrail(x,z)) {
  let sum=0,weight=1,total=0,f=0.048;
  for(let i=0;i<4;i++){sum+=noise(x*f+21,z*f+35,params.seed+i*73)*weight;total+=weight;weight*=params.roughness;f*=2.1;}
  const hill=(sum/total)**1.5*params.height;
  const edge=Math.min(1,Math.max(0,(distance-params.pathWidth/2)/3));
  return mix(params.height*0.11 + Math.sin(z*0.09)*0.12, hill, smooth(edge));
}
export interface Instance { id: string; x: number; y: number; z: number; scale: number; angle: number; }
export interface Landscape {
  positions: Float32Array; colors: Float32Array; indices: Uint32Array;
  rocks: Instance[]; trees: Instance[]; triangles: number;
}
export interface TerrainSettings {size:number;resolution:number;flat:boolean;mask:boolean;amplitude:number;frequency:number;}
export function buildLandscape(params: LandscapeParams, settings:TerrainSettings={size:SIZE,resolution:RESOLUTION,flat:false,mask:true,amplitude:4.5,frequency:.13}): Landscape {
  const points=Array.from({length:65},(_,i)=>{const z=-settings.size/2+settings.size*i/64;return {x:Math.sin(z*settings.frequency)*settings.amplitude+Math.sin(z*.28)*1.2,z};});
  const distance=(x:number,z:number)=>settings.mask?distanceToTrail(x,z,points):Infinity;
  const height=(x:number,z:number,d=distance(x,z))=>settings.flat?0:heightAt(x,z,params,d);
  const n=settings.resolution, positions=new Float32Array((n+1)**2*3), colors=new Float32Array(positions.length),indices=new Uint32Array(n*n*6);
  let offset=0;
  for(let iz=0;iz<=n;iz++)for(let ix=0;ix<=n;ix++){
    const x=(ix/n-0.5)*settings.size,z=(iz/n-0.5)*settings.size,d=distance(x,z),y=height(x,z,d),j=(iz*(n+1)+ix)*3;
    positions.set([x,y,z],j);
    const trail=1-smooth(Math.min(1,Math.max(0,(d-params.pathWidth/2+0.2)/0.9)));
    const elevation=Math.min(1,y/params.height),v=random(params.seed,iz*(n+1)+ix)*0.035;
    colors.set([mix(0.20+elevation*0.12+v,0.49,trail),mix(0.27+elevation*0.07+v,0.41,trail),mix(0.20+elevation*0.08+v,0.29,trail)],j);
    if(ix<n&&iz<n){const a=iz*(n+1)+ix,b=a+1,c=a+n+1,dv=c+1;indices.set([a,c,b,b,c,dv],offset);offset+=6;}
  }
  function scatter(kind: 'rock'|'tree', density: number, max: number, salt: number) {
    const items:Instance[]=[];
    for(let i=0;i<max;i++){
      if(random(params.seed+salt,i*7+6)>density)continue;
      const x=(random(params.seed+salt,i*7)-0.5)*(settings.size-2),z=(random(params.seed+salt,i*7+1)-0.5)*(settings.size-2),d=distance(x,z);
      const scale=kind==='rock'?0.4+random(params.seed+salt,i*7+2)*1.35:0.65+random(params.seed+salt,i*7+2)*0.7;
      if(d<params.pathWidth/2+(kind==='rock'?scale*1.1:0.8))continue;
      const y=height(x,z,d);
      if(kind==='tree'&&Math.abs(height(x+0.3,z)-height(x-0.3,z))>0.65)continue;
      items.push({id:kind+'-'+i,x,y,z,scale,angle:random(params.seed+salt,i*7+3)*Math.PI*2});
    }return items;
  }
  return {positions,colors,indices,rocks:scatter('rock',params.rocks,560,381),trees:scatter('tree',params.trees,260,781),triangles:n*n*2};
}
