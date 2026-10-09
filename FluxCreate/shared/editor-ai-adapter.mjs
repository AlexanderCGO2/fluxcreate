import {fingerprint,transportProject} from './browser.mjs';

// Every call reads the current editor refs. Selection and history remain owned by the editor.
export function editorAIAdapter({getProject,getSelection,applyCommands,commit,renderPreview,insertAsset,getReferenceImage}){
 const context=()=>{const project=getProject();return {documentId:project.id,revision:fingerprint(project),selection:getSelection().map(o=>({id:o.id,label:o.name||'Untitled object',kind:o.type||'object'}))};};
 const validate=(result,options)=>{const project=getProject();if(result.baseFingerprint!==options.context.revision||fingerprint(project)!==options.context.revision)throw Error('This proposal belongs to a previous document version.');return applyCommands(project,result.commands,{selection:options.context.selection.map(o=>o.id),scope:options.scope});};
 return {getContext:context,capabilities:['edit','explain',...(insertAsset?['text','image']:[]),...(getReferenceImage?['image-edit']:[])],
  buildRequest:({intent,mode,scope,context})=>({project:transportProject(getProject()),intent,mode,scope,selection:context.selection.map(o=>o.id),brief:'',baseFingerprint:context.revision}),
  previewProposal:validate,applyProposal:(result,options)=>commit(validate(result,options)),renderPreview,insertAsset,getReferenceImage};
}
