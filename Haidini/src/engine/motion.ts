import { random } from './geometry.ts';
import type { ParticleItem, Params } from './evaluator.ts';
const tau=Math.PI*2;
export function glyphPose(index:number,time:number,p?:Params){
  if(!p)return {y:0,z:0,rotation:0,scale:1};
  const t=time-Number(p.start),delay=index*Number(p.stagger),amp=Number(p.amplitude),tilt=Number(p.tilt)*Math.PI/180;
  if(p.mode==='wave'){const phase=(t-delay)*Number(p.frequency)*tau;return {y:Math.sin(phase)*amp,z:Math.cos(phase*.7)*amp*.2,rotation:Math.sin(phase)*tilt,scale:1};}
  const progress=Math.max(0,Math.min(1,(t-delay)/Number(p.duration)));
  if(p.mode==='typewriter')return {y:0,z:0,rotation:0,scale:t>=delay?1:0.0001};
  const eased=1-(1-progress)**3;return {y:-(1-eased)*amp,z:0,rotation:(1-eased)*tilt,scale:Math.max(.0001,eased)};
}
export function particlePose(index:number,time:number,item:ParticleItem){
  const p=item.params,m=item.motion,seed=Number(p.seed),life=Number(p.lifetime),phase=random(seed,index*7)*life;
  const age=((time+phase)%life+life)%life,progress=age/life,angle=random(seed,index*7+1)*tau,radius=Math.sqrt(random(seed,index*7+2))*Number(p.radius),height=(random(seed,index*7+3)-.5)*2;
  const speed=Number(p.speed),frequency=Number(m?.frequency??.3),amp=Number(m?.amplitude??1),gravity=Number(m?.gravity??-.5),turb=Number(m?.turbulence??.1);
  let x=Math.cos(angle)*radius,y=height,z=Math.sin(angle)*radius*.45;
  if(m?.mode==='swirl'){const a=angle+age*frequency*tau;x=Math.cos(a)*(radius+Math.sin(age)*amp*.2);z=Math.sin(a)*radius*.5;y=height*amp+Math.sin(a*2+phase)*amp*.4+speed*(progress-.5);}
  else if(m?.mode==='drift'){x+=speed*age;y+=Math.sin(age*frequency*tau+phase)*amp;z+=Math.cos(age*frequency*tau+phase)*amp*.4;}
  else if(['rain','snow','confetti'].includes(String(m?.mode))){y=5-(age*speed%10);const drift=m?.mode==='rain'?age*.3:Math.sin(age*frequency*tau+phase)*amp;x+=drift;z+=Math.cos(age+phase)*turb;}
  else if(m?.mode==='tornado'){const a=angle+age*frequency*tau*speed,r=.25+progress*Number(p.radius);x=Math.cos(a)*r;z=Math.sin(a)*r;y=-3+progress*8;}
  else if(m?.mode==='bubbles'){y=-4+(age*speed%8);x+=Math.sin(age*frequency*tau+phase)*amp;z+=Math.cos(age+phase)*amp;}
  else if(m?.mode==='fire'){const taper=1-progress;x*=taper;z*=taper;y=age*speed;x+=Math.sin(age*5+phase)*amp*.2*progress;}
  else if(['fireworks','explosion','debris'].includes(String(m?.mode))){const burst=((time%life)+life)%life,spread=burst*(.65+random(seed,index*7+5)*.35)*speed,vertical=random(seed,index*7+6)*2-1,radial=Math.sqrt(1-vertical*vertical);x=Math.cos(angle)*spread*radial;y=vertical*spread+.5*gravity*burst*burst;z=Math.sin(angle)*spread*radial;if(m?.mode==='debris'&&y<-2)y=-2+Math.abs(y+2)*Math.exp(-burst*1.7);}
  else if(m?.mode==='sand'){const fall=Math.min(age,1),pile=Math.max(0,age-1)/Math.max(1,life-1);x+=Math.cos(angle)*pile*3;z+=Math.sin(angle)*pile*3;y=age<1?-speed*fall+.5*gravity*fall*fall:-5+1.5*(1-pile);}
  else{y+=speed*age+.5*gravity*age*age;x+=Math.cos(angle)*age*amp*.25;z+=Math.sin(angle)*age*amp*.25;}
  x+=Math.sin(age*3.1+index)*turb;y+=Math.cos(age*2.3+index*.7)*turb;
  const burst=['fireworks','explosion','debris'].includes(String(m?.mode)),visibleProgress=burst?((time%life)+life)%life/life:progress,fade=Math.min(1,visibleProgress*12,(1-visibleProgress)*5),scale=Math.max(.001,Number(p.size)*fade*(.65+random(seed,index*7+4)*.7));
  return {x:x+Number(p.x),y:y+Number(p.y),z:z+Number(p.z),scale,age,progress:visibleProgress,rotation:angle+time*(.5+random(seed,index)*2)};
}
