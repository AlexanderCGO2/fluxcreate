import { CATALOG, RENDERABLE } from './catalog.ts';
import type { Graph } from './project.ts';
import type { RenderItem } from './evaluator.ts';

export function canToggleVisibility(type:string){const output=CATALOG[type]?.output;return !!output&&RENDERABLE.includes(output);}
const visualInputs:Record<string,string>={textAnimate:'text',motion:'particles',height:'surface',mask:'surface'};
// Follow visual modifiers, but keep simulation sources, colliders and scatter inputs active.
export function renderVisibilityIds(graph:Graph,item:RenderItem):string[]{
 const ids=new Set([...(item.visibilityIds||[]),item.nodeId]),pending=[item.nodeId],visited=new Set<string>();
 while(pending.length){const id=pending.pop()!;if(visited.has(id))continue;visited.add(id);const node=graph.nodes.find(n=>n.id===id),input=node&&visualInputs[node.type];if(!input)continue;for(const edge of graph.edges)if(edge.target===id&&edge.input===input){ids.add(edge.source);pending.push(edge.source);}}
 return [...ids];
}
export function isAppearanceVisible(graph:Graph,ids:string[]){return ids.every(id=>graph.nodes.find(n=>n.id===id)?.visible!==false);}
