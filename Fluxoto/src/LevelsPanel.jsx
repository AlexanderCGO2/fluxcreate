import React,{useEffect,useState} from 'react';
import {DEFAULT_LEVELS,normalizeLevels,histogram} from './levels.mjs';
import './levels.css';

function PhotoHistogram({src}){
 const [result,setResult]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setResult(null);setError('');if(!src){setError('Relink this photo to inspect its pixels.');return;}
  const image=new Image();image.onload=()=>{if(!active)return;const canvas=document.createElement('canvas');try{const factor=Math.min(1,512/image.naturalWidth,512/image.naturalHeight);canvas.width=Math.max(1,Math.round(image.naturalWidth*factor));canvas.height=Math.max(1,Math.round(image.naturalHeight*factor));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,canvas.width,canvas.height);setResult(histogram(ctx.getImageData(0,0,canvas.width,canvas.height).data));}catch(e){setError('Could not read this photo’s pixels.');}finally{canvas.width=canvas.height=1;}};
  image.onerror=()=>{if(active)setError('Could not decode this photo. Relink it before editing.');};image.src=src;
  return()=>{active=false;image.onload=image.onerror=null;image.src='';};
 },[src]);
 const peak=result?Math.max(1,...result.red,...result.green,...result.blue):1;
 return <div className="oto-histogram"><svg viewBox="0 0 256 72" role="img" aria-label="Sampled source RGB histogram">{result&&['red','green','blue'].map(channel=><path key={channel} className={channel} d={`M0 72 ${Array.from(result[channel],(v,i)=>`L${i} ${72-68*v/peak}`).join(' ')} L255 72 Z`}/>)}</svg><p role="status">{error||(!result?'Reading source pixels…':result.coverage?'Source RGB · sampled up to 512 px. Before adjustments and mask; transparency weighted.':'This source has no visible pixels.')}</p></div>;
}
function LevelsControls({layer,disabled,onApply}){
 const [draft,setDraft]=useState(()=>layer.levels||{...DEFAULT_LEVELS}),[error,setError]=useState('');
 const change=(key,value)=>{setDraft(v=>({...v,[key]:value}));setError('');};
 const apply=()=>{try{const value=normalizeLevels(draft);if(onApply(value))setError('');}catch(e){setError(e.message);}};
 return <><fieldset disabled={disabled}><label className="oto-levels-enabled"><input aria-label="Enable Levels" type="checkbox" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/>Enable Levels</label><div className="oto-levels-fields">{[['black','Black point',0,255,1],['white','White point',0,255,1],['gamma','Gamma',.1,10,.05]].map(([key,label,min,max,step])=><label key={key}><span>{label}</span><input aria-label={label} type="number" min={min} max={max} step={step} value={draft[key]} onChange={e=>change(key,e.target.value===''?'':e.target.valueAsNumber)}/></label>)}</div><div className="oto-levels-actions"><button type="button" onClick={()=>{setDraft({...DEFAULT_LEVELS});setError('');}}>Reset values</button><button type="button" className="primary" onClick={apply}>Apply Levels</button></div></fieldset>{error&&<p role="alert">{error}</p>}</>;
}

export function LevelsPanel({layer,revision,disabled,onApply}){return <details className="oto-levels"><summary>Photo Levels <span>RGB</span></summary><PhotoHistogram src={layer.src}/><p className="oto-levels-hint">Adjust this photo without changing its source. Apply once to add one undo step.</p><LevelsControls key={revision} layer={layer} disabled={disabled} onApply={onApply}/></details>;}
