import React,{useEffect,useRef,useState} from 'react';
import {readWorkflowComparison} from './workflow-library.mjs';
import {compareWorkflowGraphs} from './workflow-diff.mjs';
import './workflow-comparison.css';

const fieldLabels={'name':'Name','version':'Workflow format','type':'Step type','from':'Input steps (in order)','when.nodeId':'Branch condition step','when.equals':'Required condition result','limits.maxSteps':'Maximum steps','limits.maxModelCalls':'Maximum model calls','limits.maxOutputTokens':'Total output token allowance','limits.budgetUSD':'Estimated model budget (USD)','config.value':'Input text','config.prompt':'Prompt','config.model':'Model','config.maxOutputTokens':'Maximum response tokens','config.operation':'Operation','config.text':'Text','config.caseSensitive':'Match letter case','config.mode':'Join mode','config.separator':'Join separator','config.message':'Approval message','config.seconds':'Delay in seconds'};
const label=path=>fieldLabels[path]||path;
const display=value=>value===undefined?'Not present':typeof value==='string'?(value||'(empty text)'):JSON.stringify(value);
function Changes({rows}){return <div className="workflow-diff-fields">{rows.map(row=><div className="workflow-diff-field" key={row.path}><strong>{label(row.path)}</strong><div><pre aria-label={'Before '+label(row.path)}>{display(row.before)}</pre><pre aria-label={'After '+label(row.path)}>{display(row.after)}</pre></div></div>)}</div>;}
export function WorkflowComparison({entry,number,graph,disabled,stale}){
 const[opened,setOpened]=useState(false),[target,setTarget]=useState('draft'),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState('');
 const epoch=useRef(0),alive=useRef(true),trigger=useRef(null),region=useRef(null),latestGraph=useRef(graph);latestGraph.current=graph;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;epoch.current++;};},[]);
 const changed=result?.target==='draft'&&JSON.stringify(result.draft)!==JSON.stringify(graph);
 async function compare(){
  if(disabled||stale)return;
  const token=++epoch.current,before=structuredClone(graph),choice=target;setOpened(true);setBusy(true);setResult(null);setError('');
  try{const saved=await readWorkflowComparison(entry.id,number,entry.revision);if(!alive.current||token!==epoch.current)return;
   if(choice==='draft'&&JSON.stringify(before)!==JSON.stringify(latestGraph.current))throw Error('The draft changed while the saved version was being read. Refresh comparison to review the current draft.');
   const after=choice==='draft'?before:saved.head.graph;
   setResult({target:choice,draft:before,beforeLabel:`${saved.entry.name} · Version ${saved.version.number}`,afterLabel:choice==='draft'?'Current draft snapshot':`${saved.entry.name} · Version ${saved.head.number} (latest saved)`,diff:compareWorkflowGraphs(saved.version.graph,after)});
  }catch(e){if(alive.current&&token===epoch.current)setError(e.message);}finally{if(alive.current&&token===epoch.current){setBusy(false);setTimeout(()=>region.current?.focus(),0);}}
 }
 function close(){epoch.current++;setOpened(false);setBusy(false);setResult(null);setError('');trigger.current?.focus();}
 return <><button ref={trigger} type="button" disabled={disabled||stale} onClick={compare}>Compare saved version</button>{opened&&<section className="workflow-comparison" role="region" aria-label="Workflow comparison" tabIndex={-1} ref={region} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}}}>
 <header><div><h3>Review what changed</h3><p>Read-only comparison. Your draft, saved versions and runs stay unchanged.</p></div><button type="button" onClick={close} aria-label="Close comparison">Close</button></header>
 <div className="workflow-compare-controls"><label>Compare against<select aria-label="Compare against" value={target} onChange={e=>{epoch.current++;setTarget(e.target.value);setBusy(false);setResult(null);setError('');}}><option value="draft">Current draft</option><option value="head">Latest saved version</option></select></label><button type="button" disabled={disabled||stale||busy} onClick={compare}>Refresh comparison</button></div>
 {busy&&<p role="status">Reading saved versions…</p>}{error&&<p className="workflow-compare-warning" role="alert">{error}</p>}{stale&&<p className="workflow-compare-warning">The saved entry changed. Reload the library and select its current record before comparing again.</p>}
 {result&&<><div className="workflow-compare-labels"><strong>Before · {result.beforeLabel}</strong><strong>After · {result.afterLabel}</strong></div>{changed&&<p className="workflow-compare-warning" role="status">The draft changed since this comparison. These are the captured values; refresh to review the current draft.</p>}
 {result.diff.identical?<p className="workflow-compare-empty">No differences</p>:<><p className="workflow-compare-summary">{result.diff.workflow.length} workflow settings · {result.diff.nodes.length} changed steps · {result.diff.connections.added.length} added / {result.diff.connections.removed.length} removed connections</p>
 {result.diff.workflow.length>0&&<section><h4>Workflow settings</h4><Changes rows={result.diff.workflow}/></section>}
 {result.diff.nodes.map(node=><details className="workflow-node-diff" open key={node.id}><summary><span>{node.name} <small>{node.id}</small></span><b>{node.kind}</b></summary><Changes rows={node.changes}/></details>)}
 {(result.diff.connections.added.length>0||result.diff.connections.removed.length>0)&&<section className="workflow-edge-diff"><h4>Connections</h4>{['removed','added'].map(kind=>result.diff.connections[kind].map(edge=><p key={kind+JSON.stringify(edge)}><b>{kind}</b> {edge.source} → {edge.target} · {edge.kind==='condition'?'branch condition':`input ${edge.slot}`}</p>))}</section>}
 </>}</>}
 </section>}</>;
}
