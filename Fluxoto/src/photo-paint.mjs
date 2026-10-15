import {normalizePhotoClip,clipVertices,createPhotoClipPainter} from './photo-paint-clip.mjs';
export {capturePhotoClip} from './photo-paint-clip.mjs';
export const PHOTO_PAINT_LIMITS=Object.freeze({dimension:8192,pixels:16777216,strokes:256,points:16384,strokePoints:4096});
const fail=message=>{throw Error(message);};
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const number=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:fail('Invalid photo paint number.');
export function normalizePhotoPaint(raw){
 if(raw==null)return null;if(!object(raw)||Object.keys(raw).some(k=>!['width','height','strokes'].includes(k)))fail('Invalid photo paint data.');
 const width=number(raw.width,1,8192),height=number(raw.height,1,8192);if(width*height>PHOTO_PAINT_LIMITS.pixels)fail('Photo painting supports up to 16 megapixels and 8192 pixels per side.');
 if(!Array.isArray(raw.strokes)||raw.strokes.length>256)fail('Photo painting supports up to 256 strokes.');let count=0,clipCount=0;
 const strokes=raw.strokes.map(s=>{if(!object(s)||Object.keys(s).some(k=>!['mode','size','color','opacity','points','clip'].includes(k))||!['paint','erase'].includes(s.mode)||typeof s.color!=='string'||!/^#[a-f0-9]{6}$/i.test(s.color))fail('Invalid photo paint stroke.');
 if(!Array.isArray(s.points)||!s.points.length||s.points.length>4096||(count+=s.points.length)>16384)fail('Photo painting supports 4096 points per stroke and 16384 points per layer.');
 const clip=s.clip===undefined?undefined:normalizePhotoClip(s.clip);if(clip&&(clipCount+=clipVertices(clip))>32768)fail('Photo painting supports up to 32768 retained selection vertices per image.');
 return {...(clip?{clip}:{}),mode:s.mode,size:number(s.size,1,512),color:s.color,opacity:number(s.opacity,.01,1),points:s.points.map(p=>{if(!Array.isArray(p)||p.length!==2)fail('Invalid photo paint point.');return[number(p[0],-8192,width+8192),number(p[1],-8192,height+8192)];})};
 });return{width,height,strokes};
}
export const hasPhotoPaint=value=>!!value?.strokes?.length;
export function photoPaintPoint(layer,point){const a=-layer.rotation*Math.PI/180,dx=point.x-layer.x-layer.width/2,dy=point.y-layer.y-layer.height/2,width=layer.paint?.width??layer.width,height=layer.paint?.height??layer.height;return[Math.max(-8192,Math.min(width+8192,(dx*Math.cos(a)-dy*Math.sin(a)+layer.width/2)*width/layer.width)),Math.max(-8192,Math.min(height+8192,(dx*Math.sin(a)+dy*Math.cos(a)+layer.height/2)*height/layer.height))];}
export function beginPhotoStroke(layer,brush,point){
 if(layer.type!=='image'||!layer.src||layer.locked||!layer.visible)fail('Select one visible, unlocked photo with a linked source before painting.');
 if(layer.width>8192||layer.height>8192||layer.width*layer.height>PHOTO_PAINT_LIMITS.pixels)fail('Photo painting supports up to 16 megapixels and 8192 pixels per side.');
 const paint=layer.paint??{width:layer.width,height:layer.height,strokes:[]};return normalizePhotoPaint({...paint,strokes:[...paint.strokes,{mode:brush.mode,size:brush.size,color:brush.color,opacity:brush.opacity,points:[point],...(brush.clip===undefined?{}:{clip:brush.clip})}]});
}
export function extendPhotoStroke(paint,point){const last=paint.strokes.at(-1),previous=last.points.at(-1);if(Math.hypot(point[0]-previous[0],point[1]-previous[1])<.25)return paint;return normalizePhotoPaint({...paint,strokes:[...paint.strokes.slice(0,-1),{...last,points:[...last.points,point]}]});}
function drawStroke(ctx,stroke){ctx.strokeStyle=ctx.fillStyle=stroke.color;ctx.lineWidth=stroke.size;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();if(stroke.points.length===1){ctx.arc(...stroke.points[0],stroke.size/2,0,Math.PI*2);ctx.fill();}else{ctx.moveTo(...stroke.points[0]);for(const p of stroke.points.slice(1))ctx.lineTo(...p);ctx.stroke();}}
export function drawPhotoPaint(ctx,layer){if(!hasPhotoPaint(layer.paint))return;const clipped=createPhotoClipPainter(ctx);ctx.save();try{ctx.scale(layer.width/layer.paint.width,layer.height/layer.paint.height);for(const stroke of layer.paint.strokes){if(stroke.clip){clipped.draw(stroke,drawStroke);continue;}ctx.globalCompositeOperation=stroke.mode==='erase'?'destination-out':'source-over';ctx.globalAlpha=stroke.opacity;drawStroke(ctx,stroke);}}finally{ctx.restore();clipped.dispose();}}
