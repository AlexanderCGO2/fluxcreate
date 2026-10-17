import {validateAutoeditPlan} from './model.mjs';
const MAX_BYTES=3*1024*1024,encoder=new TextEncoder();
export function buildEditorRequest(raw,startIndex){
 const plan=validateAutoeditPlan(raw),request={plan:{...plan,footage:plan.footage.map(v=>({...v,frames:[]})),job:null},startIndex};
 const bytes=()=>encoder.encode(JSON.stringify(request)).length;
 // Every included source gets a representative frame before any receives extras.
 const ordered=plan.footage.map(v=>v.enabled?[...v.frames].sort((a,b)=>Math.abs(a.time-(v.inPoint+v.outPoint)/2)-Math.abs(b.time-(v.inPoint+v.outPoint)/2)):[]);
 for(let pass=0;pass<6;pass++)for(let i=0;i<ordered.length;i++){const frame=ordered[i][pass];if(!frame)continue;const target=request.plan.footage[i].frames;target.push(frame);if(bytes()>MAX_BYTES){target.pop();if(pass===0)throw Error('The edit metadata exceeds the AI request budget. Use a smaller board.');}}
 for(const v of request.plan.footage)v.frames.sort((a,b)=>a.time-b.time);
 if(bytes()>MAX_BYTES)throw Error('The edit metadata exceeds the AI request budget.');return request;
}
