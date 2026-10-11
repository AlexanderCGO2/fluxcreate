import {libraryGraph} from './workflow-library-model.mjs';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function fields(before,after,prefix=''){
 const changes=[];
 for(const key of [...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].sort()){
  const left=before?.[key],right=after?.[key],path=prefix?prefix+'.'+key:key;
  if(object(left)||object(right))changes.push(...fields(object(left)?left:{},object(right)?right:{},path));
  else if(JSON.stringify(left)!==JSON.stringify(right))changes.push({path,before:structuredClone(left),after:structuredClone(right)});
 }
 return changes;
}
function connections(graph){const found=new Map();for(const node of graph.nodes){const sources=node.from===null?[]:Array.isArray(node.from)?node.from:[node.from];sources.forEach((source,index)=>{const edge={source,target:node.id,kind:'input',slot:index+1};found.set(JSON.stringify(edge),edge);});if(node.when){const edge={source:node.when.nodeId,target:node.id,kind:'condition',slot:1};found.set(JSON.stringify(edge),edge);}}return found;}
/** Bounded, detached review data. Comparing never mutates, executes or persists a graph. */
export function compareWorkflowGraphs(rawBefore,rawAfter){
 const before=libraryGraph(rawBefore),after=libraryGraph(rawAfter),left=new Map(before.nodes.map(n=>[n.id,n])),right=new Map(after.nodes.map(n=>[n.id,n]));
 const workflow=[...fields({name:before.name,version:before.version},{name:after.name,version:after.version}),...fields(before.limits,after.limits,'limits')],nodes=[];
 for(const id of [...new Set([...left.keys(),...right.keys()])].sort()){
  const a=left.get(id),b=right.get(id);
  if(!a||!b){nodes.push({id,name:(b||a).name,kind:a?'removed':'added',changes:fields(a||{},b||{}).filter(c=>c.path!=='id')});continue;}
  const changes=fields(a,b).filter(c=>c.path!=='id');if(changes.length)nodes.push({id,name:b.name,kind:'changed',changes});
 }
 const leftEdges=connections(before),rightEdges=connections(after),edges={added:[...rightEdges.keys()].sort().filter(k=>!leftEdges.has(k)).map(k=>rightEdges.get(k)),removed:[...leftEdges.keys()].sort().filter(k=>!rightEdges.has(k)).map(k=>leftEdges.get(k))};
 return {identical:!workflow.length&&!nodes.length&&!edges.added.length&&!edges.removed.length,workflow,nodes,connections:edges};
}
