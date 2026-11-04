import {renderSelection,waitForSelectionImages} from './pixel-selection.mjs';
import {drawProject} from './renderer.mjs';
import {newLayer,validateProject} from './model.mjs';

export async function selectedPixels(raw,selection,{layerId,fill,feather=0,signal}={}){
 const project=validateProject(raw),layer=project.layers.find(l=>l.id===layerId);
 if(fill===undefined&&(!layer||layer.eraser))throw Error('Select a photo, text, shape or brush layer to copy.');
 if(project.width*project.height>33554432)throw Error('Selected-pixel operations support canvases up to 32 megapixels.');
 signal?.throwIfAborted();if(fill===undefined)await waitForSelectionImages({layers:[layer]},signal);
 const mask=renderSelection(Math.ceil(project.width),Math.ceil(project.height),selection,{feather}),canvas=document.createElement('canvas');canvas.width=mask.width;canvas.height=mask.height;
 try{
  const ctx=canvas.getContext('2d');if(fill!==undefined){const checked=validateProject({...project,layers:[newLayer('shape',{fill})]});ctx.fillStyle=checked.layers[0].fill;ctx.fillRect(0,0,canvas.width,canvas.height);}
  else drawProject(canvas,{...project,background:'transparent',layers:[{...layer,visible:true,blend:'normal'}]},{rasterSize:{width:canvas.width,height:canvas.height}});
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,canvas.width,canvas.height);
  const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('The selection contains no visible pixels.');signal?.throwIfAborted();
  const crop=document.createElement('canvas');crop.width=right-left+1;crop.height=bottom-top+1;
  try{crop.getContext('2d').drawImage(canvas,left,top,crop.width,crop.height,0,0,crop.width,crop.height);const src=crop.toDataURL('image/png');if(src.length>45000000)throw Error('This pixel clipboard is too large. Select a smaller area.');return{x:left,y:top,width:crop.width,height:crop.height,src,name:fill===undefined?layer.name+' pixels':'Selection fill'};}finally{crop.width=crop.height=1;}
 }finally{canvas.width=canvas.height=mask.width=mask.height=1;}
}
export function pastePixels(project,clipboard){if(!clipboard)throw Error('Copy pixels in FluxFoto first.');const layer=newLayer('image',clipboard);return{layerId:layer.id,project:validateProject({...project,layers:[layer,...project.layers]})};}
