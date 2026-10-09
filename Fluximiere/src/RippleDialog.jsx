import React,{useEffect,useMemo,useState} from 'react';
import {MoveHorizontal,X} from 'lucide-react';
import {planRippleEdit,timecode} from './model.mjs';
import './ripple.css';

export function RippleDialog({project,clipId,time,onApply,onClose}){
 const [scope,setScope]=useState('track'),[operation,setOperation]=useState('delete'),clip=project.clips.find(c=>c.id===clipId);
 const preview=useMemo(()=>{try{return {plan:planRippleEdit(project,{clipId,scope,operation,time})};}catch(error){return {error:error.message};}},[project,clipId,scope,operation,time]);
 useEffect(()=>{const key=event=>{if(event.key==='Escape'){event.preventDefault();onClose();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[onClose]);
 const plan=preview.plan;
 return <div className="modal-backdrop" onClick={onClose}><section className="modal ripple-dialog" role="dialog" aria-modal="true" aria-label="Ripple edit" onClick={event=>event.stopPropagation()}>
  <button className="modal-close" aria-label="Close ripple dialog" onClick={onClose}><X size={18}/></button><span className="eyebrow">MAKE ROOM FOR THE NEXT FRAME</span><h2>Close the gap.</h2><p>Remove time from <strong>{clip?.name}</strong> and bring the following edits forward.</p>
  <label className="ripple-field">Edit<select aria-label="Ripple operation" value={operation} onChange={event=>setOperation(event.target.value)} autoFocus><option value="delete">Delete selected clip interval</option><option value="trim-start">Trim start to playhead</option><option value="trim-end">Trim end to playhead</option></select></label>
  <label className="ripple-field">Track scope<select aria-label="Ripple scope" value={scope} onChange={event=>setScope(event.target.value)}><option value="track">Selected track · {clip?.track}</option><option value="all">All picture and sound tracks</option></select></label>
  <p className="ripple-help">{scope==='all'?'Every track loses the same interval, including overlapping clips. The sequence becomes shorter.':'Only this track changes. Other tracks and sequence length stay in place; picture and sound may move apart.'}</p>
  <section className="ripple-preview" aria-label="Ripple edit preview" aria-live="polite">{preview.error?<p role="alert">{preview.error}</p>:<><div className="ripple-amount"><MoveHorizontal size={18}/><strong>{plan.amount.toFixed(3)}s earlier</strong><span>{timecode(plan.from,project.fps)} → {timecode(plan.to,project.fps)}</span></div><ul>{plan.changes.map(change=><li key={change.id}><span><b>{change.track}</b> {change.name}</span><small>{change.action}</small></li>)}</ul><p>New sequence length: {plan.project.duration.toFixed(3)}s</p></>}</section>
  <p className="ripple-help">Source files stay intact. Locked clips and cuts through a fade stop the whole edit. Undo restores every affected clip together.</p>
  <div className="ripple-actions"><button className="wide-button" aria-label="Cancel ripple edit" onClick={onClose}>Cancel</button><button className="primary" aria-label="Apply ripple edit" disabled={!plan} onClick={()=>onApply(plan,project)}>Apply ripple edit</button></div>
 </section></div>;
}
