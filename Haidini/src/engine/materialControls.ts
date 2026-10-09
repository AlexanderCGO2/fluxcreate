import type { Value } from './catalog.ts';
import { isLocked, type Project, type Command } from './project.ts';
export const MATERIAL_PRESETS:Record<string,Record<string,Value>>={
 'Matte':{roughness:.85,metalness:0,transmission:0,clearcoat:0},
 'Polished metal':{roughness:.16,metalness:1,transmission:0,clearcoat:.2},
 'Glass':{color:'#ffffff',roughness:.06,metalness:0,transmission:1,ior:1.5,thickness:.4,clearcoat:0},
 'Coated plastic':{roughness:.25,metalness:0,transmission:0,clearcoat:1}
};
export function materialPresetCommands(project:Project,nodeId:string,preset:string,time:number):Command[]{
 const values=MATERIAL_PRESETS[preset],node=project.graph.nodes.find(n=>n.id===nodeId);
 if(!values||node?.type!=='material')throw new Error('Select a surface material first.');
 if(Object.keys(values).some(param=>isLocked(project,nodeId,param)))throw new Error('Unlock the material properties before applying this preset.');
 const at=Math.min(project.timeline.duration,Math.round(time*project.timeline.fps)/project.timeline.fps);
 return Object.entries(values).map(([param,value]):Command=>{const track=project.animations.find(t=>t.nodeId===nodeId&&t.param===param);
  return track?{op:'animate',track:{...track,keys:[...track.keys.filter(k=>Math.abs(k.time-at)>.001),{time:at,value:value as number|string,easing:track.keys[0].easing}].sort((a,b)=>a.time-b.time)}}:{op:'set',nodeId,param,value};
 });
}
