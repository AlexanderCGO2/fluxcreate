import {applyPatch,edge,type Project,type Graph,type Command} from './project.ts';
export type GraphBatchAction={type:'duplicate'|'delete'|'alignLeft'|'row'}|{type:'move';dx:number;dy:number};
export function upstreamSelection(graph:Graph,nodeId:string){const ids=new Set<string>(),pending=[nodeId];while(pending.length){const id=pending.pop()!;if(ids.has(id))continue;ids.add(id);for(const connection of graph.edges)if(connection.target===id)pending.push(connection.source);}return graph.nodes.filter(node=>ids.has(node.id)).map(node=>node.id);}
/** Reuse existing validated commands; every batch remains one revision and undo. */
export function graphBatch(project:Project,selection:string[],action:GraphBatchAction,makeId:(id:string)=>string=()=>`copy_${crypto.randomUUID().replaceAll('-','')}`){
 const ids=[...new Set(selection)],chosen=ids.map(id=>project.graph.nodes.find(node=>node.id===id));if(!ids.length)throw Error('Select at least one node.');if(chosen.some(node=>!node))throw Error('A selected node no longer exists.');const nodes=chosen.filter(node=>!!node),commands:Command[]=[];let resultIds=ids;
 if(action.type==='duplicate'||action.type==='delete'){
  if(nodes.some(node=>node.type==='output'))throw Error('Scene output cannot be duplicated or deleted.');
  if(project.locks.some(lock=>ids.includes(lock.nodeId)))throw Error('Unlock selected node parameters before duplicating or deleting this selection.');
 }
 if(action.type==='duplicate'){
  const copies=new Map(nodes.map(node=>[node.id,makeId(node.id)]));resultIds=nodes.map(node=>copies.get(node.id)!);
  for(const node of nodes)commands.push({op:'duplicate',nodeId:node.id,id:copies.get(node.id)!,x:node.position.x+80,y:node.position.y+80});
  // Ordinary duplicate keeps external inputs. Replace only wires internal to the copied selection.
  for(const connection of project.graph.edges)if(copies.has(connection.source)&&copies.has(connection.target))commands.push({op:'disconnect',edgeId:edge(connection.source,copies.get(connection.target)!,connection.input).id},{op:'connect',edge:edge(copies.get(connection.source)!,copies.get(connection.target)!,connection.input)});
 }else if(action.type==='delete'){for(const id of ids)commands.push({op:'remove',nodeId:id});resultIds=[];}
 else{
  const x=Math.min(...nodes.map(node=>node.position.x)),y=Math.min(...nodes.map(node=>node.position.y));
  for(const [i,node]of nodes.entries())commands.push({op:'move',nodeId:node.id,x:action.type==='move'?node.position.x+action.dx:action.type==='row'?x+i*240:x,y:action.type==='move'?node.position.y+action.dy:action.type==='row'?y:node.position.y});
 }
 if(commands.length>32)throw Error('This edit exceeds the 32-command atomic limit. Select fewer nodes or wires.');const summary=({duplicate:'Duplicate',delete:'Delete',alignLeft:'Align',row:'Arrange',move:'Move'}[action.type])+' '+ids.length+' graph nodes.';
 applyPatch(project,{baseRevision:project.revision,summary,commands});return{commands,summary,selection:resultIds};
}
