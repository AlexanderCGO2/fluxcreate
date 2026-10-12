import { useEffect, useLayoutEffect, useId, useMemo, useRef, useState, type ReactNode, type CSSProperties, type RefObject } from 'react';
import { Maximize2, Minimize2, Plus, Redo2, SlidersHorizontal, Undo2, X, Scan, Focus, Search, Layers } from 'lucide-react';
import { ReactFlow, Background, Controls, Handle, Position, useNodesState, useReactFlow, type NodeChange, type NodeProps, type Node, type Edge, BackgroundVariant, type Connection, type Viewport } from '@xyflow/react';
import { CATALOG } from '../engine/catalog.ts';
import { validateGraph, edge, type Graph, type Project, type Command } from '../engine/project.ts';
import NodePalette from './NodePalette';
import GraphNavigator from './GraphNavigator';
import GraphOrganizer from './GraphOrganizer';
import {beginGraphDrag,finishGraphDrag,type GraphDrag} from '../engine/graphDrag.ts';
import '@xyflow/react/dist/style.css';
type RecipeNode=Node<{label:string;type:string;active:boolean;error?:string;preview:boolean}>;
function Operator({data}:NodeProps<RecipeNode>){const definition=CATALOG[data.type],ports=Object.entries(definition.inputs);return <div className={'operator '+(data.active?'selected ':'')+(data.error?'invalid ':'')+(data.preview?'changed':'')} title={data.error||definition.description}>
  {ports.map(([key,port],i)=><Handle key={key} id={key} type="target" position={Position.Left} style={{top:ports.length===1?'50%':`${28+i*45}%`}} title={key+' · '+port.accept.join('/')}/>) }
  <span className={'node-dot '+definition.category.toLowerCase()}/><div><strong>{data.label}</strong><small>{data.error?'CHECK NODE':definition.category}</small></div>{definition.output&&<Handle id="out" type="source" position={Position.Right} title={definition.output}/>}</div>;}
