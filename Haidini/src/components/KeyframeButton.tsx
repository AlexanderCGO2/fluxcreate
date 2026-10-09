import { useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';

type Props=ButtonHTMLAttributes<HTMLButtonElement>&{onDelete:()=>void;deleteDisabled:boolean};
export default function KeyframeButton({onDelete,deleteDisabled,onKeyDown,onContextMenu,children,...props}:Props){
 const target=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null);
 const [position,setPosition]=useState<{x:number;y:number}|null>(null);
 function close(restore=false){setPosition(null);if(restore)target.current?.focus();}
 function remove(){if(deleteDisabled||props.disabled)return;close(true);onDelete();}
 function open(x:number,y:number){setPosition({x:Math.max(8,Math.min(x,window.innerWidth-212)),y:Math.max(8,Math.min(y,window.innerHeight-64))});}
 useLayoutEffect(()=>{if(!position||!menu.current)return;const rect=menu.current.getBoundingClientRect(),x=Math.max(8,Math.min(position.x,window.innerWidth-rect.width-8)),y=Math.max(8,Math.min(position.y,window.innerHeight-rect.height-8));if(x!==position.x||y!==position.y)setPosition({x,y});},[position]);
 useEffect(()=>{
  if(!position)return;
  menu.current?.focus();
  const outside=(e:PointerEvent)=>{if(!menu.current?.contains(e.target as Node))close();};
  const dismiss=()=>close();
  document.addEventListener('pointerdown',outside,true);window.addEventListener('resize',dismiss);window.addEventListener('blur',dismiss);
  return()=>{document.removeEventListener('pointerdown',outside,true);window.removeEventListener('resize',dismiss);window.removeEventListener('blur',dismiss);};
 },[position]);
 function deleteKey(e:KeyboardEvent){if(!['Delete','Backspace'].includes(e.key)||e.ctrlKey||e.metaKey||e.altKey)return false;e.preventDefault();e.stopPropagation();if(!e.repeat)remove();return true;}
 const host=target.current?.closest('[role="dialog"]')||document.body;
 return <><button {...props} ref={target} aria-keyshortcuts="Delete Backspace Shift+F10" onKeyDown={e=>{if(deleteKey(e))return;if(e.key==='ContextMenu'||e.key==='F10'&&e.shiftKey){e.preventDefault();e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();open(rect.left,rect.bottom+4);return;}onKeyDown?.(e);}} onContextMenu={e=>{e.preventDefault();e.stopPropagation();open(e.clientX,e.clientY);onContextMenu?.(e);}}>{children}</button>{position&&createPortal(<div ref={menu} className="keyframe-context-menu" role="menu" aria-label="Keyframe actions" tabIndex={-1} style={{left:position.x,top:position.y}} onContextMenu={e=>e.preventDefault()} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close();}} onKeyDown={e=>{if(deleteKey(e))return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}else if(e.key==='Tab'){close(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();}else if(e.key==='Enter'&&e.target===menu.current){e.preventDefault();remove();}}}><button role="menuitem" disabled={deleteDisabled||props.disabled} onClick={remove}><Trash2 size={14}/><span>Delete keyframe</span><kbd>Del</kbd></button>{deleteDisabled&&<small>This property is protected or editing is unavailable.</small>}</div>,host)}</>;
}
