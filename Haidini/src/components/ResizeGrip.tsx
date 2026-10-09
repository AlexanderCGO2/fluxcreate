import { useRef } from 'react';
export default function ResizeGrip({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(value:number)=>void}){
  const drag=useRef<{x:number;value:number}|null>(null),clamp=(n:number)=>Math.max(min,Math.min(max,n));
  return <div className="resize-grip" role="separator" aria-label={label} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} tabIndex={0} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();onChange(clamp(value+(e.key==='ArrowLeft'?10:-10)));}if(e.key==='Home')onChange(min);if(e.key==='End')onChange(max);}} onPointerDown={e=>{drag.current={x:e.clientX,value};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)onChange(clamp(drag.current.value+drag.current.x-e.clientX));}} onPointerUp={e=>{drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={()=>{drag.current=null;}}/>;
}
