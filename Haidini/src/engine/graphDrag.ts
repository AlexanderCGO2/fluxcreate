import {graphBatch} from './graphBatch.ts';
import type {Project} from './project.ts';
export type GraphDrag={projectId:string;revision:number;selection:string[];anchor:string;origin:{x:number;y:number}};
export function beginGraphDrag(project:Project,selection:string[],anchor:string):GraphDrag{
 const ids=[...new Set(selection)],node=project.graph.nodes.find(node=>node.id===anchor);
 if(!node||!ids.includes(anchor))throw Error('The dragged node must belong to the selection.');
 // Validate the complete selection before allowing a visual draft, including the atomic bound.
 graphBatch(project,ids,{type:'move',dx:0,dy:0});
 return{projectId:project.id,revision:project.revision,selection:ids,anchor,origin:{...node.position}};
}
export function finishGraphDrag(drag:GraphDrag|null,project:Project,selection:string[],position:{x:number;y:number}){
 if(!drag||drag.projectId!==project.id||drag.revision!==project.revision||drag.selection.length!==new Set(selection).size||!drag.selection.every(id=>selection.includes(id)))return null;
 if(!Number.isFinite(position.x)||!Number.isFinite(position.y))throw Error('Graph coordinates must be finite.');
 const dx=Math.round(position.x-drag.origin.x),dy=Math.round(position.y-drag.origin.y);
 if(!dx&&!dy)return null;
 return graphBatch(project,drag.selection,{type:'move',dx,dy});
}
