import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2, Plus, Redo2, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { ReactFlow, Background, Controls, Handle, Position, useNodesState, useReactFlow, type NodeProps, type Node, type Edge, BackgroundVariant, type Connection, type Viewport } from '@xyflow/react';
import { CATALOG } from '../engine/catalog.ts';
import { validateGraph, edge, type Graph, type Command } from '../engine/project.ts';
import NodePalette from './NodePalette';
import '@xyflow/react/dist/style.css';
type RecipeNode=Node<{label:string;type:string;active:boolean;error?:string;preview:boolean}>;
function Operator({data}:NodeProps<RecipeNode>){const definition=CATALOG[data.type],ports=Object.entries(definition.inputs);return <div className={'operator '+(data.active?'selected ':'')+(data.error?'invalid ':'')+(data.preview?'changed':'')} title={data.error||definition.description}>
  {ports.map(([key,port],i)=><Handle key={key} id={key} type="target" position={Position.Left} style={{top:ports.length===1?'50%':`${28+i*45}%`}} title={key+' · '+port.accept.join('/')}/>) }
  <span className={'node-dot '+definition.category.toLowerCase()}/><div><strong>{data.label}</strong><small>{data.error?'INPUT NEEDED':definition.category}</small></div>{definition.output&&<Handle id="out" type="source" position={Position.Right} title={definition.output}/>}</div>;}
