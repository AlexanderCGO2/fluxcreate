import {hasMedia,mediaSource,openMediaURL} from './local-media.mjs';
import React,{useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,MoveHorizontal} from 'lucide-react';
import {planSlipEdit,slipBounds} from './model.mjs';
import './slip.css';

export function useSourceDuration(asset){
 const [result,setResult]=useState({src:null});
 useEffect(()=>{
  if(!hasMedia(asset)||!['audio','video'].includes(asset.type)){setResult({src:mediaSource(asset),error:'Relink the offline source before editing this clip.'});return;}
  const src=mediaSource(asset),opened=openMediaURL(asset),media=document.createElement(asset.type);let active=true;
  setResult({src,loading:true});media.preload='metadata';media.muted=true;
  const clean=()=>{media.onloadedmetadata=null;media.onerror=null;media.removeAttribute('src');media.load();opened.release();};
  const finish=error=>{if(!active)return;active=false;clearTimeout(timer);const duration=media.duration;setResult({src,...(error?{error}:{duration})});clean();};
  const timer=setTimeout(()=>finish('The source duration could not be read. Relink a file with a readable duration.'),12000);
  media.onloadedmetadata=()=>finish(Number.isFinite(media.duration)&&media.duration>0?'':'The source duration is unknown. Relink a file with a readable duration.');
  media.onerror=()=>finish('This source could not be decoded. Relink it before editing.');media.src=opened.url;
  return()=>{active=false;clearTimeout(timer);clean();};
 },[asset?.src,asset?.blob,asset?.type]);
 return result.src===mediaSource(asset)?result:{loading:true};
}

export function useSlipEditing({project,selected,getProject,getSelected,onCommit,onPause,onError,timelineRef}){
 const clip=project.clips.find(c=>c.id===selected),asset=project.assets.find(a=>a.id===clip?.assetId),measured=useSourceDuration(asset);
 const [mode,setMode]=useState(false),[draft,setDraft]=useState(null),cleanup=useRef(null),latest=useRef(null);
 latest.current={project,selected,getProject,getSelected,onCommit,onPause,onError};
 let bounds,error;
 try{if(measured.loading)throw Error('Reading the source duration…');if(measured.error)throw Error(measured.error);bounds=slipBounds(project,selected,{sourceDuration:measured.duration});}catch(e){error=e.message;}
 useEffect(()=>{cleanup.current?.();setDraft(null);},[project,selected,mode]);
 useEffect(()=>()=>cleanup.current?.(),[]);
 function apply(values){try{const current=latest.current,base=current.getProject();if(base!==project||current.getSelected()!==selected)throw Error('The selection changed. Review its source range again.');if(!bounds)throw Error(error);const plan=planSlipEdit(base,{clipId:selected,...values,sourceDuration:bounds.sourceDuration});if(Math.abs(plan.delta)<1e-10)return true;current.onPause(base.clips.find(c=>c.id===selected));return !!current.onCommit(plan.project,base);}catch(e){latest.current.onError(e.message);return false;}}
 function begin(event,item){
  event.preventDefault();event.stopPropagation();if(event.button!==0)return;
  if(!bounds||item.id!==selected){latest.current.onError(item.id!==selected?'Select this clip first, then drag to slip its source.':error);return;}
  cleanup.current?.();const base=project,pointerId=event.pointerId,startX=event.clientX,pixels=timelineRef.current.getBoundingClientRect().width/base.duration,original=item.sourceIn;let plan=null,ended=false;
  latest.current.onPause(item);
  const finish=commit=>{if(ended)return;ended=true;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);cleanup.current=null;setDraft(null);if(!commit||!plan||Math.abs(plan.delta)<1e-10)return;const current=latest.current;if(current.getProject()!==base||current.getSelected()!==item.id){current.onError('The sequence or selection changed. The slip preview was discarded.');return;}current.onCommit(plan.project,base);};
  const cancel=e=>{if(e?.type==='pointercancel'&&e.pointerId!==pointerId)return;finish(false);},release=e=>{if(e.pointerId===pointerId)finish(true);},key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}};
  const move=e=>{if(e.pointerId!==pointerId)return;const current=latest.current;if(current.getProject()!==base||current.getSelected()!==item.id){cancel();return;}const frames=Math.round((e.clientX-startX)/pixels*base.fps),sourceIn=Math.max(bounds.min,Math.min(bounds.max,original+frames*bounds.frameStep));try{plan=planSlipEdit(base,{clipId:item.id,sourceIn,sourceDuration:bounds.sourceDuration});setDraft({base,project:plan.project,sourceIn:plan.sourceIn,sourceOut:plan.sourceOut,delta:plan.delta});}catch(error){cancel();current.onError(error.message);}};
  cleanup.current=cancel;window.addEventListener('pointermove',move);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel,{once:true});window.addEventListener('keydown',key,true);
 }
 return {mode,setMode,draft,bounds,error,apply,begin,previewProject:draft?.base===project?draft.project:project};
}

export function SlipControls({clip,state}){
 const [value,setValue]=useState(String(clip.sourceIn));useEffect(()=>setValue(String(clip.sourceIn)),[clip.id,clip.sourceIn]);
 const bounds=state.bounds,offset=state.draft?.sourceIn??clip.sourceIn;
 return <div className="slip-controls"><div className="slip-heading"><MoveHorizontal size={14}/><h3>Slip source</h3></div>
  <p>Choose different content inside the same timeline slot. Drag right in Slip mode to show later source content.</p>
  <form noValidate onSubmit={e=>{e.preventDefault();if(state.apply({sourceIn:value.trim()===''?NaN:Number(value)}))setValue(String(Number(value)));}}>
   <label className="property"><span>Source in</span><div><input aria-label="Source in" type="number" min="0" max={bounds?.max} step="any" value={value} disabled={!bounds} onChange={e=>setValue(e.target.value)}/><small>s</small></div></label>
   <div className="slip-actions"><button type="button" aria-label="Slip source one frame earlier" disabled={!bounds||clip.sourceIn-bounds.frameStep< -1e-8} onClick={()=>state.apply({deltaFrames:-1})}><ChevronLeft size={14}/>1 frame</button><button type="button" aria-label="Slip source one frame later" disabled={!bounds||clip.sourceIn+bounds.frameStep>bounds.max+1e-8} onClick={()=>state.apply({deltaFrames:1})}>1 frame<ChevronRight size={14}/></button><button type="submit" disabled={!bounds}>Apply slip</button></div>
  </form>
  <p className="slip-range" aria-live="polite">{bounds?`${offset.toFixed(3)}–${(offset+bounds.sourceSpan).toFixed(3)}s of ${bounds.sourceDuration.toFixed(3)}s · ${clip.playbackRate}× speed`:state.error}</p>
  {bounds&&<p>One frame shifts the source by {(bounds.frameStep*1000).toFixed(3)} ms. This clip moves independently of other picture or sound clips.</p>}
 </div>;
}
