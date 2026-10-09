import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export default function Dialog({title,children,onClose,wide=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLElement>(null),close=useRef(onClose),id=useId();close.current=onClose;
  useEffect(()=>{
    const opener=document.activeElement as HTMLElement|null,el=ref.current!;
    const focusable=()=>Array.from(el.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(e=>e.getClientRects().length);
    (el.querySelector<HTMLElement>('[data-autofocus]')||focusable()[0]||el).focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();}if(e.key==='Tab'){const items=focusable(),first=items[0],last=items[items.length-1];if(!first){e.preventDefault();el.focus();}else if(e.shiftKey&&(document.activeElement===first||!el.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!el.contains(document.activeElement))){e.preventDefault();first.focus();}}};
    document.addEventListener('keydown',key,true);return()=>{document.removeEventListener('keydown',key,true);opener?.focus();};
  },[]);
  return <div className="dialog-scrim" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id} className={'dialog '+(wide?'dialog-wide':'')}><header><h2 id={id}>{title}</h2><button aria-label="Close dialog" onClick={onClose}><X size={18}/></button></header>{children}</section></div>;
}
