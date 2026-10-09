// Depth-averaged nonlinear shallow water, metres / seconds. RGBA stores
// water depth, x momentum (h*u), y momentum (h*v), and one.
// Shared finite-volume face fluxes conserve water; mirrored states close the walls.
export const PAINT_BASIN_SIZE=12;
export const MAX_LIQUID_SPEED=4;
export function waveSubsteps(resolution:number,speed:number){
 // Unsplit 2D CFL < .45, including advection and a generous wave-height margin.
 const signal=MAX_LIQUID_SPEED+Math.sqrt(speed*speed+9.81*3);
 return Math.max(1,Math.ceil(2*signal*(1/60)/(PAINT_BASIN_SIZE/resolution)/.45));
}
export function liquidDepth(params:Record<string,unknown>){return Number(params.liquidDepth??Number(params.waveSpeed??2.8)**2/9.81);}
export const waveStep=`
vec3 conserved(vec2 uv){vec3 q=texture2D(state,clamp(uv,vec2(.5/resolution),vec2(1.-.5/resolution))).rgb;
 if(uv.x<0.||uv.x>1.)q.y=-q.y;if(uv.y<0.||uv.y>1.)q.z=-q.z;return q;}
vec3 flux(vec3 a,vec3 b,vec2 axis){
 float ha=max(a.x,1.e-12),hb=max(b.x,1.e-12);
 float ua=dot(a.yz,axis)/ha,ub=dot(b.yz,axis)/hb;
 vec3 fa=vec3(ha*ua,a.yz*ua+axis*(.5*9.81*ha*ha));
 vec3 fb=vec3(hb*ub,b.yz*ub+axis*(.5*9.81*hb*hb));
 float speed=max(abs(ua)+sqrt(9.81*ha),abs(ub)+sqrt(9.81*hb));
 vec3 f=.5*(fa+fb)-.5*speed*(b-a);
 // Viscous shear transfers momentum between adjacent columns.
 f.yz-=viscosity*viscosity*.02*(ha+hb)*.5*(b.yz/hb-a.yz/ha)/(12./resolution);
 return f;
}
void main(){
 vec2 d=vec2(1./resolution,0.);float dx=12./resolution;
 vec3 c=conserved(vUv),l=conserved(vUv-d),r=conserved(vUv+d),b=conserved(vUv-d.yx),t=conserved(vUv+d.yx);
 vec3 q=c-waveDt/dx*(flux(c,r,vec2(1.,0.))-flux(l,c,vec2(1.,0.))+flux(c,t,vec2(0.,1.))-flux(b,c,vec2(0.,1.)));
 vec2 v=q.yz/max(q.x,.00001);
 float running=forceEnvelope(waveClock);
 vec2 force=eddy(vUv,vec2(.46+.10*sin(waveClock*.24),.53+.09*cos(waveClock*.33)),2.1)+eddy(vUv,vec2(.70+.05*cos(waveClock*.35),.34+.10*sin(waveClock*.42)),-2.8)+eddy(vUv,vec2(.28,.30),1.2);
 force=force*swirl*2.+vec2(drift*.12,0.);
 vec3 s=sources(vUv);force+=(s.x*vec2(.65,-1.)+s.y*vec2(1.,.3)+s.z*vec2(-.9,.7))*flow*4.;
 float distance=waveDirection<.5?1.-vUv.y:waveDirection<1.5?vUv.x:waveDirection<2.5?vUv.y:1.-vUv.x;
 bool horizontal=waveDirection<.5||(waveDirection>1.5&&waveDirection<2.5);
 float across=horizontal?vUv.x:vUv.y;
 vec2 inward=waveDirection<.5?vec2(0.,-1.):waveDirection<1.5?vec2(1.,0.):waveDirection<2.5?vec2(0.,1.):vec2(-1.,0.);
 float drive=waveAmplitude*sqrt(9.81/depth)*2.*sin(6.28318530718*waveFrequency*waveClock);
 if(wavePattern>.5)drive*=cos((across-.5)*6.28318530718);
 float paddle=1.-smoothstep(.015,.075,distance);
 // Momentum forcing moves existing liquid; it never writes a prescribed height.
 force+=inward*(drive-dot(v,inward))*8.*paddle*waveDrive;
 q.yz+=waveDt*q.x*force*running;
 q.yz*=exp(-waveDt*(waveDamping+viscosity*1.6));
 // Bound extreme artistic forcing, not the water height/volume.
 if(q.x<1.e-6)q.yz=vec2(0.);else q.yz*=min(1.,4.*q.x/max(length(q.yz),1.e-12));
 gl_FragColor=vec4(q,1.);
}`;
export const waveSampling=`
vec4 linearField(sampler2D field,vec2 uv){
 vec2 p=clamp(uv*resolution-.5,vec2(0.),vec2(resolution-1.));
 vec2 lo=floor(p),f=fract(p),a=(lo+.5)/resolution,b=min(a+1./resolution,vec2(1.-.5/resolution));
 return mix(mix(texture2D(field,a),texture2D(field,vec2(b.x,a.y)),f.x),mix(texture2D(field,vec2(a.x,b.y)),texture2D(field,b),f.x),f.y);
}
vec2 waveFlow(vec2 uv){vec4 w=linearField(waves,uv);return w.gb/max(w.r,.00001)*resolution/12.;}
`;
export const paintSurfaceVertex=`
varying vec2 vUv;varying vec3 viewDirection;
uniform sampler2D waves,surfaceField;uniform float resolution,depth;
${waveSampling}
void main(){vUv=uv;vec3 p=position;vec4 relief=linearField(surfaceField,uv);p.z+=relief.r;p.xy+=relief.gb;viewDirection=(inverse(modelMatrix)*vec4(cameraPosition,1.)).xyz-p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
`;
