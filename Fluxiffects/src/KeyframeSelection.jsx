import React, {useEffect,useRef,useState} from 'react';
import {getComp,supportsKeyframePaste} from './core.mjs';
import {editKeyframeGroup,copyKeyframeGroup,pasteKeyframeGroup} from './grouped-keyframes.mjs';
import './keyframe-selection.css';

const scopeOf=(projectId,compId,layerId)=>JSON.stringify([projectId,compId,layerId]);
const sameKey=(a,b)=>a.property===b.property&&a.id===b.id;
const layerKeys=layer=>Object.entries(layer?.keyframes??{}).flatMap(([property,keys])=>keys.map(key=>({property,id:key.id})));
const keyIdentity=ref=>JSON.stringify([ref.property,ref.id]);
const liveKeys=(layer,refs)=>{const tracks=new Map(Object.entries(layer?.keyframes??{}).map(([property,keys])=>[property,new Set(keys.map(key=>key.id))]));return refs.filter(ref=>tracks.get(ref.property)?.has(ref.id));};
const clipboardCount=clipboard=>clipboard?.tracks.reduce((n,track)=>n+track.keys.length,0)??0;
function applyToProject(project,layerId,refs,action){
  const comp=getComp(project),layer=comp.layers.find(item=>item.id===layerId);
  if(!layer)throw Error('This layer no longer exists.');
  const next=editKeyframeGroup(layer,refs,action,{duration:comp.duration});
  if(next===layer)return project;
  return {...project,compositions:project.compositions.map(item=>item.id===comp.id?{...comp,layers:comp.layers.map(item=>item.id===layerId?next:item)}:item)};
}

