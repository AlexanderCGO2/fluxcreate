// Actual NodeGraph boundary harness: no production test hooks or simulated drag callbacks.
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import NodeGraph from '../src/components/NodeGraph';import {createProject,makeNode,edge,applyPatch,type Project} from '../src/engine/project.ts';
import '../src/style.css';import '../src/nodes.css';import '../src/motion.css';import '../src/studio.css';import '../src/theme.css';
const initial=createProject('00000000-0000-4000-8000-000000000001','blank');initial.graph={nodes:[makeNode('a','shape',0,0),makeNode('b','transform',240,0),makeNode('output','output',480,0)],edges:[edge('a','b','scene'),edge('b','output','scene')]};
const noChanges:string[]=[];
const boundary=window as unknown as {graphBoundary:{read:()=>{project:Project;commits:number};change:(kind:string)=>void}};
function Harness(){const [project,setProject]=useState(initial),[disabled,setDisabled]=useState(false),[selected,setSelected]=useState('a'),[commits,setCommits]=useState(0);
 boundary.graphBoundary={read:()=>({project,commits}),change:kind=>{if(kind==='disabled')setDisabled(true);else if(kind==='enabled')setDisabled(false);else if(kind==='selection')setSelected('output');else setProject(p=>({...p,...(kind==='identity'?{id:'00000000-0000-4000-8000-000000000002'}:{revision:p.revision+1}),graph:{...p.graph,nodes:p.graph.nodes.map(node=>({...node,position:{x:node.position.x+10,y:node.position.y+15}}))}}));}};
 return <NodeGraph project={project} graph={project.graph} selected={selected} onSelect={setSelected} onCommands={(commands,summary)=>{setCommits(c=>c+1);setProject(p=>applyPatch(p,{baseRevision:p.revision,commands,summary}));}} onAdd={()=>{}} inspector={null} onUndo={()=>{}} onRedo={()=>{}} canUndo={false} canRedo={false} disabled={disabled} diagnostics={{}} changed={noChanges}/>;
}createRoot(document.getElementById('root')!).render(<Harness/>);
