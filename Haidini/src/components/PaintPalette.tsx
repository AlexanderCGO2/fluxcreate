import { useEffect, useState } from 'react';
import { animatedValue } from '../engine/animation.ts';
import { PAINT_COLOR_KEYS, PAINT_PALETTES, paintPaletteParams } from '../engine/paintPalette.ts';
import { isLocked, type Command, type Project, type SceneNode } from '../engine/project.ts';
import type { Value } from '../engine/catalog.ts';
export default function PaintPalette({project,node,time,disabled,onChange,onCommands}:{project:Project;node:SceneNode;time:number;disabled:boolean;onChange:(key:string,value:Value)=>void;onCommands:(commands:Command[],summary:string)=>void}){
 const [draft,setDraft]=useState<Record<string,string>>({});
 useEffect(()=>setDraft({}),[node.id,project.revision]);
 function preset(name:string){const values=paintPaletteParams(name),at=Math.min(project.timeline.duration,Math.round(time*project.timeline.fps)/project.timeline.fps);
  const commands=Object.entries(values).map(([param,value]):Command=>{const track=project.animations.find(t=>t.nodeId===node.id&&t.param===param);
   return track?{op:'animate',track:{...track,keys:[...track.keys.filter(k=>Math.abs(k.time-at)>.001),{time:at,value:value as number|string,easing:track.keys[0].easing}].sort((a,b)=>a.time-b.time)}}:{op:'set',nodeId:node.id,param,value};
  });onCommands(commands,'Apply '+name+' paint palette');
 }
 return <><div className="paint-palette-presets">{Object.keys(PAINT_PALETTES).map(name=><button key={name} disabled={disabled||['colorCount',...PAINT_COLOR_KEYS].some(key=>isLocked(project,node.id,key))} onClick={()=>preset(name)}>{name}</button>)}</div>
  <div className="paint-palette" aria-label="Paint palette">{PAINT_COLOR_KEYS.slice(0,Number(node.params.colorCount??3)).map((key,i)=>{
   const current=String(animatedValue(project.animations,node.id,key,time,String(node.params[key]??PAINT_PALETTES.Vivid[i])));
   const value=draft[key]??current,locked=isLocked(project,node.id,key);
   const commit=()=>{if(draft[key]!==undefined&&!locked&&!disabled&&value!==current)onChange(key,value);};
   return <label key={key}><span>{i+1}{locked?' · locked':''}</span><input type="color" aria-label={'Paint color '+(i+1)} title={value} disabled={disabled||locked} value={value} onChange={e=>setDraft(d=>({...d,[key]:e.target.value}))} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/><small>{value.toUpperCase()}</small></label>;
  })}</div><p className="control-hint">Choose a swatch to edit it. New colors enter through the flowing inlets.</p>
 </>;
}
