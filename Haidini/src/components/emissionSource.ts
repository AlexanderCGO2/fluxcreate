import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import type { Font } from 'three/addons/loaders/FontLoader.js';
import { random } from '../engine/geometry.ts';
import type { ShapeItem, TextItem } from '../engine/evaluator.ts';
import type { EmissionSource } from '../engine/collisions.ts';
export function buildEmissionSource(item:TextItem|ShapeItem,font?:Font,region='surface'):EmissionSource{
 if(item.kind==='shape')return {nodeId:item.nodeId,params:item.params,shape:item.params.shape as 'sphere'|'box'};
 if(!font)throw new Error('Load the text source font before emitting particles.');
 const size=Number(item.params.size),depth=Number(item.params.depth),tracking=Number(item.params.tracking),chars=Array.from(String(item.params.text)),triangles:{a:number[];b:number[];c:number[];normal:number[];origin:number;glyph:number;end:number;edge?:boolean}[]=[];let cursor=0,area=0;
 for(let glyph=0;glyph<chars.length;glyph++){
  const char=font.data.glyphs[chars[glyph]]?chars[glyph]:'?',metrics=font.data.glyphs[char],advance=metrics.ha/font.data.resolution*size;
  if(char!==' '&&region==='outline'){
   for(const shape of font.generateShapes(char,size)){const extracted=shape.extractPoints(10);for(const [index,contour] of [extracted.shape,...extracted.holes].entries()){
    let signed=0;for(let j=0;j<contour.length;j++){const a=contour[j],b=contour[(j+1)%contour.length];signed+=a.x*b.y-b.x*a.y;}
    const sign=(signed>=0?1:-1)*(index? -1:1);
    for(let j=0;j<contour.length;j++){const a=contour[j],b=contour[(j+1)%contour.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<1e-8)continue;area+=length;const start=[a.x+cursor,a.y-size*.4,depth],end=[b.x+cursor,b.y-size*.4,depth];triangles.push({a:start,b:end,c:end,normal:[sign*dy/length,-sign*dx/length,0],origin:cursor,glyph,end:area,edge:true});}
   }}
  }else if(char!==' '){
   const geometry=new TextGeometry(char,{font,size,depth,curveSegments:4,bevelEnabled:false}),positions=geometry.getAttribute('position'),indices=geometry.index;
   for(let i=0;i<(indices?.count||positions.count);i+=3){const point=(j:number)=>{const k=indices?indices.getX(j):j;return [positions.getX(k)+cursor,positions.getY(k)-size*.4,positions.getZ(k)];},a=point(i),b=point(i+1),c=point(i+2),u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...cross),weight=length*.5;if(weight>1e-10){const normal=cross.map(n=>n/length);if(region==='front face'&&normal[2]<.9)continue;area+=weight;triangles.push({a,b,c,normal,origin:cursor,glyph,end:area});}}
   geometry.dispose();
  }
  cursor+=advance+tracking;
 }
 if(!triangles.length)throw new Error('The source text needs at least one visible character.');
 const count=2048,points=new Float32Array(count*3),normals=new Float32Array(count*3),origins=new Float32Array(count),glyphs=new Uint16Array(count),center=(cursor-tracking)/2;
 for(let i=0;i<count;i++){const target=random(47,i*3)*area;let lo=0,hi=triangles.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(triangles[mid].end<target)lo=mid+1;else hi=mid;}const tri=triangles[lo],u=tri.edge?random(47,i*3+1):Math.sqrt(random(47,i*3+1)),v=tri.edge?0:random(47,i*3+2);for(let axis=0;axis<3;axis++){points[i*3+axis]=tri.a[axis]*(1-u)+tri.b[axis]*u*(1-v)+tri.c[axis]*u*v-(axis===0?center:0);normals[i*3+axis]=tri.normal[axis];}origins[i]=tri.origin-center;glyphs[i]=tri.glyph;}
 return {nodeId:item.styleId,params:item.params,points,normals,origins,glyphs,animations:item.animations};
}
