import {drawPhotoPaint,hasPhotoPaint} from './photo-paint.mjs';
import {applyCurves,hasActiveCurves} from './curves.mjs';
import {applyLevels,hasActiveLevels} from './levels.mjs';
const images=new Map();const masks=new WeakMap();
export function imageFor(src,onLoad){if(!src)return null;let entry=images.get(src);if(!entry){const image=new Image();entry={image,ready:false,promise:null};entry.promise=new Promise(resolve=>{image.onload=()=>{entry.ready=true;resolve(image);onLoad?.();};image.onerror=()=>{resolve(null);onLoad?.();};});image.src=src;images.set(src,entry);if(images.size>500){const first=images.keys().next().value;if(first!==src)images.delete(first);}}return entry.ready?entry.image:null;}
export async function readyImages(project){const sources=project.layers.flatMap(l=>[l.type==='image'?l.src:null,l.mask?.enabled?l.mask.src:null]).filter(Boolean);await Promise.all(sources.map(async src=>{imageFor(src);if(!await images.get(src)?.promise)throw Error('An image or layer mask could not be decoded. Relink it before exporting.');}));}
export const RASTER_LIMITS={dimension:8192,pixels:33554432};
export function boundedRasterSize(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Raster dimensions must be positive.');const factor=Math.min(1,RASTER_LIMITS.dimension/width,RASTER_LIMITS.dimension/height,Math.sqrt(RASTER_LIMITS.pixels/(width*height)));return{width:Math.max(1,Math.floor(width*factor)),height:Math.max(1,Math.floor(height*factor))};}
export function drawProject(canvas,project,{onLoad,jpeg=false,rasterSize=null}={}){
  if(!canvas)return;const ctx=canvas.getContext('2d'),width=rasterSize?.width??project.width,height=rasterSize?.height??project.height,sx=width/project.width,sy=height/project.height;if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);
  if(jpeg){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);}if(project.background!=='transparent'){ctx.fillStyle=project.background;ctx.fillRect(0,0,canvas.width,canvas.height);}
  ctx.scale(sx,sy);
  for(const l of [...project.layers].reverse()){
    if(!l.visible)continue;ctx.save();ctx.globalAlpha=l.opacity;ctx.globalCompositeOperation=l.eraser?'destination-out':l.blend==='normal'?'source-over':l.blend;
    ctx.filter=`brightness(${l.brightness}%) contrast(${l.contrast}%) saturate(${l.saturation}%) blur(${l.blur*Math.sqrt(sx*sy)}px)`;
    ctx.translate(l.x+l.width/2,l.y+l.height/2);ctx.rotate(l.rotation*Math.PI/180);ctx.translate(-l.width/2,-l.height/2);
    if(l.mask?.enabled||hasActiveLevels(l.levels)||hasActiveCurves(l.curves)||hasPhotoPaint(l.paint)){const content=document.createElement('canvas'),size=boundedRasterSize(l.width*Math.min(1,sx),l.height*Math.min(1,sy));content.width=size.width;content.height=size.height;try{const paint=content.getContext('2d');paint.scale(content.width/l.width,content.height/l.height);drawLayerContent(paint,l,onLoad);drawPhotoPaint(paint,l);if(hasActiveLevels(l.levels)||hasActiveCurves(l.curves)){const pixels=paint.getImageData(0,0,content.width,content.height);applyLevels(pixels.data,l.levels);applyCurves(pixels.data,l.curves);paint.putImageData(pixels,0,0);}if(l.mask?.enabled){paint.globalCompositeOperation='destination-in';paint.drawImage(maskCanvas(l.mask,onLoad),0,0,l.width,l.height);}ctx.drawImage(content,0,0,l.width,l.height);}finally{content.width=content.height=1;}}else drawLayerContent(ctx,l,onLoad);
    ctx.restore();
  }
}
export async function rasterBlob(project,type='image/png'){await readyImages(project);const c=document.createElement('canvas');drawProject(c,project);if(type==='image/jpeg'){const ctx=c.getContext('2d');ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.globalCompositeOperation='source-over';}return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not export the canvas.')),type,0.94));}
export function hitLayer(project,x,y){return project.layers.find(l=>{if(!l.visible||l.locked||l.type==='stroke')return false;const cx=x-l.x-l.width/2,cy=y-l.y-l.height/2,a=-l.rotation*Math.PI/180,px=cx*Math.cos(a)-cy*Math.sin(a)+l.width/2,py=cx*Math.sin(a)+cy*Math.cos(a)+l.height/2;return px>=0&&py>=0&&px<=l.width&&py<=l.height;});}

function drawLayerContent(ctx,l,onLoad){
    ctx.fillStyle=l.fill;
    if(l.gradient&&l.type==='shape'){const a=l.gradient.angle*Math.PI/180,dx=Math.cos(a)*l.width/2,dy=Math.sin(a)*l.height/2;const gradient=ctx.createLinearGradient(l.width/2-dx,l.height/2-dy,l.width/2+dx,l.height/2+dy);gradient.addColorStop(0,l.gradient.from);gradient.addColorStop(1,l.gradient.to);ctx.fillStyle=gradient;}
    if(l.type==='shape'){ctx.beginPath();if(l.shape==='ellipse')ctx.ellipse(l.width/2,l.height/2,l.width/2,l.height/2,0,0,Math.PI*2);else ctx.roundRect(0,0,l.width,l.height,Math.min(l.radius,l.width/2,l.height/2));ctx.fill();}
    if(l.type==='text'){
      ctx.font=`${l.fontWeight} ${l.fontSize}px ${l.fontFamily}`;ctx.textBaseline='top';ctx.textAlign=l.textAlign;
      const x=l.textAlign==='center'?l.width/2:l.textAlign==='right'?l.width:0;let y=0;
      for(const paragraph of l.text.split('\n')){let line='';for(const word of paragraph.split(' ')){const next=line?`${line} ${word}`:word;if(line&&ctx.measureText(next).width>l.width){ctx.fillText(line,x,y);y+=l.fontSize*l.lineHeight;line=word;}else line=next;}ctx.fillText(line,x,y);y+=l.fontSize*l.lineHeight;}
    }
    if(l.type==='image'){
      const image=imageFor(l.src,onLoad);if(image)ctx.drawImage(image,0,0,l.width,l.height);else{ctx.fillStyle='#dddde3';ctx.fillRect(0,0,l.width,l.height);ctx.fillStyle='#737582';ctx.font=`${Math.max(16,Math.min(l.width/14,32))}px Arial`;ctx.textAlign='center';ctx.fillText(l.src?'Loading image…':'Relink image',l.width/2,l.height/2);}
    }
    if(l.type==='stroke'&&l.points.length){ctx.strokeStyle=l.fill;ctx.lineWidth=l.brushSize;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...l.points[0]);for(const point of l.points.slice(1))ctx.lineTo(...point);if(l.points.length===1)ctx.lineTo(l.points[0][0]+0.01,l.points[0][1]);ctx.stroke();}

}