const nodeTypes={operator:Operator};
function GraphViewTools({count,expanded,editorOpen,selected,focusRequest,restored=false,dockedView}:{count:number;expanded:boolean;editorOpen:boolean;selected:string;focusRequest:number;restored?:boolean;dockedView:RefObject<{viewport:Viewport;count:number}|null>}){
  const {fitView,getViewport,setViewport}=useReactFlow(),wasExpanded=useRef(false),lastFocusRequest=useRef(0),selection=useRef(selected);selection.current=selected;
  const skipRestoredView=useRef(restored);
  useEffect(()=>{
    if(skipRestoredView.current){skipRestoredView.current=false;wasExpanded.current=expanded;lastFocusRequest.current=focusRequest;return;}
    const entering=expanded&&!wasExpanded.current,leaving=!expanded&&wasExpanded.current,focusRequested=focusRequest!==lastFocusRequest.current;lastFocusRequest.current=focusRequest;
    if(entering)dockedView.current={viewport:getViewport(),count};
    wasExpanded.current=expanded;
    const timer=setTimeout(()=>{if(focusRequested)fitView({nodes:[{id:selection.current}],padding:.4,minZoom:1,maxZoom:1.2,duration:180});else if(leaving&&dockedView.current?.count===count)setViewport(dockedView.current.viewport);else fitView({padding:expanded?.15:.25,minZoom:.8,maxZoom:1,...(!expanded&&selection.current?{nodes:[{id:selection.current}]}:{}),duration:180});},60);
    return()=>clearTimeout(timer);
  },[count,expanded,editorOpen,focusRequest,fitView,getViewport,setViewport]);
  return <div className="graph-view-tools" role="toolbar" aria-label="Graph view"><button onClick={()=>fitView({padding:.15,minZoom:.2,maxZoom:1,duration:180})} title="Fit all nodes; zoom out for an overview"><Scan size={15}/>Fit all</button><button disabled={!selected} onClick={()=>fitView({nodes:[{id:selected}],padding:.4,minZoom:1,maxZoom:1.2,duration:180})}><Focus size={15}/>Focus selection</button></div>;
}
export default function NodeGraph({project,graph,selected,onSelect,onCommands,onAdd,inspector,onUndo,onRedo,canUndo,canRedo,disabled,diagnostics,changed=[]}:{project:Project;graph:Graph;selected:string;onSelect:(s:string)=>void;onCommands:(c:Command[],summary:string)=>void;onAdd:(type:string)=>void;inspector:ReactNode;onUndo:()=>void;onRedo:()=>void;canUndo:boolean;canRedo:boolean;disabled:boolean;diagnostics:Record<string,string>;changed?:string[]}){
  const [batchIds,setBatchIds]=useState([selected]),[organizerOpen,setOrganizerOpen]=useState(false),organizeButton=useRef<HTMLButtonElement>(null),pendingSelection=useRef<string[]|null>(null),nodeDrag=useRef<GraphDrag|null>(null);
  const [boxSelect,setBoxSelect]=useState(false),[dragError,setDragError]=useState(''),[flowEpoch,setFlowEpoch]=useState(0),generation=useRef(0),selectionRef=useRef(batchIds),viewportRef=useRef<Viewport>({x:0,y:0,zoom:1});selectionRef.current=batchIds;
  const dockedView=useRef<{viewport:Viewport;count:number}|null>(null);
  const [additiveSelection,setAdditiveSelection]=useState(false);
  useEffect(()=>{const modifiers=(event:KeyboardEvent)=>setAdditiveSelection(event.ctrlKey||event.metaKey||event.shiftKey),blur=()=>setAdditiveSelection(false);window.addEventListener('keydown',modifiers,true);window.addEventListener('keyup',modifiers,true);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',modifiers,true);window.removeEventListener('keyup',modifiers,true);window.removeEventListener('blur',blur);};},[]);
  const [expanded,setExpanded]=useState(false),[paletteOpen,setPaletteOpen]=useState(false),[navigatorOpen,setNavigatorOpen]=useState(false),[focusRequest,setFocusRequest]=useState(0),findButton=useRef<HTMLButtonElement>(null),[editorOpen,setEditorOpen]=useState(true),panelRef=useRef<HTMLElement>(null),addButton=useRef<HTMLButtonElement>(null),paletteId=useId();
  const [height,setHeight]=useState(()=>{try{return Math.max(190,Math.min(520,Number(localStorage.getItem('fluxini.graphHeight'))||280));}catch{return 280;}}),drag=useRef<{y:number;height:number}|null>(null);
  const [availableHeight,setAvailableHeight]=useState(()=>Math.max(190,Math.min(520,window.innerHeight-450)));
  useEffect(()=>{const resize=()=>setAvailableHeight(Math.max(190,Math.min(520,window.innerHeight-450)));window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useEffect(()=>{localStorage.setItem('fluxini.graphHeight',String(height));},[height]);
  const dockHeight=Math.min(height,availableHeight),resizeGraph=(value:number)=>setHeight(Math.max(190,Math.min(availableHeight,value)));
  const latest=useRef({paletteOpen,navigatorOpen,organizerOpen,disabled,onUndo,onRedo,canUndo,canRedo});latest.current={paletteOpen,navigatorOpen,organizerOpen,disabled,onUndo,onRedo,canUndo,canRedo};
  useEffect(()=>{setBatchIds(ids=>ids.includes(selected)?ids:[selected]);},[selected]);
  useEffect(()=>{setBatchIds([selected]);pendingSelection.current=null;},[project.id]);
  useEffect(()=>{if(pendingSelection.current?.every(id=>graph.nodes.some(node=>node.id===id))){const ids=pendingSelection.current;pendingSelection.current=null;setBatchIds(ids);if(ids.length)onSelect(ids.at(-1)!);}else setBatchIds(ids=>{const valid=ids.filter(id=>graph.nodes.some(node=>node.id===id));return valid.length===ids.length?ids:valid;});},[graph.nodes,onSelect]);
  const activeNode=graph.nodes.find(node=>node.id===selected)||graph.nodes[0];
  useEffect(()=>{setEditorOpen(true);},[selected]);
  useEffect(()=>{if(expanded&&!panelRef.current?.contains(document.activeElement))panelRef.current?.focus();},[expanded,selected,disabled,paletteOpen,editorOpen]);
  function closePalette(){setPaletteOpen(false);addButton.current?.focus();}
  function closeNavigator(){setNavigatorOpen(false);findButton.current?.focus();}
  function closeOrganizer(){setOrganizerOpen(false);organizeButton.current?.focus();}
  function openOrganizer(){setNavigatorOpen(false);setPaletteOpen(false);setOrganizerOpen(true);}
  function openNavigator(){setOrganizerOpen(false);setPaletteOpen(false);setNavigatorOpen(true);}
  function toggleExpanded(){setOrganizerOpen(false);setNavigatorOpen(false);setPaletteOpen(false);setExpanded(value=>!value);}
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
        if(latest.current.organizerOpen){event.preventDefault();event.stopPropagation();closeOrganizer();}
        else if(latest.current.navigatorOpen){event.preventDefault();event.stopPropagation();closeNavigator();}
        else if(latest.current.paletteOpen){event.preventDefault();event.stopPropagation();closePalette();}
        else if(!typing){event.preventDefault();event.stopPropagation();setExpanded(false);}
      }
      if(!typing&&event.shiftKey&&!event.ctrlKey&&!event.metaKey&&event.code==='KeyA'&&!latest.current.disabled){event.preventDefault();event.stopPropagation();setOrganizerOpen(false);setNavigatorOpen(false);setPaletteOpen(true);}
      if(!typing&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
        event.preventDefault();event.stopPropagation();const current=latest.current;
        if(event.shiftKey?current.canRedo:current.canUndo)(event.shiftKey?current.onRedo:current.onUndo)();
      }
      if(event.key==='Tab'){const items=focusable(),first=items[0],last=items[items.length-1];if(!first){event.preventDefault();panel.focus();}else if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last.focus();}else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first.focus();}}
    };
    document.addEventListener('keydown',key,true);
    return()=>{document.removeEventListener('keydown',key,true);outside.forEach(({element,inert})=>{element.inert=inert;});if(opener?.isConnected)opener.focus();};
  },[expanded]);
  const initial=useMemo(()=>graph.nodes.map(n=>({id:n.id,type:'operator',position:n.position,selected:batchIds.includes(n.id),data:{label:n.label,type:n.type,active:batchIds.includes(n.id),error:diagnostics[n.id],preview:changed.includes(n.id)}})),[graph.nodes,batchIds,selected,diagnostics,changed]);
  const [nodes,setNodes,applyNodeChanges]=useNodesState<RecipeNode>(initial);
  const committed=useRef(initial);committed.current=initial;
  useEffect(()=>{if(!nodeDrag.current)setNodes(initial);},[initial,setNodes]);
  // ReactFlow's native drag can continue emitting after cancellation. Recreate its
  // interaction state and reject callbacks from the old generation, retaining zoom.
  function cancelNodeDrag(){if(!nodeDrag.current)return false;nodeDrag.current=null;generation.current++;setFlowEpoch(generation.current);setNodes(committed.current);return true;}
  function changeSelection(ids:string[]){const next=[...new Set(ids)];if(next.length===selectionRef.current.length&&next.every(id=>selectionRef.current.includes(id)))return;cancelNodeDrag();selectionRef.current=next;setBatchIds(next);}
  useLayoutEffect(()=>{const draft=nodeDrag.current;if(draft&&(disabled||draft.projectId!==project.id||draft.revision!==project.revision||draft.selection.length!==batchIds.length||!draft.selection.every(id=>batchIds.includes(id))))cancelNodeDrag();},[project.id,project.revision,disabled,batchIds]);
  useLayoutEffect(()=>{cancelNodeDrag();},[selected]);
  const cancelRef=useRef(cancelNodeDrag);cancelRef.current=cancelNodeDrag;
  useEffect(()=>{const cancel=()=>cancelRef.current(),key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&cancelRef.current()){event.preventDefault();event.stopImmediatePropagation();}};window.addEventListener('keydown',key,true);window.addEventListener('pointercancel',cancel,true);window.addEventListener('blur',cancel);return()=>{window.removeEventListener('keydown',key,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel);};},[]);
  function onNodesChange(changes:NodeChange<RecipeNode>[]){
    if(flowEpoch!==generation.current)return;
    const selectionChanges=changes.filter(change=>change.type==='select');
    if(selectionChanges.length){const ids=new Set(selectionRef.current);for(const change of selectionChanges)if(change.type==='select'){if(change.selected)ids.add(change.id);else ids.delete(change.id);}changeSelection([...ids]);}
    applyNodeChanges(changes.filter(change=>change.type!=='position'||!!nodeDrag.current));
  }
  function startNodeDrag(anchor:RecipeNode){if(flowEpoch!==generation.current||disabled)return;try{nodeDrag.current=beginGraphDrag(project,selectionRef.current.includes(anchor.id)?selectionRef.current:[anchor.id],anchor.id);setDragError('');}catch(error){setDragError((error as Error).message);nodeDrag.current=null;generation.current++;setFlowEpoch(generation.current);setNodes(committed.current);}}
  function stopNodeDrag(moved:RecipeNode[]){if(flowEpoch!==generation.current)return;const draft=nodeDrag.current;nodeDrag.current=null;const anchor=moved.find(node=>node.id===draft?.anchor);try{const batch=!disabled&&anchor?finishGraphDrag(draft,project,selectionRef.current,anchor.position):null;if(batch)onCommands(batch.commands,batch.summary);else setNodes(committed.current);}catch(error){setDragError((error as Error).message);setNodes(committed.current);}}

  const edges=useMemo<Edge[]>(()=>graph.edges.map(e=>({id:e.id,source:e.source,target:e.target,sourceHandle:'out',targetHandle:e.input,type:'smoothstep',label:e.input,style:{stroke:e.target===selected?'var(--accent)':'var(--graph-edge)',strokeWidth:1.5},labelStyle:{fontSize:11,fill:'var(--secondary)'},labelBgStyle:{fill:'var(--workspace)'}})),[graph.edges,selected]);
  function valid(c:Connection|Edge){if(!c.source||!c.target||!c.targetHandle)return false;try{validateGraph({...graph,edges:[...graph.edges,edge(c.source,c.target,c.targetHandle)]});return true;}catch{return false;}}
  return <section onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='f'){event.preventDefault();event.stopPropagation();openNavigator();}}} ref={panelRef} className={'graph-panel'+(additiveSelection?' graph-additive':'')+(expanded?' graph-fullscreen':'')+(expanded&&editorOpen?' graph-with-editor':'')} style={{'--graph-height':dockHeight+'px'} as CSSProperties} role={expanded?'dialog':'region'} aria-label="Procedural graph" aria-modal={expanded?true:undefined} tabIndex={-1}>{!expanded&&<div className="graph-resize" role="separator" aria-label="Graph height" aria-orientation="horizontal" aria-valuemin={190} aria-valuemax={availableHeight} aria-valuenow={dockHeight} tabIndex={0} onKeyDown={e=>{if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();resizeGraph(e.key==='Home'?190:e.key==='End'?availableHeight:dockHeight+(e.key==='ArrowUp'?20:-20));}}} onPointerDown={e=>{drag.current={y:e.clientY,height:dockHeight};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)resizeGraph(drag.current.height+drag.current.y-e.clientY);}} onPointerUp={e=>{drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{drag.current=null;}}/>}<div className="graph-heading"><span>PROCEDURAL GRAPH · {graph.nodes.length} NODES</span><div className="graph-heading-actions"><span className="graph-hint">Drag ports to connect · double-click a wire to remove</span><button className="graph-expand" aria-label="Box select nodes" aria-pressed={boxSelect} disabled={disabled} title="Drag empty canvas to select nodes (or hold Shift)" onClick={()=>{cancelNodeDrag();setBoxSelect(value=>!value);}}><Scan size={15}/><span>Box select</span></button><button ref={organizeButton} className="graph-expand" aria-label="Organize graph nodes" aria-expanded={organizerOpen} onClick={()=>organizerOpen?closeOrganizer():openOrganizer()}><Layers size={15}/><span>Organize</span></button><button ref={findButton} className="graph-expand" aria-label="Find nodes in graph" title="Find nodes (Ctrl+F)" aria-expanded={navigatorOpen} onClick={()=>navigatorOpen?closeNavigator():openNavigator()}><Search size={15}/><span>Find nodes</span></button><button className="graph-expand" aria-label={expanded?'Exit full-screen graph':'Expand graph to full screen'} title={expanded?'Exit full screen (Esc)':'Expand graph to full screen'} aria-expanded={expanded} onClick={toggleExpanded}>{expanded?<Minimize2 size={15}/>:<Maximize2 size={15}/>}<span>{expanded?'Exit full screen':'Full screen'}</span></button></div></div><div className="graph-canvas">{dragError&&<p className="graph-drag-error" role="alert">{dragError}</p>}<ReactFlow key={flowEpoch} nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultViewport={viewportRef.current} onMove={(_:unknown,viewport:Viewport)=>{viewportRef.current=viewport;}} fitView={flowEpoch===0} fitViewOptions={{padding:.25,minZoom:.8,maxZoom:1}} minZoom={.2} maxZoom={1.5} nodesConnectable={!disabled} nodesDraggable={!disabled} selectionOnDrag={boxSelect} selectionKeyCode="Shift" multiSelectionKeyCode={['Control','Meta','Shift']} panOnDrag={boxSelect?[1,2]:true} disableKeyboardA11y edgesFocusable={false} onNodesChange={onNodesChange} deleteKeyCode={null} onNodeClick={(event,n)=>{if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey){onSelect(n.id);setEditorOpen(true);}setPaletteOpen(false);}} onPaneClick={()=>setPaletteOpen(false)} onNodeDragStart={(_,n)=>startNodeDrag(n)} onNodeDragStop={(_,n,moved)=>stopNodeDrag(moved.length?moved:[n])} onSelectionDragStart={(_,selectedNodes)=>{if(selectedNodes[0])startNodeDrag(selectedNodes[0]);}} onSelectionDragStop={(_,selectedNodes)=>stopNodeDrag(selectedNodes)} isValidConnection={valid} onConnect={(c:Connection)=>onCommands([{op:'connect',edge:edge(c.source,c.target,c.targetHandle!)}],'Connect scene operators.')} onEdgeDoubleClick={(_,e)=>{if(!disabled)onCommands([{op:'disconnect',edgeId:e.id}],'Disconnect scene operators.');}}><Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--graph-grid)"/><Controls showInteractive={false} showFitView={false}/><GraphViewTools dockedView={dockedView} restored={flowEpoch>0} focusRequest={focusRequest} count={nodes.length} expanded={expanded} editorOpen={expanded&&editorOpen} selected={selected}/>{navigatorOpen&&<GraphNavigator graph={graph} diagnostics={diagnostics} disabled={disabled} onSelect={id=>{setBatchIds([id]);onSelect(id);setEditorOpen(true);setFocusRequest(value=>value+1);}} onCommands={onCommands} onClose={closeNavigator}/>}{organizerOpen&&<GraphOrganizer project={project} selection={batchIds} onSelection={changeSelection} disabled={disabled} onClose={closeOrganizer} onApply={(commands,summary,ids)=>{pendingSelection.current=ids;onCommands(commands,summary);}}/>}</ReactFlow></div>
    {expanded&&<>
      {editorOpen&&<aside className="graph-node-editor" aria-label="Selected node parameters" onFocusCapture={()=>setPaletteOpen(false)} onPointerDown={()=>setPaletteOpen(false)}><header><div><SlidersHorizontal size={16}/><strong>Node parameters</strong></div><button aria-label="Hide node parameters" onClick={()=>setEditorOpen(false)}><X size={17}/></button></header><div className="inspector-scroll graph-editor-scroll" key={activeNode?.id}>{inspector}</div></aside>}
      <div className="graph-floating-tools">
        {paletteOpen&&<NodePalette id={paletteId} selected={activeNode} disabled={disabled} onAdd={type=>{onAdd(type);closePalette();setEditorOpen(true);}} onClose={closePalette}/>}
        <div className="graph-action-dock" role="toolbar" aria-label="Graph editing tools">
          <button ref={addButton} className="graph-add-node" aria-label="Add node" aria-expanded={paletteOpen} aria-controls={paletteId} title="Add node (Shift+A)" disabled={disabled} onClick={()=>{setOrganizerOpen(false);setNavigatorOpen(false);setPaletteOpen(value=>!value);}}><span className="graph-add-symbol"><Plus size={28}/></span><span>Add node<small>Shift + A</small></span></button>
          <span className="graph-dock-divider"/>
          <button aria-label="Undo graph edit" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={onUndo}><Undo2 size={19}/></button><button aria-label="Redo graph edit" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={onRedo}><Redo2 size={19}/></button>
          <span className="graph-dock-divider"/>
          <button className="graph-editor-toggle" aria-label="Toggle node parameters" aria-pressed={editorOpen} title="Selected node parameters" onClick={()=>setEditorOpen(value=>!value)}><SlidersHorizontal size={19}/><span>Parameters</span></button>
        </div>
      </div>
    </>}
  </section>;
}
