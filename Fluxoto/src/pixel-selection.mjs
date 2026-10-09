import {maskCanvas,readyImages} from './renderer.mjs';
import {normalizeMask} from './masks.mjs';

const modes=['replace','add','subtract','intersect'];
function shapeBounds(selection){
 if(!selection||!['rectangle','ellipse','lasso'].includes(selection.kind)||!Array.isArray(selection.points)||selection.points.length<2||selection.points.length>5000)throw Error('Draw a selection first.');
 if(selection.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||Math.abs(n)>32768)))throw Error('Selection points are invalid.');
 const xs=selection.points.map(p=>p[0]),ys=selection.points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),width=Math.max(...xs)-x,height=Math.max(...ys)-y;
 if(width<1||height<1||selection.kind==='lasso'&&selection.points.length<3)throw Error('Select an area at least one pixel wide and high.');return{x,y,width,height};
}
export function selectionBounds(selection){
 if(selection?.kind!=='compound')return shapeBounds(selection);
 if(!Array.isArray(selection.steps)||!selection.steps.length||selection.steps.length>32||selection.steps[0].mode!=='replace')throw Error('A selection supports up to 32 combined areas. Start a new selection.');
 const boxes=[];for(const step of selection.steps){if(step.mode==='invert')continue;if(!modes.includes(step.mode))throw Error('Invalid selection operation.');boxes.push(shapeBounds(step.shape));}
 if(!boxes.length)throw Error('Draw a selection first.');const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return{x,y,width:Math.max(...boxes.map(b=>b.x+b.width))-x,height:Math.max(...boxes.map(b=>b.y+b.height))-y};
}
export function combineSelection(previous,shape,mode='replace'){
 shapeBounds(shape);if(!modes.includes(mode))throw Error('Choose a selection operation.');
 if(!previous||mode==='replace')return structuredClone(shape);selectionBounds(previous);
 const steps=previous.kind==='compound'?structuredClone(previous.steps):[{mode:'replace',shape:{...structuredClone(previous),inverted:false}}];
 if(previous.inverted)steps.push({mode:'invert'});steps.push({mode,shape:structuredClone(shape)});
 const result={kind:'compound',steps,inverted:false};selectionBounds(result);return result;
}
export function selectionPath(ctx,selection){const b=shapeBounds(selection);ctx.beginPath();if(selection.kind==='ellipse')ctx.ellipse(b.x+b.width/2,b.y+b.height/2,b.width/2,b.height/2,0,0,2*Math.PI);else if(selection.kind==='rectangle')ctx.rect(b.x,b.y,b.width,b.height);else{ctx.moveTo(...selection.points[0]);for(const p of selection.points.slice(1))ctx.lineTo(...p);ctx.closePath();}}
const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
function invert(ctx,w,h){ctx.save();ctx.resetTransform();ctx.globalCompositeOperation='xor';ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.restore();}
// Always composite full-size stencils: an intersection must clear pixels outside its path.
export function renderSelection(width,height,selection,{matrix=[1,0,0,1,0,0],feather=0}={}){
 selectionBounds(selection);if(!Number.isFinite(feather)||feather<0||feather>100)throw Error('Feather must be between 0 and 100 pixels.');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>33554432)throw Error('Selected-pixel operations support up to 32 megapixels.');
 const pad=Math.ceil(feather*3)+2,source=make(width+pad*2,height+pad*2),temp=make(source.width,source.height),result=make(width,height),ctx=source.getContext('2d');
 try{
  const steps=selection.kind==='compound'?selection.steps:[{mode:'replace',shape:{...selection,inverted:false}}];
  for(const step of steps){if(step.mode==='invert'){invert(ctx,source.width,source.height);continue;}
   const paint=temp.getContext('2d');paint.resetTransform();paint.clearRect(0,0,temp.width,temp.height);paint.translate(pad,pad);paint.transform(...matrix);selectionPath(paint,step.shape);paint.fillStyle='#fff';paint.fill();if(step.shape.inverted)invert(paint,temp.width,temp.height);
   if(step.mode==='replace')ctx.clearRect(0,0,source.width,source.height);
   ctx.globalCompositeOperation=step.mode==='subtract'?'destination-out':step.mode==='intersect'?'destination-in':'source-over';ctx.drawImage(temp,0,0);
  }
  if(selection.inverted)invert(ctx,source.width,source.height);
  const out=result.getContext('2d');if(feather)out.filter=`blur(${feather}px)`;out.drawImage(source,-pad,-pad);return result;
 }catch(e){result.width=result.height=1;throw e;}finally{source.width=source.height=temp.width=temp.height=1;}
}
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
