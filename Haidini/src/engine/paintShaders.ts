import {sculptSurface,filledPigment} from './paintSculpture.ts';
import {waveStep,waveSampling} from './paintWaves.ts';
// Nonlinear depth-averaged liquid momentum and gravity drive the surface and pigments.
export const paintVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
export const paintCommon=`
precision highp float;
varying vec2 vUv;
uniform sampler2D state, velocity, rhs,waves,pack0,pack1,pack2;
uniform float filledBasin;
uniform float sculptural,foldDepth;
uniform float waveEnabled,waveDrive,waveDt,waveClock,waveAmplitude,waveFrequency,depth,waveDamping,waveDirection,wavePattern,forceDuration;
uniform float resolution, dt, clock, viscosity, flow, swirl, drift, mixing, streamWidth;
uniform float pigmentGroup,paletteCount,separateColors,colorCycle;
${waveSampling}
float forceEnvelope(float t){return smoothstep(0.,1.5,t)*(forceDuration>0.?1.-smoothstep(max(0.,forceDuration-.5),forceDuration,t):1.);}
vec2 transportVelocity(vec2 uv){return waveFlow(uv); }
vec4 sampleLinear(sampler2D field,vec2 uv){
 vec2 p=clamp(uv*resolution-.5,vec2(0.),vec2(resolution-1.));
 vec2 lo=floor(p),f=fract(p),h=vec2(1./resolution);
 vec2 a=(lo+.5)*h,b=min(a+h,vec2(1.)-.5*h);
 return mix(mix(texture2D(field,a),texture2D(field,vec2(b.x,a.y)),f.x),mix(texture2D(field,vec2(a.x,b.y)),texture2D(field,b),f.x),f.y);
}
bool wall(vec2 uv){float h=1./resolution;return uv.x<h||uv.y<h||uv.x>1.-h||uv.y>1.-h;}
float sourceAt(vec2 p,vec2 center){vec2 d=(p-center)/streamWidth;return exp(-dot(d,d)*2.);}
vec3 sources(vec2 p){return vec3(sourceAt(p,vec2(.30,.78)),sourceAt(p,vec2(.22,.34)),sourceAt(p,vec2(.78,.28)));}
vec4 pigmentChoice(float index){vec4 indices=pigmentGroup*4.+vec4(0.,1.,2.,3.);return vec4(1.)-step(vec4(.25),abs(indices-vec4(index)));}
vec4 inletPigment(float inlet){float index=mod(floor(clock/max(colorCycle,1.))+floor(inlet*paletteCount/3.),paletteCount);return pigmentChoice(index);}
vec2 eddy(vec2 p,vec2 center,float strength){vec2 d=p-center;return vec2(-d.y,d.x)*exp(-dot(d,d)/.065)*strength;}
`;
export const paintPasses={
 sculptSurface,filledPigment,waveStep,
 normalizePigment:`void main(){
  vec4 a=texture2D(pack0,vUv),b=texture2D(pack1,vUv),c=texture2D(pack2,vUv);
  float total=dot(a,vec4(1.));if(paletteCount>4.)total+=dot(b,vec4(1.));if(paletteCount>8.)total+=dot(c,vec4(1.));
  // Independent monotonic advection can alter the sum of material fractions.
  // Restore a partition of unity for a full basin; retain partial dye coverage otherwise.
  float divisor=filledBasin>.5?max(total,1.e-8):max(total,1.);
  gl_FragColor=texture2D(state,vUv)/divisor;
 }`,

 flowVelocity:`void main(){gl_FragColor=vec4(waveFlow(vUv),0.,1.);}`,
 zero:'void main(){gl_FragColor=vec4(0.);}',
 initialLiquid:'void main(){gl_FragColor=vec4(depth,0.,0.,1.);}',
 advectPigment:`void main(){vec2 v=transportVelocity(vUv);gl_FragColor=sampleLinear(state,vUv-dt*v/resolution);}`,
 correctPigment:`void main(){
  vec2 v=transportVelocity(vUv);
  vec4 forward=texture2D(state,vUv),back=sampleLinear(state,vUv+dt*v/resolution);
  vec4 corrected=forward+.5*(texture2D(rhs,vUv)-back);
  vec2 p=clamp(vUv-dt*v/resolution,vec2(.5/resolution),vec2(1.-.5/resolution));
  vec2 lo=(floor(p*resolution-.5)+.5)/resolution,hi=lo+1./resolution;
  vec4 a=texture2D(rhs,lo),b=texture2D(rhs,vec2(hi.x,lo.y)),c=texture2D(rhs,vec2(lo.x,hi.y)),d=texture2D(rhs,hi);
  gl_FragColor=clamp(corrected,min(min(a,b),min(c,d)),max(max(a,b),max(c,d)));
 }`,
 pigment:`void main(){
  vec2 h=vec2(1./resolution,0.);
  vec4 c=texture2D(state,vUv);
  vec4 neighbor=(texture2D(state,vUv-h)+texture2D(state,vUv+h)+texture2D(state,vUv-h.yx)+texture2D(state,vUv+h.yx))*.25;
  c=mix(c,neighbor,1.-exp(-mixing*dt*30.));
  vec3 weights=sources(vUv)*flow*dt*22.*forceEnvelope(clock);
  if(paletteCount>3.5||separateColors>.5){
   // Recirculating inlets replace pigment locally. All packs share the same weights,
   // so fresh colors displace old dye rather than saturating every channel.
   c=mix(c,inletPigment(0.),min(1.,weights.x));c=mix(c,inletPigment(1.),min(1.,weights.y));c=mix(c,inletPigment(2.),min(1.,weights.z));
  }else if(pigmentGroup<.5)c.rgb+=weights;
  gl_FragColor=min(c,vec4(6.));
 }`
};

