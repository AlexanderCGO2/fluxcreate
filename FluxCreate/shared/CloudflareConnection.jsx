import React,{useEffect,useId,useRef,useState} from 'react';
import {Cloud,ShieldCheck,Check,LoaderCircle,CircleAlert} from 'lucide-react';
import {apiURL} from './hosting.mjs';
import {notifyConnectionChanged,subscribeConnectionChanges} from './connection-events.mjs';

export function CloudflareConnection({appId,onSavingChange}){
 const id=useId(),[status,setStatus]=useState(null),[accountId,setAccountId]=useState(''),[gatewayId,setGatewayId]=useState('default'),[apiToken,setApiToken]=useState(''),[allowMusic,setAllowMusic]=useState(false),[allowTextFallback,setAllowTextFallback]=useState(false),[busy,setBusy]=useState('loading'),[error,setError]=useState(''),[message,setMessage]=useState('');
 const mounted=useRef(false),request=useRef(null),busyRef=useRef('loading'),savingCallback=useRef(onSavingChange);savingCallback.current=onSavingChange;
 async function perform(action,{quiet=false}={}){
  if(busyRef.current&&!(action==='load'&&busyRef.current==='loading'))return;
  request.current?.abort();const controller=new AbortController();request.current=controller;const timeout=setTimeout(()=>controller.abort('timeout'),20000);
  busyRef.current=action;setBusy(action);savingCallback.current?.(action==='save'||action==='remove');if(!quiet){setError('');setMessage('');}
  const method=action==='load'?'GET':action==='remove'?'DELETE':'POST',draft=apiToken.trim();
  try{
   const body=action==='check'&&!draft?{}:{accountId:accountId.trim(),gatewayId:gatewayId.trim()||'default',apiToken:draft,allowMusic,allowTextFallback};
   const response=await fetch(apiURL(appId,`/settings/cloudflare${action==='check'?'/check':''}`),{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
   let result;try{result=await response.json();}catch{throw Error('Cloudflare settings returned an unreadable response.');}
   if(controller.signal.aborted||!mounted.current||request.current!==controller)return;
   if(!response.ok)throw Error(typeof result.error==='string'?result.error:'Cloudflare settings could not be updated.');
   if(action==='check'){
    if(result.verified!==true)throw Error('Cloudflare did not confirm an active token.');
    setMessage('Token is active. Account access, Workers AI Read permission, model access and billing credits are not verified.');
   }else{
    if(!['none','suite','personal','invalid'].includes(result?.mode)||typeof result.available!=='boolean')throw Error('Cloudflare settings returned an unreadable status.');
    setStatus(result);setAccountId(result.accountId||'');setGatewayId(result.gatewayId||'default');setAllowMusic(result.allowMusic===true);setAllowTextFallback(result.allowTextFallback===true);
    if(action==='save'||action==='remove'){setApiToken('');setMessage(action==='save'?'Cloudflare saved for this browser.':'Personal Cloudflare connection removed.');notifyConnectionChanged();}
   }
  }catch(failure){if(mounted.current&&request.current===controller&&(!controller.signal.aborted||controller.signal.reason==='timeout'))setError(controller.signal.reason==='timeout'?'Cloudflare settings timed out. Check the saved status before trying again.':failure.message||'Cloudflare settings could not be updated.');}
  finally{clearTimeout(timeout);if(request.current===controller){request.current=null;busyRef.current='';savingCallback.current?.(false);if(mounted.current)setBusy('');}}
 }
 useEffect(()=>{mounted.current=true;perform('load');const unsubscribe=subscribeConnectionChanges(()=>{if(!busyRef.current)perform('load',{quiet:true});});return()=>{mounted.current=false;request.current?.abort();unsubscribe();savingCallback.current?.(false);};},[appId]);
 const personal=status?.mode==='personal',invalid=status?.mode==='invalid';
 return <section className="fc-cloudflare-card" aria-labelledby={`${id}-title`}>
  <div className="fc-settings-heading"><span className="fc-settings-key-icon"><Cloud size={21}/></span><div><h3 id={`${id}-title`}>Cloudflare</h3><p>Music and optional text fallback</p></div><span className={`fc-settings-badge ${status?.available?'ready':''}`}><i/>{busy==='load'&&!status?'Checking':status?.available?'Configured':'Not configured'}</span></div>
  <div className={`fc-settings-status ${invalid?'invalid':''}`}><div><strong>{personal?'Personal Cloudflare connection':status?.mode==='suite'?'Workspace Cloudflare connection':invalid?'Cloudflare needs attention':'Add a Cloudflare connection'}</strong></div><p>{status?.reason||'Cloudflare is separate from your Vercel connection. Usage is billed through the account and gateway below.'}</p><p>Configured settings do not verify model access or billing credits.</p></div>
  <form onSubmit={e=>{e.preventDefault();if(apiToken.trim())perform('save');}}>
   <div className="fc-cloudflare-fields"><label htmlFor={`${id}-account`}>Cloudflare account ID</label><input id={`${id}-account`} value={accountId} onChange={e=>setAccountId(e.target.value)} maxLength={32} autoComplete="off" spellCheck={false} disabled={!!busy}/><label htmlFor={`${id}-gateway`}>Cloudflare gateway ID</label><input id={`${id}-gateway`} value={gatewayId} onChange={e=>setGatewayId(e.target.value)} maxLength={64} autoComplete="off" spellCheck={false} disabled={!!busy}/><label htmlFor={`${id}-token`}>Cloudflare API token</label><input id={`${id}-token`} type="password" value={apiToken} onChange={e=>{setApiToken(e.target.value);setError('');setMessage('');}} maxLength={1024} placeholder={personal?'Re-enter token to replace settings':'Paste your API token'} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} disabled={!!busy}/></div>
   <p className="fc-settings-field-note">Use an account-scoped token with Workers AI Read permission. Tokens stay in an encrypted, HttpOnly browser cookie and are excluded from projects and exports.</p>
   <label className="fc-cloudflare-toggle"><input type="checkbox" checked={allowMusic} onChange={e=>setAllowMusic(e.target.checked)} disabled={!!busy}/>Enable music</label><label className="fc-cloudflare-toggle"><input type="checkbox" checked={allowTextFallback} onChange={e=>setAllowTextFallback(e.target.checked)} disabled={!!busy}/>Enable text fallback</label>
   <p className="fc-settings-field-note">Text fallback may send an eligible rejected request to this Cloudflare account. Music runs only when you choose Generate. Re-enter your token and save to change these choices.</p>
   <div className="fc-settings-feedback" aria-live="polite">{error?<p role="alert" className="fc-settings-error"><CircleAlert size={16}/>{error}</p>:message?<p role="status" className="fc-settings-success"><Check size={16}/>{message}</p>:null}</div>
   <div className="fc-settings-actions"><button type="button" className="fc-settings-secondary" disabled={!!busy||(!apiToken.trim()&&!status?.available)} onClick={()=>perform('check')}>{busy==='check'?<LoaderCircle size={15} className="fc-settings-spin"/>:<ShieldCheck size={15}/>}Check Cloudflare token</button><button type="submit" className="fc-settings-primary" disabled={!!busy||!apiToken.trim()||!accountId.trim()}>{busy==='save'?<LoaderCircle size={15} className="fc-settings-spin"/>:<Check size={15}/>}Save Cloudflare</button></div>
  </form>
  {(personal||invalid)&&<div className="fc-settings-remove"><div><strong>Remove Cloudflare connection</strong><p>Workspace Cloudflare settings apply only when eligible. Your Vercel connection is separate.</p></div><button type="button" disabled={!!busy} onClick={()=>perform('remove')}>Remove Cloudflare</button></div>}
 </section>;
}
