import React,{useEffect,useId,useState} from 'react';
import {createManualBeatGrid} from './listening.mjs';

export default function MusicMap({analysis,onApplyAnchors,disabled=false}) {
  const prefix=useId(),[bpm,setBpm]=useState('120'),[offset,setOffset]=useState('0'),[error,setError]=useState(''),[pending,setPending]=useState(false);
  useEffect(()=>{setBpm(String(analysis?.tempoCandidates?.[0]?.bpm??120));setOffset(String((analysis?.anchors?.[0]?.beats?.[0]??0)/(analysis?.sampleRate??1)));setError('');},[analysis?.sourceHash]);
  if(!analysis)return <section className="mv-analysis" aria-label="Music map"><h3>Music map</h3><p>Load your song to measure its rhythm and mark musical cuts.</p></section>;
  const beats=analysis.beats??[],step=Math.max(1,Math.ceil(beats.length/720));
  async function apply(event){event.preventDefault();setError('');setPending(true);try{await onApplyAnchors(createManualBeatGrid(analysis,Number(bpm),Number(offset)));}catch(e){setError(e?.message??'The manual beat grid could not be applied.');}finally{setPending(false);}}
  const manual=beats.filter(b=>b.manual).length;
  return <section className="mv-analysis" aria-label="Music map">
    <div className="mv-section-heading"><div><h3>Music map</h3><p>{analysis.duration.toFixed(2)} seconds · {beats.length} {manual?'measured and manual':'measured'} beat candidates · {beats.filter(b=>b.manual||b.confidence>=.35).length} usable cut anchors</p></div><span className="mv-confidence">{manual?'Manual anchors added':analysis.status==='silent'?'No rhythm detected':`${Math.round(analysis.confidence*100)}% rhythm confidence`}</span></div>
    <svg role="img" aria-labelledby={`${prefix}-map-title`} viewBox="0 0 1000 96" width="100%" style={{display:'block',borderRadius:12,background:'var(--panel-2,rgba(127,127,127,.06))'}}>
      <title id={`${prefix}-map-title`}>{beats.length} musical beat candidates across {analysis.duration.toFixed(2)} seconds. Manual anchors are highlighted. This is a beat map, not an audio waveform.</title>
      <line x1="0" y1="48" x2="1000" y2="48" stroke="currentColor" opacity=".12"/>
      {beats.filter((_,i)=>i%step===0).map(beat=>{const x=beat.sample/analysis.sampleCount*1000,h=12+beat.confidence*32;return <line key={beat.id} x1={x} x2={x} y1={48-h} y2={48+h} stroke={beat.manual?'var(--accent,#7856ce)':'currentColor'} strokeWidth={beat.manual?2:1} opacity={beat.manual?1:.45}/>;})}
    </svg>
    <div className="mv-map-times" style={{display:'flex',justifyContent:'space-between',fontSize:12,opacity:.65,marginTop:6}}><span>0:00</span><span>{Math.floor(analysis.duration/60)}:{String(Math.floor(analysis.duration%60)).padStart(2,'0')}</span></div>
    {analysis.tempoCandidates?.length>0&&<p className="mv-tempo-candidates">Suggested tempo: {analysis.tempoCandidates.map(c=>`${c.bpm} BPM`).join(' · ')}</p>}
    {analysis.warnings?.map((warning,i)=><p className="mv-analysis-note" key={i}>{warning}</p>)}
    <form onSubmit={apply} className="mv-manual-tempo" style={{display:'flex',gap:12,alignItems:'end',flexWrap:'wrap'}}>
      <label htmlFor={`${prefix}-bpm`}>Manual tempo (BPM)<input id={`${prefix}-bpm`} type="number" min="40" max="240" step="0.01" value={bpm} onChange={e=>setBpm(e.target.value)} required disabled={disabled||pending}/></label>
      <label htmlFor={`${prefix}-offset`}>First beat (seconds)<input id={`${prefix}-offset`} type="number" min="0" max={Math.max(0,analysis.duration-1/analysis.sampleRate)} step="any" value={offset} onChange={e=>setOffset(e.target.value)} required disabled={disabled||pending}/></label>
      <button type="submit" disabled={disabled||pending||typeof onApplyAnchors!=='function'}>{pending?'Applying…':'Apply manual beat grid'}</button>
    </form>
    <p className="mv-analysis-note">A manual grid replaces the suggested beats across the song. For changing tempo, keep the measured map or use precise range anchors.</p>
    {error&&<p role="alert">{error}</p>}
  </section>;
}
