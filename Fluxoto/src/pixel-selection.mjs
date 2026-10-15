import {maskCanvas,readyImages} from './renderer.mjs';
import {normalizeMask} from './masks.mjs';

import {selectionBounds,renderSelection} from './selection-raster.mjs';
export {selectionBounds,combineSelection,selectionPath,renderSelection} from './selection-raster.mjs';

export async function waitForSelectionImages(project,signal){
 signal?.throwIfAborted();let cancel;
 try{await Promise.race([readyImages(project),new Promise((_,reject)=>{cancel=()=>reject(signal.reason||new DOMException('Cancelled','AbortError'));signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();})]);}finally{signal?.removeEventListener('abort',cancel);}signal?.throwIfAborted();
}
export async function maskFromSelection(layer,selection,{feather=0,combine=true,signal}={}){
 if(!Number.isFinite(feather)||feather<0||feather>100)throw Error('Feather must be between 0 and 100 pixels.');selectionBounds(selection);if(!layer||layer.locked||layer.type==='stroke')throw Error('Select an unlocked photo, shape or text layer first.');
 signal?.throwIfAborted();if(combine&&layer.mask?.enabled)await waitForSelectionImages({layers:[layer]},signal);
 const scale=Math.min(1,4096/layer.width,4096/layer.height),width=Math.max(1,Math.round(layer.width*scale)),height=Math.max(1,Math.round(layer.height*scale)),sx=width/layer.width,sy=height/layer.height;
 const transform=new DOMMatrix().scale(sx,sy).translate(layer.width/2,layer.height/2).rotate(-layer.rotation).translate(-layer.x-layer.width/2,-layer.y-layer.height/2);
 const mask=renderSelection(width,height,selection,{matrix:[transform.a,transform.b,transform.c,transform.d,transform.e,transform.f],feather:feather*Math.sqrt(sx*sy)});
 try{if(combine&&layer.mask?.enabled){const ctx=mask.getContext('2d');ctx.globalCompositeOperation='destination-in';ctx.drawImage(maskCanvas(layer.mask),0,0,width,height);}signal?.throwIfAborted();return normalizeMask({enabled:true,width,height,src:mask.toDataURL('image/png'),defaultAlpha:255,strokes:[]});}finally{mask.width=mask.height=1;}
}
