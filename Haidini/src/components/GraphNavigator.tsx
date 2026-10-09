import {useEffect,useMemo,useRef,useState} from 'react';
import {Search,X} from 'lucide-react';
import {CATALOG} from '../engine/catalog.ts';
import {connectionSources,searchGraphNodes} from '../engine/graphAuthoring.ts';
import {edge,type Graph,type Command} from '../engine/project.ts';

export default function GraphNavigator({graph,diagnostics,disabled,onSelect,onCommands,onClose}:{graph:Graph;diagnostics:Record<string,string>;disabled:boolean;onSelect:(id:string)=>void;onCommands:(commands:Command[],summary:string)=>void;onClose:()=>void}){
 const [query,setQuery]=useState(''),[issuesOnly,setIssuesOnly]=useState(false),search=useRef<HTMLInputElement>(null);
 const results=useMemo(()=>searchGraphNodes(graph,query,diagnostics,issuesOnly),[graph,query,diagnostics,issuesOnly]);
 const output=graph.nodes.find(node=>node.type==='output'),outputSources=useMemo(()=>output?connectionSources(graph,output.id,'scene'):[],[graph,output]);
 useEffect(()=>{search.current?.focus();},[]);
 function focus(id:string){onSelect(id);onClose();}
 function connect(source:string,target:string,input:string){if(disabled||!connectionSources(graph,target,input).some(node=>node.id===source))return;onCommands([{op:'connect',edge:edge(source,target,input)}],`Connect ${graph.nodes.find(node=>node.id===source)?.label} to ${graph.nodes.find(node=>node.id===target)?.label} / ${input}.`);}
 return <section className="graph-navigator nodrag nopan nowheel" aria-label="Find nodes in graph" onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}}}>
  <header><strong><Search size={15}/>Find nodes</strong><button aria-label="Close graph search" onClick={onClose}><X size={16}/></button></header>
  <input ref={search} type="search" aria-label="Search graph nodes" placeholder="Name, operator or parameter value…" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&results[0]){event.preventDefault();focus(results[0].node.id);}}}/>
  <div className="graph-search-filter"><label><input type="checkbox" checked={issuesOnly} onChange={event=>setIssuesOnly(event.target.checked)}/>Issues only</label><span role="status">{results.length} of {graph.nodes.length} nodes</span></div>
  <div className="graph-search-results">{results.map(({node,issues})=><article className="graph-search-result" key={node.id}>
   <button className="graph-search-focus" aria-label={'Focus '+node.label} onClick={()=>focus(node.id)}><strong>{node.label}</strong><small>{CATALOG[node.type].label}{node.visible===false?' · Hidden':''}</small></button>
   {issues.map((issue,index)=><div className={'graph-search-issue '+issue.kind} key={issue.kind+'-'+index}><span>{issue.message}</span>{issue.kind==='input'&&issue.input&&<select aria-label={`Connect ${node.label} ${issue.input} input`} value="" disabled={disabled||!connectionSources(graph,node.id,issue.input).length} onChange={event=>connect(event.target.value,node.id,issue.input!)}><option value="">{connectionSources(graph,node.id,issue.input).length?'Choose source…':'No compatible source'}</option>{connectionSources(graph,node.id,issue.input).map(source=><option value={source.id} key={source.id}>{source.label} · {CATALOG[source.type].label}</option>)}</select>}</div>)}
   {output&&issues.some(issue=>issue.kind==='unused')&&outputSources.some(source=>source.id===node.id)&&<button className="graph-search-connect" disabled={disabled} aria-label={`Connect ${node.label} to Scene output`} onClick={()=>connect(node.id,output.id,'scene')}>Connect to Scene output</button>}
  </article>)}{!results.length&&<p>{issuesOnly&&!query.trim()?'No nodes need attention.':'No matching nodes.'}</p>}</div>
 </section>;
}
