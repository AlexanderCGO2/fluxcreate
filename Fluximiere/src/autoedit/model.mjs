import {createMusicVideoPlan,validateMusicVideoPlan} from '../music-video/model.mjs';
import {buildBeatStoryboard} from '../music-video/timing.mjs';
import {createProject,makeClip,validateProject} from '../model.mjs';

export const AUTOEDIT_LIMITS=Object.freeze({videos:12,frames:6,fileBytes:32*1024*1024,totalBytes:128*1024*1024,cuts:120,page:16});
const fail=message=>{throw Error(message);};
const ident=v=>typeof v==='string'&&/^[a-zA-Z0-9][\w.:-]{0,127}$/.test(v);
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const text=(v,max=1000)=>typeof v==='string'&&v.length<=max;
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function createAutoeditPlan(){return {format:'fluximiere-autoedit',version:1,id:crypto.randomUUID(),revision:0,music:createMusicVideoPlan(),footage:[],cuts:[],feel:'music',originalAudio:false,job:null};}
export function validateAutoeditPlan(raw){
 if(!raw||raw.format!=='fluximiere-autoedit'||raw.version!==1||!ident(raw.id)||!Number.isSafeInteger(raw.revision)||raw.revision<0)fail('Invalid Autoedit plan or revision.');
 const music=validateMusicVideoPlan(raw.music);
 if(!['music','energetic','cinematic'].includes(raw.feel)||typeof raw.originalAudio!=='boolean'||!Array.isArray(raw.footage)||raw.footage.length>AUTOEDIT_LIMITS.videos)fail('Invalid Autoedit options or too many videos.');
 const ids=new Set();let bytes=music.song?.bytes??0;bytes+=music.references.reduce((sum,r)=>sum+r.bytes,0);
 const footage=raw.footage.map(v=>{
  if(!v||!ident(v.assetId)||ids.has(v.assetId)||v.assetId===music.song?.assetId)fail('Invalid or duplicate footage identity.');ids.add(v.assetId);
  if(!hash(v.hash)||!['video/mp4','video/webm','video/quicktime','video/ogg'].includes(v.mime)||!Number.isSafeInteger(v.bytes)||v.bytes<1||v.bytes>AUTOEDIT_LIMITS.fileBytes||!text(v.name,240)||!finite(v.duration,.1,600)||!finite(v.width,1,8192)||!finite(v.height,1,8192))fail('Invalid footage metadata; use videos up to 10 minutes and 32 MiB each.');
  if(typeof v.enabled!=='boolean'||!finite(v.inPoint,0,v.duration)||!finite(v.outPoint,v.inPoint+.01,v.duration)||!Array.isArray(v.frames)||v.frames.length>AUTOEDIT_LIMITS.frames)fail('Invalid preferred footage range or samples.');
  let previous=-1;const frames=v.frames.map(f=>{if(!finite(f.time,0,v.duration)||f.time<=previous||!text(f.dataUrl,48*1024)||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(f.dataUrl)||!finite(f.brightness,0,1)||!finite(f.motion,0,1))fail('Invalid sampled footage frame.');previous=f.time;return {time:f.time,dataUrl:f.dataUrl,brightness:f.brightness,motion:f.motion};});
  if(v.hasAudio!==undefined&&typeof v.hasAudio!=='boolean')fail('Invalid source audio metadata.');
  bytes+=v.bytes;return {assetId:v.assetId,hash:v.hash,mime:v.mime,bytes:v.bytes,name:v.name,duration:v.duration,width:v.width,height:v.height,hasAudio:v.hasAudio??false,enabled:v.enabled,inPoint:v.inPoint,outPoint:v.outPoint,frames};
 });
 if(bytes>AUTOEDIT_LIMITS.totalBytes)fail('Autoedit supports up to 128 MiB of original media in this browser.');
 if(!Array.isArray(raw.cuts)||raw.cuts.length>AUTOEDIT_LIMITS.cuts)fail('Use up to 120 cuts.');
 const cuts=raw.cuts.map(c=>({...c}));validateCuts(cuts,footage,music);
 let job=null;if(raw.job!=null){const j=raw.job;if(!ident(j.id)||j.baseRevision!==raw.revision||!['running','paused','uncertain','ready'].includes(j.status)||!Number.isSafeInteger(j.nextIndex)||j.nextIndex<0||j.nextIndex>cuts.filter(c=>!c.locked).length||!Array.isArray(j.patches)||j.patches.length!==j.nextIndex||!text(j.model,128))fail('Invalid saved Autoedit job.');validatePatches({id:raw.id,revision:raw.revision,footage,cuts,music},j.patches);const expected=cuts.filter(c=>!c.locked).slice(0,j.nextIndex).map(c=>c.id);if(j.patches.some((p,i)=>p.id!==expected[i]))fail('Saved editor checkpoint is out of order.');job={id:j.id,baseRevision:j.baseRevision,status:j.status,nextIndex:j.nextIndex,patches:j.patches.map(p=>({id:p.id,assetId:p.assetId,sourceIn:p.sourceIn,reason:p.reason})),model:j.model};}
 return {format:raw.format,version:1,id:raw.id,revision:raw.revision,music,footage,cuts,feel:raw.feel,originalAudio:raw.originalAudio,job};
}
function validateCuts(cuts,footage,music){
 const seen=new Set(),anchors=new Set((music.analysis?.beats??[]).map(b=>Math.round(b.sample/music.analysis.sampleRate*24)));let cursor=0;
 for(const c of cuts){
  if(!ident(c.id)||seen.has(c.id)||!Number.isSafeInteger(c.startFrame)||!Number.isSafeInteger(c.endFrame)||c.startFrame!==cursor||c.endFrame<=c.startFrame)fail('Invalid cut identity or gap in timing coverage.');seen.add(c.id);cursor=c.endFrame;
  if(c.startFrame>0&&!anchors.has(c.startFrame))fail('Cut timing no longer matches the music map. Rebuild the draft.');
  const source=footage.find(v=>v.assetId===c.assetId);if(!source||!source.enabled||!finite(c.sourceIn,source.inPoint,source.outPoint)||c.sourceIn+(c.endFrame-c.startFrame)/24>source.outPoint+1e-7)fail('A cut is outside the available footage range. Choose a longer source or adjust its preferred range.');
  if(typeof c.locked!=='boolean'||!text(c.reason,1000))fail('Invalid cut lock or editorial reason.');
 }
 if(cuts.length&&(!music.analysis||cursor!==Math.ceil(music.analysis.duration*24)))fail('Cut coverage must reach the end of the soundtrack.');
}
function validatePatches(plan,patches){
 if(!Array.isArray(patches)||patches.length>120)fail('Invalid editor proposal.');const seen=new Set();
 for(const p of patches){if(!p||Object.keys(p).some(k=>!['id','assetId','sourceIn','reason'].includes(k))||seen.has(p.id)||!plan.cuts.some(c=>c.id===p.id))fail('Editor returned an unknown or duplicate cut.');seen.add(p.id);const original=plan.cuts.find(c=>c.id===p.id);if(original.locked)fail('The editor cannot change locked cuts.');if(!text(p.reason,1000)||!p.reason.trim())fail('Each edit needs an editorial reason.');}
 validateCuts(plan.cuts.map(c=>({...c,...patches.find(p=>p.id===c.id)})),plan.footage,plan.music);
}
export function buildAutoedit(raw){
 const plan=validateAutoeditPlan(raw);if(!plan.music.analysis)fail('Analyze the soundtrack first.');
 const boundaries=plan.cuts.some(c=>c.locked)?plan.cuts:buildBeatStoryboard({...plan.music,shots:[],locks:[]},plan.music.analysis,plan.feel).shots;
 const enabled=plan.footage.filter(v=>v.enabled);if(!enabled.length)fail('Include at least one video.');
 const used=new Map();let previous=null;
 const cuts=boundaries.map((b,i)=>{if(b.locked){previous=b.assetId;return b;}const duration=(b.endFrame-b.startFrame)/24;const choices=enabled.filter(v=>v.outPoint-v.inPoint>=duration-1e-7);if(!choices.length)fail(`No footage range is long enough for cut ${i+1} (${duration.toFixed(2)}s). Add a longer video or extend a preferred range.`);
  choices.sort((a,b)=>(used.get(a.assetId)??0)-(used.get(b.assetId)??0)||(a.assetId===previous?1:0)-(b.assetId===previous?1:0));const v=choices[0],frames=v.frames.filter(f=>f.time>=v.inPoint&&f.time+duration<=v.outPoint),ranked=[...frames].sort((a,b)=>(b.brightness>.06&&b.brightness<.94?1:0)-(a.brightness>.06&&a.brightness<.94?1:0)||b.motion-a.motion);const count=used.get(v.assetId)??0;const sourceIn=ranked.length?ranked[count%ranked.length].time:v.inPoint+Math.min(count*duration,Math.max(0,v.outPoint-v.inPoint-duration));used.set(v.assetId,count+1);previous=v.assetId;
  return {id:b.id??`cut-${i}`,startFrame:b.startFrame,endFrame:b.endFrame,assetId:v.assetId,sourceIn,locked:false,reason:'Automatic draft: measured music timing, varied source selection and sampled brightness/motion. Review the footage before export.'};
 });return validateAutoeditPlan({...plan,revision:plan.revision+1,cuts,job:null});
}
export function applyEditProposal(raw,proposal){const p=validateAutoeditPlan(raw);if(proposal?.planId!==p.id||proposal.revision!==p.revision)fail('The edit proposal is for another plan revision.');validatePatches(p,proposal.cuts);return validateAutoeditPlan({...p,revision:p.revision+1,job:null,cuts:p.cuts.map(c=>({...c,...proposal.cuts.find(v=>v.id===c.id)}))});}
export function updateCut(raw,id,patch){const p=validateAutoeditPlan(raw);const cut=p.cuts.find(c=>c.id===id);if(!cut)fail('Unknown cut.');if(Object.keys(patch).some(k=>!['assetId','sourceIn','locked','reason'].includes(k)))fail('Unsupported cut edit.');if(cut.locked&&Object.keys(patch).some(k=>k!=='locked'))fail('Unlock this cut before changing it.');return validateAutoeditPlan({...p,revision:p.revision+1,job:null,cuts:p.cuts.map(c=>c.id===id?{...c,...patch}:c)});}
export function assembleAutoedit(raw,media){
 const p=validateAutoeditPlan(raw);if(!p.cuts.length)fail('Create an edit first.');const song=media.find(a=>a.id===p.music.song?.assetId);if(!song||song.type!=='audio'||!song.src||Math.abs(song.duration-p.music.analysis.duration)>.001)fail('Load the original soundtrack media.');
 const assets=[song],clips=p.cuts.map((c,i)=>{const v=p.footage.find(a=>a.assetId===c.assetId),asset=media.find(a=>a.id===c.assetId);if(!asset||asset.type!=='video'||!asset.src||Math.abs(asset.duration-v.duration)>.001)fail('A source video is missing or has changed.');if(!assets.some(a=>a.id===asset.id))assets.push(asset);const scale=Math.max(p.music.width/v.width,p.music.height/v.height);return makeClip('video',{id:`auto-${p.id}-${c.id}`,name:`${String(i+1).padStart(2,'0')} · ${v.name}`,assetId:c.assetId,start:c.startFrame/24,duration:(c.endFrame-c.startFrame)/24,sourceIn:c.sourceIn,playbackRate:1,muted:true,locked:c.locked,x:p.music.width/2,y:p.music.height/2,width:v.width*scale,height:v.height*scale});});
 if(p.originalAudio)for(const c of [...clips].filter(c=>p.footage.find(v=>v.assetId===c.assetId)?.hasAudio))clips.push(makeClip('audio',{id:c.id+'-audio',name:c.name+' · source audio',assetId:c.assetId,track:'A2',start:c.start,duration:c.duration,sourceIn:c.sourceIn,volume:.35,muted:false,locked:c.locked}));
 clips.push(makeClip('audio',{id:`auto-song-${p.id}`,name:song.name,assetId:song.id,track:'A1',duration:song.duration,muted:false}));
 return validateProject({...createProject(),id:`auto-${p.id}`,name:p.music.name+' · Autoedit',width:p.music.width,height:p.music.height,fps:24,duration:p.cuts.at(-1).endFrame/24,assets,clips,brief:p.music.concept.slice(0,6000)});
}
