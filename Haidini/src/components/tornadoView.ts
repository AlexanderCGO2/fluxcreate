import * as THREE from 'three';
import type { ParticleItem, Params } from '../engine/evaluator.ts';

// Procedural rotating density field, ray-marched on the GPU. This is an appearance
// model with rising condensation and ground dust, not a weather/pressure solver.
const vertex=`varying vec3 origin;varying vec3 ray;void main(){origin=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz;ray=position-origin;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
precision highp float;
varying vec3 origin;varying vec3 ray;
uniform float clock,rotationSpeed,roughness,lean,baseRadius,topRadius,densityAmount,dust,masterOpacity,seed;
uniform vec3 tint;
float hash(vec3 p){p=fract(p*.3183099+vec3(.17,.31,.43));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float field(vec3 p){
 float h=clamp((p.y+.44)/.86,0.,1.);
 vec2 bend=vec2(sin(h*2.7+clock*.21),cos(h*3.3-clock*.17))*.008*lean*h;
 vec2 q=p.xz-bend;float radius=mix(baseRadius,topRadius,pow(h,1.55));
 float angle=clock*rotationSpeed-h*8.;mat2 spin=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
 vec3 samplePoint=vec3(spin*q*22.,h*13.-clock*.45+seed);
 float n=noise(samplePoint)*.57+noise(samplePoint*2.1)*.28+noise(samplePoint*4.3)*.15;
 float radial=length(q)/max(radius,.001);
 float core=1.-smoothstep(.32,1.12+(n-.5)*roughness,radial);
 core*=.48+.8*n;core*=smoothstep(0.,.045,h)*(1.-smoothstep(.89,1.,h));
 float skirt=exp(-pow((h-.045)/.055,2.))*(1.-smoothstep(.12,.39,length(q)))*(.25+.75*n)*dust;
 float capCenter=.88+(n-.5)*.11;float cap=exp(-pow((h-capCenter)/.075,2.))*exp(-pow(length(q)/.32,4.))*(.35+n*.7);
 return max(0.,core+skirt+cap)*densityAmount;
}
void main(){
 vec3 direction=normalize(ray),inv=1./direction;
 vec3 a=(-vec3(.5)-origin)*inv,b=(vec3(.5)-origin)*inv,near=min(a,b),far=max(a,b);
 float start=max(max(near.x,near.y),max(near.z,0.)),end=min(min(far.x,far.y),far.z);if(start>=end)discard;
 float stepSize=(end-start)/96.;float jitter=hash(vec3(gl_FragCoord.xy,0.));
 vec3 lightDirection=normalize(vec3(-.6,.8,.4));vec3 sum=vec3(0.);float alpha=0.;
 for(int i=0;i<96;i++){
  vec3 p=origin+direction*(start+(float(i)+jitter)*stepSize);float d=field(p);
  if(d>.015){float shadow=field(p+lightDirection*.045)*.8+field(p+lightDirection*.11)*.5;
   float lighting=.18+.75*exp(-shadow*1.8);float ground=1.-smoothstep(-.38,-.20,p.y);
   vec3 color=mix(tint,vec3(.26,.20,.14),ground*dust*.6)*lighting;
   float opacity=1.-exp(-d*stepSize*22.);sum+=(1.-alpha)*opacity*color;alpha+=(1.-alpha)*opacity;
   if(alpha>.99)break;
  }
 }
 if(alpha<.005)discard;gl_FragColor=vec4(sum/max(alpha,.001),alpha*masterOpacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
export function createTornadoView(item:ParticleItem,styleAt:(time:number)=>Params){
 const group=new THREE.Group(),m=item.motion!,height=Number(m.funnelHeight??8),width=Math.max(Number(item.params.radius)*2.8,6);
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,transparent:true,side:THREE.BackSide,depthWrite:false,uniforms:{clock:{value:0},rotationSpeed:{value:Number(m.frequency)*Number(item.params.speed)},roughness:{value:.8+Number(m.turbulence)},lean:{value:Number(m.amplitude)},baseRadius:{value:Number(m.coreWidth??.35)/width},topRadius:{value:Math.min(.33,Number(item.params.radius)/width)},densityAmount:{value:Number(m.volumeDensity??1.6)},dust:{value:Number(m.dust??.75)},masterOpacity:{value:Number(item.params.opacity??1)},seed:{value:Number(item.params.seed)*.013},tint:{value:new THREE.Color(String(item.params.color))}}});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);mesh.scale.set(width,height/.86,width);mesh.position.y=-3+height*.44/.86;mesh.name='Tornado_volume_'+item.nodeId;mesh.userData.node=item.nodeId;mesh.userData.volume=true;mesh.renderOrder=2;group.add(mesh);group.userData.gpuDensity=true;
 const update=(time:number)=>{const p=styleAt(time);group.position.set(Number(p.x),Number(p.y),Number(p.z));material.uniforms.clock.value=time;material.uniforms.tint.value.set(String(p.color));material.uniforms.masterOpacity.value=Number(p.opacity??1);mesh.visible=Number(p.opacity??1)>.001;};
 update(0);return {group,update};
}
