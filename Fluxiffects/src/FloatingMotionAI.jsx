import React,{useRef,useEffect} from 'react';
import {FloatingAIHelper} from '../../FluxCreate/shared/FloatingAIHelper.jsx';
import {fingerprint} from '../../FluxCreate/shared/browser.mjs';
import {applyProposal,projectForAI} from './ai-commands.mjs';
import {getComp,createLayer,parseProject,uid} from './core.mjs';
import {prepareAssets,renderComposition} from './renderer.mjs';

function Preview({project,time}){const canvas=useRef(null);useEffect(()=>{let active=true;prepareAssets(project.assets).then(()=>{if(!active||!canvas.current)return;const comp=getComp(project),factor=Math.min(1,320/comp.width,190/comp.height);canvas.current.width=Math.round(comp.width*factor);canvas.current.height=Math.round(comp.height*factor);renderComposition(canvas.current.getContext('2d'),comp,project.assets,time);});return()=>{active=false;};},[project,time]);return <canvas ref={canvas} aria-label="Proposed composition preview" style={{maxWidth:'100%'}}/>;}
export function FloatingMotionAI({project,projectRef,selectedId,timeRef,commit,setSelectedId,setPlaying,ready,recovery,modal,exporting}){
 const live=useRef({selectedId});live.current={selectedId};
 const getSelection=()=>getComp(projectRef.current).layers.find(l=>l.id===live.current.selectedId);
 const adapter={capabilities:['edit','explain','text','image','image-edit'],
  getContext(){const p=projectRef.current,comp=getComp(p),selection=getSelection();return {documentId:p.id+':'+comp.id,revision:fingerprint(p),selectionRevision:timeRef.current,preview:selection?.type==='image'?p.assets.find(a=>a.id===selection.assetId)?.src:undefined,selection:selection?[{id:selection.id,label:selection.name,kind:selection.type}]:[]};},
  buildRequest({intent,mode,scope,context}){setPlaying(false);return {project:projectForAI(projectRef.current),intent,mode,scope,selection:context.selection.map(n=>n.id),time:timeRef.current,brief:projectRef.current.brief||'',preferences:[],variations:1};},
  previewProposal(result){if(!result.proposal?.commands?.length)return null;return applyProposal(projectRef.current,result.proposal).project;},
  applyProposal(result,{isCurrent}){if(!isCurrent())throw Error('The composition changed. Prepare a new proposal.');const next=applyProposal(projectRef.current,result.proposal).project;commit(next);setPlaying(false);return true;},
  renderPreview:next=><Preview project={next} time={timeRef.current}/>,
  getReferenceImage(){const layer=getSelection();if(layer?.type!=='image')throw Error('Select an image layer for pixel editing.');if(layer.locked)throw Error('Unlock this layer before requesting an image edit.');const asset=projectRef.current.assets.find(a=>a.id===layer.assetId);if(!/^data:image\/(png|jpeg|webp);base64,/.test(asset?.src||''))throw Error('The selected layer needs a saved PNG, JPEG or WebP image.');return asset.src;},
  insertAsset(asset,{isCurrent}){
   if(!isCurrent())throw Error('The composition changed. Prepare a new result.');const before=projectRef.current,comp=getComp(before);let layer,next;
   if(asset.kind==='text'){layer=createLayer('text',{name:'FluxLab text',text:asset.text,fontSize:64,x:comp.width/2,y:comp.height/2,start:0,end:comp.duration});next=before;}
   else{const image=asset.images[0],media={id:uid(),name:'FluxLab image',type:'image',src:image.src,width:image.width,height:image.height},scale=Math.min(1,comp.width/image.width*.7,comp.height/image.height*.7);layer=createLayer('image',{name:media.name,assetId:media.id,width:image.width,height:image.height,anchorX:image.width/2,anchorY:image.height/2,x:comp.width/2,y:comp.height/2,scaleX:scale,scaleY:scale,start:0,end:comp.duration});next={...before,assets:[...before.assets,media]};}
   next={...next,compositions:next.compositions.map(c=>c.id===comp.id?{...c,layers:[layer,...c.layers]}:c)};const validated=parseProject(JSON.stringify(next)).project;if(!isCurrent())throw Error('The composition changed.');commit(validated);setSelectedId(layer.id);setPlaying(false);return true;
  }
 };
 return <FloatingAIHelper appId="fluxiffects" adapter={adapter} disabledReason={!ready?'Opening project…':recovery?'Resolve project recovery before using AI.':exporting?'Wait for export to finish.':modal?'Finish the open dialog before using AI.':''}/>;
}
