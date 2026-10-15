import React,{useEffect,useRef,useState} from 'react';
import {linkedPair,planLinkClips,planSeparateSound,planLinkedEdit} from './model.mjs';
import {useSourceDuration} from './SlipEditing.jsx';

export function useLinkedEditing({project,selected,time,getTime,context,blocked,playing,importing,getImportEpoch,getProject,getSelected,timelineRef,store,onPause,onCommit,onError,onSelect}){
 const clip=project.clips.find(c=>c.id===selected),[partnerId,setPartnerId]=useState(''),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),cleanup=useRef(null),epoch=useRef(0),latest=useRef(null);
 const pair=clip?.linkId?linkedPair(project,selected):null,partner=pair?.find(c=>c.id!==selected)??project.clips.find(c=>c.id===partnerId);
 const media=useSourceDuration(project.assets.find(a=>a.id===clip?.assetId)),partnerMedia=useSourceDuration(project.assets.find(a=>a.id===partner?.assetId));
 latest.current={project,selected,time,getTime,context,blocked,playing,importing,getImportEpoch,getProject,getSelected,onPause,onCommit,onError,onSelect};
 useEffect(()=>{cleanup.current?.();setDraft(null);epoch.current++;setBusy(false);},[project,selected,time,context,blocked,importing,partnerId]);
 useEffect(()=>setPartnerId(''),[selected,project]);
 useEffect(()=>{if(playing){cleanup.current?.();setDraft(null);epoch.current++;setBusy(false);}},[playing]);
 useEffect(()=>()=>{cleanup.current?.();epoch.current++;},[]);
 const importEpoch=getImportEpoch(),current=()=>latest.current.getProject()===project&&latest.current.getSelected()===selected&&latest.current.getTime()===time&&latest.current.context===context&&!latest.current.blocked&&!latest.current.importing&&latest.current.getImportEpoch()===importEpoch;
 const sourceDurations={[clip?.id]:media.duration,[partner?.id]:partnerMedia.duration};
 const ready=!!pair&&!media.loading&&!partnerMedia.loading&&!media.error&&!partnerMedia.error&&media.duration>0&&partnerMedia.duration>0&&!blocked&&!importing;
 const error=blocked?'Finish the other edit preview first.':importing?'Wait for the current import.':media.error||(partner?partnerMedia.error:null)||(media.loading||partner&&partnerMedia.loading?'Reading actual source durations…':'');
 function commit(result){const ok=latest.current.onCommit(result.project,project);if(ok&&result.selectedId)latest.current.onSelect(result.selectedId);return !!ok;}
 function apply(operation,values={}){try{if(!current())throw Error('The sequence or selection changed. Review the linked pair again.');if(busy)throw Error('Wait for sound decoding to finish.');cleanup.current?.();const result=planLinkedEdit(project,{clipId:selected,operation,sourceDurations,...values});if(JSON.stringify(result.project)===JSON.stringify(project))return true;latest.current.onPause();return commit(result);}catch(e){latest.current.onError(e.message);return false;}}
 async function create(separate=false){
  if(busy)return;const token=++epoch.current;
  try{
   if(!current())throw Error('Wait for the current import or finish the other edit.');
   if(!clip||media.loading||media.error||!media.duration)throw Error(media.error||'Read the actual source duration first.');
   const audioClip=separate?clip:[clip,partner].find(c=>c?.type==='audio');
   if(!audioClip||!separate&&(!partner||partnerMedia.loading||partnerMedia.error||!partnerMedia.duration))throw Error(partnerMedia.error||'Choose an aligned picture and sound clip.');
   setBusy(true);latest.current.onPause();const decoded=await store.load(project.assets.find(a=>a.id===audioClip.assetId));
   if(token!==epoch.current||!current()||latest.current.playing)throw Error('The sequence, selection or import changed. No link was created.');
   const result=separate?planSeparateSound(project,{clipId:selected,videoDuration:media.duration,soundDuration:decoded.duration}):planLinkClips(project,{clipId:selected,partnerId,sourceDurations:{...sourceDurations,[audioClip.id]:decoded.duration}});
   commit(result);
  }catch(e){latest.current.onError(e.message);}finally{if(token===epoch.current)setBusy(false);}
 }
 function begin(event,item,mode){
  if(event.button!==0)return;event.preventDefault();event.stopPropagation();if(cleanup.current)return;
  if(item.id!==selected){onSelect(item.id);return;}
  if(!ready||busy){onError(error||'Read both source durations before dragging the pair.');return;}
  cleanup.current?.();const owner=event.currentTarget,pointerId=event.pointerId,x=event.clientX,pxPerSecond=timelineRef.current.getBoundingClientRect().width/project.duration,operation={move:'move',in:'trim-start',out:'trim-end'}[mode];let candidate=null,ended=false;
  const finish=save=>{if(ended)return;ended=true;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',cancel);window.removeEventListener('keydown',key,true);owner.removeEventListener('lostpointercapture',cancel);if(owner.hasPointerCapture?.(pointerId))owner.releasePointerCapture(pointerId);cleanup.current=null;setDraft(null);if(save&&candidate&&current()&&!latest.current.playing&&JSON.stringify(candidate.project)!==JSON.stringify(project))commit(candidate);};
  const cancel=e=>{if(['pointercancel','lostpointercapture'].includes(e?.type)&&e.pointerId!==pointerId)return;finish(false);},release=e=>{if(e.pointerId===pointerId)finish(true);},key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')cancel();};
  const move=e=>{if(e.pointerId!==pointerId)return;if(!current()){cancel();return;}const deltaFrames=Math.round((e.clientX-x)/pxPerSecond*project.fps);try{candidate=planLinkedEdit(project,{clipId:selected,operation,deltaFrames,sourceDurations});setDraft({base:project,project:candidate.project,deltaFrames});}catch(error){candidate=null;setDraft({base:project,project,deltaFrames:0});latest.current.onError(error.message);}};
  try{owner.setPointerCapture(pointerId);}catch{onError('The pointer gesture could not start. Use the numeric or frame controls.');return;}
  cleanup.current=cancel;window.addEventListener('pointermove',move);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('keydown',key,true);owner.addEventListener('lostpointercapture',cancel);latest.current.onPause();move(event);
 }
 return {isDragging:()=>!!cleanup.current,clip,pair,partnerId,setPartnerId,ready,error,busy,draft,apply,begin,create,previewProject:draft?.base===project?draft.project:project};
}

