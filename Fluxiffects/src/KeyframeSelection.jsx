import React, {useEffect,useRef,useState} from 'react';
import {editKeyframes,getComp,copyKeyframes,pasteKeyframes,supportsKeyframePaste} from './core.mjs';
import './keyframe-selection.css';

const scopeOf = (compId,layerId,property) => JSON.stringify([compId,layerId,property]);
function applyToProject(project,layerId,property,ids,action) {
  const comp=getComp(project), layer=comp.layers.find(item=>item.id===layerId);
  if(!layer)throw Error('This layer no longer exists.');
  const next=editKeyframes(layer,property,ids,action,{duration:comp.duration});
  if(next===layer)return project;
  return {...project,compositions:project.compositions.map(item=>item.id===comp.id?{...comp,layers:comp.layers.map(item=>item.id===layerId?next:item)}:item)};
}

export function useKeyframeSelection({project,selectedId,property,time,commit,notice,onChoose,onPause}) {
  const [selection,setSelection]=useState({scope:'',ids:[]}),[draft,setDraft]=useState(null),[clipboard,setClipboard]=useState(null);
  const current=useRef(null),gesture=useRef(null);
  current.current={project,selectedId,property,commit,notice,onChoose,onPause};
  const comp=getComp(project),scope=scopeOf(comp.id,selectedId,property),track=comp.layers.find(layer=>layer.id===selectedId)?.keyframes?.[property]??[];
  const ids=selection.scope===scope?selection.ids.filter(id=>track.some(key=>key.id===id)):[];
  const choose=(nextIds,layerId=selectedId,prop=property)=>setSelection({scope:scopeOf(comp.id,layerId,prop),ids:nextIds});
  const clear=()=>{gesture.current?.cancel();setSelection({scope:'',ids:[]});};
  const toggle=id=>choose(ids.includes(id)?ids.filter(key=>key!==id):[...ids,id]);
  const apply=action=>{
    const base=project;
    try {
      if(current.current.project!==base)throw Error('The project changed. Select the keys again.');
      const next=applyToProject(base,selectedId,property,ids,action);
      if(next!==base){onPause();commit(p=>p===base?next:p);notice(`${ids.length} keyframe${ids.length===1?'':'s'} ${action.type==='delete'?'deleted':'moved'}.`);}
    }catch(error){notice(error.message);}
  };
  const copy=()=>{
    gesture.current?.cancel();
    try {
      if(current.current.project!==project)throw Error('The project changed. Select the keys again.');
      const layer=comp.layers.find(item=>item.id===selectedId);
      if(!layer)throw Error('Select a source layer first.');
      const next=copyKeyframes(layer,property,ids);setClipboard(next);
      notice(next.keys.length+' keyframes copied. Choose the same property and paste at the playhead.');
    }catch(error){notice(error.message);}
  };
  const paste=()=>{
    gesture.current?.cancel();
    try {
      if(current.current.project!==project)throw Error('The project changed. Choose the destination again.');
      const layer=comp.layers.find(item=>item.id===selectedId);
      if(!layer)throw Error('Select a destination layer first.');
      const keyCount=project.compositions.reduce((sum,item)=>sum+item.layers.reduce((n,layer)=>n+Object.values(layer.keyframes??{}).reduce((n,keys)=>n+keys.length,0),0),0);
      const next=pasteKeyframes(layer,property,clipboard,time,{duration:comp.duration,remainingKeys:100000-keyCount});
      const nextProject={...project,compositions:project.compositions.map(item=>item.id===comp.id?{...comp,layers:comp.layers.map(item=>item.id===layer.id?next:item)}:item)};
      onPause();commit(p=>p===project?nextProject:p);
      choose(next.keyframes[property].filter(key=>!layer.keyframes?.[property]?.some(old=>old.id===key.id)).map(key=>key.id));
      notice(clipboard.keys.length+' keyframes pasted. Undo removes the whole paste.');
    }catch(error){notice(error.message);}
  };
  const destination=comp.layers.find(item=>item.id===selectedId);
  const canPaste=!!clipboard && clipboard.property===property && supportsKeyframePaste(destination,property) && !destination.locked;
  const isSelected=(layerId,prop,id)=>selection.scope===scopeOf(comp.id,layerId,prop)&&selection.ids.includes(id);
  const begin=(event,layer,prop,key)=>{
    event.stopPropagation();if(event.button!==0)return;event.preventDefault();
    gesture.current?.cancel();
    const targetScope=scopeOf(comp.id,layer.id,prop),old=selection.scope===targetScope?selection.ids:[];
    onChoose(layer.id,prop,key.time);onPause();
    if(event.shiftKey||event.ctrlKey||event.metaKey){choose(old.includes(key.id)?old.filter(id=>id!==key.id):[...old,key.id],layer.id,prop);return;}
    const moving=old.includes(key.id)?old:[key.id];choose(moving,layer.id,prop);
    if(layer.locked){notice('Unlock the layer before editing keyframes.');return;}
    const base=project,startX=event.clientX,pointerId=event.pointerId,width=event.currentTarget.closest('.track-lane').getBoundingClientRect().width;
    let next=null,lastDelta=0,error='',moved=false;
    const valid=()=>current.current.project===base&&scopeOf(getComp(current.current.project).id,current.current.selectedId,current.current.property)===targetScope;
    const cleanup=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancelPointer);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',escape,true);gesture.current=null;setDraft(null);};
    const cancel=()=>cleanup();
    const cancelPointer=e=>{if(e.pointerId===pointerId)cancel();};
    const escape=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancel();}};
    const move=e=>{
      if(e.pointerId!==pointerId)return;
      if(!valid()){cancel();return;}
      if(!moved&&Math.abs(e.clientX-startX)<3)return;
      moved=true;lastDelta=Math.round((e.clientX-startX)/width*comp.duration*comp.fps)/comp.fps;
      try{next=applyToProject(base,layer.id,prop,moving,{type:'move',delta:lastDelta});error='';setDraft({base,project:next,label:`${moving.length} selected · ${lastDelta>=0?'+':''}${lastDelta.toFixed(3)} s · release to apply, Esc to cancel`});}
      catch(failure){next=null;error=failure.message;setDraft({base,project:base,label:error});}
    };
    const end=e=>{if(e.pointerId!==pointerId)return;const canCommit=valid();cleanup();if(!canCommit)return;if(error)notice(error);else if(next&&next!==base&&lastDelta!==0)commit(p=>p===base?next:p);};
    gesture.current={base,scope:targetScope,cancel};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancelPointer);window.addEventListener('blur',cancel);window.addEventListener('keydown',escape,true);
  };
  useEffect(()=>{const active=gesture.current;if(active&&(active.base!==project||active.scope!==scope))active.cancel();},[project,scope]);
  useEffect(()=>()=>gesture.current?.cancel(),[]);
  return {ids,toggle,clear,copy,paste,canPaste,clipboard,all:()=>choose(track.map(key=>key.id)),apply,begin,isSelected,previewProject:draft?.base===project?draft.project:project,draftLabel:draft?.base===project?draft.label:''};
}

