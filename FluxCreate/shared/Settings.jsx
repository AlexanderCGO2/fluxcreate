import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Settings2, X, KeyRound, ShieldCheck, ArrowUpRight, Eye, EyeOff, Check, LoaderCircle, CircleAlert, Sparkles, Monitor} from 'lucide-react';
import {apiURL, isPublicDemo} from './hosting.mjs';
import {notifyConnectionChanged, subscribeConnectionChanges} from './connection-events.mjs';
import {CloudflareConnection} from './CloudflareConnection.jsx';
import './settings.css';

export function SettingsButton({appId, className = '', theme}) {
  const [open, setOpen] = useState(false);
  if (isPublicDemo()) return null;
  return <><button type="button" className={`fc-settings-trigger ${className}`} aria-label="General settings" title="General settings" onClick={() => setOpen(true)}><Settings2 size={17}/></button>{open && <SettingsDialog appId={appId} theme={theme} onClose={() => setOpen(false)}/>}</>;
}

export function SettingsDialog({appId, onClose, theme}) {
  const [portal] = useState(() => document.createElement('div'));
  const [status, setStatus] = useState(null), [apiKey, setApiKey] = useState(''), [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState('loading'), [error, setError] = useState(''), [message, setMessage] = useState('');
  const dialog = useRef(null), input = useRef(null), request = useRef(null), mounted = useRef(false), busyRef = useRef(busy), closeRef = useRef(onClose);
  busyRef.current = busy; closeRef.current = onClose;
  const [cloudflareSaving,setCloudflareSaving]=useState(false),cloudflareSavingRef=useRef(false);
  const onCloudflareSaving=useCallback(value=>{cloudflareSavingRef.current=value;setCloudflareSaving(value);},[]);
  const id = useId(), saving = busy === 'save' || busy === 'remove' || cloudflareSaving;
  const personal = status?.mode === 'personal', invalid = status?.mode === 'invalid';

  useEffect(() => {
    mounted.current = true;
    portal.className = 'fc-settings-portal';
    portal.dataset.theme = theme || document.documentElement.dataset.theme || document.activeElement?.closest('[data-theme]')?.dataset.theme || (appId === 'fluxini' ? 'dark' : 'light');
    const opener = document.activeElement, overflow = document.body.style.overflow;
    document.body.appendChild(portal);
    const siblings = [...document.body.children].filter(node => node !== portal).map(node => [node, node.inert]);
    siblings.forEach(([node]) => {node.inert = true;});
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keys = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!['save', 'remove'].includes(busyRef.current) && !cloudflareSavingRef.current) closeRef.current();
      }
      if (event.key === 'Tab') {
        const items = [...(dialog.current?.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]') || [])].filter(node => node.getClientRects().length);
        const first = items[0], last = items.at(-1), current = document.activeElement;
        if (!first) {event.preventDefault(); dialog.current?.focus();}
        else if (event.shiftKey && (current === first || !items.includes(current))) {event.preventDefault(); last.focus();}
        else if (!event.shiftKey && (current === last || !items.includes(current))) {event.preventDefault(); first.focus();}
      }
      // Keep editor shortcuts from acting on a document behind the dialog.
      event.stopPropagation();
    };
    const focus = event => {if (!portal.contains(event.target)) dialog.current?.focus();};
    window.addEventListener('keydown', keys, true);
    document.addEventListener('focusin', focus);
    return () => {
      mounted.current = false; request.current?.abort();
      window.removeEventListener('keydown', keys, true); document.removeEventListener('focusin', focus);
      siblings.forEach(([node, inert]) => {node.inert = inert;});
      document.body.style.overflow = overflow; portal.remove();
      if (opener?.isConnected) opener.focus();
    };
  }, [portal]);

  async function perform(action, {quiet = false} = {}) {
    if (action !== 'load' && busyRef.current) return;
    if (action === 'load' && busyRef.current && busyRef.current !== 'loading') return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 20000);
    busyRef.current = action === 'load' ? 'loading' : action;
    setBusy(busyRef.current);
    if (!quiet) {setError(''); setMessage('');}
    const draft = apiKey.trim(), method = action === 'load' ? 'GET' : action === 'remove' ? 'DELETE' : 'POST';
    try {
      const response = await fetch(apiURL(appId, `/settings/connection${action === 'check' ? '/check' : ''}`), {
        method, credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        ...(method === 'POST' ? {headers: {'Content-Type': 'application/json'}, body: JSON.stringify({apiKey: draft})} : {}),
      });
      let result; try {result = await response.json();} catch {throw Error('Settings could not connect. Refresh this workspace and try again.');}
      if (controller.signal.aborted || request.current !== controller || !mounted.current) return;
      if (!response.ok) throw Error(typeof result.error === 'string' ? result.error : 'The connection could not be updated. Try again.');
      if (action === 'check' ? result?.valid !== true : !result || !['personal', 'suite', 'none', 'invalid'].includes(result.mode) || typeof result.available !== 'boolean') throw Error('The connection returned an unreadable status. Try again.');
      if (action !== 'check') setStatus(result);
      if (action === 'save' || action === 'remove') {
        setApiKey(''); setRevealed(false);
        setMessage(action === 'save' ? 'Personal connection saved for this browser.' : result.mode === 'suite' ? 'Personal key removed. The suite connection is now active.' : 'Personal key removed from this browser.');
        notifyConnectionChanged();
      } else if (action === 'check') {
        const credit = typeof result.credits === 'number' && Number.isFinite(result.credits) ? ` Available credits: $${result.credits.toFixed(2)}.` : '';
        setMessage((draft ? 'This key works. Save it to use it across the suite.' : 'Your active connection is working.') + credit);
      }
    } catch (failure) {
      if (request.current === controller && mounted.current && (!controller.signal.aborted || controller.signal.reason === 'timeout')) setError(controller.signal.reason === 'timeout' ? 'The connection request timed out. Check your connection and try again.' : failure.message || 'The connection could not be updated.');
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {request.current = null; busyRef.current = ''; if (mounted.current) setBusy('');}
    }
  }

  useEffect(() => {
    perform('load');
    return subscribeConnectionChanges(() => {if (!busyRef.current) perform('load', {quiet: true});});
  }, [appId]);

  const name = personal ? 'Personal connection' : status?.mode === 'suite' ? 'Suite connection' : invalid ? 'Connection needs attention' : 'Connect your AI';
  const description = personal ? 'Your key powers interactive AI across the creative studios in this browser.' : status?.mode === 'suite' ? 'Using the connection provided by this workspace. Add your own key to use your AI Gateway account.' : invalid ? 'The saved personal connection could not be opened. Add your key again or remove it to choose another connection.' : 'Add an AI Gateway key to create and edit with AI across the creative studios.';
  const expiration = status?.expiresAt && !Number.isNaN(new Date(status.expiresAt).getTime()) ? new Intl.DateTimeFormat(undefined, {dateStyle: 'medium'}).format(new Date(status.expiresAt)) : null;

  return createPortal(<div className="fc-settings-overlay" onPointerDown={event => {if (event.target === event.currentTarget && !saving) onClose();}}>
    <section ref={dialog} className="fc-settings-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} tabIndex={-1}>
      <aside className="fc-settings-sidebar"><div className="fc-settings-brand"><span>f</span>FluxCreate</div><span className="fc-settings-eyebrow">YOUR WORKSPACE</span><div className="fc-settings-section" aria-current="page"><Settings2 size={16}/>General<span/></div><div className="fc-settings-sidebar-note"><Sparkles size={20}/><p>Your connection.<br/>Every creative space.</p></div></aside>
      <div className="fc-settings-content"><header><div><span className="fc-settings-eyebrow">PREFERENCES</span><h2 id={`${id}-title`}>General settings</h2><p id={`${id}-description`}>A little setup. A world of possibility.</p></div><button type="button" className="fc-settings-close" aria-label="Close general settings" disabled={saving} onClick={onClose}><X size={19}/></button></header>
        <div className="fc-settings-scroll"><div className="fc-settings-heading"><span className="fc-settings-key-icon"><KeyRound size={21}/></span><div><h3>AI connection</h3><p>One key. All your creative tools.</p></div><span className={`fc-settings-badge ${status?.available ? 'ready' : ''}`}><i/>{busy === 'loading' && !status ? 'Checking' : status?.available ? 'Connected' : 'Not connected'}</span></div>
          <div className={`fc-settings-status ${invalid ? 'invalid' : ''}`}><div><strong>{busy === 'loading' && !status ? 'Checking your connection…' : name}</strong><span>{personal ? 'JUST FOR YOU' : status?.mode === 'suite' ? 'WORKSPACE DEFAULT' : 'AI GATEWAY'}</span></div><p>{description}</p>{status?.reason && <p className="fc-settings-reason">{status.reason}</p>}{personal && expiration && <small>Saved until {expiration}. You can remove it anytime.</small>}</div>
          {appId === 'fluxagents' && <p className="fc-settings-run-note"><CircleAlert size={16}/><span>FluxAgents background workflows use the suite connection. Personal browser keys apply to interactive studio AI; each live workflow shows its billing connection before starting.</span></p>}
          <form onSubmit={event => {event.preventDefault(); if (apiKey.trim()) perform('save');}}>
            <div className="fc-settings-label-row"><label htmlFor={`${id}-key`}>{personal ? 'Replace your personal key' : 'Your AI Gateway key'}</label><a href="https://vercel.com/dashboard/ai-gateway" target="_blank" rel="noopener noreferrer">Get a key<ArrowUpRight size={12}/></a></div>
            <div className="fc-settings-key-field"><KeyRound size={16}/><input ref={input} id={`${id}-key`} name="fluxcreate-personal-gateway" type={revealed ? 'text' : 'password'} value={apiKey} placeholder="Paste your API key" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={1024} disabled={!!busy} onChange={event => {setApiKey(event.target.value); setError(''); setMessage('');}}/><button type="button" aria-label={revealed ? 'Hide API key' : 'Show API key'} disabled={!apiKey || !!busy} onClick={() => setRevealed(!revealed)}>{revealed ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
            <p className="fc-settings-field-note">Use a Vercel AI Gateway key. Model usage is billed to the connected account.</p>
            <div className="fc-settings-feedback" aria-live="polite">{error ? <p role="alert" className="fc-settings-error"><CircleAlert size={16}/><span>{error}</span></p> : message ? <p role="status" className="fc-settings-success"><Check size={16}/><span>{message}</span></p> : null}</div>
            <div className="fc-settings-actions"><button type="button" className="fc-settings-secondary" disabled={!!busy || (!apiKey.trim() && !status?.available)} onClick={() => perform('check')}>{busy === 'check' ? <LoaderCircle size={15} className="fc-settings-spin"/> : <ShieldCheck size={15}/>}Check connection</button><button type="submit" className="fc-settings-primary" disabled={!!busy || !apiKey.trim()}>{busy === 'save' ? <><LoaderCircle size={15} className="fc-settings-spin"/>Saving…</> : <><Check size={15}/>Save connection</>}</button></div>
          </form>
          <div className="fc-settings-privacy"><Monitor size={17}/><div><strong>Private to this browser</strong><p>Your key is encrypted and saved in a secure browser cookie. It is sent to the server for AI requests and is never included in your projects or exports. This does not change the workspace’s shared connection.</p></div></div>
          {(personal || invalid) && <div className="fc-settings-remove"><div><strong>Remove personal connection</strong><p>The suite connection will be used if one is available.</p></div><button type="button" disabled={!!busy} onClick={() => perform('remove')}>{busy === 'remove' ? 'Removing…' : 'Remove key'}</button></div>}
          <p className="fc-settings-video-note">Changing or removing a key may interrupt checking or downloading videos started with that key. Saved media stays in your library.</p>
          <CloudflareConnection appId={appId} onSavingChange={onCloudflareSaving}/>
        </div><footer><ShieldCheck size={13}/><span>Shared across FluxCreate in this browser</span><button type="button" disabled={saving} onClick={onClose}>Done</button></footer>
      </div>
    </section>
  </div>, portal);
}