export function useKeyframeSelection({project,selectedId,property,time,commit,notice,onChoose,onPause}){
  const [selection,setSelection]=useState({scope:'',refs:[]}),[draft,setDraft]=useState(null),[clipboard,setClipboard]=useState(null),[dragging,setDragging]=useState(false);
  const current=useRef(null),gesture=useRef(null);
  current.current={project,selectedId,property,commit,notice,onChoose,onPause};
  const comp=getComp(project),layer=comp.layers.find(item=>item.id===selectedId),scope=scopeOf(project.id,comp.id,selectedId),track=layer?.keyframes?.[property]??[];
  const refs=selection.scope===scope?liveKeys(layer,selection.refs):[],ids=refs.filter(ref=>ref.property===property).map(ref=>ref.id);
  const identities=new Set(refs.map(keyIdentity)),counts={};for(const ref of refs)counts[ref.property]=(counts[ref.property]??0)+1;
  const choose=(next,layerId=selectedId)=>setSelection({scope:scopeOf(project.id,comp.id,layerId),refs:next});
  const clear=()=>{gesture.current?.cancel();setSelection({scope:'',refs:[]});};
  const toggle=id=>{gesture.current?.cancel();const ref={property,id};choose(refs.some(item=>sameKey(item,ref))?refs.filter(item=>!sameKey(item,ref)):[...refs,ref]);};
  const apply=action=>{
    gesture.current?.cancel();const base=project;
    try{
      if(current.current.project!==base)throw Error('The project changed. Select the keys again.');
      const next=applyToProject(base,selectedId,refs,action);
      if(next!==base){onPause();commit(p=>p===base?next:p);notice(`${refs.length} keyframe${refs.length===1?'':'s'} ${action.type==='delete'?'deleted':'moved'}.`);}
    }catch(error){notice(error.message);}
  };
  const copy=()=>{
    gesture.current?.cancel();
    try{
      if(current.current.project!==project)throw Error('The project changed. Select the keys again.');
      if(!layer)throw Error('Select a source layer first.');
      const next=copyKeyframeGroup(layer,refs);setClipboard(next);
      notice(`${clipboardCount(next)} keyframes copied across ${next.tracks.length} ${next.tracks.length===1?'property':'properties'}. Paste into the same compatible properties at the playhead.`);
    }catch(error){notice(error.message);}
  };
  const paste=()=>{
    gesture.current?.cancel();
    try{
      if(current.current.project!==project)throw Error('The project changed. Choose the destination again.');
      if(!layer)throw Error('Select a destination layer first.');
      if(clipboard?.tracks.length===1&&clipboard.tracks[0].property!==property)throw Error('Choose the same compatible property as the copied keys.');
      const keyCount=project.compositions.reduce((sum,item)=>sum+item.layers.reduce((n,l)=>n+Object.values(l.keyframes??{}).reduce((n,keys)=>n+keys.length,0),0),0);
      const next=pasteKeyframeGroup(layer,clipboard,time,{duration:comp.duration,remainingKeys:100000-keyCount});
      const nextProject={...project,compositions:project.compositions.map(item=>item.id===comp.id?{...comp,layers:comp.layers.map(item=>item.id===layer.id?next:item)}:item)};
      onPause();commit(p=>p===project?nextProject:p);
      const original=new Map(Object.entries(layer.keyframes??{}).map(([prop,keys])=>[prop,new Set(keys.map(key=>key.id))]));
      choose(layerKeys(next).filter(ref=>!original.get(ref.property)?.has(ref.id)));
      notice(clipboardCount(clipboard)+' keyframes pasted. Undo removes the whole paste.');
    }catch(error){notice(error.message);}
  };
  const canPaste=!!clipboard&&!!layer&&!layer.locked&&clipboard.tracks.every(track=>supportsKeyframePaste(layer,track.property))&&(clipboard.tracks.length>1||clipboard.tracks[0].property===property);
  const isSelected=(layerId,prop,id)=>layerId===selectedId&&identities.has(keyIdentity({property:prop,id}));
  const begin=(event,target,prop,key)=>{
    event.stopPropagation();if(event.button!==0)return;event.preventDefault();if(gesture.current)return;
    const targetScope=scopeOf(project.id,comp.id,target.id),old=selection.scope===targetScope?liveKeys(target,selection.refs):[],ref={property:prop,id:key.id};
    onChoose(target.id,prop,key.time);onPause();
    if(event.shiftKey||event.ctrlKey||event.metaKey){choose(old.some(item=>sameKey(item,ref))?old.filter(item=>!sameKey(item,ref)):[...old,ref],target.id);return;}
    const moving=old.some(item=>sameKey(item,ref))?old:[ref];choose(moving,target.id);
    if(target.locked){notice('Unlock the layer before editing keyframes.');return;}
    const base=project,startX=event.clientX,pointerId=event.pointerId,width=event.currentTarget.closest('.track-lane').getBoundingClientRect().width;
    let next=null,lastDelta=0,error='',moved=false;
    const valid=()=>current.current.project===base&&scopeOf(current.current.project.id,getComp(current.current.project).id,current.current.selectedId)===targetScope&&current.current.property===prop;
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancelPointer);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',escape,true);gesture.current=null;setDragging(false);setDraft(null);};
    const cancel=()=>cleanup();
    const cancelPointer=e=>{if(e.pointerId===pointerId)cancel();};
    const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();}};
    const move=e=>{
      if(e.pointerId!==pointerId)return;if(!valid()){cancel();return;}
      if(!moved&&Math.abs(e.clientX-startX)<3)return;moved=true;lastDelta=Math.round((e.clientX-startX)/width*comp.duration*comp.fps)/comp.fps;
      try{next=applyToProject(base,target.id,moving,{type:'move',delta:lastDelta});error='';setDraft({base,project:next,label:`${moving.length} selected · ${lastDelta>=0?'+':''}${lastDelta.toFixed(3)} s · release to apply, Esc to cancel`});}
      catch(failure){next=null;error=failure.message;setDraft({base,project:base,label:error});}
    };
    const end=e=>{if(e.pointerId!==pointerId)return;const canCommit=valid();cleanup();if(!canCommit)return;if(error)notice(error);else if(next&&next!==base&&lastDelta!==0)commit(p=>p===base?next:p);};
    gesture.current={base,scope:targetScope,property:prop,cancel};setDragging(true);
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancelPointer);window.addEventListener('blur',cancel);window.addEventListener('keydown',escape,true);
  };
  useEffect(()=>{const active=gesture.current;if(active&&(active.base!==project||active.scope!==scope||active.property!==property))active.cancel();},[project,scope,property]);
  // Keep dormant IDs in the same scope so Undo restores the prior key selection.
  // Live lookups exclude deleted keys; leaving the layer/comp permanently clears them.
  useEffect(()=>{setSelection(previous=>previous.scope!==scope&&previous.refs.length?{scope:'',refs:[]}:previous);},[scope]);
  useEffect(()=>()=>gesture.current?.cancel(),[]);
  return {dragging,isDragging:()=>!!gesture.current,ids,total:refs.length,counts,toggle,clear,copy,paste,canPaste,clipboard,clipboardCount:clipboardCount(clipboard),
    all:()=>{gesture.current?.cancel();choose(track.map(key=>({property,id:key.id})));},allLayer:()=>{gesture.current?.cancel();choose(layerKeys(layer));},
    apply,begin,isSelected,previewProject:draft?.base===project?draft.project:project,draftLabel:draft?.base===project?draft.label:''};
}

