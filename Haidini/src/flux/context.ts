import { fitToBudget, estimateTokens } from './budget.ts';
import type { Project } from '../engine/project.ts';
export interface SceneEvent {id:string;revision:number;summary:string;nodeIds:string[];}
export interface ScenePreference {id:string;statement:string;source_id:string;node_id:string|null;}
// Pure, storage-independent scene context assembly. The SQLite adapter supplies scoped records.
export function buildSceneContext(project:Project,intent:string,selection:string[],events:SceneEvent[],hits:SceneEvent[],preferences:ScenePreference[]){
  const selected=new Set(selection),history=[...events].sort((a,b)=>Number(b.nodeIds.some(id=>selected.has(id)))-Number(a.nodeIds.some(id=>selected.has(id)))).slice(0,8),seen=new Set(history.map(e=>e.id));
  const raw=[
    {id:'scene',budget:null,lines:[`Project: ${project.name}; ID: ${project.id}; branch: ${project.branchId}; revision: ${project.revision}`,`Timeline: ${JSON.stringify(project.timeline)}`,...project.graph.nodes.map(n=>`Node ${n.id}: ${JSON.stringify({type:n.type,label:n.label,visible:n.visible!==false,params:n.params})}`),`Connections: ${JSON.stringify(project.graph.edges)}`,`Animation tracks: ${JSON.stringify(project.animations)}`]},
    {id:'selection',budget:null,lines:[`Selected nodes: ${selection.join(', ')||'whole scene'}. Preserve unrelated branches unless the request explicitly concerns them.`]},
    {id:'invariants',budget:null,lines:[`Locked parameters: ${JSON.stringify(project.locks)}. Never change these values or remove their nodes.`,`Only registered operators and validated commands are supported. No cycles. Exactly one Scene output. Disconnected branches are not visible. A node’s visible=false hides its appearance and downstream visual modifiers, including exports, while sources and colliders still compute. Use the visibility command; do not disconnect or set opacity to hide an object. Emitter/motion are analytical. particleSim is a fixed-step particle solver with connected sphere/box collisions; water and cloth also accept shape colliders. Use animate/removeAnimation for timeline tracks, and lifeTransition/endColor/endOpacity/endSize for per-particle aging. Never animate locked parameters.`]},
    {id:'preferences',budget:500,lines:preferences.filter(p=>!p.node_id||project.graph.nodes.some(n=>n.id===p.node_id)).map(p=>`Approved preference [${p.id}; source ${p.source_id}; node ${p.node_id||'project-wide'}]: ${p.statement}`)},
    {id:'history',budget:700,lines:history.map(e=>`History [${e.id}; revision ${e.revision}; nodes ${e.nodeIds.join(', ')}]: ${e.summary}`)},
    {id:'retrieved',budget:600,lines:hits.filter(e=>!seen.has(e.id)).map(e=>`Retrieved history [${e.id}; revision ${e.revision}; nodes ${e.nodeIds.join(', ')}]: ${e.summary}`)},
  ];
  const sections=raw.map(s=>{const fit=s.budget===null?{kept:s.lines,dropped:[],tokens:estimateTokens(s.lines.join('\n'))}:fitToBudget(s.lines,s.budget);return {id:s.id,budget:s.budget,lines:fit.kept,dropped:fit.dropped,tokens:fit.tokens};});
  return {projectId:project.id,branchId:project.branchId,revision:project.revision,selection,intent,sections,tokenEstimate:sections.reduce((n,s)=>n+s.tokens,0),retrieval:'SQLite FTS5',assembledAt:new Date().toISOString()};
}
