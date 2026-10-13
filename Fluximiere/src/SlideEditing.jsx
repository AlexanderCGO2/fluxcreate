import React,{useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,MoveHorizontal} from 'lucide-react';
import {slideGroup,slideBounds,planSlideEdit} from './model.mjs';
import {useSourceDuration} from './SlipEditing.jsx';
import './slide.css';

export function useSlideEditing({project,selected,context,blocked,playing,getProject,getSelected,onCommit,onPause,onError}){
 let group,groupError;try{group=slideGroup(project,selected);}catch(error){groupError=error.message;}
 const leftMedia=useSourceDuration(project.assets.find(a=>a.id===group?.left.assetId)),middleMedia=useSourceDuration(project.assets.find(a=>a.id===group?.middle.assetId)),rightMedia=useSourceDuration(project.assets.find(a=>a.id===group?.right.assetId));
 const [draft,setDraft]=useState(null),cleanup=useRef(null),latest=useRef(null);
 latest.current={project,selected,context,blocked,playing,getProject,getSelected,onCommit,onPause,onError};
 let bounds,error;
 try{if(groupError)throw Error(groupError);if(blocked)throw Error('Finish or cancel the other edit preview before sliding.');if([leftMedia,middleMedia,rightMedia].some(m=>m.loading))throw Error('Reading all three source durations…');const failed=[leftMedia,middleMedia,rightMedia].find(m=>m.error);if(failed)throw Error(failed.error);bounds=slideBounds(project,selected,{leftDuration:leftMedia.duration,middleDuration:middleMedia.duration,rightDuration:rightMedia.duration});}catch(e){error=e.message;}
 useEffect(()=>{cleanup.current?.();setDraft(null);},[project,selected,context,blocked]);
 useEffect(()=>{if(playing){cleanup.current?.();setDraft(null);}},[playing]);
 useEffect(()=>()=>cleanup.current?.(),[]);
 const current=()=>latest.current.getProject()===project&&latest.current.getSelected()===selected&&latest.current.context===context&&!latest.current.blocked;
 const plan=values=>planSlideEdit(project,{clipId:selected,...values,leftDuration:bounds.leftDuration,middleDuration:bounds.middleDuration,rightDuration:bounds.rightDuration});
 function apply(values){try{if(!current())throw Error('The sequence or selection changed. Review the adjacent clips again.');if(!bounds)throw Error(error);cleanup.current?.();const result=plan(values);if(Math.abs(result.delta)<1e-10)return true;latest.current.onPause(bounds.startTime);return !!latest.current.onCommit(result.project,project);}catch(e){latest.current.onError(e.message);return false;}}
 function begin(event){
  if(event.button!==0||!bounds)return;event.preventDefault();event.stopPropagation();cleanup.current?.();
  const owner=event.currentTarget,rect=owner.getBoundingClientRect(),pointerId=event.pointerId;let candidate=null,ended=false;
  const finish=commit=>{if(ended)return;ended=true;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);owner.removeEventListener('lostpointercapture',cancel);if(owner.hasPointerCapture?.(pointerId))owner.releasePointerCapture(pointerId);cleanup.current=null;setDraft(null);if(!commit||!candidate||Math.abs(candidate.delta)<1e-10)return;if(!current()||latest.current.playing){latest.current.onError('The sequence or selection changed. The slide preview was discarded.');return;}latest.current.onCommit(candidate.project,project);};
  const cancel=e=>{if(['pointercancel','lostpointercapture'].includes(e?.type)&&e.pointerId!==pointerId)return;finish(false);},release=e=>{if(e.pointerId===pointerId)finish(true);},key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')cancel();};
  const move=e=>{if(e.pointerId!==pointerId)return;if(!current()){cancel();return;}const fraction=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),frames=Math.round(bounds.minFrames+fraction*(bounds.maxFrames-bounds.minFrames));try{candidate=plan({deltaFrames:frames});setDraft({base:project,project:candidate.project,startTime:candidate.startTime,deltaFrames:frames});}catch(error){cancel();latest.current.onError(error.message);}};
  try{owner.setPointerCapture(pointerId);}catch{latest.current.onError('The pointer gesture could not start. Try again or use the frame controls.');return;}
  cleanup.current=cancel;window.addEventListener('pointermove',move);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);owner.addEventListener('lostpointercapture',cancel);latest.current.onPause(bounds.startTime);move(event);
 }
 return {group,bounds,error,draft,apply,begin,previewProject:draft?.base===project?draft.project:project};
}

export function SlideControls({clip,state}){
 const [value,setValue]=useState(String(clip.start));useEffect(()=>setValue(String(clip.start)),[clip.id,clip.start]);
 const {bounds,group}=state;
 return <div className="slide-controls"><div className="slip-heading"><MoveHorizontal size={14}/><h3>Slide clip</h3></div>
  <p>Move this clip between its neighbours. Its content and duration stay fixed; the neighbours trim to fill the space.</p>
  <form noValidate onSubmit={e=>{e.preventDefault();state.apply({startTime:value.trim()===''?NaN:Number(value)});}}>
   <label className="property"><span>Selected start</span><div><input aria-label="Slide start time" type="number" min={bounds?.min} max={bounds?.max} step="any" value={value} disabled={!bounds} onChange={e=>setValue(e.target.value)}/><small>s</small></div></label>
   <div className="slip-actions"><button type="button" aria-label="Slide one frame earlier" disabled={!bounds||bounds.minFrames> -1} onClick={()=>state.apply({deltaFrames:-1})}><ChevronLeft size={14}/>1 frame</button><button type="button" aria-label="Slide one frame later" disabled={!bounds||bounds.maxFrames<1} onClick={()=>state.apply({deltaFrames:1})}>1 frame<ChevronRight size={14}/></button><button type="submit" disabled={!bounds}>Apply slide</button></div>
  </form>
  <label className="slide-slider-label">Preview slide<input aria-label="Slide preview" type="range" min={bounds?.minFrames??0} max={bounds?.maxFrames??0} step="1" value={state.draft?.deltaFrames??0} disabled={!bounds||bounds.minFrames===bounds.maxFrames} onPointerDown={state.begin} onChange={e=>state.apply({deltaFrames:Number(e.target.value)})}/></label>
  <p className="slide-range" aria-live="polite">{bounds?`${group.left.name} ← ${group.middle.name} → ${group.right.name} · start ${bounds.min.toFixed(3)}–${bounds.max.toFixed(3)}s`:state.error}</p>
  {state.draft?<p className="slide-preview-status" aria-live="polite">Start {state.draft.startTime.toFixed(3)}s · release to apply · Escape cancels</p>:bounds&&<p>Drag to preview, release to apply. Numeric starts snap to sequence frames. Picture and sound slide independently; other tracks stay fixed.</p>}
 </div>;
}
