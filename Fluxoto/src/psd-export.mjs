import {writePsdUint8Array} from 'ag-psd';
import {drawProject,readyImages} from './renderer.mjs';
import {validateProject} from './model.mjs';

export const PSD_EXPORT_LIMITS={layers:200,pixels:48*1024*1024,bytes:64*1024*1024};
function bounds(layer,project){
  // Text and strokes can extend outside their nominal frame.
  if(['text','stroke'].includes(layer.type))return {left:0,top:0,width:project.width,height:project.height};
  const angle=layer.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  const width=layer.width*c+layer.height*s,height=layer.width*s+layer.height*c,pad=Math.ceil(layer.blur*3)+2;
  const cx=layer.x+layer.width/2,cy=layer.y+layer.height/2,left=Math.max(0,Math.floor(cx-width/2-pad)),top=Math.max(0,Math.floor(cy-height/2-pad));
  const right=Math.min(project.width,Math.ceil(cx+width/2+pad)),bottom=Math.min(project.height,Math.ceil(cy+height/2+pad));
  return {left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
}
export function inspectPSDExport(input){
 const project=validateProject(input),fallback=project.layers.some(l=>l.visible&&l.eraser);
 const count=project.layers.length+(project.background!=='transparent'?1:0)+(fallback?2:0);
 if(count>PSD_EXPORT_LIMITS.layers)throw Error('PSD export supports up to 200 layers, including the canvas background.');
 const plans=project.layers.map(layer=>({layer,...bounds(layer,project)}));
 const pixels=project.width*project.height*(1+(project.background!=='transparent'?1:0)+(fallback?1:0))+plans.reduce((n,p)=>n+p.width*p.height,0);
 if(pixels>PSD_EXPORT_LIMITS.pixels)throw Error('This layered PSD exceeds the 48 megapixel export budget. Reduce the canvas size or layer count, or save the full FluxFoto project.');
 return {project,plans,fallback};
}
const pixels=canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
const breathe=()=>new Promise(resolve=>setTimeout(resolve,0));
export async function exportPhotoshop(input,{signal,onProgress}={}){
 const {project,plans,fallback}=inspectPSDExport(input),warnings=['Text, shapes, masks and adjustments are rendered into separate pixel layers. Keep a FluxFoto project for their original editable controls.','Content outside the canvas is clipped in this PSD. RGB, 8 bits per channel; no embedded color profile.'];
 const abort=()=>{if(signal?.aborted)throw Error('PSD export cancelled.');};abort();await readyImages(project);abort();
 const canvas=document.createElement('canvas'),children=[];
 try{
  drawProject(canvas,project);const composite=pixels(canvas);
  for(let i=0;i<plans.length;i++){
   abort();const {layer,left,top,width,height}=plans[i];
   const child={name:layer.name,left,top,opacity:layer.opacity,hidden:!layer.visible,blendMode:layer.blend.replaceAll('-',' '),protected:{position:layer.locked,composite:layer.locked,transparency:layer.locked}};
   if(width&&height){drawProject(canvas,{width,height,background:'transparent',layers:[{...layer,x:layer.x-left,y:layer.y-top,visible:true,opacity:1,blend:'normal',eraser:false}]});child.imageData=pixels(canvas);}
   children.push(child);onProgress?.((i+1)/(plans.length+1));await breathe();
  }
  if(project.background!=='transparent'){
   drawProject(canvas,{width:project.width,height:project.height,background:project.background,layers:[]});
   children.push({name:'Canvas background',left:0,top:0,opacity:1,blendMode:'normal',imageData:pixels(canvas)});
  }
  let outputLayers=children;
  if(fallback){
   outputLayers=[{name:'FluxFoto appearance',left:0,top:0,imageData:composite},{name:'Original layers · hidden',hidden:true,opened:false,children}];
   warnings.push('Canvas eraser strokes affect several layers. The visible result is a merged appearance layer; the separate originals are retained in a hidden group. Their recombined appearance will differ without the FluxFoto eraser operation.');
  }
  if(project.layers.some(l=>l.suiteSource))warnings.push('Objects from other studios are pixel layers in PSD. Their complete source stays in the FluxFoto project.');
  abort();await breathe();const bytes=writePsdUint8Array({width:project.width,height:project.height,channels:4,bitsPerChannel:8,colorMode:3,imageData:composite,children:outputLayers},{noBackground:true,trimImageData:false,generateThumbnail:false});
  if(bytes.byteLength>PSD_EXPORT_LIMITS.bytes)throw Error('The PSD exceeds the 64 MB export limit. Reduce its size or save a FluxFoto project.');
  abort();onProgress?.(1);return {blob:new Blob([bytes],{type:'image/vnd.adobe.photoshop'}),warnings};
 }finally{canvas.width=canvas.height=1;}
}
