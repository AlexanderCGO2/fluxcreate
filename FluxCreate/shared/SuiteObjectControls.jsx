import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {readSuiteObject,renderSuiteObject} from './suite-object.mjs';
import {suiteSourceDownload} from './suite-source.mjs';
import {download} from './browser.mjs';
import {appURL,getApp} from './registry.mjs';
import './suite-object.css';

export function SuiteObjectControls({source,disabled=false,getRevision,onPlace,onRefresh,onError=()=>{},compact=false}){
 const input=useRef(null),dialog=useRef(null),task=useRef(null),operation=useRef(false),live=useRef(null);live.current={getRevision,onPlace,onRefresh,source,disabled};
 const [opened,setOpened]=useState(null),[view,setView]=useState({}),[prepared,setPrepared]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[committing,setCommitting]=useState(false);
 const cancel=()=>{if(operation.current)return;task.current?.abort();task.current=null;setOpened(null);setPrepared(null);setBusy(false);setError('');};
 useEffect(()=>()=>task.current?.abort(),[]);
 useEffect(()=>{if(opened&&!dialog.current?.open)dialog.current?.showModal();},[opened]);
 async function begin(file,preferredView){if(!file||disabled)return;task.current?.abort();const controller=new AbortController();task.current=controller;setBusy(true);setError('');setPrepared(null);try{const initial=live.current.getRevision(),data=await readSuiteObject(file,{signal:controller.signal});controller.signal.throwIfAborted();if(preferredView)data.view=preferredView;data.baseRevision=initial;data.replace=Boolean(source);setOpened(data);setView(data.view);await preview(data,data.view,controller);}catch(e){if(!controller.signal.aborted){setError(e.message);onError(e.message);}}finally{if(task.current===controller)setBusy(false);}}
 async function preview(data,next,controller=new AbortController()){
  if(task.current!==controller)task.current?.abort();task.current=controller;setBusy(true);setPrepared(null);setError('');
  try{const result=await renderSuiteObject(data,next,{signal:controller.signal});if(task.current===controller&&!controller.signal.aborted)setPrepared(result);}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(task.current===controller)setBusy(false);}
 }
 async function apply(){if(!prepared||busy||operation.current)return;operation.current=true;setCommitting(true);setError('');setBusy(true);try{if(live.current.disabled||opened.baseRevision!==live.current.getRevision())throw Error('Your document or selection changed. Close this preview and place the source again.');const accepted=await (opened.replace?live.current.onRefresh:live.current.onPlace)(prepared);if(accepted===false)throw Error('This object could not be placed. Your original document is unchanged.');operation.current=false;cancel();}catch(e){setError(e.message);setBusy(false);}finally{operation.current=false;setCommitting(false);}}
 const choice=opened?.choices.find(c=>c.id===(view.pageId||view.compositionId));
 return <div className={`fc-studio-object ${compact?'compact':''}`}>
  <input ref={input} type="file" hidden aria-label={source?'Replace studio object source':'Place studio object file'} accept=".fluxoto,.fluxidesign,.fluximiere,.fluxiffects,.flux3d,.fluxcreate,.json,.md" onChange={e=>{begin(e.target.files?.[0]);e.target.value='';}}/>
  {source?<><strong>{getApp(source.app)?.name} object</strong><span>{source.name}</span><small>Rendered snapshot · original source preserved</small><div className="fc-object-actions"><button disabled={disabled||busy} onClick={()=>input.current.click()}>Replace source</button><button disabled={disabled||busy} onClick={()=>begin(new File([source.text],source.filename),source.view)}>Refresh preview</button><button onClick={()=>{const saved=suiteSourceDownload(source);download(saved.blob,saved.filename);}}>Save original</button><a href={appURL(source.app)} target="_blank" rel="noopener noreferrer">Open {getApp(source.app)?.name} ↗</a></div></>:<button className="fc-place-object" disabled={disabled||busy} onClick={()=>input.current.click()}>{busy?'Preparing object…':'Place studio object'}</button>}
  {!opened&&error&&<small role="alert">{error}</small>}
  {opened&&createPortal(<dialog ref={dialog} className="fc-object-dialog" aria-label="Place studio object" onCancel={e=>{e.preventDefault();cancel();}} onKeyDown={e=>e.stopPropagation()}><header><div><small>FROM {getApp(opened.app)?.name?.toUpperCase()}</small><h2>{opened.name}</h2></div><button aria-label="Close studio object preview" disabled={committing} onClick={cancel}>×</button></header><p>Place a snapshot with its original source preserved. You can transform it here and replace its source after editing in the original app.</p>
  {!!opened.choices.length&&<div className="fc-object-view"><label>{opened.mode==='page'?'Page':'Composition'}<select aria-label="Studio source view" value={view.pageId||view.compositionId} disabled={busy} onChange={e=>{const next=opened.mode==='page'?{pageId:e.target.value}:{compositionId:e.target.value,time:0};setView(next);preview(opened,next);}}>{opened.choices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{choice?.duration>0&&<label>Frame (seconds)<input aria-label="Studio source frame" type="number" min="0" max={choice.duration} step="0.01" disabled={busy} value={view.time||0} onChange={e=>{const next={...view,time:e.target.valueAsNumber};setView(next);setPrepared(null);}}/><button disabled={busy} onClick={()=>preview(opened,view)}>Update frame</button></label>}</div>}
  <div className="fc-object-preview">{busy?<span role="status">Rendering source preview…</span>:prepared?<img src={prepared.preview.src} alt={`${opened.name} rendered preview`}/>:<span>Preview unavailable</span>}</div>
  {prepared?.source.warnings.length>1&&<details><summary>Compatibility notes</summary><ul>{prepared.source.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}{error&&<p role="alert">{error}</p>}<footer><button disabled={committing} onClick={cancel}>Cancel</button><button className="primary" disabled={busy||!prepared} onClick={apply}>{opened.replace?'Update object':'Place in document'}</button></footer></dialog>,document.body)}
 </div>;
}
