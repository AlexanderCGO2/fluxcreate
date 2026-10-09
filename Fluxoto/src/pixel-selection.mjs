import {maskCanvas,readyImages} from './renderer.mjs';
import {normalizeMask} from './masks.mjs';

export function selectionBounds(selection){
 if(!selection||!['rectangle','ellipse','lasso'].includes(selection.kind)||!Array.isArray(selection.points)||selection.points.length<2||selection.points.length>5000)throw Error('Draw a selection first.');
 if(selection.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>32768)))throw Error('Selection points are invalid.');
 const xs=selection.points.map(p=>p[0]),ys=selection.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),width=Math.max(...xs)-x,height=Math.max(...ys)-y;
 if(width<1||height<1||selection.kind==='lasso'&&selection.points.length<3)throw Error('Select an area at least one pixel wide and high.');return{x,y,width,height};
}
export function selectionPath(ctx,selection){const b=selectionBounds(selection);ctx.beginPath();if(selection.kind==='ellipse')ctx.ellipse(b.x+b.width/2,b.y+b.height/2,b.width/2,b.height/2,0,0,2*Math.PI);else if(selection.kind==='rectangle')ctx.rect(b.x,b.y,b.width,b.height);else{ctx.moveTo(...selection.points[0]);for(const p of selection.points.slice(1))ctx.lineTo(...p);ctx.closePath();}}
// The selection lives in document coordinates; mask pixels follow the selected layer's transform.
export async function maskFromSelection(layer,selection,{feather=0,combine=true,signal}={}){
 selectionBounds(selection);if(!layer||layer.locked||layer.type==='stroke')throw Error('Select an unlocked photo, shape or text layer first.');
 if(!Number.isFinite(feather)||feather<0||feather>100)throw Error('Feather must be between 0 and 100 pixels.');signal?.throwIfAborted();
 if(combine&&layer.mask?.enabled){let cancel;try{await Promise.race([readyImages({layers:[layer]}),new Promise((_,reject)=>{cancel=()=>reject(signal.reason||new DOMException('Cancelled','AbortError'));signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();})]);}finally{signal?.removeEventListener('abort',cancel);}}signal?.throwIfAborted();
 const scale=Math.min(1,4096/layer.width,4096/layer.height),width=Math.max(1,Math.round(layer.width*scale)),height=Math.max(1,Math.round(layer.height*scale)),sx=width/layer.width,sy=height/layer.height,pad=Math.ceil(feather*Math.max(sx,sy)*3)+2;
 const source=document.createElement('canvas'),soft=document.createElement('canvas'),mask=document.createElement('canvas');source.width=soft.width=width+pad*2;source.height=soft.height=height+pad*2;mask.width=width;mask.height=height;
 try{
  const draw=source.getContext('2d');draw.translate(pad,pad);draw.scale(sx,sy);draw.translate(layer.width/2,layer.height/2);draw.rotate(-layer.rotation*Math.PI/180);draw.translate(-layer.x-layer.width/2,-layer.y-layer.height/2);selectionPath(draw,selection);draw.fillStyle='#fff';draw.fill();
  const blur=soft.getContext('2d');if(feather)blur.filter=`blur(${feather*Math.sqrt(sx*sy)}px)`;blur.drawImage(source,0,0);
  const ctx=mask.getContext('2d');if(selection.inverted){ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='destination-out';}ctx.drawImage(soft,pad,pad,width,height,0,0,width,height);ctx.globalCompositeOperation='source-over';
  if(combine&&layer.mask?.enabled){ctx.globalCompositeOperation='destination-in';ctx.drawImage(maskCanvas(layer.mask),0,0,width,height);ctx.globalCompositeOperation='source-over';}
  signal?.throwIfAborted();return normalizeMask({enabled:true,width,height,src:mask.toDataURL('image/png'),defaultAlpha:255,strokes:[]});
 }finally{source.width=source.height=soft.width=soft.height=mask.width=mask.height=1;}
}
