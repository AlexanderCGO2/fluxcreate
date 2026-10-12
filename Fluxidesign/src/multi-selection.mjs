import {frameBounds,snapTargets} from './layout.mjs';
export const editableIds=objects=>objects.filter(o=>o.visible&&!o.locked).map(o=>o.id);
export function toggleSelection(ids,id,objects){const available=new Set(objects.map(o=>o.id)),next=ids.filter(key=>available.has(key)&&key!==id);if(available.has(id)&&!ids.includes(id))next.push(id);return next;}
function selected(objects,ids){const chosen=objects.filter(o=>ids.includes(o.id));if(new Set(ids).size!==ids.length||chosen.length!==ids.length)throw Error('The selection changed. Select the frames again.');if(chosen.some(o=>o.locked))throw Error('Unlock all selected frames before changing the selection.');return chosen;}
export function selectionBounds(frames){if(!frames.length)return null;const boxes=frames.map(frameBounds),left=Math.min(...boxes.map(b=>b.left)),right=Math.max(...boxes.map(b=>b.right)),top=Math.min(...boxes.map(b=>b.top)),bottom=Math.max(...boxes.map(b=>b.bottom));return{left,right,top,bottom,cx:(left+right)/2,cy:(top+bottom)/2,width:right-left,height:bottom-top};}
export function translateFrames(objects,ids,dx,dy){const chosen=selected(objects,ids);if(!chosen.length)return objects;if(!Number.isFinite(dx)||!Number.isFinite(dy))throw Error('Offsets must be finite numbers.');dx=Math.max(...chosen.map(o=>-32768-o.x),Math.min(dx,...chosen.map(o=>32768-o.x)));dy=Math.max(...chosen.map(o=>-32768-o.y),Math.min(dy,...chosen.map(o=>32768-o.y)));return objects.map(o=>ids.includes(o.id)?{...o,x:o.x+dx,y:o.y+dy}:o);}
export function arrangeFrames(objects,ids,action){const chosen=selected(objects,ids);if(chosen.length<2)throw Error('Select at least two frames.');const b=selectionBounds(chosen),updates=new Map();
 if(action==='horizontal'||action==='vertical'){
  if(chosen.length<3)throw Error('Select at least three frames to distribute gaps.');const horizontal=action==='horizontal',start=horizontal?'left':'top',end=horizontal?'right':'bottom',size=horizontal?'width':'height',position=horizontal?'x':'y',sorted=chosen.map(o=>({o,b:frameBounds(o)})).sort((a,b)=>a.b[start]-b.b[start]);
  const gap=(sorted.at(-1).b[end]-sorted[0].b[start]-sorted.reduce((n,item)=>n+item.b[size],0))/(sorted.length-1);let cursor=sorted[0].b[start];for(let i=0;i<sorted.length;i++){const item=sorted[i];if(i>0&&i<sorted.length-1)updates.set(item.o.id,{[position]:item.o[position]+cursor-item.b[start]});cursor+=item.b[size]+gap;}
 }else{const key={left:'left',right:'right',center:'cx',top:'top',bottom:'bottom',middle:'cy'}[action];if(!key)throw Error('Choose a supported selection alignment.');const position=['left','right','cx'].includes(key)?'x':'y';for(const o of chosen)updates.set(o.id,{[position]:o[position]+b[key]-frameBounds(o)[key]});}
 const result=objects.map(o=>updates.has(o.id)?{...o,...updates.get(o.id)}:o);if(result.some(o=>Math.abs(o.x)>32768||Math.abs(o.y)>32768))throw Error('Arrangement exceeds the supported coordinate range.');return result;
}
export function duplicateFrames(objects,ids,makeId){const chosen=selected(objects,ids),shifted=translateFrames(chosen,ids,16,16),copies=shifted.map(o=>({...structuredClone(o),id:makeId(),name:`${o.name} copy`}));return{objects:[...objects,...copies],ids:copies.map(o=>o.id)};}
export function deleteFrames(objects,ids){selected(objects,ids);return objects.filter(o=>!ids.includes(o.id));}
export function moveSelection(page,ids,dx,dy,{enabled=true,bypass=false,scale=1}={}){
 let objects=translateFrames(page.objects,ids,dx,dy);const b=selectionBounds(objects.filter(o=>ids.includes(o.id)));if(!b||!enabled||bypass)return{objects,lines:[]};
 const targets=snapTargets({...page,objects:page.objects.filter(o=>!ids.includes(o.id))}),tolerance=6/(Number.isFinite(scale)&&scale>0?scale:1),lines=[];
 function closest(values,targets){let best=null;for(const target of targets)for(const value of values){const delta=target.value-value;if(Math.abs(delta)<=tolerance&&(!best||Math.abs(delta)<Math.abs(best.delta)-1e-9))best={...target,delta};}return best;}
 const sx=closest([b.left,b.cx,b.right],targets.x),sy=closest([b.top,b.cy,b.bottom],targets.y);
 objects=translateFrames(objects,ids,sx?.delta??0,sy?.delta??0);const actual=selectionBounds(objects.filter(o=>ids.includes(o.id)));
 if(sx&&[actual.left,actual.cx,actual.right].some(v=>Math.abs(v-sx.value)<1e-6))lines.push({axis:'x',value:sx.value,label:sx.label});
 if(sy&&[actual.top,actual.cy,actual.bottom].some(v=>Math.abs(v-sy.value)<1e-6))lines.push({axis:'y',value:sy.value,label:sy.label});
 return{objects,lines};
}
