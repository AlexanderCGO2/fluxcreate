import { CATALOG } from './catalog.ts';
import { animatedValue } from './animation.ts';
import { isLocked, type Project, type Command } from './project.ts';
export type ManipulationMode='translate'|'rotate'|'scale';
export function manipulationKeys(mode:ManipulationMode){return mode==='translate'?['x','y','z']:mode==='rotate'?['rotateX','rotateY','rotateZ']:['scale'];}
export function manipulationValues(project:Project,nodeId:string,time:number){
 const node=project.graph.nodes.find(n=>n.id===nodeId);if(!node)return {};
 return Object.fromEntries(['x','y','z','rotateX','rotateY','rotateZ','scale'].filter(k=>CATALOG[node.type].params[k]).map(k=>[k,Number(animatedValue(project.animations,nodeId,k,time,Number(node.params[k])))]));
}
export function manipulationCommands(project:Project,nodeId:string,values:Record<string,number>,time:number):Command[]{
 const node=project.graph.nodes.find(n=>n.id===nodeId);if(!node)return [];
 const commands:Command[]=[],at=Math.min(project.timeline.duration,Math.round(time*project.timeline.fps)/project.timeline.fps);
 for(const [param,raw] of Object.entries(values)){
  const spec=CATALOG[node.type].params[param];if(!spec||!Number.isFinite(raw)||isLocked(project,nodeId,param))continue;
  const value=Math.round(Math.min(spec.max!,Math.max(spec.min!,raw))*10000)/10000;
  const old=Number(animatedValue(project.animations,nodeId,param,time,Number(node.params[param])));if(Math.abs(value-old)<.00005)continue;
  const track=project.animations.find(t=>t.nodeId===nodeId&&t.param===param);
  if(track)commands.push({op:'animate',track:{...track,keys:[...track.keys.filter(k=>Math.abs(k.time-at)>.001),{time:at,value,easing:track.keys[0].easing}].sort((a,b)=>a.time-b.time)}});
  else commands.push({op:'set',nodeId,param,value});
 }
 return commands;
}
