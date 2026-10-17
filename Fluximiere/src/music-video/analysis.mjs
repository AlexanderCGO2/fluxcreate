const MiB = 1024 * 1024;
export const MUSIC_ANALYSIS_LIMITS = Object.freeze({ duration: 180, workingBytes: 16 * MiB, beats: 3600, anchors: 120 });
const HASH = /^[a-f0-9]{64}$/i;
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const clamp = n => Math.max(0, Math.min(1, n));
function abort(signal) { if (signal?.aborted) { const e = new Error('Music analysis cancelled.'); e.name = 'AbortError'; throw e; } }
function median(values) { if (!values.length) return 0; const sorted = [...values].sort((a,b)=>a-b); return sorted[Math.floor(sorted.length / 2)]; }

/** Analyze a mono proxy without retaining a spectrogram. Beat positions are measured
 * onset candidates, never an invented fixed grid. Canonical PCM remains the authority. */
export function analyzeMusic(input, { signal } = {}) {
  abort(signal);
  const { mono, sampleRate, sourceHash, canonicalSampleRate = sampleRate, canonicalSampleCount = mono?.length } = input ?? {};
  if (!(mono instanceof Float32Array) || mono.length === 0) throw new Error('Music analysis needs a mono Float32 sample proxy.');
  if (!integer(sampleRate, 8000, 96000) || !integer(canonicalSampleRate, 8000, 192000)) throw new Error('Invalid music sample rate.');
  if (!HASH.test(sourceHash ?? '')) throw new Error('Music source hash must be SHA256.');
  if (!integer(canonicalSampleCount, 1, canonicalSampleRate * MUSIC_ANALYSIS_LIMITS.duration)) throw new Error('Canonical duration must be between 1 and 180 seconds.');
  const duration = canonicalSampleCount / canonicalSampleRate;
  if (duration < 1 || mono.length / sampleRate < 1 || mono.length / sampleRate > 180) throw new Error('Music duration must be between 1 and 180 seconds.');
  if (Math.abs(mono.length / sampleRate - duration) > 1 / sampleRate + 1 / canonicalSampleRate) throw new Error('Proxy duration does not match canonical sample mapping.');
  const hop = Math.max(1, Math.round(sampleRate * .005));
  const frames = Math.ceil(mono.length / hop);
  // Reserve input, energy/onset buffers and conservative space for bounded result objects.
  const workingBytes = mono.byteLength + frames * 8 + MUSIC_ANALYSIS_LIMITS.beats * 512 + 64 * 1024 + 180 * 256;
  if (workingBytes > MUSIC_ANALYSIS_LIMITS.workingBytes) throw new Error('Analysis exceeds the 16 MiB budget. Use a lower-rate mono proxy.');
  const energy = new Float32Array(frames), onset = new Float32Array(frames);
  let maxEnergy = 0, maxOnset = 0, sumEnergy = 0;
  for (let f = 0; f < frames; f++) {
    if (!(f % 128)) abort(signal);
    let sum = 0;
    const end = Math.min(mono.length, (f + 1) * hop);
    for (let i = f * hop; i < end; i++) { const value = mono[i]; if (!Number.isFinite(value)) throw new Error('Music samples must be finite.'); sum += value * value; }
    const e = sum / (end - f * hop);
    if (!Number.isFinite(e) || e > 1e12) throw new Error('Music sample amplitude is outside the supported range.');
    energy[f] = e; sumEnergy += e; maxEnergy = Math.max(maxEnergy, e);
    const rise = Math.max(0, e - (f ? energy[f-1] : 0));
    onset[f] = rise; maxOnset = Math.max(maxOnset, rise);
  }
  const base = { sourceHash:sourceHash.toLowerCase(), revision:0, sampleRate:canonicalSampleRate, sampleCount:canonicalSampleCount, duration, proxySampleRate:sampleRate, tempoCandidates:[], beats:[], changePoints:[], anchors:[], confidence:0, status:'uncertain', warnings:[], workingBytes };
  if (maxEnergy < 1e-10 || sumEnergy / frames < 1e-12) return { ...base, status:'silent', warnings:['No usable musical onsets were found. Add manual anchors.'] };
  const events = [];
  const minDistance = Math.max(1, Math.round(.09 * sampleRate / hop));
  const neighborhood = Math.max(1, Math.round(.75 * sampleRate / hop));
  for (let f = 0; f < frames; f++) {
    if (!(f % 256)) abort(signal);
    const strength = onset[f];
    if (strength <= Math.max(1e-12,maxOnset*1e-5) || (f && strength < onset[f-1]) || (f+1 < frames && strength <= onset[f+1])) continue;
    // Judge local transients against their passage, not the loudest hit in the song.
    let scale=0;for(let j=Math.max(0,f-neighborhood);j<Math.min(frames,f+neighborhood+1);j++)scale=Math.max(scale,onset[j]);
    if(strength<scale*.045)continue;
    let local = 0, count = 0;
    for (let j = Math.max(0,f-20); j < f; j++) { local += onset[j]; count++; }
    if (count && strength < local / count * 2.2) continue;
    const previous = events.at(-1);
    if (previous && f - previous.frame < minDistance) { if (strength > previous.strength) { previous.frame = f; previous.strength = strength; previous.scale=scale; } continue; }
    if (events.length === MUSIC_ANALYSIS_LIMITS.beats) throw new Error('Too many onset candidates; use manual musical anchors.');
    events.push({ frame:f, strength, scale });
  }
  const intervals = [];
  for (let i=1;i<events.length;i++) { const seconds=(events[i].frame-events[i-1].frame)*hop/sampleRate; if(seconds>=.25&&seconds<=1.5) intervals.push(seconds); }
  const bins = new Map();
  for(const interval of intervals) { const bpm=60/interval; const bin=Math.round(bpm); if(bin>=40&&bin<=240)bins.set(bin,(bins.get(bin)??0)+1); }
  const ranked = [...bins].sort((a,b)=>b[1]-a[1]);
  const candidates=[];
  function candidate(bpm, weight) { if(bpm<40||bpm>240||candidates.some(c=>Math.abs(c.bpm-bpm)<3))return; candidates.push({bpm:Math.round(bpm*100)/100,confidence:clamp(weight)}); }
  for(const [bpm,count] of ranked.slice(0,3))candidate(bpm,.8*count/Math.max(1,intervals.length));
  if(candidates.length) { const top=candidates[0]; candidate(top.bpm/2,top.confidence*.6); candidate(top.bpm*2,top.confidence*.6); }
  candidates.sort((a,b)=>b.confidence-a.confidence);
  base.tempoCandidates=candidates.slice(0,5);
  const mid=median(intervals), deviation=median(intervals.map(v=>Math.abs(v-mid)));
  const regularity=mid?Math.max(0,1-deviation/mid*4):0;
  base.confidence=events.length>=4&&intervals.length>=3?Math.min(.8,(candidates[0]?.confidence??0)*regularity):0;
  base.status=base.confidence>=.55?'measured':'uncertain';
  base.warnings.push('Tempo and half/double-time candidates are suggestions. Review the beat map before directing.');
  if(base.status==='uncertain')base.warnings.push('Rhythm confidence is low or tempo varies. Add manual anchors where needed.');
  // Local onset strength and confidence in a single global tempo are different.
  // Syncopation or tempo changes must not make every clearly measured hit unusable.
  base.beats=events.map((e,i)=>({id:`beat-${i}`,sample:Math.min(canonicalSampleCount-1,Math.round(e.frame*hop/sampleRate*canonicalSampleRate)),confidence:.8*clamp(e.strength/e.scale),manual:false}));
  for(let i=8;i<events.length-4;i+=4) {
    const before=(events[i].frame-events[i-4].frame), after=(events[i+4].frame-events[i].frame);
    if(before&&Math.abs(after/before-1)>.18)base.changePoints.push({id:`change-${i}`,sample:base.beats[i].sample,confidence:.4,suggested:true});
  }
  abort(signal);
  // Bounded one-second summaries keep musical dynamics after PCM is released.
  const dynamics=[];
  for(let second=0;second<duration;second++){
    const from=Math.floor(second*sampleRate/hop),to=Math.min(frames,Math.ceil((second+1)*sampleRate/hop));let sum=0;
    for(let f=from;f<to;f++)sum+=energy[f];
    dynamics.push({startSample:Math.round(second*canonicalSampleRate),endSample:Math.min(canonicalSampleCount,Math.round((second+1)*canonicalSampleRate)),energy:Math.sqrt(sum/Math.max(1,to-from)),activity:events.filter(e=>e.frame*hop/sampleRate>=second&&e.frame*hop/sampleRate<second+1).length/Math.min(1,duration-second)});
  }
  const percentile=key=>{const sorted=dynamics.map(w=>w[key]).sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*.9)]||sorted.at(-1)||1;},energyScale=percentile('energy'),activityScale=percentile('activity');
  base.dynamics=dynamics.map(w=>({...w,energy:clamp(w.energy/energyScale),activity:clamp(w.activity/activityScale)}));
  for(let i=1;i<base.dynamics.length;i++){const before=base.dynamics[i-1],now=base.dynamics[i],change=Math.abs(now.energy-before.energy);if(change>=.3&&!base.changePoints.some(c=>Math.abs(c.sample-now.startSample)<canonicalSampleRate/2))base.changePoints.push({id:`energy-change-${i}`,sample:now.startSample,confidence:Math.min(.8,change),suggested:true});}
  base.changePoints.sort((a,b)=>a.sample-b.sample);
  return base;
}

