// Art-directed surface relief: the underlying wave/transport state remains separate.
// Keeping this in a GPU texture lets shading, displacement and GLB export agree.
export const sculptNoise=`
float sculptHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sculptNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(sculptHash(i),sculptHash(i+vec2(1,0)),f.x),mix(sculptHash(i+vec2(0,1)),sculptHash(i+vec2(1,1)),f.x),f.y);}
float sculptFbm(vec2 p){return sculptNoise(p)*.57+sculptNoise(p*2.07+7.3)*.28+sculptNoise(p*4.17-2.1)*.15;}
`;
export const sculptSurface=`${sculptNoise}
void main(){
 float height=(texture2D(waves,vUv).r-depth)*waveEnabled;vec2 offset=vec2(0.);
 if(sculptural>.5){
  float edge=smoothstep(0.,.095,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));
  vec2 q=vUv*3.2+vec2(sin(clock*.09),cos(clock*.07))*.18;
  q+=vec2(sculptFbm(q*1.1+clock*.018),sculptFbm(q*1.1+8.3-clock*.021))*.9;
  float n=sculptFbm(q*1.32),phase=q.x*2.8+q.y*2.5+n*7.5;
  float ridge=pow(.5+.5*cos(phase*2.),3.);
  float detail=sculptFbm(q*3.5+clock*.04);
  float elevation=.12+n*.42+ridge*.65+(detail-.5)*.025;
  height=(height*(1.+foldDepth*.6)+foldDepth*elevation)*edge;
  float angle=sculptFbm(q+13.)*6.28318530718;
  offset=vec2(cos(angle),sin(angle))*(ridge-.25)*foldDepth*.13*edge;
 }
 gl_FragColor=vec4(height,offset,1.);
}`;
export const filledPigment=`${sculptNoise}
void main(){
 vec2 q=vUv*3.2;float n=sculptFbm(q*1.3);float phase=q.x*2.8+q.y*2.5+n*7.5;
 if(paletteCount>3.5||separateColors>.5){float bands=(vUv.x*.7+vUv.y*.45+sculptFbm(vUv*3.1)*.42)*paletteCount;gl_FragColor=pigmentChoice(mod(floor(bands),paletteCount));return;}
 float red=pow(.5+.5*sin(phase),7.),blue=pow(.5+.5*cos(phase+1.2),3.);
 vec3 weights=vec3(red,blue,max(.05,1.-red-blue));
 weights=pow(weights,vec3(3.));weights/=max(dot(weights,vec3(1.)),.0001);
 gl_FragColor=vec4(weights*1.3,1.);
}`;
