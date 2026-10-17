import React,{useState} from 'react';
export const visualModeLabels={'references':'Reference images','start-frame':'Start frame','start-end-frames':'Start + end frames'};
const empty={mode:'references',reason:'',sceneStrategy:'independent-shot',continuityNotes:'',startPrompt:'',endPrompt:''};
export default function VisualPlanEditor({shot,index,disabled,onSave}){
 const [draft,setDraft]=useState(shot.visualPlan??empty),update=patch=>setDraft(d=>({...d,...patch}));
 const changed=JSON.stringify(draft)!==JSON.stringify(shot.visualPlan??empty),label=name=>`Shot ${index+1} ${name}`;
 return <details className="mv-visual-plan"><summary>{shot.visualPlan?visualModeLabels[shot.visualPlan.mode]:'Image strategy · not planned'}</summary>
  <p>Plan how this shot begins and ends. Images and video are not generated yet.</p>
  <form onSubmit={e=>{e.preventDefault();onSave(draft);}}><fieldset disabled={disabled}>
   <label>Image strategy<select aria-label={label('image strategy')} value={draft.mode} onChange={e=>update({mode:e.target.value,...(e.target.value==='references'?{startPrompt:'',endPrompt:''}:e.target.value==='start-frame'?{endPrompt:''}:{})})}>{Object.entries(visualModeLabels).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>
   <label>Scene approach<select aria-label={label('scene approach')} value={draft.sceneStrategy} onChange={e=>update({sceneStrategy:e.target.value})}><option value="independent-shot">Independent shot</option><option value="continuous-scene">Part of a continuous scene</option></select></label>
   <label>Why this approach<textarea aria-label={label('image strategy reason')} value={draft.reason} onChange={e=>update({reason:e.target.value})} maxLength={1000} required/></label>
   {draft.mode!=='references'&&<label>Start frame<textarea aria-label={label('start frame prompt')} value={draft.startPrompt} onChange={e=>update({startPrompt:e.target.value})} maxLength={2000} required/></label>}
   {draft.mode==='start-end-frames'&&<label>End frame<textarea aria-label={label('end frame prompt')} value={draft.endPrompt} onChange={e=>update({endPrompt:e.target.value})} maxLength={2000} required/></label>}
   <label>Continuity notes<textarea aria-label={label('continuity notes')} value={draft.continuityNotes} onChange={e=>update({continuityNotes:e.target.value})} maxLength={2000} required={draft.sceneStrategy==='continuous-scene'} placeholder="Character, lighting, movement and transitions to preserve…"/></label>
   <button type="submit" disabled={!changed} aria-label={label('save image plan')}>Save image plan</button>{changed&&<small>Unsaved image plan</small>}
  </fieldset></form>
 </details>;
}
