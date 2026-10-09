import {useRef} from 'react';
import {SuiteObjectControls} from '../../FluxCreate/shared/SuiteObjectControls.jsx';
import {edge,validatePatch,type Project,type Patch,type Command,type SceneNode} from './engine/project.ts';
import {StudioObjectSchema,type StudioObject} from './engine/studioObject.ts';

export type ApplyStudioObject=(patch:Patch,isCurrent:()=>boolean)=>Promise<boolean>;
type Props={project:Project;selected?:string;node?:SceneNode;disabled:boolean;onApply:ApplyStudioObject};
type Prepared={source:StudioObject['suiteSource'];preview:StudioObject['preview']};

export function SceneObjectPlacement({project,selected='',node,disabled,onApply}:Props){
 const live=useRef({project,selected,node,disabled,onApply});live.current={project,selected,node,disabled,onApply};
 const revision=()=>{const v=live.current;return `${v.project.id}:${v.project.revision}:${v.node?.id||v.selected}`;};
 async function place(prepared:Prepared){
  const initial=revision(),current=live.current,p=current.project;if(current.disabled)throw Error('Finish the current scene operation first.');
  const value=StudioObjectSchema.parse({suiteSource:prepared.source,preview:prepared.preview}),commands:Command[]=[],existing=current.node;
  if(existing){if(existing.type!=='studioImage'||!existing.studioObject)throw Error('Select a studio object to update.');commands.push({op:'studioObject',nodeId:existing.id,value});}
  else{
   const output=p.graph.nodes.find(n=>n.type==='output');if(!output)throw Error('Add a scene output before placing this object.');
   const id='studio_'+crypto.randomUUID().slice(0,8);commands.push({op:'add',id,type:'studioImage',label:value.suiteSource.name.slice(0,100)||'Studio object',x:0,y:120},{op:'studioObject',nodeId:id,value},{op:'set',nodeId:id,param:'width',value:8},{op:'set',nodeId:id,param:'height',value:Math.max(.1,Math.min(30,8*value.preview.height/value.preview.width))},{op:'connect',edge:edge(id,output.id,'scene')});
  }
  const patch=validatePatch(p,{baseRevision:p.revision,summary:existing?'Update studio object source':'Place studio object',commands});
  return current.onApply(patch,()=>!live.current.disabled&&revision()===initial);
 }
 return <SuiteObjectControls compact={!node} source={node?.studioObject?.suiteSource} disabled={disabled||!!node&&project.locks.some(lock=>lock.nodeId===node.id)} getRevision={revision} onPlace={place} onRefresh={place}/>;
}
