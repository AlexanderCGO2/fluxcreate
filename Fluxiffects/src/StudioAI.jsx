import {apiURL} from '../../FluxCreate/shared/hosting.mjs';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, X, ArrowUp, Square, ChevronDown, Layers, WandSparkles, MessageCircle, Plus, RefreshCw, Play, Pause, Check, AlertCircle, FileText, CheckCheck } from 'lucide-react';
import { getComp } from './core.mjs';
import { projectForAI } from './ai-commands.mjs';
import { CreativePreferences } from './CreativePreferences.jsx';
import { selectedPreferenceTexts } from './creative-preferences.mjs';
import './creative-preferences.css';
import { renderComposition, prepareAssets, syncMedia, subscribeMedia, disposeCompositionMedia } from './renderer.mjs';

const PROMPTS = {
  edit: ['Give this a soft, cinematic entrance.', 'Make the motion slower and more elegant.', 'Create a warm sunset color palette.'],
  create: ['An elegant 6-second product reveal with editable text and shapes.', 'A minimal kinetic typography intro: “Make it matter.”', 'A playful portrait title card with floating shapes.'],
  explain: ['Explain how the selected layer is animated.', 'What could make this composition clearer?', 'Check the composition for timing and readability issues.'],
};

export function StudioAI({ project, selectedId, time, onClose, onBrief, onReview }) {
  const [mode, setMode] = useState('edit'), [scope, setScope] = useState('selection');
  const [directions, setDirections] = useState(1), [preferenceLibrary, setPreferenceLibrary] = useState([]), [preferenceIds, setPreferenceIds] = useState([]);
  const [intent, setIntent] = useState(''), [brief, setBrief] = useState(project.brief ?? project.exchange?.brief ?? '');
  const [status, setStatus] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [messages, setMessages] = useState([]), [lastProposal, setLastProposal] = useState(null);
  const abort = useRef(null), mounted = useRef(true), endRef = useRef(null);
  const comp = getComp(project), selection = comp.layers.find(layer => layer.id === selectedId);
  const checkStatus = async () => { try { const res = await fetch(apiURL('fluxiffects','/ai/status')); if (!res.ok) throw new Error('The local AI service is not available. Restart Fluxiffects with its launcher.'); setStatus(await res.json()); } catch (e) { setStatus({ available:false,reason:e.message }); } };
  useEffect(() => { mounted.current=true; checkStatus(); return () => { mounted.current=false; abort.current?.abort(); }; }, []);
  useEffect(() => { setBrief(project.brief ?? project.exchange?.brief ?? ''); }, [project.brief, project.exchange?.brief]);
  useEffect(() => { setMessages([]); setLastProposal(null); setPreferenceIds([]); setError(''); abort.current?.abort(); }, [project.id]);
  useEffect(() => { if(messages.length||busy||error)endRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'}); }, [messages,busy,error]);
  const submit = async e => {
    e?.preventDefault(); if (busy || !intent.trim() || !status?.available) return;
    const prompt=intent.trim(); const requestMode=mode;
    let preferences;try{preferences=selectedPreferenceTexts(preferenceLibrary,preferenceIds);}catch(e){setError(e.message);return;}
    const variations=requestMode==='explain'?1:directions;
    setIntent('');setPreferenceIds([]);setError('');setBusy(true);setMessages(m=>[...m,{role:'user',text:prompt,context:[preferences.length?`${preferences.length} selected rule${preferences.length===1?'':'s'}`:'',variations===3?'3 directions':''].filter(Boolean).join(' · ')}]);
    abort.current=new AbortController();
    try {
      const response=await fetch(apiURL('fluxiffects','/ai/plan'),{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.current.signal,body:JSON.stringify({project:projectForAI(project),selection:selection?[selection.id]:[],scope:requestMode==='create'?'composition':selection?scope:'composition',intent:prompt,mode:requestMode,time,brief,preferences,variations})});
      const result=await response.json();if(!response.ok)throw new Error(result.error || 'The request could not be completed.');
      if(!mounted.current)return;
      if(result.explanation && (!result.proposal?.commands?.length || requestMode==='explain')) setMessages(m=>[...m,{role:'assistant',text:result.explanation}]);
      else if(result.proposal?.commands?.length){setLastProposal(result);setMessages(m=>[...m,{role:'assistant',text:result.alternatives?.length===3?'Three editable directions are ready. Compare them and choose the one you want to apply.':result.proposal.summary,review:true}]);onReview(result);}
      else setMessages(m=>[...m,{role:'assistant',text:result.explanation || result.proposal?.summary || 'No editable changes were needed.'}]);
    } catch (e) { if(mounted.current)setError(e.name==='AbortError'?'Request cancelled.':e.message); }
    finally { if(mounted.current)setBusy(false); }
  };
  return <aside className="studio-ai" aria-label="Flux AI assistant">
    <div className="ai-header"><span className="ai-avatar"><Sparkles size={19}/></span><div><strong>Flux</strong><span>Your motion partner</span></div><button className="icon-button" aria-label="Close AI assistant" onClick={onClose}><X size={17}/></button></div>
    <div className="ai-mode-switch" role="tablist" aria-label="AI mode">{[['edit','Refine',WandSparkles],['create','Create',Plus],['explain','Understand',MessageCircle]].map(([value,label,Icon])=><button key={value} role="tab" aria-selected={mode===value} className={mode===value?'selected':''} onClick={()=>setMode(value)} disabled={busy}><Icon size={13}/>{label}</button>)}</div>
    <div className="ai-context"><Layers size={14}/><div><strong>{mode==='create'?'A new composition':mode==='edit' && scope==='selection' && selection?selection.name:comp.name}</strong><span>{mode==='create'?'Your existing work stays in the project':`${comp.layers.length} layers · ${comp.duration}s · ${comp.fps} fps`}</span></div>{mode!=='create'&&<select aria-label="AI edit scope" value={selection?scope:'composition'} onChange={e=>setScope(e.target.value)} disabled={busy}><option value="selection" disabled={!selection}>Selected layer</option><option value="composition">Whole composition</option></select>}</div>
    <div className="ai-context-tools"><details className="ai-brief"><summary aria-label="Edit creative brief"><FileText size={13}/>Brief<span>{brief?'Saved':'Add context'}</span><ChevronDown size={12}/></summary><p>Style, audience, pacing, or things to preserve. This travels with your Flux exchange file.</p><textarea aria-label="Creative brief" maxLength={6000} value={brief} onChange={e=>setBrief(e.target.value)} onBlur={()=>{if(brief!==(project.brief||''))onBrief(brief);}} placeholder="Quiet, confident motion. Keep the title readable. Use our violet palette." disabled={busy}/></details>
    <CreativePreferences selectedIds={preferenceIds} onSelectionChange={setPreferenceIds} disabled={busy} onLibraryChange={setPreferenceLibrary}/></div>
    <div className="ai-conversation" aria-live="polite">
      {!messages.length && <div className="ai-welcome"><span className="ai-welcome-icon"><Sparkles size={25}/></span><h3>{mode==='create'?'From a thought to a timeline.':mode==='explain'?'A fresh pair of eyes.':'A little direction. A lot of possibility.'}</h3><p>{mode==='create'?'Describe an idea. Flux builds an editable composition with real layers and keyframes.':mode==='explain'?'Ask about the design, timing, or animation already in your composition.':'Tell Flux what you want to change. You’ll see a preview before anything is applied.'}</p><div className="ai-starters">{PROMPTS[mode].map(prompt=><button key={prompt} onClick={()=>setIntent(prompt)}>{prompt}<ArrowUp size={13}/></button>)}</div></div>}
      {messages.map((message,i)=><div className={`ai-message ${message.role}`} key={i}>{message.role==='assistant'&&<span className="message-avatar"><Sparkles size={13}/></span>}<div><p>{message.text}</p>{message.context&&<small className="ai-message-context">{message.context}</small>}{message.review&&lastProposal&&i===messages.length-1&&<button className="ai-review-link" onClick={()=>onReview(lastProposal)}><Play size={12}/>Review proposed changes</button>}</div></div>)}
      {busy&&<div className="ai-thinking"><span/><span/><span/><p>{mode!=='explain'&&directions===3?'Exploring three directions…':mode==='create'?'Composing your idea…':'Working with your composition…'}</p></div>}
      {error&&<div className="ai-error" role="alert"><AlertCircle size={15}/><p>{error}</p></div>}
      {status && !status.available && <div className="ai-connection-note"><AlertCircle size={15}/><p>{status.reason || 'The shared Fluxini AI connection is not configured. Local editing is available.'}</p><button aria-label="Recheck AI connection" onClick={checkStatus}><RefreshCw size={14}/></button></div>}
      <div ref={endRef}/>
    </div>
    <form className="ai-composer" onSubmit={submit}>{mode!=='explain'&&<div className="ai-generation-options"><label><Layers size={12}/>Explore<select aria-label="AI directions" value={directions} onChange={e=>setDirections(Number(e.target.value))} disabled={busy}><option value={1}>One direction</option><option value={3}>Three directions</option></select></label>{directions===3&&<span>One request</span>}</div>}<textarea aria-label="Ask Flux" maxLength={2000} value={intent} onChange={e=>setIntent(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();submit();}}} placeholder={mode==='create'?'Describe the composition you imagine…':mode==='explain'?'What would you like to understand?':'What would you like to change?'} disabled={busy}/><div><span>{mode==='explain'?'Explanation only':'Editable results · review first'}</span>{busy?<button type="button" className="ai-send" aria-label="Cancel AI request" onClick={()=>abort.current?.abort()}><Square size={13}/></button>:<button type="submit" className="ai-send" aria-label={mode==='explain'?'Ask about composition':'Generate editable proposal'} disabled={!intent.trim()||!status?.available}><ArrowUp size={17}/></button>}</div></form>
    <p className="ai-data-note">Sends your prompt, brief, selected rules, and chosen scene data to your Fluxini AI provider. Media stays local.</p>
    <div className="ai-footer"><span className={status?.available?'connection-ready':''}/>{status?.available?'Using your Fluxini AI connection':status?'Shared connection unavailable':'Checking shared connection'}</div>
  </aside>;
}

function ComparisonCanvas({ project, time, playing, side }) {
  const ref=useRef(null), [revision,setRevision]=useState(0);
  const source=getComp(project), comp=useMemo(()=>({...source,id:`ai-review-${side}-${source.id}`,layers:source.layers.map(l=>({...l,muted:true}))}),[source,side]);
  useEffect(()=>{let alive=true;prepareAssets(project.assets).then(()=>{if(alive)setRevision(v=>v+1);});return()=>{alive=false;};},[project.assets]);
  useEffect(()=>subscribeMedia(()=>setRevision(v=>v+1)),[]);
  useEffect(()=>()=>disposeCompositionMedia(comp.id),[comp.id]);
  useEffect(()=>{const canvas=ref.current;if(!canvas)return;const factor=Math.min(1,900/comp.width,600/comp.height);canvas.width=Math.round(comp.width*factor);canvas.height=Math.round(comp.height*factor);const frame=Math.min(time,Math.max(0,comp.duration-1/comp.fps));syncMedia(comp,project.assets,frame,playing);renderComposition(canvas.getContext('2d'),comp,project.assets,frame);},[comp,project.assets,time,playing,revision]);
  return <canvas ref={ref} aria-label={`${side} AI preview`} style={{aspectRatio:`${comp.width}/${comp.height}`}}/>;
}

export function AIReview({ result, before, after, onApply, onDiscard, onSelect, stale }) {
  const comp=getComp(after), [time,setTime]=useState(Math.min(1.4,comp.duration/2)),[playing,setPlaying]=useState(false),timeRef=useRef(time);timeRef.current=time;
  useEffect(()=>{if(!playing)return;let frame;const start=performance.now(),from=timeRef.current;const tick=now=>{setTime((from+(now-start)/1000)%comp.duration);frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,comp.duration]);
  useEffect(()=>{setPlaying(false);setTime(Math.min(1.4,comp.duration/2));},[after]);
  const changes=result.changes||[];
  return <div className="ai-review">{result.alternatives?.length>1&&<><div className="ai-direction-tabs" role="tablist" aria-label="Design directions">{result.alternatives.map((direction,index)=><button key={index} role="tab" aria-label={direction.label} aria-selected={index===result.selectedIndex} tabIndex={index===result.selectedIndex?0:-1} className={index===result.selectedIndex?'selected':''} onClick={()=>onSelect(index)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?result.alternatives.length-1:(index+(e.key==='ArrowRight'?1:-1)+result.alternatives.length)%result.alternatives.length;onSelect(next);e.currentTarget.parentElement.children[next].focus();}}}><span className="ai-direction-letter">{String.fromCharCode(65+index)}</span><span><strong>{direction.label}</strong><small>{direction.changes.length} editable changes</small></span>{index===result.selectedIndex&&<Check size={15}/>}</button>)}</div><p className="ai-directions-note">Each direction starts from your current scene. Applying one keeps the whole edit together in Undo.</p></>}<p className="ai-review-summary">{result.proposal.summary}</p><div className="ai-comparison"><div><span>Current</span><ComparisonCanvas project={before} time={time} playing={playing} side="Before"/></div><div><span><Sparkles size={12}/>Proposed</span><ComparisonCanvas project={after} time={time} playing={playing} side="After"/></div></div><div className="ai-preview-transport"><button className="icon-button" aria-label={playing?'Pause AI preview':'Play AI preview'} onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={16}/>:<Play size={16}/>}</button><input type="range" aria-label="AI preview time" min={0} max={comp.duration} step={1/comp.fps} value={time} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}}/><span>{time.toFixed(2)}s / {comp.duration}s</span></div><div className="ai-change-heading"><CheckCheck size={15}/><strong>{changes.length} proposed change{changes.length!==1?'s':''}</strong><span>One undoable edit</span></div><ul className="ai-change-list">{changes.map((change,i)=><li key={i}><Check size={13}/>{typeof change==='string'?change:change.description||change.summary||JSON.stringify(change)}</li>)}</ul>{result.warnings?.length>0&&<div className="ai-review-warnings">{result.warnings.map((w,i)=><p key={i}><AlertCircle size={13}/>{typeof w==='string'?w:JSON.stringify(w)}</p>)}</div>}{stale&&<div className="ai-error"><AlertCircle size={15}/><p>Your composition changed after this proposal was generated. Request a fresh proposal before applying it.</p></div>}<div className="review-actions"><button className="button" onClick={onDiscard}>Keep current</button><button className="button primary" disabled={stale} onClick={onApply}><Check size={15}/>Apply changes</button></div></div>;
}