export function LinkedControls({project,clip,state}){
 const [start,setStart]=useState(''),[end,setEnd]=useState('');useEffect(()=>{setStart(String(clip.start));setEnd(String(clip.start+clip.duration));},[clip.id,clip.start,clip.duration]);
 const candidates=project.clips.filter(c=>c.id!==clip.id&&!c.linkId&&c.type===(clip.type==='video'?'audio':'video')&&['start','duration','playbackRate'].every(k=>Math.abs(c[k]-clip[k])<1e-8));
 return <div className="linked-controls"><h3>{state.pair?'Linked picture and sound':'Picture and sound'}</h3>{state.pair?<>
  <p>{state.pair.map(c=>c.name).join(' ↔ ')}. Timing edits affect both. Sound gain and picture opacity remain independent.</p>
  <div className="linked-frame-actions"><button aria-label="Move pair one frame earlier" disabled={!state.ready||state.busy} onClick={()=>state.apply('move',{deltaFrames:-1})}>← 1 frame</button><button aria-label="Move pair one frame later" disabled={!state.ready||state.busy} onClick={()=>state.apply('move',{deltaFrames:1})}>1 frame →</button></div>
  <form onSubmit={e=>{e.preventDefault();state.apply('trim-start',{time:start.trim()===''?NaN:Number(start)});}}><label>Pair start trim<input aria-label="Linked trim start" type="number" step="any" value={start} onChange={e=>setStart(e.target.value)} disabled={!state.ready||state.busy}/></label><button aria-label="Trim linked start" disabled={!state.ready||state.busy}>Trim start</button></form>
  <form onSubmit={e=>{e.preventDefault();state.apply('trim-end',{time:end.trim()===''?NaN:Number(end)});}}><label>Pair end trim<input aria-label="Linked trim end" type="number" step="any" value={end} onChange={e=>setEnd(e.target.value)} disabled={!state.ready||state.busy}/></label><button aria-label="Trim linked end" disabled={!state.ready||state.busy}>Trim end</button></form>
  <button onClick={()=>state.apply('unlink')} disabled={state.busy}>Unlink picture and sound</button><p>Move and end extension grow the sequence. Trim and split require no fades. Unlink for speed, slip, ripple, rolling or slide edits.</p>
 </>:<><p>Link one aligned picture and sound clip. Start, duration and speed must match. Linking mutes picture sound; the sound clip keeps its own gain.</p>
  {clip.type==='video'&&<button disabled={state.busy||clip.locked} onClick={()=>state.create(true)}>Separate linked sound</button>}
  <label>Aligned counterpart<select aria-label="Link counterpart" value={state.partnerId} disabled={state.busy||clip.locked} onChange={e=>state.setPartnerId(e.target.value)}><option value="">Choose picture or sound</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.name} · {c.track}</option>)}</select></label><button disabled={!state.partnerId||state.busy||clip.locked} onClick={()=>state.create(false)}>Link and mute picture sound</button>
 </>}{state.busy&&<p role="status">Decoding source sound…</p>}{state.error&&<p className="linked-error">{state.error}</p>}{state.draft&&<p className="linked-preview-status">Paired preview · {state.draft.deltaFrames} frames · release to apply · Escape cancels</p>}</div>;
}
