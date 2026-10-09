import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {receiveLabResult} from './asset-handoff.mjs';
import './lab-receiver.css';

export function LabPromptReceiver({onUsePrompt,ready=true}){
 const [result,setResult]=useState(null),[text,setText]=useState(''),[error,setError]=useState(''),dialog=useRef(null);
 useEffect(()=>receiveLabResult(value=>{setResult(value);setText(value.text);setError('');},{appId:'fluxlab'}),[]);
 useEffect(()=>{if(result&&!dialog.current?.open)dialog.current?.showModal();},[result]);
 if(!result)return null;
 return createPortal(<dialog ref={dialog} className="fc-lab-receiver" aria-label="Workflow output for FluxLab" onKeyDown={event=>event.stopPropagation()} onCancel={event=>{event.preventDefault();setResult(null);}}>
  <span className="fc-lab-eyebrow">FLUXAGENTS → FLUXLAB</span><h2>A starting point for your next creation.</h2>
  <p>Use this workflow output as your prompt. Choose an image, text, video or speech model afterward. Nothing is generated until you choose Generate.</p>
  <textarea aria-label="Workflow prompt to use" rows={8} value={text} onChange={event=>setText(event.target.value)}/>
  <small>{text.length.toLocaleString()} / 12,000 characters</small>
  {text.length>12000&&<p role="alert">Shorten this text before using it as a prompt. The complete workflow output remains in FluxAgents.</p>}
  {error&&<p role="alert">{error}</p>}
  <div><button onClick={()=>setResult(null)}>Keep working</button><button className="primary" disabled={!ready||!text.trim()||text.length>12000} onClick={()=>{try{if(onUsePrompt(text)===false)throw Error('Save or finish your current creation before replacing its prompt.');setResult(null);}catch(e){setError(e.message);}}}>{ready?'Use as prompt':'Opening FluxLab…'}</button></div>
 </dialog>,document.body);
}
