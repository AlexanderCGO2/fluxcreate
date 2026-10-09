import {CATALOG} from './catalog.ts';
import {edge,validateGraph,type Graph,type SceneNode} from './project.ts';

export type GraphIssue={kind:'input'|'evaluation'|'unused';message:string;input?:string};

/** Reachability describes scene output, independently of temporary visibility. */
export function graphIssues(graph:Graph,diagnostics:Record<string,string>={}):Record<string,GraphIssue[]>{
 const used=new Set<string>(),pending=graph.nodes.filter(node=>node.type==='output').map(node=>node.id);
 while(pending.length){const id=pending.pop()!;if(used.has(id))continue;used.add(id);for(const connection of graph.edges)if(connection.target===id)pending.push(connection.source);}
 const result:Record<string,GraphIssue[]>={};
 for(const node of graph.nodes){
  const issues:GraphIssue[]=[],definition=CATALOG[node.type];
  for(const [name,port]of Object.entries(definition.inputs))if(!port.optional&&!graph.edges.some(connection=>connection.target===node.id&&connection.input===name))issues.push({kind:'input',input:name,message:`Missing ${name} input.`});
  if(diagnostics[node.id]&&!issues.some(issue=>issue.kind==='input'))issues.push({kind:'evaluation',message:diagnostics[node.id]});
  if(node.type!=='output'&&!used.has(node.id))issues.push({kind:'unused',message:'Not used by Scene output.'});
  if(issues.length)result[node.id]=issues;
 }
 return result;
}

export function searchGraphNodes(graph:Graph,query:string,diagnostics:Record<string,string>={},issuesOnly=false){
 const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),issues=graphIssues(graph,diagnostics);
 return graph.nodes.flatMap(node=>{
  const definition=CATALOG[node.type],nodeIssues=issues[node.id]||[];
  // Retained source files and preview bytes are deliberately outside this index.
  const searchable=[node.id,node.label,node.type,definition.label,definition.category,...Object.entries(node.params).flatMap(([name,value])=>[name,definition.params[name]?.label||'',String(value)]),...nodeIssues.map(issue=>issue.message)].join(' ').toLocaleLowerCase();
  return (!issuesOnly||nodeIssues.length)&&terms.every(term=>searchable.includes(term))?[{node,issues:nodeIssues}]:[];
 });
}

/** Suggestions use the same type, cycle, multiplicity and output-budget rules as edits. */
export function connectionSources(graph:Graph,targetId:string,input:string):SceneNode[]{
 const target=graph.nodes.find(node=>node.id===targetId),port=target&&CATALOG[target.type].inputs[input];
 if(!port||(!port.multi&&graph.edges.some(connection=>connection.target===targetId&&connection.input===input)))return[];
 return graph.nodes.filter(source=>{
  const output=CATALOG[source.type].output;
  if(source.id===targetId||!output||!port.accept.includes(output))return false;
  try{validateGraph({...graph,edges:[...graph.edges,edge(source.id,targetId,input)]});return true;}catch{return false;}
 });
}