export const paintSurface=`
varying vec2 vUv;varying vec3 viewDirection;
uniform sampler2D pigment,pigment1,pigment2,velocity,waves,surfaceField;
uniform vec3 palette[12];uniform float paletteCount,separateColors;
uniform vec3 colorA,colorB,colorC;
uniform float resolution,depth,masterOpacity,showFlow,waveEnabled,waterFinish,sculptural,foldDepth,grainAmount;
${waveSampling}
vec3 reliefAt(vec2 uv){vec4 r=linearField(surfaceField,uv);return vec3((uv-.5)*12.+r.gb,r.r);}
float grainHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec3 pigmentColor(vec2 at){
 vec4 packs0=linearField(pigment,at),packs1=linearField(pigment1,at),packs2=linearField(pigment2,at);
 float amount=0.,best=-1.,second=-1.;vec3 logarithm=vec3(0.),winner=palette[0],runner=palette[0];
 for(int i=0;i<12;i++){if(float(i)>=paletteCount)break;float weight=i<4?packs0[i]:i<8?packs1[i-4]:packs2[i-8];weight=max(0.,weight);
  amount+=weight;logarithm+=log(max(palette[i],vec3(.008)))*weight;
  if(weight>best){second=best;runner=winner;best=weight;winner=palette[i];}else if(weight>second){second=weight;runner=palette[i];}
 }
 vec3 mixed=exp(logarithm/max(amount,1.e-6));
 // Advected pigment ownership keeps distinct regions; antialias only their boundary.
 if(separateColors>.5){float edge=max(fwidth(best-second)*.7,.000001);mixed=mix(runner,winner,smoothstep(-edge,edge,best-second));}
 vec2 tile=abs(fract(at*12.)-.5);float grout=1.-smoothstep(.014,.03,min(tile.x,tile.y));
 vec3 base=mix(vec3(.84,.81,.72),mix(vec3(.10,.36,.43),vec3(.23,.49,.53),grout),waterFinish);
 return mix(base,mixed,1.-exp(-amount*6.));
}
float lineDistance(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/max(dot(d,d),.00001),0.,1.));}
void main(){
 vec2 h=vec2(1./resolution,0.);
 vec2 slope=vec2(linearField(waves,vUv+h).r-linearField(waves,vUv-h).r,linearField(waves,vUv+h.yx).r-linearField(waves,vUv-h.yx).r)*resolution/24.*waveEnabled;
 vec3 normal=normalize(vec3(-slope,1.));
 if(sculptural>.5){vec3 tangentX=reliefAt(vUv+h)-reliefAt(vUv-h),tangentY=reliefAt(vUv+h.yx)-reliefAt(vUv-h.yx);normal=normalize(cross(tangentX,tangentY));if(dot(normal,viewDirection)<0.)normal=-normal;}
 vec2 refraction=normal.xy*.018*waterFinish;vec3 c=pigmentColor(vUv+refraction);
 vec3 light=normalize(vec3(-.35,.55,1.)),eye=normalize(viewDirection);
 float grain=0.;vec2 grainNormal=vec2(0.);if(sculptural>.5&&grainAmount>0.){vec3 surface=reliefAt(vUv),axis=abs(normal);vec2 projected=axis.z>axis.x&&axis.z>axis.y?surface.xy:axis.x>axis.y?surface.yz:surface.xz;vec3 tangentA=axis.z>axis.x&&axis.z>axis.y?vec3(1,0,0):axis.x>axis.y?vec3(0,1,0):vec3(1,0,0),tangentB=axis.z>axis.x&&axis.z>axis.y?vec3(0,1,0):vec3(0,0,1);vec2 g=projected*12.,cell=floor(g),point=fract(g)-.5;point-=(vec2(grainHash(cell),grainHash(cell+8.))-.5)*.45;float size=.22+grainHash(cell+31.)*.24,r=length(point)/size;grain=(1.-smoothstep(.8,1.,r))*step(grainHash(cell+67.),grainAmount);grainNormal=point/max(size,.01)*grain;normal=normalize(normal+(tangentA*grainNormal.x+tangentB*grainNormal.y)*.7+normal*grain*.22);float accent=grainHash(cell+19.);vec3 bead=accent<.3?colorA:accent<.6?colorB:colorC;c=mix(c,bead,grain*(.4+.35*accent));}
 float gloss=pow(max(dot(normal,normalize(light+eye)),0.),mix(75.,130.,waterFinish));
 float fresnel=.04+.96*pow(1.-max(dot(normal,eye),0.),5.);
 c=c*(.58+.42*max(dot(normal,light),0.))*(1.-fresnel)+gloss*.08;
 if(waveEnabled>.5){
  // Two fixed studio softboxes reflected by the simulated normal. Their distortion
  // reveals moving liquid curvature; no extra bump or animated geometry is added.
  vec3 reflected=reflect(-eye,normal);vec2 ceiling=reflected.xy/max(reflected.z,.15);
  float strip=exp(-pow((ceiling.y-.85)/.09,2.))*(1.-smoothstep(1.6,1.9,abs(ceiling.x)));
  float side=exp(-pow((ceiling.x+.9)/.08,2.))*(1.-smoothstep(1.4,1.7,abs(ceiling.y)));
  c+=vec3(.62,.76,.84)*fresnel*.7+vec3(1.)*fresnel*(gloss*3.+strip*10.+side*6.);
 }
 if(sculptural>.5){vec3 center=reliefAt(vUv);float shade=1.,occlusion=0.;for(int i=1;i<=14;i++){float distance=float(i)*.22;vec2 at=vUv+light.xy*distance/12.;float blocker=linearField(surfaceField,at).r-(center.z+light.z*distance);shade=min(shade,1.-smoothstep(.025,.10,blocker)*.83);}for(int j=0;j<4;j++){vec2 direction=j==0?vec2(1.,0.):j==1?vec2(-1.,0.):j==2?vec2(0.,1.):vec2(0.,-1.);occlusion+=max(0.,linearField(surfaceField,vUv+direction*.018).r-center.z);}c*=mix(.42,1.,shade)*exp(-occlusion*.5);c*=1.-grain*.14;c+=grain*gloss*.11;}
 float edge=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y));c*=.75+.25*smoothstep(0.,.025,edge);
 if(showFlow>.5){
  vec2 cell=(floor(vUv*14.)+.5)/14.,v=waveFlow(cell);
  float speed=length(v)/resolution;
  vec2 d=v/max(length(v),.001),p=(vUv-cell)*14.;
  vec2 q=vec2(dot(p,d),dot(p,vec2(-d.y,d.x)));
  float arrow=min(lineDistance(q,vec2(-.28,0.),vec2(.28,0.)),min(lineDistance(q,vec2(.28,0.),vec2(.08,.15)),lineDistance(q,vec2(.28,0.),vec2(.08,-.15))));
  float ink=(1.-smoothstep(.025,.052,arrow))*smoothstep(.002,.025,speed);
  c=mix(c,vec3(.018,.024,.028),ink*.68);
 }
 gl_FragColor=vec4(c,masterOpacity*(sculptural>.5?1.:smoothstep(.0001,.002,linearField(waves,vUv).r)));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;