export function maskCanvas(mask,onLoad){let cached=masks.get(mask);if(cached)return cached;const canvas=document.createElement('canvas');canvas.width=Math.round(mask.width);canvas.height=Math.round(mask.height);const ctx=canvas.getContext('2d');if(mask.src){const image=imageFor(mask.src,onLoad);if(!image)return canvas;ctx.drawImage(image,0,0,canvas.width,canvas.height);}else{ctx.fillStyle='rgba(255,255,255,'+mask.defaultAlpha/255+')';ctx.fillRect(0,0,canvas.width,canvas.height);}for(const stroke of mask.strokes){ctx.globalCompositeOperation=stroke.mode==='hide'?'destination-out':'source-over';ctx.strokeStyle='#ffffff';ctx.lineWidth=stroke.size;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(...stroke.points[0]);for(const point of stroke.points.slice(1))ctx.lineTo(...point);if(stroke.points.length===1)ctx.lineTo(stroke.points[0][0]+.01,stroke.points[0][1]);ctx.stroke();}ctx.globalCompositeOperation='source-over';masks.set(mask,canvas);return canvas;}
export async function portableProject(project){if(!project.layers.some(l=>l.mask?.enabled||hasActiveLevels(l.levels)||hasActiveCurves(l.curves)||hasPhotoPaint(l.paint)))return project;await readyImages(project);const layers=[];for(const layer of project.layers){if(!layer.mask?.enabled&&!hasActiveLevels(layer.levels)&&!hasActiveCurves(layer.curves)&&!hasPhotoPaint(layer.paint)){layers.push(layer);continue;}const canvas=document.createElement('canvas'),copy={...layer,x:0,y:0,rotation:0,opacity:1,blend:'normal',eraser:false,visible:true};try{drawProject(canvas,{width:layer.width,height:layer.height,background:'transparent',layers:[copy]},{rasterSize:boundedRasterSize(layer.width,layer.height)});layers.push({...layer,type:'image',src:canvas.toDataURL('image/png'),mask:null,levels:null,curves:null,paint:null,brightness:100,contrast:100,saturation:100,blur:0});}finally{canvas.width=canvas.height=1;}}return{...project,layers};}
