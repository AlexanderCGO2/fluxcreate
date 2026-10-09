import {MAX_PARTICLE_CAPACITY} from './particleLimits.ts';
import {validateGraph,type Graph} from './project.ts';
// Include graph amplification and the remaining scene budget when offering a higher capacity.
export function particleCapacityLimit(graph:Graph,nodeId:string){
 const node=graph.nodes.find(n=>n.id===nodeId);if(node?.type!=='particleSim')return 0;
 let low=Math.floor(Number(node.params.count)/10),high=MAX_PARTICLE_CAPACITY/10;
 while(low<high){const mid=Math.ceil((low+high)/2),candidate={...graph,nodes:graph.nodes.map(n=>n.id===nodeId?{...n,params:{...n.params,count:mid*10}}:n)};try{validateGraph(candidate);low=mid;}catch{high=mid-1;}}
 return Math.max(Number(node.params.count),low*10);
}
