export const particleCompute = /* glsl */ `
uniform sampler2D birthPosition;
uniform sampler2D birthVelocity;
uniform sampler2D birthMetadata;
uniform float simulationStep;
uniform float simulationEpoch;
uniform float simulationPhase;
uniform float particleCount;
uniform vec3 acceleration;
uniform float dragFactor;
uniform float particleRadius;
uniform float turbulence;
uniform float noiseScale;
uniform float seedPhase;
uniform float bounce;
uniform float friction;
uniform int colliderCount;
uniform vec4 colliderA[32];
uniform vec4 colliderB[32];
void contact(inout vec3 p,inout vec3 v,float radius,int index){
 vec4 a=colliderA[index],b=colliderB[index];vec3 delta=p-a.xyz,normal=vec3(0.0);float depth=0.0;
 if(a.w<0.5){float distance=length(delta),r=b.w+radius;if(distance>=r)return;if(distance<1e-8){normal.y=1.0;depth=r;}else{normal=delta/distance;depth=r-distance;}}
 else{vec3 closest=clamp(delta,-b.xyz,b.xyz),offset=delta-closest;float distance=length(offset);if(distance>=radius)return;if(distance>1e-8){normal=offset/distance;depth=radius-distance;}else{vec3 remaining=b.xyz-abs(delta);int axis=0;if(remaining.y<remaining.x)axis=1;if(remaining.z<remaining[axis])axis=2;normal[axis]=delta[axis]>=0.0?1.0:-1.0;depth=remaining[axis]+radius;}}
 p+=normal*depth;float inward=dot(v,normal);if(inward<0.0){v-=(1.0+bounce)*inward*normal;float outward=dot(v,normal);v-=(v-outward*normal)*friction;}
}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution.xy;float index=floor(gl_FragCoord.y)*resolution.x+floor(gl_FragCoord.x);
 vec4 position=texture2D(statePosition,uv),velocity=texture2D(stateVelocity,uv),spawn=texture2D(birthPosition,uv),meta=texture2D(birthMetadata,uv);
 if(index>=particleCount){gl_FragColor=vec4(0.0,0.0,0.0,-1.0);return;}
 if(abs(spawn.w-simulationStep)<0.25&&abs(meta.w-simulationEpoch)<.25){position=vec4(spawn.xyz,0.0);velocity=texture2D(birthVelocity,uv);}
 if(position.w>=0.0){
  const float dt=1.0/240.0;float phase=simulationPhase;
  for(int sub=0;sub<4;sub++){
   vec3 samplePosition=position.xyz*noiseScale;
   vec3 flow=vec3(sin(samplePosition.y+phase)-cos(samplePosition.z-phase),sin(samplePosition.z+phase)-cos(samplePosition.x-phase),sin(samplePosition.x+phase)-cos(samplePosition.y-phase));
   velocity.xyz+=(acceleration+turbulence*flow)*dt;velocity.xyz*=dragFactor;position.xyz+=velocity.xyz*dt;
   for(int c=0;c<8;c++){if(c>=colliderCount)break;contact(position.xyz,velocity.xyz,particleRadius*meta.x,sub*8+c);}
  }
  float ageSteps=(simulationEpoch-meta.w)*65536.+simulationStep-spawn.w+1.;
  position.w=ageSteps/60.0;
  if(ageSteps>=meta.z)position.w=-1.0;
 }
 #ifdef OUTPUT_VELOCITY
 gl_FragColor=velocity;
 #else
 gl_FragColor=position;
 #endif
}
`;