/** A new measurement refreshes detection without discarding the user's beat corrections. */
export function refreshMusicAnalysis(previous,measured){
 if(!previous)return measured;
 if(previous.sourceHash!==measured.sourceHash||previous.sampleRate!==measured.sampleRate||previous.sampleCount!==measured.sampleCount)throw Error('Reanalysis source does not match the saved music.');
 if(!Number.isSafeInteger(previous.revision)||previous.revision<0||previous.revision>=Number.MAX_SAFE_INTEGER)throw Error('Music analysis revision is invalid.');
 const next={...measured,revision:previous.revision};
 if(!previous.anchors?.length)return {...next,revision:previous.revision+1};
 const corrected=applyMusicAnchors(next,previous.anchors,previous.revision);
 // Editing a subrange can split anchor records without renaming retained beats.
 // Keep those identities so an unchanged manual cut still resolves in saved shots.
 const manualIds=new Map(previous.beats.filter(b=>b.manual).map(b=>[b.sample,b.id]));
 return {...corrected,beats:corrected.beats.map(b=>b.manual&&manualIds.has(b.sample)?{...b,id:manualIds.get(b.sample)}:b)};
}

/** Atomic, revision-checked correction of selected sample ranges only. */
export function applyMusicAnchors(analysis, anchors, expectedRevision) {
  if(!analysis||!integer(analysis.revision,0,Number.MAX_SAFE_INTEGER)||expectedRevision!==analysis.revision)throw new Error('Music analysis revision conflict.');
  if(!HASH.test(analysis.sourceHash??'')||!integer(analysis.sampleRate,8000,192000)||!integer(analysis.sampleCount,analysis.sampleRate,analysis.sampleRate*180)||!Array.isArray(analysis.beats)||analysis.beats.length>MUSIC_ANALYSIS_LIMITS.beats)throw new Error('Invalid music analysis.');
  if(analysis.beats.some((b,i)=>!b||typeof b.id!=='string'||!integer(b.sample,0,analysis.sampleCount-1)||!Number.isFinite(b.confidence)||b.confidence<0||b.confidence>1||(i>0&&b.sample<=analysis.beats[i-1].sample)))throw new Error('Invalid analysis beat samples.');
  if(!Array.isArray(analysis.anchors)||analysis.anchors.length>MUSIC_ANALYSIS_LIMITS.anchors||analysis.anchors.some(a=>!a||typeof a.id!=='string'||!integer(a.startSample,0,analysis.sampleCount-1)||!integer(a.endSample,a.startSample+1,analysis.sampleCount)||!Array.isArray(a.beats)||a.beats.length>MUSIC_ANALYSIS_LIMITS.beats||a.beats.some((s,i)=>!integer(s,a.startSample,a.endSample-1)||(i>0&&s<=a.beats[i-1]))))throw new Error('Invalid analysis manual anchor ranges.');
  if(!Array.isArray(anchors)||anchors.length>MUSIC_ANALYSIS_LIMITS.anchors)throw new Error('Too many manual anchor ranges.');
  const next=anchors.map((a,i)=>{
    if(!a||!integer(a.startSample,0,analysis.sampleCount-1)||!integer(a.endSample,a.startSample+1,analysis.sampleCount)||!Array.isArray(a.beats)||a.beats.length>MUSIC_ANALYSIS_LIMITS.beats)throw new Error('Invalid manual anchor range.');
    const id=a.id??`manual-r${analysis.revision+1}-${i}`;
    if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(id))throw new Error('Invalid manual anchor ID.');
    const beats=[...a.beats];
    if(beats.some((sample,index)=>!integer(sample,a.startSample,a.endSample-1)||(index>0&&sample<=beats[index-1])))throw new Error('Manual anchor beats must be increasing within the range.');
    return{id,startSample:a.startSample,endSample:a.endSample,beats,approved:true};
  }).sort((a,b)=>a.startSample-b.startSample);
  if(next.some((a,i)=>i>0&&a.startSample<next[i-1].endSample))throw new Error('Manual anchor ranges must not overlap.');
  if(new Set(next.map(a=>a.id)).size!==next.length)throw new Error('Duplicate manual anchor IDs.');
  const retained=analysis.beats.filter(b=>!next.some(a=>b.sample>=a.startSample&&b.sample<a.endSample));
  const beats=[...retained,...next.flatMap(a=>a.beats.map(sample=>({id:`${a.id}:${sample}`,sample,confidence:1,manual:true})))].sort((a,b)=>a.sample-b.sample);
  if(beats.length>MUSIC_ANALYSIS_LIMITS.beats)throw new Error('Too many manual beats.');
  const previous=Array.isArray(analysis.anchors)?analysis.anchors:[];
  let remaining=previous.map(a=>({...a,beats:[...a.beats]}));
  for(const range of next)remaining=remaining.flatMap(a=>{
    if(a.endSample<=range.startSample||a.startSample>=range.endSample)return[a];
    const parts=[];
    if(a.startSample<range.startSample)parts.push({...a,id:`${a.id.slice(0,48)}-l${analysis.revision+1}`,endSample:range.startSample,beats:a.beats.filter(s=>s<range.startSample)});
    if(a.endSample>range.endSample)parts.push({...a,id:`${a.id.slice(0,48)}-r${analysis.revision+1}`,startSample:range.endSample,beats:a.beats.filter(s=>s>=range.endSample)});
    return parts;
  });
  const combined=[...remaining,...next].sort((a,b)=>a.startSample-b.startSample);
  if(combined.length>MUSIC_ANALYSIS_LIMITS.anchors)throw new Error('Too many manual anchor ranges.');
  if(new Set(combined.map(a=>a.id)).size!==combined.length)throw new Error('Duplicate retained manual anchor identities.');
  return{...analysis,revision:analysis.revision+1,beats,anchors:combined};
}
