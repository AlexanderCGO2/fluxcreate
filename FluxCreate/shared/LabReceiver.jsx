import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {receiveLabResult,labImageFile} from './asset-handoff.mjs';
import {getApp} from './registry.mjs';
import './lab-receiver.css';
export function LabReceiver({appId,ready=true,onText,onImage}){
 const [result,setResult]=useState(null),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),dialog=useRef(null);
 useEffect(()=>receiveLabResult(r=>{setResult(r);setText(r.text||'');setError('');}),[]);
 useEffect(()=>{if(result&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[result]);
 if(!result)return null;
 async function add(){setBusy(true);setError('');try{const accepted=await(result.kind==='image'?onImage(labImageFile(result)):onText(text));if(accepted===false)throw Error('This result could not be added. Check the editor notice and try again.');setResult(null);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return createPortal(<dialog className="fc-lab-receiver" ref={dialog} onCancel={e=>{e.preventDefault();if(!busy)setResult(null);}} aria-label="From FluxLab"><span className="fc-lab-eyebrow">FLUXLAB → {getApp(appId)?.name}</span><h2>Bring this idea in.</h2><p>{result.kind==='text'?'Add an editable text layer. Refine the words before placing them.':'Add this image to your current project. Your existing work stays in place.'}</p>{result.kind==='image'?<img src={result.images[0].src} alt={result.prompt||'Generated image'}/>:<textarea aria-label="FluxLab text to import" value={text} onChange={e=>setText(e.target.value)} rows={7}/>}<small>{result.model} · AI generated{result.kind==='text'?` · ${text.length.toLocaleString()} / 5,000 characters`:''}</small>{error&&<p role="alert">{error}</p>}<div><button disabled={busy} onClick={()=>setResult(null)}>Keep working</button><button className="primary" disabled={busy||!ready||result.kind==='text'&&(!text.trim()||text.length>5000)} onClick={add}>{busy?'Adding…':!ready?'Opening project…':'Add to project'}</button></div></dialog>,document.body);
}
