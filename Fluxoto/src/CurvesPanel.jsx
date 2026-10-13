import React,{useState} from 'react';
import {DEFAULT_CURVES,IDENTITY_CURVE,normalizeCurves} from './curves.mjs';
import './curves.css';

function CurveControls({layer,disabled,onApply}){
 const [draft,setDraft]=useState(()=>layer.curves||DEFAULT_CURVES),[channel,setChannel]=useState('rgb'),[error,setError]=useState('');
 const points=channel==='rgb'?draft.points:draft.channels?.[channel]||IDENTITY_CURVE;
 const setPoints=next=>{setDraft(v=>channel==='rgb'?{...v,points:next}:{...v,channels:{...v.channels,[channel]:next}});setError('');};
 const change=(index,axis,value)=>setPoints(points.map((p,i)=>i===index?p.map((v,a)=>a===axis?value:v):p));
 let valid=true;try{normalizeCurves(draft);}catch{valid=false;}
 const add=()=>{if(!valid||points.length>=16)return;let index=0;for(let i=1;i<points.length-1;i++)if(points[i+1][0]-points[i][0]>points[index+1][0]-points[index][0])index=i;const [x,y]=points[index],[nx,ny]=points[index+1],input=Math.floor((x+nx)/2),output=Math.round(y+(ny-y)*(input-x)/(nx-x));setPoints([...points.slice(0,index+1),[input,output],...points.slice(index+1)]);};
 const apply=()=>{try{if(onApply(normalizeCurves(draft)))setError('');}catch(e){setError(e.message);}};
 return <><fieldset disabled={disabled}><label className="oto-curves-channel">Channel<select aria-label="Curves channel" value={channel} onChange={e=>setChannel(e.target.value)}><option value="rgb">RGB</option><option value="red">Red</option><option value="green">Green</option><option value="blue">Blue</option></select></label>
 <svg className={'oto-curve-graph '+channel} viewBox="-8 -8 271 271" role="img" aria-label={'Draft '+channel.toUpperCase()+' curve; input left to right, output bottom to top'}><path className="grid" d="M0 0H255V255H0ZM64 0V255M128 0V255M192 0V255M0 64H255M0 128H255M0 192H255"/><path className="identity" d="M0 255L255 0"/>{valid&&<><polyline points={points.map(([x,y])=>x+','+(255-y)).join(' ')}/>{points.map(([x,y],i)=><circle key={i} cx={x} cy={255-y} r="4"/>)}</>}</svg>
 <p className="oto-curves-hint">Linear segments · Levels first, then RGB and channel curves. Numeric points below edit this draft; Apply changes the photo.</p>
 <label className="oto-curves-enabled"><input aria-label="Enable Curves" type="checkbox" checked={draft.enabled} onChange={e=>{setDraft(v=>({...v,enabled:e.target.checked}));setError('');}}/>Enable Curves</label>
 <div className="oto-curve-points">{points.map((point,i)=><div className="oto-curve-point" key={i}><span>{i+1}</span>{['input','output'].map((name,axis)=><label key={axis}>{name}<input aria-label={'Curve point '+(i+1)+' '+name} type="number" min="0" max="255" step="1" readOnly={axis===0&&(i===0||i===points.length-1)} value={point[axis]} onChange={e=>change(i,axis,e.target.value===''?'':e.target.valueAsNumber)}/></label>)}<button type="button" aria-label={'Remove curve point '+(i+1)} disabled={i===0||i===points.length-1} onClick={()=>setPoints(points.filter((_,index)=>index!==i))}>×</button></div>)}</div>
 <div className="oto-curves-actions"><button type="button" disabled={!valid||points.length>=16} onClick={add}>Add curve point</button><button type="button" onClick={()=>setPoints(IDENTITY_CURVE)}>Reset current curve</button><button type="button" onClick={()=>{setDraft({...DEFAULT_CURVES,enabled:draft.enabled});setError('');}}>Reset all curves</button><button type="button" className="primary" onClick={apply}>Apply Curves</button></div></fieldset>{error&&<p role="alert">{error}</p>}</>;
}
export function CurvesPanel({layer,revision,disabled,onApply}){return <details className="oto-curves"><summary>Photo Curves <span>RGB + channels</span></summary><CurveControls key={revision} layer={layer} disabled={disabled} onApply={onApply}/></details>;}
