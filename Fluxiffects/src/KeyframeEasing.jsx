import React,{useEffect,useRef,useState} from 'react';
import {DEFAULT_BEZIER,EASINGS} from './core.mjs';
import './keyframe-easing.css';
const bound=value=>Math.max(0,Math.min(1,value));
const labels=['First handle time','First handle value','Second handle time','Second handle value'];

export function KeyframeEasing({keyframe,disabled,onChange}){
 const [draft,setDraft]=useState(()=>[...(keyframe.bezier??DEFAULT_BEZIER)]),[dragging,setDragging]=useState(false),svg=useRef(null),stop=useRef(null);
 useEffect(()=>{stop.current?.();setDraft([...(keyframe.bezier??DEFAULT_BEZIER)]);},[keyframe,disabled]);
 useEffect(()=>()=>stop.current?.(),[]);
 const commit=next=>{if(disabled)return;const numbers=next.map(Number);if(next.some(v=>String(v).trim()==='')||numbers.some(v=>!Number.isFinite(v))){setDraft([...(keyframe.bezier??DEFAULT_BEZIER)]);return;}const value=numbers.map(bound);setDraft(value);if(value.some((v,i)=>v!==(keyframe.bezier??DEFAULT_BEZIER)[i]))onChange('cubic-bezier',value);};
 const drag=(event,index)=>{
  if(disabled||event.button!==0)return;event.preventDefault();event.stopPropagation();stop.current?.();let current=[...(keyframe.bezier??DEFAULT_BEZIER)];const original=[...current],rect=svg.current.getBoundingClientRect();setDragging(true);
  const move=e=>{current=[...current];current[index]=bound(((e.clientX-rect.left)/rect.width*220-20)/180);current[index+1]=bound(1-((e.clientY-rect.top)/rect.height*180-20)/140);setDraft(current);};
  const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',key,true);stop.current=null;setDragging(false);};
  const cancel=()=>{cleanup();setDraft(original);},end=()=>{cleanup();commit(current);},key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}};
  stop.current=cancel;window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true});window.addEventListener('pointercancel',cancel,{once:true});window.addEventListener('keydown',key,true);
 };
 const keyboard=(event,index)=>{if(disabled||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();const next=[...(keyframe.bezier??DEFAULT_BEZIER)],axis=['ArrowUp','ArrowDown'].includes(event.key)?1:0,sign=['ArrowLeft','ArrowDown'].includes(event.key)?-1:1;next[index+axis]=bound(next[index+axis]+sign*(event.shiftKey?.1:.01));commit(next);};
 const values=draft.map((v,i)=>Number.isFinite(Number(v))?bound(Number(v)):DEFAULT_BEZIER[i]),[x1,y1,x2,y2]=values;
 return <div className="keyframe-easing"><select aria-label={`Easing at ${keyframe.time}`} value={keyframe.easing} disabled={disabled} onChange={e=>onChange(e.target.value,e.target.value==='cubic-bezier'?keyframe.bezier??DEFAULT_BEZIER:undefined)}>{Object.entries(EASINGS).map(([value,name])=><option key={value} value={value}>{name}</option>)}<option value="cubic-bezier">Custom curve</option></select>
  {keyframe.easing==='cubic-bezier'&&<div className="bezier-editor"><p>Curve to the next keyframe</p><svg ref={svg} viewBox="0 0 220 180" preserveAspectRatio="none" aria-label={`Easing curve at ${keyframe.time}`}><path className="curve-grid" d="M20 20H200V160H20ZM20 90H200M110 20V160"/><path className="curve-guide" d={`M20 160L${20+x1*180} ${160-y1*140}M200 20L${20+x2*180} ${160-y2*140}`}/><path className="curve-path" d={`M20 160C${20+x1*180} ${160-y1*140},${20+x2*180} ${160-y2*140},200 20`}/>{[[x1,y1],[x2,y2]].map(([x,y],i)=><circle key={i} className="curve-handle" role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-label={`${i?'Second':'First'} curve handle at ${keyframe.time}`} cx={20+x*180} cy={160-y*140} r="7" onPointerDown={e=>drag(e,i*2)} onKeyDown={e=>keyboard(e,i*2)}><title>Drag, or use arrow keys. Shift moves further.</title></circle>)}<text x="20" y="176">Start</text><text x="200" y="176" textAnchor="end">End</text></svg><div className="curve-fields">{labels.map((label,i)=><label key={label}><span>{['Time 1','Value 1','Time 2','Value 2'][i]}</span><input aria-label={`${label} at ${keyframe.time}`} type="number" min="0" max="1" step=".01" disabled={disabled} value={draft[i]} onChange={e=>setDraft(current=>current.map((v,n)=>n===i?e.target.value:v))} onBlur={()=>commit(draft)} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape')setDraft([...(keyframe.bezier??DEFAULT_BEZIER)]);}}/></label>)}</div><small>{dragging?'Release to apply · Esc cancels':'Drag handles or use arrow keys · range 0–1'}</small></div>}
 </div>;
}
