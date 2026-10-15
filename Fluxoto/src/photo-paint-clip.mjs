import {selectionBounds,renderSelection} from './selection-raster.mjs';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
function shape(value){
 if(!keys(value,['kind','points','inverted'])||value.inverted!==undefined&&typeof value.inverted!=='boolean')throw Error('Invalid paint clip shape.');selectionBounds(value);
 return {kind:value.kind,points:value.points.map(p=>[...p]),inverted:value.inverted??false};
}
function selection(value){
 if(value?.kind!=='compound')return shape(value);
 if(!keys(value,['kind','steps','inverted'])||value.inverted!==undefined&&typeof value.inverted!=='boolean')throw Error('Invalid paint clip selection.');selectionBounds(value);
 return {kind:'compound',steps:value.steps.map(step=>{if(step.mode==='invert'){if(!keys(step,['mode']))throw Error('Invalid paint clip inversion.');return{mode:'invert'};}if(!keys(step,['mode','shape']))throw Error('Invalid paint clip operation.');return{mode:step.mode,shape:shape(step.shape)};}),inverted:value.inverted??false};
}
export const clipVertices=clip=>clip.selection.kind==='compound'?clip.selection.steps.reduce((n,s)=>n+(s.shape?.points.length??0),0):clip.selection.points.length;
export function normalizePhotoClip(value){
 if(!keys(value,['selection','feather','documentWidth','documentHeight','matrix']))throw Error('Invalid photo paint clip.');
 const {documentWidth:width,documentHeight:height,feather,matrix}=value;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||width*height>16777216)throw Error('Paint selection frames support up to 8192 pixels per side and 16 megapixels.');
 if(!finite(feather,0,100))throw Error('Paint selection feather must be between 0 and 100 pixels.');const pad=Math.ceil(feather*3)+2;if((width+pad*2)*(height+pad*2)>25165824)throw Error('Padded paint selection exceeds 24 megapixels.');
 if(!Array.isArray(matrix)||matrix.length!==6||matrix.some((v,i)=>!finite(v,i<4?-8192:-1e9,i<4?8192:1e9))||Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2])<1e-12)throw Error('Invalid photo clip transform.');
 return {selection:selection(value.selection),feather,documentWidth:width,documentHeight:height,matrix:matrix.map(v=>v===0?0:v)};
}
export function capturePhotoClip(layer,value,feather,document){const width=layer.paint?.width??layer.width,height=layer.paint?.height??layer.height,sx=width/layer.width,sy=height/layer.height,angle=-layer.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),a=sx*c,b=sy*s,cc=-sx*s,d=sy*c,x=layer.x+layer.width/2,y=layer.y+layer.height/2;return normalizePhotoClip({selection:value,feather,documentWidth:Math.ceil(document.width),documentHeight:Math.ceil(document.height),matrix:[a,b,cc,d,width/2-a*x-cc*y,height/2-b*x-d*y]});}
// Only one document stencil is retained (<=16 MP). Drop it before allocating a replacement.
let cachedKey='',cachedStencil=null;
function stencil(clip){const key=JSON.stringify([clip.selection,clip.feather,clip.documentWidth,clip.documentHeight]);if(cachedKey===key&&cachedStencil)return cachedStencil;if(cachedStencil)cachedStencil.width=cachedStencil.height=1;cachedStencil=null;cachedKey='';const canvas=renderSelection(clip.documentWidth,clip.documentHeight,clip.selection,{feather:clip.feather});cachedKey=key;cachedStencil=canvas;return canvas;}
// Two full raster scratch surfaces are reused for all clipped strokes of one layer.
export function createPhotoClipPainter(ctx){let strokeCanvas=null,maskCanvas=null,maskKey='';const make=()=>{const c=document.createElement('canvas');c.width=ctx.canvas.width;c.height=ctx.canvas.height;if(c.width>8192||c.height>8192||c.width*c.height>33554432)throw Error('Paint clip raster exceeds renderer limits.');return c;};
 return {draw(stroke,drawStroke){const source=stencil(stroke.clip);strokeCanvas??=make();maskCanvas??=make();const transform=ctx.getTransform(),key=JSON.stringify([stroke.clip,transform.a,transform.b,transform.c,transform.d,transform.e,transform.f]);
  if(key!==maskKey){const mask=maskCanvas.getContext('2d');mask.resetTransform();mask.clearRect(0,0,maskCanvas.width,maskCanvas.height);mask.setTransform(transform);mask.transform(...stroke.clip.matrix);mask.drawImage(source,0,0);maskKey=key;}
  const paint=strokeCanvas.getContext('2d');paint.resetTransform();paint.clearRect(0,0,strokeCanvas.width,strokeCanvas.height);paint.globalCompositeOperation='source-over';paint.globalAlpha=1;paint.setTransform(transform);drawStroke(paint,stroke);paint.resetTransform();paint.globalCompositeOperation='destination-in';paint.drawImage(maskCanvas,0,0);
  ctx.save();try{ctx.resetTransform();ctx.globalAlpha=stroke.opacity;ctx.globalCompositeOperation=stroke.mode==='erase'?'destination-out':'source-over';ctx.drawImage(strokeCanvas,0,0);}finally{ctx.restore();}
 },dispose(){if(strokeCanvas)strokeCanvas.width=strokeCanvas.height=1;if(maskCanvas)maskCanvas.width=maskCanvas.height=1;}};
}
