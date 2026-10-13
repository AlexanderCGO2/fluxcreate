import React,{useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,MoveHorizontal} from 'lucide-react';
import {rollingPair,rollingBounds,planRollingEdit} from './model.mjs';
import {useSourceDuration} from './SlipEditing.jsx';
import './rolling.css';

export function useRollingEditing({project,selected,context,getProject,getSelected,onCommit,onPause,onError}){
 let pair,pairError;try{pair=rollingPair(project,selected);}catch(error){pairError=error.message;}
 const leftMedia=useSourceDuration(project.assets.find(a=>a.id===pair?.left.assetId)),rightMedia=useSourceDuration(project.assets.find(a=>a.id===pair?.right.assetId));
 const [draft,setDraft]=useState(null),cleanup=useRef(null),latest=useRef(null);
 latest.current={project,selected,context,getProject,getSelected,onCommit,onPause,onError};
 let bounds,error;
 try{if(pairError)throw Error(pairError);if(leftMedia.loading||rightMedia.loading)throw Error('Reading both source durations…');if(leftMedia.error||rightMedia.error)throw Error(leftMedia.error||rightMedia.error);bounds=rollingBounds(project,selected,{leftDuration:leftMedia.duration,rightDuration:rightMedia.duration});}catch(e){error=e.message;}
 useEffect(()=>{cleanup.current?.();setDraft(null);},[project,selected,context]);
 useEffect(()=>()=>cleanup.current?.(),[]);
 const current=()=>latest.current.getProject()===project&&latest.current.getSelected()===selected&&latest.current.context===context;
 function apply(values){try{if(!current())throw Error('The sequence or selection changed. Review the shared cut again.');if(!bounds)throw Error(error);const plan=planRollingEdit(project,{clipId:selected,...values,leftDuration:bounds.leftDuration,rightDuration:bounds.rightDuration});if(Math.abs(plan.delta)<1e-10)return true;latest.current.onPause(bounds.cutTime);return !!latest.current.onCommit(plan.project,project);}catch(e){latest.current.onError(e.message);return false;}}
 function begin(event){
  if(event.button!==0||!bounds)return;event.preventDefault();event.stopPropagation();cleanup.current?.();
  const rect=event.currentTarget.getBoundingClientRect(),pointerId=event.pointerId;let plan=null,ended=false;
  latest.current.onPause(bounds.cutTime);
  const finish=commit=>{if(ended)return;ended=true;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);cleanup.current=null;setDraft(null);if(!commit||!plan||Math.abs(plan.delta)<1e-10)return;if(!current()){latest.current.onError('The sequence or selection changed. The rolling preview was discarded.');return;}latest.current.onCommit(plan.project,project);};
  const cancel=e=>{if(e?.type==='pointercancel'&&e.pointerId!==pointerId)return;finish(false);},release=e=>{if(e.pointerId===pointerId)finish(true);},key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){cancel();}};
  const move=e=>{if(e.pointerId!==pointerId)return;if(!current()){cancel();return;}const fraction=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),frames=Math.round(bounds.minFrames+fraction*(bounds.maxFrames-bounds.minFrames));try{plan=planRollingEdit(project,{clipId:selected,deltaFrames:frames,leftDuration:bounds.leftDuration,rightDuration:bounds.rightDuration});setDraft({base:project,project:plan.project,cutTime:plan.cutTime,deltaFrames:frames});}catch(error){cancel();latest.current.onError(error.message);}};
  cleanup.current=cancel;window.addEventListener('pointermove',move);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);move(event);
 }
 return {pair,bounds,error,draft,apply,begin,previewProject:draft?.base===project?draft.project:project};
}

export function RollingControls({clip,state}){
 const cut=clip.start+clip.duration,[value,setValue]=useState(String(cut));useEffect(()=>setValue(String(cut)),[clip.id,cut]);
 const {bounds,pair}=state;
 return <div className="rolling-controls"><div className="slip-heading"><MoveHorizontal size={14}/><h3>Rolling trim</h3></div>
  <p>Move the cut into the next clip on this track. The pair’s outside endpoints and every other track stay fixed.</p>
  <form noValidate onSubmit={e=>{e.preventDefault();state.apply({cutTime:value.trim()===''?NaN:Number(value)});}}>
   <label className="property"><span>Shared cut</span><div><input aria-label="Rolling cut time" type="number" min={bounds?.min} max={bounds?.max} step="any" value={value} disabled={!bounds} onChange={e=>setValue(e.target.value)}/><small>s</small></div></label>
   <div className="slip-actions"><button type="button" aria-label="Roll cut one frame earlier" disabled={!bounds||bounds.minFrames> -1} onClick={()=>state.apply({deltaFrames:-1})}><ChevronLeft size={14}/>1 frame</button><button type="button" aria-label="Roll cut one frame later" disabled={!bounds||bounds.maxFrames<1} onClick={()=>state.apply({deltaFrames:1})}>1 frame<ChevronRight size={14}/></button><button type="submit" disabled={!bounds}>Apply rolling trim</button></div>
  </form>
  <label className="rolling-slider-label">Preview shared cut<input aria-label="Rolling cut preview" type="range" min={bounds?.minFrames??0} max={bounds?.maxFrames??0} step="1" value={state.draft?.deltaFrames??0} disabled={!bounds||bounds.minFrames===bounds.maxFrames} onPointerDown={state.begin} onChange={e=>state.apply({deltaFrames:Number(e.target.value)})}/></label>
  <p className="rolling-range" aria-live="polite">{bounds?`${pair.left.name} → ${pair.right.name} · ${bounds.min.toFixed(3)}–${bounds.max.toFixed(3)}s available`:state.error}</p>
  {state.draft?<p className="rolling-preview-status" aria-live="polite">Cut {state.draft.cutTime.toFixed(3)}s · release to apply · Escape cancels</p>:bounds&&<p>Drag to preview, release to apply. Numeric times snap to sequence frames. Picture and sound roll independently.</p>}
 </div>;
}