export function KeyframeSelectionControls({selection,layer,property,label,fps}) {
  const [delta,setDelta]=useState('0.1'),hasKeys=!!layer.keyframes?.[property]?.length,disabled=layer.locked||!selection.ids.length;
  return <div className="key-selection-controls" aria-label="Keyframe selection controls">
    <div><strong>{selection.ids.length} selected</strong><button disabled={!hasKeys} onClick={selection.all}>Select all keys</button><button disabled={!selection.ids.length} onClick={selection.clear}>Clear keys</button></div>
    <p>{label} · this layer only. Shift-click diamonds or use the checkboxes.</p>
    <div className="key-selection-actions"><button disabled={!selection.ids.length} onClick={selection.copy}>Copy keys</button><button disabled={!selection.canPaste} onClick={selection.paste}>Paste keys at playhead</button></div>
    {selection.clipboard&&<small>{selection.clipboard.keys.length} copied · {selection.clipboard.property} · spacing in seconds</small>}
    <form noValidate onSubmit={event=>{event.preventDefault();selection.apply({type:'move',delta:delta.trim()?Number(delta):NaN});}}>
      <label>Move by seconds<input aria-label="Selected keyframe time change" type="number" step="any" value={delta} disabled={disabled} onChange={event=>setDelta(event.target.value)}/></label><button className="button" type="submit" disabled={disabled}>Move keys</button>
    </form>
    <div className="key-selection-actions"><button disabled={disabled} onClick={()=>selection.apply({type:'move',delta:-1/fps})}>−1 frame</button><button disabled={disabled} onClick={()=>selection.apply({type:'move',delta:1/fps})}>+1 frame</button><button disabled={disabled} onClick={()=>selection.apply({type:'delete'})}>Delete keys</button></div>
    <small>{layer.locked?'Unlock this layer to edit its keys.':'Moves keep key spacing and outgoing curves. Collisions and out-of-range moves are rejected.'}</small>
  </div>;
}