const nodeTypes={operator:Operator};
function FitNewNodes({count,expanded,editorOpen}:{count:number;expanded:boolean;editorOpen:boolean}){
  const {fitView,getViewport,setViewport}=useReactFlow(),wasExpanded=useRef(false),dockedView=useRef<{viewport:Viewport;count:number}|null>(null);
  useEffect(()=>{
    const entering=expanded&&!wasExpanded.current,leaving=!expanded&&wasExpanded.current;
    if(entering)dockedView.current={viewport:getViewport(),count};
    wasExpanded.current=expanded;
    const timer=setTimeout(()=>{if(leaving&&dockedView.current?.count===count)setViewport(dockedView.current.viewport);else fitView({padding:expanded?.15:.25,duration:180});},60);
    return()=>clearTimeout(timer);
  },[count,expanded,editorOpen,fitView,getViewport,setViewport]);
  return null;
}
export default function NodeGraph({graph,selected,onSelect,onCommands,onAdd,inspector,onUndo,onRedo,canUndo,canRedo,disabled,diagnostics,changed=[]}:{graph:Graph;selected:string;onSelect:(s:string)=>void;onCommands:(c:Command[],summary:string)=>void;onAdd:(type:string)=>void;inspector:ReactNode;onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean;disabled:boolean;diagnostics:Record<string,string>;changed?:string[]}){
  const [expanded,setExpanded]=useState(false),[paletteOpen,setPaletteOpen]=useState(false),[editorOpen,setEditorOpen]=useState(true),panelRef=useRef<HTMLElement>(null),addButton=useRef<HTMLButtonElement>(null),paletteId=useId();
  const latest=useRef({paletteOpen,disabled,onUndo,onRedo,canUndo,canRedo});latest.current={paletteOpen,disabled,onUndo,onRedo,canUndo,canRedo};
  const activeNode=graph.nodes.find(node=>node.id===selected)||graph.nodes[0];
  useEffect(()=>{setEditorOpen(true);},[selected]);
  useEffect(()=>{if(expanded&&!panelRef.current?.contains(document.activeElement))panelRef.current?.focus();},[expanded,selected,disabled,paletteOpen,editorOpen]);
  function closePalette(){setPaletteOpen(false);addButton.current?.focus();}
  function toggleExpanded(){setPaletteOpen(false);setExpanded(value=>!value);}
  useEffect(()=>{
    if(!expanded)return;
    const panel=panelRef.current!,opener=document.activeElement as HTMLElement|null,outside:{element:HTMLElement;inert:boolean}[]=[];
    // Keep the graph mounted while preventing interaction with the covered workspace.
    for(let branch:HTMLElement|null=panel;branch?.parentElement;branch=branch.parentElement){
      for(const sibling of Array.from(branch.parentElement.children))if(sibling!==branch&&sibling instanceof HTMLElement){outside.push({element:sibling,inert:sibling.inert});sibling.inert=true;}
      if(branch.parentElement===document.body)break;
    }
    const focusable=()=>Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.getClientRects().length);
    focusable()[0]?.focus();
    const key=(event:KeyboardEvent)=>{
      const typing=(event.target as HTMLElement)?.closest('input,textarea,select,[contenteditable=true]');
      if(event.key==='Escape'){
        if(latest.current.paletteOpen){event.preventDefault();event.stopPropagation();closePalette();}
        else if(!typing){event.preventDefault();event.stopPropagation();setExpanded(false);}
      }
      if(!typing&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&event.code==='KeyA'&&!latest.current.disabled){event.preventDefault();event.stopPropagation();setPaletteOpen(true);}
      if(!typing&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
        event.preventDefault();event.stopPropagation();const current=latest.current;
        if(event.shiftKey?current.canRedo:current.canUndo)(event.shiftKey?current.onRedo:current.onUndo)();
      }
      if(event.key==='Tab'){const items=focusable(),first=items[0],last=items[items.length-1];if(!first){event.preventDefault();panel.focus();}else if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}}
    };
    document.addEventListener('keydown',key,true);
    return()=>{document.removeEventListener('keydown',key,true);outside.forEach(({element,inert})=>{element.inert=inert;});if(opener?.isConnected)opener.focus();};
  },[expanded]);
  const initial=useMemo(()=>graph.nodes.map(n=>({id:n.id,type:'operator',position:n.position,data:{label:n.label,type:n.type,active:selected===n.id,error:diagnostics[n.id],preview:changed.includes(n.id)}})),[graph.nodes,selected,diagnostics,changed]);
  const [nodes,setNodes,onNodesChange]=useNodesState(initial);useEffect(()=>setNodes(initial),[initial,setNodes]);
  const edges=useMemo<Edge[]>(()=>graph.edges.map(e=>({id:e.id,source:e.source,target:e.target,sourceHandle:'out',targetHandle:e.input,type:'smoothstep',label:e.input,style:{stroke:e.target===selected?'#bed694':'#617664',strokeWidth:1.5},labelStyle:{fontSize:8,fill:'#899e89'},labelBgStyle:{fill:'#1b2224'}})),[graph.edges,selected]);
  function valid(c:Connection|Edge){if(!c.source||!c.target||!c.targetHandle)return false;try{validateGraph({...graph,edges:[...graph.edges,edge(c.source,c.target,c.targetHandle)]});return true;}catch{return false;}}
  return <section ref={panelRef} className={'graph-panel'+(expanded?' graph-fullscreen':'')+(expanded&&editorOpen?' graph-with-editor':'')} role={expanded?'dialog':'region'} aria-label="Procedural graph" aria-modal={expanded?true:undefined} tabIndex={-1}><div className="graph-heading"><span>PROCEDURAL GRAPH · {graph.nodes.length} NODES</span><div className="graph-heading-actions"><span className="graph-hint">Drag ports to connect · double-click a wire to remove</span><button className="graph-expand" aria-label={expanded?'Exit full-screen graph':'Expand graph to full screen'} title={expanded?'Exit full screen (Esc)':'Expand graph to full screen'} aria-expanded={expanded} onClick={toggleExpanded}>{expanded?<Minimize2 size={15}/>:<Maximize2 size={15}/>}<span>{expanded?'Exit full screen':'Full screen'}</span></button></div></div><div className="graph-canvas"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{padding:.25}} minZoom={.2} maxZoom={1.5} nodesConnectable={!disabled} nodesDraggable={!disabled} onNodesChange={onNodesChange} deleteKeyCode={null} onNodeClick={(_,n)=>{onSelect(n.id);setEditorOpen(true);setPaletteOpen(false);}} onPaneClick={()=>setPaletteOpen(false)} onNodeDragStop={(_,n)=>onCommands([{op:'move',nodeId:n.id,x:Math.round(n.position.x),y:Math.round(n.position.y)}],'Move '+n.data.label)} isValidConnection={valid} onConnect={c=>onCommands([{op:'connect',edge:edge(c.source,c.target,c.targetHandle!)}],'Connect scene operators.')} onEdgeDoubleClick={(_,e)=>{if(!disabled)onCommands([{op:'disconnect',edgeId:e.id}],'Disconnect scene operators.');}}><Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#3b4648"/><Controls showInteractive={false}/><FitNewNodes count={nodes.length} expanded={expanded} editorOpen={expanded&&editorOpen}/></ReactFlow></div>
    {expanded&&<>
      {editorOpen&&<aside className="graph-node-editor" aria-label="Selected node parameters" onFocusCapture={()=>setPaletteOpen(false)} onPointerDown={()=>setPaletteOpen(false)}><header><div><SlidersHorizontal size={16}/><strong>Node parameters</strong></div><button aria-label="Hide node parameters" onClick={()=>setEditorOpen(false)}><X size={17}/></button></header><div className="inspector-scroll graph-editor-scroll" key={activeNode?.id}>{inspector}</div></aside>}
      <div className="graph-floating-tools">
        {paletteOpen&&<NodePalette id={paletteId} selected={activeNode} disabled={disabled} onAdd={type=>{onAdd(type);closePalette();setEditorOpen(true);}} onClose={closePalette}/>}
        <div className="graph-action-dock" role="toolbar" aria-label="Graph editing tools">
          <button ref={addButton} className="graph-add-node" aria-label="Add node" aria-expanded={paletteOpen} aria-controls={paletteId} title="Add node (Shift+A)" disabled={disabled} onClick={()=>setPaletteOpen(value=>!value)}><span className="graph-add-symbol"><Plus size={28}/></span><span>Add node<small>Shift + A</small></span></button>
          <span className="graph-dock-divider"/>
          <button aria-label="Undo graph edit" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}><Undo2 size={19}/></button><button aria-label="Redo graph edit" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}><Redo2 size={19}/></button>
          <span className="graph-dock-divider"/>
          <button className="graph-editor-toggle" aria-label="Toggle node parameters" aria-pressed={editorOpen} title="Selected node parameters" onClick={()=>setEditorOpen(value=>!value)}><SlidersHorizontal size={19}/><span>Parameters</span></button>
        </div>
      </div>
    </>}
  </section>;
}
