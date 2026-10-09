// Shared by schema, timeline controls, CPU workers and GPU solvers.
export const MAX_SCENE_DURATION=999999;
export const clampSceneTime=(time:number)=>Math.max(0,Math.min(MAX_SCENE_DURATION,Number.isFinite(time)?time:0));

export function continuousPreview(project:{graph:{nodes:{id:string;type:string;visible?:boolean;params:Record<string,unknown>}[];edges:{source:string;target:string}[]}}){
 const {nodes,edges}=project.graph,pending=nodes.filter(n=>n.type==='output').map(n=>n.id),visited=new Set<string>();
 while(pending.length){const id=pending.pop()!;if(visited.has(id))continue;visited.add(id);const node=nodes.find(n=>n.id===id);if(!node||node.visible===false)continue;
  if(node.type==='paint'&&node.params.endlessMotion===true)return true;
  for(const edge of edges)if(edge.target===id)pending.push(edge.source);
 }
 return false;
}
export function advancePlayback(time:number,delta:number,duration:number,loop:boolean,continuous:boolean){
 const next=Math.max(0,time+delta);if(continuous)return {time:Math.min(MAX_SCENE_DURATION,next),stop:next>=MAX_SCENE_DURATION};
 return next>=duration?{time:loop?next%duration:duration,stop:!loop}:{time:next,stop:false};
}
export const previewSpan=(duration:number,time:number,continuous:boolean)=>continuous?Math.min(MAX_SCENE_DURATION,Math.max(duration,Math.ceil((time+1)/duration)*duration)):duration;
