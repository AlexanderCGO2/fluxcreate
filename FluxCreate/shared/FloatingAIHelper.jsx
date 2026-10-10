import {RoutingProvenance} from './RoutingProvenance.jsx';
import React,{useEffect,useRef,useState} from 'react';
import {Sparkles,X,Square,ArrowUp,Check} from 'lucide-react';
import {connectEditorMcp} from '../../FluxLab/src/mcp-client.mjs';
import {apiURL} from './hosting.mjs';
import {subscribeConnectionChanges} from './connection-events.mjs';
import {captureAIContext,sameAIContext,decodeMcpAsset} from './ai-context.mjs';
import './floating-ai.css';

const labels={edit:'Propose editable changes',explain:'Explain selected properties',text:'Generate text',image:'Generate image','image-edit':'Edit selected image'};
async function decodeImage(asset,signal){if(asset.kind!=='image')return;const source=asset.images[0],image=new Image();image.src=source.src;await image.decode();signal.throwIfAborted();if(image.naturalWidth!==source.width||image.naturalHeight!==source.height)throw Error('The generated image does not match its dimensions.');}

/** The editor adapter owns validation, preview and its single history commit. */
export function FloatingAIHelper({appId,adapter,disabledReason=''}){
 const [open,setOpen]=useState(false),[catalog,setCatalog]=useState(null),[tools,setTools]=useState([]),[action,setAction]=useState('edit'),[scope,setScope]=useState('selection'),[prompt,setPrompt]=useState(''),[model,setModel]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState(null),[text,setText]=useState(''),[notice,setNotice]=useState('');
 const live=useRef({adapter,disabledReason}),request=useRef(null),applying=useRef(false),trigger=useRef(null),input=useRef(null),epoch=useRef({signature:'',value:0}),refresh=useRef(0);live.current={adapter,disabledReason};
 let context=null,selectionPreview='';try{const raw=adapter.getContext();context=captureAIContext(raw);if(typeof raw.preview==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(raw.preview))selectionPreview=raw.preview;}catch{}
 const signature=JSON.stringify(context);if(epoch.current.signature!==signature){epoch.current={signature,value:epoch.current.value+1};}
 const current=ticket=>!live.current.disabledReason&&ticket.epoch===epoch.current.value&&sameAIContext(ticket.context,live.current.adapter.getContext());
 const cancel=()=>{request.current?.abort();request.current=null;setBusy(false);};
 const close=()=>{cancel();setOpen(false);setTimeout(()=>trigger.current?.focus(),0);};
 useEffect(()=>()=>request.current?.abort(),[]);
 useEffect(()=>subscribeConnectionChanges(()=>{refresh.current++;cancel();setReview(null);setCatalog(null);setTools([]);setNotice('Connection changed. Reopen AI to refresh available actions.');},{focus:false}),[]);
 useEffect(()=>{if(!open)return;input.current?.focus();let active=true;const controller=new AbortController(),generation=refresh.current;
  (async()=>{let client;try{client=await connectEditorMcp(apiURL(appId,'/mcp'),{signal:controller.signal});const result=await client.call('fluxlab_catalog',{});if(active&&generation===refresh.current){setTools(client.tools.map(t=>t.name));setCatalog(result.structuredContent);setNotice('');}}catch(e){if(active&&!controller.signal.aborted)setError(e.message);}finally{await client?.close();}})();
  return()=>{active=false;controller.abort();};
 },[open,appId]);
 const capabilities=adapter.capabilities||['edit','explain'],actions=Object.keys(labels).filter(a=>capabilities.includes(a)&&(['edit','explain'].includes(a)?tools.includes('fluxcreate_edit'):typeof adapter.insertAsset==='function'&&(a!=='image-edit'||typeof adapter.getReferenceImage==='function'&&tools.includes('fluxlab_image_edit'))));
 const mode=actions.includes(action)?action:actions[0]||'edit',generating=['text','image','image-edit'].includes(mode),models=(catalog?.models||[]).filter(m=>mode==='image-edit'?m.imageEdit?.supported:m.capabilities?.includes(mode));
 const chosen=models.find(m=>m.id===model)||models[0],stale=review&&!current(review),selection=context?.selection||[],effectiveScope=selection.length?scope:'composition';
 async function prepare(){
  if(request.current||applying.current||!prompt.trim()||live.current.disabledReason)return;
  const controller=new AbortController();request.current=controller;setBusy(true);setError('');setReview(null);setNotice('');const ticket={context:captureAIContext(live.current.adapter.getContext()),epoch:epoch.current.value,scope:effectiveScope,requestId:crypto.randomUUID(),action:mode};let client;
  try{
   client=await connectEditorMcp(apiURL(appId,'/mcp'),{signal:controller.signal});
   let result,asset,preview,reference;
   if(generating){if(!chosen)throw Error('No compatible model is currently available.');const args={kind:mode==='text'?'text':'image',model:chosen.id,prompt:prompt.trim()};
    if(mode==='image-edit'){reference=await live.current.adapter.getReferenceImage({context:ticket.context,signal:controller.signal});if(!current(ticket))throw Error('The selection changed. Prepare a fresh image edit.');result=await client.call('fluxlab_image_edit',{model:chosen.id,prompt:prompt.trim(),referenceImage:reference},{requestId:ticket.requestId});}
    else result=await client.call('fluxlab_generate',args,{requestId:ticket.requestId});
    asset=decodeMcpAsset(result);await decodeImage(asset,controller.signal);setText(asset.text||'');
   }else{const payload=await live.current.adapter.buildRequest({intent:prompt.trim(),mode,scope:ticket.scope,context:ticket.context});if(!current(ticket))throw Error('The document changed. Prepare a fresh proposal.');result=(await client.call('fluxcreate_edit',{request:payload},{requestId:ticket.requestId})).structuredContent;
    if(!result)throw Error('The planner returned no proposal.');if(current(ticket))preview=await live.current.adapter.previewProposal(result,{context:ticket.context,scope:ticket.scope});
   }
   if(controller.signal.aborted||request.current!==controller)return;
   setReview({...ticket,result,asset,preview,reference});
  }catch(e){if(!controller.signal.aborted&&request.current===controller)setError(e.message||'AI could not complete this request.');}
  finally{await client?.close();if(request.current===controller){request.current=null;setBusy(false);}}
 }
 async function apply(){if(!review||applying.current)return;applying.current=true;setBusy(true);setError('');try{if(!current(review))throw Error('The document or selection changed. Prepare a fresh proposal.');const adapter=live.current.adapter,options={context:review.context,scope:review.scope,preview:review.preview,isCurrent:()=>current(review)};let accepted;
   if(review.asset){if(review.asset.kind==='text'&&(!text.trim()||text.length>5000))throw Error('Keep inserted text between 1 and 5,000 characters.');accepted=await adapter.insertAsset({...review.asset,...(review.asset.kind==='text'?{text}: {})},options);}
   else accepted=await adapter.applyProposal(review.result,options);
   if(accepted===false)throw Error('The editor could not apply this result.');setReview(null);setNotice('Added to your document. Undo is available in the editor.');
  }catch(e){setError(e.message);}finally{applying.current=false;setBusy(false);}}
 const summary=review?.asset?'Review generated '+review.asset.kind:review?.result?.summary||review?.result?.patch?.summary||'Review editable proposal';
 const canApply=review&&(review.asset||review.preview!=null)&&review.action!=='explain';
 return <div className="fc-floating-ai" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'&&open){e.preventDefault();if(!applying.current)close();}}}>
  {!open?<button ref={trigger} className="fc-floating-ai-trigger" aria-label="Open floating AI helper" onClick={()=>{setError('');setOpen(true);}}><Sparkles size={18}/><span>AI helper</span></button>:<aside role="dialog" aria-label="AI helper" className="fc-floating-ai-panel">
   <header><Sparkles size={18}/><strong>AI helper</strong><button aria-label="Close AI helper" disabled={applying.current} onClick={close}><X size={18}/></button></header>
   <div className="fc-floating-ai-body">
    <div className="fc-floating-ai-selection">{selectionPreview&&<img src={selectionPreview} alt="Current selection preview" style={{maxHeight:72,maxWidth:110,objectFit:'contain'}}/>}<strong>{selection.length===1?selection[0].label:selection.length?`${selection.length} selected objects`:'Current document'}</strong><small>{selection.map(s=>s.kind).filter((s,i,a)=>a.indexOf(s)===i).join(', ')||'Whole document'}</small></div>
    <p className="fc-floating-ai-status">{catalog?.status?.available?'Connected through FluxLab':catalog?.status?.reason||'Connecting to FluxLab…'}</p>
    <label>Action<select aria-label="AI action" value={mode} disabled={busy} onChange={e=>{setAction(e.target.value);setModel('');setReview(null);}}>{actions.map(a=><option key={a} value={a}>{labels[a]}</option>)}</select></label>
    {!generating&&<label>Work with<select aria-label="AI scope" value={effectiveScope} disabled={busy} onChange={e=>{setScope(e.target.value);setReview(null);}}><option value="selection" disabled={!selection.length}>Current selection</option><option value="composition">Whole document</option></select></label>}
    {generating&&<label>Model<select aria-label="AI model" value={chosen?.id||''} disabled={busy} onChange={e=>setModel(e.target.value)}>{!models.length&&<option>No compatible model available</option>}{models.map(m=><option key={m.id} value={m.id}>{m.name||m.id}</option>)}</select></label>}
    <label>Your request<textarea ref={input} aria-label="Floating AI request" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={generating?12000:2000} rows={3} placeholder="Describe what you want to create or change…" disabled={applying.current}/></label>
    <p className="fc-floating-ai-fine">{mode==='image-edit'?'Sends the selected image to your connected Gateway account. Review the result beside the original, then insert a new copy.':'Uses your connected Gateway account and may incur charges. Review every result before applying.'}</p>
    {mode==='image-edit'&&chosen?.imageEdit&&<p className="fc-floating-ai-fine">{chosen.imageEdit.limits} {chosen.imageEdit.priceBasis}</p>}
    {busy?<button className="fc-floating-ai-primary" disabled={applying.current} onClick={()=>{cancel();setNotice('Request cancelled. Provider work may already have started; no retry was sent.');}}><Square size={14}/>{applying.current?'Applying…':'Cancel request'}</button>:<button className="fc-floating-ai-primary" onClick={prepare} disabled={!catalog?.status?.available||!actions.length||!prompt.trim()||!!disabledReason||!context||generating&&!chosen||mode==='image-edit'&&selection.length!==1}><ArrowUp size={15}/>Prepare for review</button>}
    {disabledReason&&<p role="status">{disabledReason}</p>}{error&&<p role="alert" className="fc-floating-ai-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {review&&<section aria-label="AI proposal review" className="fc-floating-ai-review"><h3>{summary}</h3><RoutingProvenance routing={review.result?.routing||review.result?.structuredContent?.routing} className="fc-floating-ai-fine"/>{review.result?.explanation&&<p>{review.result.explanation}</p>}
     {review.reference&&<figure><img src={review.reference} alt="Original selected image"/><figcaption>Original</figcaption></figure>}
     {review.asset?.kind==='image'&&<figure><img src={review.asset.images[0].src} alt="Generated image for review"/><figcaption>Generated result</figcaption><a href={review.asset.images[0].src} download={'flux-ai-'+review.asset.id+'.'+(review.asset.images[0].mimeType==='image/jpeg'?'jpg':review.asset.images[0].mimeType==='image/webp'?'webp':'png')}>Download image</a></figure>}
     {review.asset?.kind==='text'&&<textarea aria-label="Review generated text" rows={6} value={text} onChange={e=>setText(e.target.value)}/>}
     {!review.asset&&review.preview!=null&&adapter.renderPreview&&<div className="fc-floating-ai-preview">{adapter.renderPreview(review.preview)}</div>}
     {review.asset?.warnings?.map((warning,i)=><p key={i}>{warning}</p>)}
     {stale&&<p role="status" className="fc-floating-ai-error">Document or selection changed. Prepare a fresh proposal before applying.</p>}
     {canApply&&<button className="fc-floating-ai-primary" disabled={stale||busy||!!disabledReason||review.asset?.kind==='text'&&(!text.trim()||text.length>5000)} onClick={apply}><Check size={15}/>{review.asset?'Insert reviewed result':'Apply reviewed changes'}</button>}
     <button disabled={busy} onClick={()=>setReview(null)}>Discard proposal</button>
    </section>}
    <small className="fc-floating-ai-fine">AI upscaling is unavailable until a compatible provider is verified. Editable requests send properties, not local media pixels.</small>
   </div>
  </aside>}
 </div>;
}
