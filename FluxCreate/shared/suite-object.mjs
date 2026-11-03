import {decodeExchange} from '@flux-studio/exchange';
import {decodeProject,readMotion} from './browser.mjs';
import {makeSuiteSource,SUITE_SOURCE_LIMITS,validateSuitePreview} from './suite-source.mjs';

const checkpoint=signal=>signal?.throwIfAborted();
function boundedSize(width,height){const factor=Math.min(1,2048/width,2048/height);return {width:Math.max(1,Math.round(width*factor)),height:Math.max(1,Math.round(height*factor))};}
// Sources are self-contained documents. Never fetch a URL found in an imported file.
export function checkEmbeddedMedia(value,depth=0){
 if(depth>40)throw Error('This source is too deeply nested.');
 if(!value||typeof value!=='object')return;
 for(const [key,item] of Object.entries(value)){
  if(key==='suiteSource')continue;
  if(['src','url','uri'].includes(key)&&typeof item==='string'&&item&&!item.startsWith('data:'))throw Error('This source references external media. Embed or relink its media in the original app, then save it again.');
  if(item&&typeof item==='object')checkEmbeddedMedia(item,depth+1);
 }
}
export async function readSuiteObject(file,{signal}={}){
 if(!file||file.size>SUITE_SOURCE_LIMITS.bytes)throw Error('Place a native Flux project or Flux Exchange file up to 16 MiB.');
 const text=await file.text();checkpoint(signal);
 if(new TextEncoder().encode(text).byteLength>SUITE_SOURCE_LIMITS.bytes)throw Error('Studio object sources must fit within 16 MiB.');
 const envelope=decodeProject(text);let app=envelope?.app,project=envelope?.project,kind='native',warnings=[],mode;
 if(app==='fluxoto'){const {validateProject}=await import('../../Fluxoto/src/model.mjs');project=validateProject(project);mode='photo';}
 else if(app==='fluxidesign'){const {validateProject}=await import('../../Fluxidesign/src/model.mjs');project=validateProject(project);mode='page';}
 else if(app==='flux3d'){const {validateProject}=await import('../../Flux3D/src/model.mjs');project=validateProject(project);mode='scene';}
 else if(app==='fluximiere'){const {validateProject,toMotion}=await import('../../Fluximiere/src/model.mjs');project=toMotion(validateProject(project));mode='motion';}
 else{
  if(!/^\s*\{/.test(text)){const exchange=decodeExchange(text);app=exchange.sourceApp;kind='exchange';}
  else{const raw=JSON.parse(text);if(raw.format==='flux3d-project'){const {validateProject}=await import('../../Flux3D/src/model.mjs');project=validateProject(raw);app='flux3d';mode='scene';}else if(raw.schemaVersion||raw.project?.schemaVersion)throw Error('For a FluxEffects scene, save a Flux Exchange (.flux.md) file in FluxEffects first. The supported scene and original graph travel together.');else app='fluxiffects';}
  if(!mode){const converted=readMotion(text);project=converted.project;warnings=converted.warnings||[];mode='motion';}
 }
 checkEmbeddedMedia(project);checkpoint(signal);
 const choices=mode==='page'?project.pages.map(p=>({id:p.id,name:p.name,duration:0})):mode==='motion'?project.compositions.map(c=>({id:c.id,name:c.name,duration:c.duration})):[];
 const selected=mode==='page'?project.activePageId:mode==='motion'?project.activeCompId:null;
 return {app,name:project.name,filename:file.name,text,kind,project,mode,warnings,choices,view:mode==='page'?{pageId:selected||choices[0]?.id}:mode==='motion'?{compositionId:selected||choices[0]?.id,time:0}:mode==='scene'?{time:0}:{}};
}
async function bitmapCanvas(blob){const bitmap=await createImageBitmap(blob);try{const canvas=document.createElement('canvas'),size=boundedSize(bitmap.width,bitmap.height);Object.assign(canvas,size);canvas.getContext('2d').drawImage(bitmap,0,0,size.width,size.height);return canvas;}finally{bitmap.close();}}
export async function renderSuiteObject(opened,view=opened.view,{signal}={}){
 checkpoint(signal);let canvas,sourceView={...view};
 try{
  if(opened.mode==='photo'){
   if(opened.project.layers.some(l=>l.visible&&l.type==='image'&&!l.src))throw Error('A visible source photo is missing. Relink it in FluxFoto before placing this canvas.');
   const {readyImages,drawProject}=await import('../../Fluxoto/src/renderer.mjs');await readyImages(opened.project);checkpoint(signal);
   canvas=document.createElement('canvas');drawProject(canvas,opened.project,{rasterSize:boundedSize(opened.project.width,opened.project.height)});
  }else if(opened.mode==='page'){
   const page=opened.project.pages.find(p=>p.id===view.pageId);if(!page)throw Error('Choose a page from this source.');
   const {renderPage,loadImage}=await import('../../Fluxidesign/src/render.mjs');
   for(const object of page.objects.filter(o=>o.type==='image'&&o.visible)){const asset=opened.project.assets.find(a=>a.id===object.assetId);if(!asset?.src||!await loadImage(asset.src))throw Error('A source image is missing. Relink it in FluxDesign before placing this page.');checkpoint(signal);}
   canvas=await renderPage(page,opened.project.assets,Math.min(1,2048/page.width,2048/page.height));sourceView={pageId:page.id};
  }else if(opened.mode==='scene'){
   const {createSceneCompositor}=await import('../../Flux3D/src/compositor.mjs');
   const bytes=new TextEncoder().encode(JSON.stringify(opened.project));let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
   const compositor=await createSceneCompositor({src:'data:application/json;base64,'+btoa(binary),modelFormat:'flux3d'});
   try{checkpoint(signal);const rendered=compositor.render({width:1200,height:900,time:view.time||0});canvas=document.createElement('canvas');canvas.width=1200;canvas.height=900;canvas.getContext('2d').drawImage(rendered,0,0);}finally{compositor.dispose();}
   sourceView={time:view.time||0};
  }else{
   const comp=opened.project.compositions.find(c=>c.id===view.compositionId);if(!comp)throw Error('Choose a composition from this source.');
   const time=Number(view.time||0);if(!Number.isFinite(time)||time<0||time>comp.duration)throw Error('Choose a frame within the composition duration.');
   const {exportFrame}=await import('../../Fluxiffects/src/renderer.mjs');canvas=await bitmapCanvas(await exportFrame(comp,opened.project.assets,time));sourceView={compositionId:comp.id,time};
  }
  checkpoint(signal);
  let src=canvas.toDataURL('image/png');
  // Noisy photos may exceed the byte budget at 2048px; shrink without changing the original source.
  while(src.length>SUITE_SOURCE_LIMITS.previewBytes&&canvas.width>256&&canvas.height>256){const next=document.createElement('canvas');next.width=Math.max(1,Math.floor(canvas.width*.75));next.height=Math.max(1,Math.floor(canvas.height*.75));next.getContext('2d').drawImage(canvas,0,0,next.width,next.height);canvas.width=canvas.height=1;canvas=next;src=canvas.toDataURL('image/png');}
  const size=validateSuitePreview(src);
  const warnings=[...opened.warnings,'Placed as a rendered snapshot. Edit its original source in the source app, then replace the source to update this object.'];
  return {source:makeSuiteSource({app:opened.app,name:opened.name,filename:opened.filename,kind:opened.kind,text:opened.text,view:sourceView,warnings:warnings.slice(0,100).map(w=>w.slice(0,500))}),preview:{src,...size}};
 }finally{if(canvas)canvas.width=canvas.height=1;}
}
