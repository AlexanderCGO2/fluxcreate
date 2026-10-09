import { useEffect, useRef, useState } from 'react';
import { Box, Mountain, Orbit, Plus, Search, Type, Waves, X } from 'lucide-react';
import { CATALOG, RENDERABLE } from '../engine/catalog.ts';
import type { SceneNode } from '../engine/project.ts';

const categories=['All','Motion','Particles','Simulation','Terrain','Geometry','Rendering'];
const iconFor=(category:string)=>category==='Simulation'?Waves:category==='Motion'?Type:category==='Particles'?Orbit:category==='Terrain'?Mountain:Box;

export default function NodePalette({id,selected,disabled,onAdd,onClose}:{id:string;selected?:SceneNode;disabled:boolean;onAdd:(type:string)=>void;onClose:()=>void}){
  const [query,setQuery]=useState(''),[category,setCategory]=useState('All'),search=useRef<HTMLInputElement>(null);
  useEffect(()=>{search.current?.focus();},[]);
  const source=selected&&CATALOG[selected.type];
  const connects=(definition:typeof CATALOG[string])=>!!source?.output&&Object.values(definition.inputs).some(port=>port.accept.includes(source.output!));
  const entries=Object.entries(CATALOG).filter(([type,definition])=>type!=='output'&&(category==='All'||definition.category===category)&&(definition.label+' '+definition.category+' '+type).toLowerCase().includes(query.trim().toLowerCase())).sort(([,a],[,b])=>Number(connects(b))-Number(connects(a))||categories.indexOf(a.category)-categories.indexOf(b.category));
  return <section id={id} className="graph-node-palette" aria-label="Add nodes">
    <header><div><strong>Add a node</strong><span>{selected?'Selected: '+selected.label:'Choose an operator for your graph'}</span></div><button aria-label="Close node picker" onClick={onClose}><X size={18}/></button></header>
    <div className="graph-node-search"><Search size={17}/><input ref={search} aria-label="Search nodes" placeholder="Search nodes…" value={query} onChange={event=>setQuery(event.target.value)}/></div>
    <div className="graph-node-categories" aria-label="Node categories">{categories.map(item=><button key={item} aria-pressed={category===item} onClick={()=>setCategory(item)}>{item}</button>)}</div>
    <div className="graph-node-results">{entries.map(([type,definition])=>{
      const Icon=iconFor(definition.category),hint=connects(definition)?(Object.values(definition.inputs).some(p=>p.optional)?'Use source: ':'Insert after ')+selected!.label:Object.values(definition.inputs).every(p=>p.optional)&&definition.output&&RENDERABLE.includes(definition.output)?'Connects to Scene output':Object.keys(definition.inputs).length?'Connect its inputs after adding':'Reusable source';
      return <button key={type} className="graph-node-option" aria-label={'Add node '+definition.label} title={definition.description} disabled={disabled} onClick={()=>onAdd(type)}><Icon size={21}/><span><strong>{definition.label}</strong><small>{hint}</small></span><Plus size={15}/></button>;
    })}{!entries.length&&<p className="graph-node-empty">No nodes match “{query}”. Try another name or category.</p>}</div>
    <footer>Compatible modifiers connect to the selected node automatically.</footer>
  </section>;
}
