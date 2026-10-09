import React, {useEffect, useRef, useState} from 'react';
import {Type, ImagePlus, Brush, Eye, EyeOff, Lock, Unlock, GripVertical} from 'lucide-react';

export function LayerList({layers, selected, onSelect, onToggle, onReorder}) {
  const list = useRef(null), drag = useRef(null), suppressClick = useRef(false);
  const latest = useRef(null); latest.current = {layers, onSelect, onReorder};
  const [indicator, setIndicator] = useState(null), [announcement, setAnnouncement] = useState('');
  useEffect(() => {
    let frame = 0;
    const clear = () => {drag.current = null; setIndicator(null); cancelAnimationFrame(frame);};
    const locate = (x, y) => {
      const box = list.current?.getBoundingClientRect();
      if (!box || x < box.left || x > box.right || y < box.top || y > box.bottom) return null;
      const rows = [...list.current.querySelectorAll('[data-layer-id]')];
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (y < rect.bottom) return {id: row.dataset.layerId, edge: y < rect.top + rect.height / 2 ? 'before' : 'after'};
      }
      return rows.length ? {id: rows.at(-1).dataset.layerId, edge: 'after'} : null;
    };
    const update = () => {
      const state = drag.current;
      if (!state?.active) return;
      if (latest.current.layers !== state.layers) {clear(); return;}
      const box = list.current.getBoundingClientRect();
      if (state.x >= box.left && state.x <= box.right && state.y >= box.top && state.y <= box.bottom) {
        const distance = state.y < box.top + 30 ? state.y - box.top - 30 : state.y > box.bottom - 30 ? state.y - box.bottom + 30 : 0;
        if (distance) list.current.scrollTop += distance * 0.3;
      }
      const target = locate(state.x, state.y);
      state.target = target;
      setIndicator(previous => previous?.source === state.id && previous?.id === target?.id && previous?.edge === target?.edge ? previous : {source: state.id, ...target});
      frame = requestAnimationFrame(update);
    };
    const move = event => {
      const state = drag.current;
      if (!state || state.pointerId !== event.pointerId) return;
      state.x = event.clientX; state.y = event.clientY;
      if (!state.active && Math.hypot(state.x - state.startX, state.y - state.startY) >= 5) {
        state.active = true; suppressClick.current = true; update();
      }
      if (state.active) event.preventDefault();
    };
    const finish = event => {
      const state = drag.current;
      if (!state || state.pointerId !== event.pointerId) return;
      const target = locate(event.clientX, event.clientY);
      if (state.active && target && latest.current.layers === state.layers) {
        latest.current.onReorder(state.id, target.id, target.edge);
        latest.current.onSelect(state.id);
        setAnnouncement(`${state.name} placed ${target.edge === 'before' ? 'above' : 'below'} ${state.layers.find(layer => layer.id === target.id)?.name}.`);
      }
      clear();
    };
    const cancel = () => {if (drag.current?.active) setAnnouncement('Layer move cancelled.'); clear();};
    const escape = event => {if (event.key === 'Escape' && drag.current) {event.preventDefault(); event.stopPropagation(); cancel();}};
    window.addEventListener('pointermove', move, {passive: false});
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', escape, true);
    return () => {
      clear(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', cancel); window.removeEventListener('blur', cancel); window.removeEventListener('keydown', escape, true);
    };
  }, []);
  const start = (event, layer) => {
    suppressClick.current = false;
    if (event.button !== 0 || layer.locked || !event.isPrimary) return;
    drag.current = {id:layer.id, name:layer.name, layers, pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:event.clientX, y:event.clientY, active:false};
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const keyboard = (event, layer) => {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const index = layers.indexOf(layer), target = layers[index + (event.key === 'ArrowUp' ? -1 : 1)];
    if (!layer.locked && target) {
      onReorder(layer.id, target.id, event.key === 'ArrowUp' ? 'before' : 'after');
      onSelect(layer.id); setAnnouncement(`${layer.name} moved ${event.key === 'ArrowUp' ? 'up' : 'down'}.`);
    }
  };
  return <><div ref={list} className="oto-layer-list" aria-label="Layer stack">
    {layers.map(layer => <div key={layer.id} data-layer-id={layer.id} className={`oto-layer-row ${selected === layer.id ? 'selected' : ''} ${!layer.visible ? 'hidden-layer' : ''} ${indicator?.source === layer.id ? 'is-dragging' : ''} ${indicator?.id === layer.id ? `drop-${indicator.edge}` : ''}`}>
      <button className="oto-layer-grip" aria-label={`Reorder ${layer.name}`} title={layer.locked ? 'Unlock this layer to reorder it' : 'Drag to reorder · Alt + ↑ / ↓'} disabled={layer.locked} onPointerDown={event => start(event, layer)} onKeyDown={event => keyboard(event, layer)} onClick={() => {if (!suppressClick.current) onSelect(layer.id);}}><GripVertical size={12}/></button>
      <button className={`oto-layer-select ${layer.type === 'text' ? 'text' : ''}`} aria-label={`Select ${layer.name}`} title={layer.locked ? layer.name : `${layer.name} · Drag to reorder`} onPointerDown={event => start(event, layer)} onKeyDown={event => keyboard(event, layer)} onClick={() => {if (!suppressClick.current) onSelect(layer.id); suppressClick.current = false;}}>
        <span className="oto-layer-thumb" style={{background:layer.type === 'shape' ? layer.gradient ? `linear-gradient(${layer.gradient.angle}deg,${layer.gradient.from},${layer.gradient.to})` : layer.fill : undefined, borderRadius:layer.shape === 'ellipse' && layer.type === 'shape' ? 50 : 5}}>{layer.type === 'text' ? <Type size={14}/> : layer.type === 'image' ? <ImagePlus size={14}/> : layer.type === 'stroke' ? <Brush size={14}/> : null}</span>
        <span>{layer.name}</span>
      </button>
      <button className="oto-layer-state" aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.name}`} onClick={() => onToggle(layer.id, 'locked')}>{layer.locked ? <Lock size={12}/> : <Unlock size={12}/>}</button>
      <button className="oto-layer-state" aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`} onClick={() => onToggle(layer.id, 'visible')}>{layer.visible ? <Eye size={13}/> : <EyeOff size={13}/>}</button>
    </div>)}
  </div><span className="oto-sr-only" role="status" aria-live="polite">{announcement}</span></>;
}
