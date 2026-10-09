import React, { useEffect, useId, useRef, useState } from 'react';
import { SlidersHorizontal, ChevronRight, Pencil, Trash2, Plus, X, Check, AlertCircle } from 'lucide-react';
import { loadPreferences, savePreferences, MAX_PREFERENCES, MAX_SELECTED_PREFERENCES } from './creative-preferences.mjs';
import './creative-preferences.css';

export function CreativePreferences({ selectedIds, onSelectionChange, disabled = false, onLibraryChange }) {
  const [initial] = useState(() => loadPreferences());
  const [library, setLibrary] = useState(initial.library), [error, setError] = useState(initial.error);
  const [editingId, setEditingId] = useState(null), [label, setLabel] = useState(''), [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef(null), trigger = useRef(null), nameInput = useRef(null);
  const headingId = useId(), descriptionId = useId();
  const selected = new Set(selectedIds), selectedCount = library.filter(rule => selected.has(rule.id)).length;
  useEffect(() => { onLibraryChange?.(library); }, [library, onLibraryChange]);
  useEffect(() => { if (disabled) dialog.current?.close(); }, [disabled]);
  const resetEditor = () => { setEditingId(null); setLabel(''); setText(''); };
  const open = () => { if (disabled) return; setNotice(''); resetEditor(); dialog.current?.showModal(); };
  const persist = next => {
    const result = savePreferences(next);
    if (!result.ok) { setError(result.error); return false; }
    setLibrary(result.library); setError(''); return true;
  };
  const saveRule = event => {
    event.preventDefault();
    const id = editingId ?? `rule-${globalThis.crypto.randomUUID()}`;
    const rule = { id, label, text };
    const next = editingId ? library.map(item => item.id === id ? rule : item) : [...library, rule];
    if (!persist(next)) return;
    onSelectionChange(selectedIds.filter(value => value !== id));
    setNotice(editingId ? 'Rule updated. Select it again to include the changes.' : 'Rule saved. Select it to include it with your next request.');
    resetEditor();
  };
  const editRule = rule => {
    setEditingId(rule.id); setLabel(rule.label); setText(rule.text); setNotice('');
    nameInput.current?.focus();
  };
  const deleteRule = rule => {
    if (!persist(library.filter(item => item.id !== rule.id))) return;
    onSelectionChange(selectedIds.filter(id => id !== rule.id));
    if (editingId === rule.id) resetEditor();
    setNotice(`Deleted ${rule.label}.`);
  };
  const toggleRule = (rule, checked) => {
    const next = checked ? [...selectedIds.filter(id => id !== rule.id), rule.id] : selectedIds.filter(id => id !== rule.id);
    if (next.length > MAX_SELECTED_PREFERENCES) { setError('Include up to 10 preferences with each request.'); return; }
    onSelectionChange(next); setNotice('');
  };
  return <div className="creative-preferences">
    <button ref={trigger} type="button" className="preferences-trigger" aria-label="Creative preferences" aria-haspopup="dialog" onClick={open} disabled={disabled}>
      <SlidersHorizontal size={13}/><span>Preferences</span><small>{selectedCount ? `${selectedCount} selected` : 'None'}</small><ChevronRight size={12}/>
    </button>
    <dialog ref={dialog} className="preferences-dialog" aria-labelledby={headingId} aria-describedby={descriptionId} onClose={() => trigger.current?.focus()} onKeyDown={event => event.stopPropagation()} onKeyUp={event => event.stopPropagation()}>
      <div className="preferences-dialog-header"><span className="preferences-symbol"><SlidersHorizontal size={21}/></span><div><h2 id={headingId}>Creative preferences</h2><p>A little consistency, on your terms.</p></div><button type="button" className="icon-button" aria-label="Close creative preferences" onClick={() => dialog.current?.close()} autoFocus><X size={18}/></button></div>
      <p className="preferences-description" id={descriptionId}>Stored on this device. Choose rules to send with this request. Selections clear after sending and when you change projects.</p>
      <div className="preferences-selection-summary"><strong>{selectedCount} of 10 selected</strong><span>{library.length} of 30 saved</span>{selectedCount > 0 && <button type="button" onClick={() => onSelectionChange([])} disabled={disabled}>Clear selection</button>}</div>
      {library.length ? <ul className="preferences-list">{library.map(rule => <li key={rule.id} className={selected.has(rule.id) ? 'included' : ''}>
        <label><input type="checkbox" aria-label={`Include ${rule.label}`} checked={selected.has(rule.id)} disabled={disabled || (!selected.has(rule.id) && selectedCount >= MAX_SELECTED_PREFERENCES)} onChange={event => toggleRule(rule, event.target.checked)}/><span><strong>{rule.label}</strong><small>{rule.text}</small></span></label>
        <div className="preferences-rule-actions"><button type="button" className="icon-button" aria-label={`Edit ${rule.label}`} onClick={() => editRule(rule)} disabled={disabled}><Pencil size={13}/></button><button type="button" className="icon-button" aria-label={`Delete ${rule.label}`} onClick={() => deleteRule(rule)} disabled={disabled}><Trash2 size={13}/></button></div>
      </li>)}</ul> : <div className="preferences-empty"><p>Your style, ready when you need it.</p><span>Save a palette, motion principle, or typography rule below.</span></div>}
      <form className="preferences-editor" onSubmit={saveRule}>
        <div className="preferences-editor-heading"><h3>{editingId ? 'Edit rule' : 'Add a rule'}</h3>{editingId && <button type="button" onClick={resetEditor}>Cancel edit</button>}</div>
        <label>Rule name<input aria-label="Rule name" ref={nameInput} value={label} onChange={event => setLabel(event.target.value)} maxLength={60} required placeholder="Gentle motion" disabled={disabled}/></label>
        <label>Style rule<textarea aria-label="Style rule" value={text} onChange={event => setText(event.target.value)} maxLength={300} required placeholder="Use gentle movement, generous pauses, and soft easing." disabled={disabled}/></label>
        <div className="preferences-editor-footer"><span>{text.length}/300</span><button type="submit" className="button primary" disabled={disabled || (!editingId && library.length >= MAX_PREFERENCES)}>{editingId ? <Check size={13}/> : <Plus size={13}/>} {editingId ? 'Save changes' : 'Save rule'}</button></div>
        {!editingId && library.length >= MAX_PREFERENCES && <p className="preferences-limit">Your library is full. Delete a rule to make room for another.</p>}
      </form>
      {error && <p className="preferences-error" role="alert"><AlertCircle size={14}/><span>{error}</span></p>}
      <p className="preferences-notice" role="status">{notice}</p>
      <footer className="preferences-dialog-footer"><span>Only checked rules join your next request.</span><button type="button" className="button" onClick={() => dialog.current?.close()}>Done</button></footer>
    </dialog>
  </div>;
}
