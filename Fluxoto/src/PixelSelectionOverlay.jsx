import React,{useEffect,useRef} from 'react';
import {renderSelection} from './pixel-selection.mjs';
export function PixelSelectionOverlay({selection,width,height}){
 const ref=useRef();useEffect(()=>{const c=ref.current,s=Math.min(1,1200/width,1200/height);c.width=Math.max(1,Math.round(width*s));c.height=Math.max(1,Math.round(height*s));const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);let mask;
  try{mask=renderSelection(c.width,c.height,selection,{matrix:[s,0,0,s,0,0]});const image=mask.getContext('2d').getImageData(0,0,c.width,c.height),alpha=new Uint8Array(c.width*c.height);for(let i=0;i<alpha.length;i++)alpha[i]=image.data[i*4+3];for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=y*c.width+x,edge=alpha[i]&&(x===0||y===0||x===c.width-1||y===c.height-1||!alpha[i-1]||!alpha[i+1]||!alpha[i-c.width]||!alpha[i+c.width]);image.data[i*4]=100;image.data[i*4+1]=80;image.data[i*4+2]=200;image.data[i*4+3]=edge?230:Math.round(alpha[i]*.12);}ctx.putImageData(image,0,0);}catch{}finally{if(mask)mask.width=mask.height=1;}
 },[selection,width,height]);return <canvas ref={ref} className="oto-selection-overlay" aria-label={selection.inverted?'Inverted pixel selection':'Pixel selection'}/>;
}