export function KeyframeSelectionControls({selection,layer,property,label,labels={},fps}){
  const [delta,setDelta]=useState('0.1'),hasKeys=!!layer.keyframes?.[property]?.length,hasLayerKeys=Object.values(layer.keyframes??{}).some(keys=>keys.length),disabled=layer.locked||!selection.total;
  return <div className="key-selection-controls" aria-label="Keyframe selection controls">
    <div><strong>{selection.total} selected · {Object.keys(selection.counts).length} {Object.keys(selection.counts).length===1?'property':'properties'}</strong><button disabled={!hasKeys} onClick={selection.all}>Select all keys</button><button disabled={!selection.total} onClick={selection.clear}>Clear keys</button></div>
    <p>{label} · checkboxes and Select all keys use this property. Shift-click diamonds to add other properties on this layer.</p>
    <div><button disabled={!hasLayerKeys} onClick={selection.allLayer}>Select all layer keys</button><span aria-label="Selected property counts">{Object.entries(selection.counts).map(([prop,count])=>`${labels[prop]||prop}: ${count}`).join(' · ')}</span></div>
    <div className="key-selection-actions"><button disabled={!selection.total} onClick={selection.copy}>Copy keys</button><button disabled={!selection.canPaste} onClick={selection.paste}>Paste keys at playhead</button></div>
    {selection.clipboard&&<small>{selection.clipboardCount} copied · {selection.clipboard.tracks.map(track=>labels[track.property]||track.property).join(', ')} · one earliest-key anchor, spacing in seconds</small>}
    <form noValidate onSubmit={event=>{event.preventDefault();selection.apply({type:'move',delta:delta.trim()?Number(delta):NaN});}}>
      <label>Move by seconds<input aria-label="Selected keyframe time change" type="number" step="any" value={delta} disabled={disabled} onChange={event=>setDelta(event.target.value)}/></label><button className="button" type="submit" disabled={disabled}>Move keys</button>
    </form>
    <div className="key-selection-actions"><button disabled={disabled} onClick={()=>selection.apply({type:'move',delta:-1/fps})}>−1 frame</button><button disabled={disabled} onClick={()=>selection.apply({type:'move',delta:1/fps})}>+1 frame</button><button disabled={disabled} onClick={()=>selection.apply({type:'delete'})}>Delete keys</button></div>
    <small>{layer.locked?'Unlock this layer to edit its keys.':'Move, delete and copy affect all selected properties. An incompatible track, collision or out-of-range key rejects the whole operation.'}</small>
  </div>;
}
