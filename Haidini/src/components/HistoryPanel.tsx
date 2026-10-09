import { useEffect, useRef, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { api } from '../api';
import type { ProjectState } from '../types';
type Entry={revision:number;summary:string;kind:string;createdAt:string|null;sourceRevision:number|null;current:boolean};
type Page={entries:Entry[];nextBefore:number|null;total:number;currentRevision:number};
export default function HistoryPanel({state,disabled,onRestore}:{state:ProjectState;disabled:boolean;onRestore:(revision:number)=>void}){
 const [page,setPage]=useState<Page|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const generation=useRef(0),id=state.project.id,revision=state.project.revision;
 useEffect(()=>{const request=++generation.current;setPage(null);setError('');setLoading(true);
  api<Page>('/projects/'+id+'/history').then(next=>{if(generation.current===request)setPage(next);}).catch(e=>{if(generation.current===request)setError(e.message);}).finally(()=>{if(generation.current===request)setLoading(false);});
  return()=>{generation.current++;};
 },[id,revision,retry]);
 async function older(){if(loading||page?.nextBefore==null)return;const request=generation.current;setLoading(true);setError('');
  try{const next=await api<Page>('/projects/'+id+'/history?before='+page.nextBefore);if(generation.current===request)setPage(current=>current?{...next,entries:[...current.entries,...next.entries]}:next);}
  catch(e){if(generation.current===request)setError((e as Error).message);}finally{if(generation.current===request)setLoading(false);}
 }
 return <section className="revision-history" aria-label="Saved revision history">
  <div className="revision-heading"><History size={20}/><div><h2>Scene history</h2><p>No fixed undo limit. Saved on this PC.</p></div></div>
  <p className="control-hint">Restore any saved revision, including earlier redo branches. Restoring creates a new edit that you can undo.</p>
  <div className="history-counts"><span>{state.undoDepth??0} undo steps</span><span>{state.redoDepth??0} redo steps</span><span>{page?.total??'…'} saved revisions</span></div>
  <ol className="revision-list">{page?.entries.map(entry=><li key={entry.revision} className={entry.current?'current':''}>
   <div className="revision-meta"><strong>Revision {entry.revision}</strong>{entry.current?<span>Current</span>:entry.createdAt?<time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time>:<span>Earlier session</span>}</div>
   <p title={entry.summary}>{entry.summary}</p>
   {!entry.current&&<button disabled={disabled} aria-label={'Restore revision '+entry.revision} onClick={()=>onRestore(entry.revision)}><RotateCcw size={13}/>Restore</button>}
  </li>)}</ol>
  {error&&<p role="alert" className="field-error">{error} <button onClick={()=>page?older():setRetry(n=>n+1)}>Retry</button></p>}
  {loading&&<p role="status">Loading history…</p>}
  {page?.nextBefore!=null&&<button className="history-older" disabled={loading} onClick={older}>Load older revisions</button>}
  {page&&page.nextBefore===null&&<p className="control-hint">Beginning of saved history. Older edits discarded before revision archiving was installed cannot be recovered.</p>}
 </section>;
}
