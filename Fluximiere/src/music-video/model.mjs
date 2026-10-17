import {validateVisualPlan} from '../../../FluxCreate/shared/music-visual-plan.mjs';
/** Metadata-only recipe contracts. Media lives in the workspace asset store. */
export const MUSIC_VIDEO_LIMITS=Object.freeze({shots:120,generationUnits:120,references:64,takes:360,duration:180,recipeBytes:1048576});
const HASH=/^[a-f0-9]{64}$/i, ID=/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,127}$/;
const SHOT_FIELDS=['id','revision','sceneId','sectionId','startFrame','endFrame','anchorIds','snapErrorFrames','generationUnitId','sourceInFrame','narrative','camera','look','prompt','referenceIds','performance','visualPlan','modelProfile','selectedTakeId'];
const EDIT_FIELDS=SHOT_FIELDS.filter(k=>!['id','revision','selectedTakeId'].includes(k));
const fail=(message)=>{throw new Error(`Music video: ${message}`);};
const obj=(v,label)=>{if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail(`${label} must be an object`);return v;};
const keys=(v,allowed,label)=>{obj(v,label);for(const k of Object.keys(v))if(!allowed.includes(k))fail(`unknown ${label} field ${k}`);};
const str=(v,label,max=12000)=>{if(typeof v!=='string'||v.length>max)fail(`${label} must be text up to ${max} characters`);return v;};
const id=(v,label)=>{if(typeof v!=='string'||!ID.test(v))fail(`invalid ${label}`);return v;};
const num=(v,label,min=0,max=Number.MAX_SAFE_INTEGER,integer=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isSafeInteger(v)))fail(`${label} must be ${integer?'an integer':'a number'} in ${min}–${max}`);return v;};
const rev=(v=0)=>num(v,'revision',0,Number.MAX_SAFE_INTEGER,true);
const list=(v,label,max)=>{if(!Array.isArray(v)||v.length>max)fail(`${label} must contain at most ${max} entries`);return v;};
const unique=(a,label,get=x=>x.id)=>{const seen=new Set();for(const x of a){const k=get(x);if(seen.has(k))fail(`duplicate ${label} ${k}`);seen.add(k);}return seen;};
const ids=(v,label,max=120)=>{const a=list(v??[],label,max).map(x=>id(x,label));unique(a,label,x=>x);return a;};
const hash=(v,label)=>{if(typeof v!=='string'||!HASH.test(v))fail(`invalid ${label} SHA256`);return v.toLowerCase();};
const interval=(v,label)=>{const startFrame=num(v.startFrame,`${label} startFrame`,0,4320,true),endFrame=num(v.endFrame,`${label} endFrame`,0,4320,true);if(endFrame<=startFrame)fail(`${label} interval is reversed or empty`);return {startFrame,endFrame};};
const nullableId=(v,label)=>v==null?null:id(v,label);

/** Reject unsafe object keys and embedded credentials/media even in extension metadata. */
function safeTree(value,depth=0,budget={nodes:0}){
  if(depth>18||++budget.nodes>50000)fail('metadata is too complex');
  if(value===null||typeof value==='boolean')return;
  if(typeof value==='number'){if(!Number.isFinite(value))fail('metadata contains a nonfinite number');return;}
  if(typeof value==='string'){if(value.length>12000||/^(data:|blob:)/i.test(value))fail('embedded media is forbidden');return;}
  if(Array.isArray(value)){if(value.length>12000)fail('metadata array is too large');for(const x of value)safeTree(x,depth+1,budget);return;}
  obj(value,'metadata');for(const [k,v] of Object.entries(value)){if(/^(?:__proto__|prototype|constructor|api[-_]?key|access[-_]?token|authorization|password|secret|credential|credentials|connectionKey|base64|src|url)$/i.test(k))fail(`forbidden credential or media field ${k}`);safeTree(v,depth+1,budget);}
}
function asset(v,song=false){
  keys(v,['assetId','hash','mime','bytes','role','name',...(song?['duration','sampleRate','sampleCount','sourceAssetId','sourceDuration','fadeOutSeconds']:[])],'asset');
  const a={assetId:id(v.assetId,'asset ID'),hash:hash(v.hash,'asset hash'),mime:str(v.mime,'MIME',128),bytes:num(v.bytes,'asset bytes',1,1073741824,true),role:str(v.role,'role',20)};
  if(!['song','character','scene','frame','video','audio'].includes(a.role))fail('invalid asset role');
  if(!/^(audio|image|video)\/[a-z0-9.+-]+$/i.test(a.mime))fail('invalid asset MIME');
  if(song&&(a.role!=='song'||!a.mime.startsWith('audio/')))fail('song must be audio');
  if(!song&&a.role==='song')fail('song belongs in the song field');
  if(['character','scene','frame'].includes(a.role)&&!a.mime.startsWith('image/'))fail('character, scene and frame references must be images');
  if(a.role==='video'&&!a.mime.startsWith('video/'))fail('video asset must use a video MIME');
  if(a.role==='audio'&&!a.mime.startsWith('audio/'))fail('audio asset must use an audio MIME');
  if(v.name!==undefined)a.name=str(v.name,'asset name',240);
  if(song){a.duration=num(v.duration,'song duration',1,180);if(v.sampleRate!==undefined)a.sampleRate=num(v.sampleRate,'sampleRate',8000,192000,true);if(v.sampleCount!==undefined)a.sampleCount=num(v.sampleCount,'sampleCount',1,34560000,true);}
  if(song&&v.sourceAssetId!==undefined){a.sourceAssetId=id(v.sourceAssetId,'original song ID');a.sourceDuration=num(v.sourceDuration,'original duration',180,86400);a.fadeOutSeconds=num(v.fadeOutSeconds,'fade duration',5,5);if(a.sourceDuration<=180||a.duration!==180)fail('invalid shortened song duration');}else if(song&&(v.sourceDuration!==undefined||v.fadeOutSeconds!==undefined))fail('shortened song needs its original source');
  return a;
}
function analysis(v,song){
  if(v==null)return null;keys(v,['sourceHash','revision','sampleRate','sampleCount','duration','proxySampleRate','tempoCandidates','beats','changePoints','anchors','confidence','status','warnings','workingBytes'],'analysis');const a=structuredClone(v);hash(a.sourceHash,'analysis source');rev(a.revision);num(a.sampleRate,'analysis sample rate',8000,192000,true);num(a.sampleCount,'analysis sample count',1,34560000,true);num(a.duration,'analysis duration',1,180);
  if(!song||a.sourceHash.toLowerCase()!==song.hash)fail('analysis source does not match song');
  if(Math.abs(a.duration-a.sampleCount/a.sampleRate)>1/a.sampleRate||Math.abs(a.duration-song.duration)>1/a.sampleRate||(song.sampleRate!==undefined&&a.sampleRate!==song.sampleRate)||(song.sampleCount!==undefined&&a.sampleCount!==song.sampleCount))fail('analysis sample duration does not match the original song');
  a.confidence=num(a.confidence??0,'analysis confidence',0,1);a.status=a.status??'uncertain';if(!['measured','uncertain','silent'].includes(a.status))fail('invalid analysis status');
  if(a.proxySampleRate!==undefined)num(a.proxySampleRate,'analysis proxy rate',8000,96000,true);if(a.workingBytes!==undefined)num(a.workingBytes,'analysis memory',0,16777216,true);
  a.warnings=list(a.warnings??[],'analysis warnings',32).map(w=>str(w,'analysis warning',2000));
  a.tempoCandidates=list(a.tempoCandidates??[],'tempo candidates',5).map(c=>{keys(c,['bpm','confidence'],'tempo candidate');return {bpm:num(c.bpm,'tempo',40,240),confidence:num(c.confidence,'tempo confidence',0,1)};});
  for(const key of ['beats','changePoints']){a[key]=list(a[key]??[],key,3600).map(b=>{keys(b,['id','sample','confidence',key==='beats'?'manual':'suggested'],key);id(b.id,'beat ID');num(b.sample,'beat sample',0,a.sampleCount-1,true);num(b.confidence,'beat confidence',0,1);const flag=key==='beats'?'manual':'suggested';if(b[flag]!==undefined&&typeof b[flag]!=='boolean')fail('invalid beat flag');return b;});unique(a[key],key);if(a[key].some((b,i)=>i>0&&b.sample<=a[key][i-1].sample))fail('analysis samples must be increasing');}
  a.anchors=list(a.anchors??[],'manual anchors',120).map(r=>{keys(r,['id','startSample','endSample','beats','approved'],'anchor');id(r.id,'anchor ID');num(r.startSample,'anchor start',0,a.sampleCount-1,true);num(r.endSample,'anchor end',r.startSample+1,a.sampleCount,true);list(r.beats,'anchor beats',3600).forEach((s,i)=>{num(s,'anchor sample',r.startSample,r.endSample-1,true);if(i>0&&s<=r.beats[i-1])fail('anchor beats must increase');});if(r.approved!==undefined&&typeof r.approved!=='boolean')fail('invalid anchor approval');return r;});unique(a.anchors,'anchor');if(a.anchors.some((r,i)=>i>0&&r.startSample<a.anchors[i-1].endSample))fail('manual anchor ranges overlap');
  return a;
}
function profile(v){if(v==null)return null;keys(v,['model','profileVersion'],'director profile');const model=str(v.model,'director model',160);if(!/^google\/gemini-[a-z0-9.-]+$/.test(model))fail('director must use a pinned Gemini model');return {model,profileVersion:num(v.profileVersion??1,'profile version',1,100000,true)};}
export function createMusicVideoPlan(overrides={}){
  return validateMusicVideoPlan({format:'fluxmusicvideo',version:1,id:`music-${globalThis.crypto.randomUUID()}`,revision:0,name:'Untitled music video',concept:'',fps:24,width:1920,height:1080,song:null,references:[],analysis:null,director:{model:'google/gemini-4-argon',profileVersion:1},pacing:{minCutsPer10s:2,maxCutsPer10s:5},sections:[],scenes:[],shots:[],generationUnits:[],takes:[],locks:[],...overrides});
}
export function validateMusicVideoPlan(raw){
  safeTree(raw);keys(raw,['format','version','id','revision','name','concept','fps','width','height','song','references','analysis','director','pacing','sections','scenes','shots','generationUnits','takes','locks'],'plan');
  if(raw.format!=='fluxmusicvideo'||raw.version!==1)fail('unsupported recipe format/version');if(raw.fps!==24)fail('fps must be 24');
  const width=num(raw.width,'width',1,8192,true),height=num(raw.height,'height',1,8192,true);if(width*9!==height*16&&width*16!==height*9)fail('dimensions must be 16:9 or 9:16');
  const p={format:'fluxmusicvideo',version:1,id:id(raw.id,'plan ID'),revision:rev(raw.revision),name:str(raw.name??'Untitled music video','name',240),concept:str(raw.concept??'','concept'),fps:24,width,height,song:raw.song==null?null:asset(raw.song,true),references:list(raw.references??[],'references',64).map(v=>asset(v)),analysis:null,director:profile(raw.director),pacing:null,sections:[],scenes:[],shots:[],generationUnits:[],takes:[],locks:[]};
  p.analysis=analysis(raw.analysis,p.song);if(!p.director)fail('director is required');
  keys(raw.pacing,['minCutsPer10s','maxCutsPer10s'],'pacing');p.pacing={minCutsPer10s:num(raw.pacing.minCutsPer10s,'minimum cuts',0,20,true),maxCutsPer10s:num(raw.pacing.maxCutsPer10s,'maximum cuts',0,20,true)};if(p.pacing.minCutsPer10s>p.pacing.maxCutsPer10s)fail('invalid pacing interval');
  const referenceIds=unique(p.references,'asset',x=>x.assetId);if(p.song&&referenceIds.has(p.song.assetId))fail('duplicate song asset ID');if(p.references.filter(r=>r.role==='character').length>1)fail('only one character identity is supported');
  if(p.song?.sourceAssetId&&!p.references.some(r=>r.assetId===p.song.sourceAssetId&&r.role==='audio'))fail('original song reference is missing');
  p.sections=list(raw.sections??[],'sections',120).map(v=>{keys(v,['id','name','startFrame','endFrame'],'section');return {id:id(v.id,'section ID'),name:str(v.name??'','section name',240),...interval(v,'section')};});const sectionIds=unique(p.sections,'section');
  p.scenes=list(raw.scenes??[],'scenes',120).map(v=>{keys(v,['id','sectionId','name'],'scene');if(!sectionIds.has(v.sectionId))fail('unknown scene section');return {id:id(v.id,'scene ID'),sectionId:v.sectionId,name:str(v.name??'','scene name',240)};});const sceneIds=unique(p.scenes,'scene');
  p.shots=list(raw.shots??[],'shots',120).map(v=>{keys(v,SHOT_FIELDS,'shot');if(!sectionIds.has(v.sectionId)||!sceneIds.has(v.sceneId))fail('unknown shot scene or section');if(p.scenes.find(s=>s.id===v.sceneId).sectionId!==v.sectionId)fail('shot scene/section mismatch');const range=interval(v,'shot'),section=p.sections.find(s=>s.id===v.sectionId);if(range.startFrame<section.startFrame||range.endFrame>section.endFrame)fail('shot is outside its section');const refs=ids(v.referenceIds,'reference IDs',64);if(refs.some(x=>!referenceIds.has(x)))fail('unknown shot reference');if(v.performance!==undefined&&typeof v.performance!=='boolean')fail('performance must be boolean');return {id:id(v.id,'shot ID'),revision:rev(v.revision),sceneId:v.sceneId,sectionId:v.sectionId,...range,anchorIds:ids(v.anchorIds,'anchor IDs',8),snapErrorFrames:num(v.snapErrorFrames??0,'snap error',-4320,4320),generationUnitId:nullableId(v.generationUnitId,'generation unit ID'),sourceInFrame:num(v.sourceInFrame??0,'source frame',0,86400,true),narrative:str(v.narrative??'','narrative'),camera:str(v.camera??'','camera',2000),look:str(v.look??'','look',2000),prompt:str(v.prompt??'','prompt'),referenceIds:refs,performance:v.performance??false,visualPlan:validateVisualPlan(v.visualPlan),modelProfile:v.modelProfile==null?null:str(v.modelProfile,'model profile',160),selectedTakeId:nullableId(v.selectedTakeId,'take ID')};});const shotIds=unique(p.shots,'shot');
  p.generationUnits=list(raw.generationUnits??[],'generation units',120).map(v=>{keys(v,['id','revision','shotIds','requestedDuration','selectedTakeId','promptHash','referenceHashes','audioHash'],'generation unit');const u={id:id(v.id,'generation unit ID'),revision:rev(v.revision),shotIds:ids(v.shotIds,'dependent shots'),requestedDuration:num(v.requestedDuration,'requested duration',5,15),selectedTakeId:nullableId(v.selectedTakeId,'take ID')};if(!u.shotIds.length||u.shotIds.some(x=>!shotIds.has(x)))fail('unknown or empty dependent shots');for(const k of ['promptHash','audioHash'])if(v[k]!=null)u[k]=hash(v[k],k);if(v.referenceHashes)u.referenceHashes=list(v.referenceHashes,'reference hashes',64).map(x=>hash(x,'reference'));return u;});const unitIds=unique(p.generationUnits,'generation unit');
  for(const shot of p.shots)if(shot.generationUnitId&&(!unitIds.has(shot.generationUnitId)||!p.generationUnits.find(u=>u.id===shot.generationUnitId).shotIds.includes(shot.id)))fail('orphan shot generation unit');
  for(const unit of p.generationUnits)for(const sid of unit.shotIds)if(p.shots.find(s=>s.id===sid).generationUnitId!==unit.id)fail('generation unit dependency mismatch');
  p.takes=list(raw.takes??[],'takes',360).map(v=>{keys(v,['id','generationUnitId','status','inputHash','predictionId','asset','frames','fps','duration','sourceInFrame','sourceOutFrame'],'take');if(!unitIds.has(v.generationUnitId))fail('unknown take generation unit');if(!['pending','ready','stale','failed','uncertain'].includes(v.status))fail('invalid take status');const t={id:id(v.id,'take ID'),generationUnitId:v.generationUnitId,status:v.status,inputHash:hash(v.inputHash,'take input')};if(v.predictionId!==undefined)t.predictionId=id(v.predictionId,'prediction ID');if(v.asset)t.asset=asset(v.asset);for(const k of ['frames','fps','duration','sourceInFrame','sourceOutFrame'])if(v[k]!==undefined)t[k]=num(v[k],k,0,86400,k!=='duration'&&k!=='fps');return t;});const takeIds=unique(p.takes,'take');
  for(const u of p.generationUnits)if(p.takes.filter(t=>t.generationUnitId===u.id).length>3)fail('at most three takes per generation unit');
  const retained=new Map();for(const a of [p.song,...p.references,...p.takes.map(t=>t.asset)].filter(Boolean)){const previous=retained.get(a.assetId);if(previous&&(previous.hash!==a.hash||previous.bytes!==a.bytes||previous.mime!==a.mime))fail('conflicting retained asset metadata');retained.set(a.assetId,a);}
  if([...retained.values()].reduce((sum,a)=>sum+a.bytes,0)>1073741824)fail('retained media exceeds 1 GiB project limit');
  for(const t of p.takes)if(t.asset&&(t.asset.role!=='video'||t.asset.bytes>67108864))fail('generated take must be a video no larger than 64 MiB');
  for(const v of [...p.shots,...p.generationUnits])if(v.selectedTakeId){const t=p.takes.find(t=>t.id===v.selectedTakeId);if(!takeIds.has(v.selectedTakeId)||t.status!=='ready'||t.generationUnitId!==(v.generationUnitId??v.id))fail('invalid selected take');}
  p.locks=list(raw.locks??[],'locks',240).map(v=>{keys(v,['shotId','fields'],'lock');if(v.shotId!=='*'&&!shotIds.has(v.shotId))fail('unknown locked shot');const fields=ids(v.fields,'locked fields',EDIT_FIELDS.length);if(fields.some(f=>!EDIT_FIELDS.includes(f)))fail('unknown locked field');return {shotId:v.shotId,fields};});
  if(p.song&&p.sections.some(s=>s.endFrame>Math.ceil(p.song.duration*24)))fail('section extends beyond song');return p;
}
function stale(p,affected){
  const units=new Set(p.shots.filter(s=>affected.has(s.id)&&s.generationUnitId).map(s=>s.generationUnitId));
  for(const u of p.generationUnits)if(units.has(u.id)){u.revision++;u.selectedTakeId=null;for(const sid of u.shotIds)affected.add(sid);}
  const staleTakeIds=[];for(const t of p.takes)if(units.has(t.generationUnitId)&&t.status!=='stale'){t.status='stale';staleTakeIds.push(t.id);}
  for(const s of p.shots)if(affected.has(s.id))s.selectedTakeId=null;return staleTakeIds;
}
export function reviseShot(plan,shotId,patch,expectedRevision){
  const p=validateMusicVideoPlan(plan);if(p.revision!==expectedRevision){const e=new Error(`Music video revision conflict: current ${p.revision}`);e.status=409;e.currentRevision=p.revision;throw e;}
  keys(patch,EDIT_FIELDS,'shot patch');const shot=p.shots.find(s=>s.id===shotId);if(!shot)fail('unknown shot');const changed=Object.keys(patch).filter(k=>JSON.stringify(shot[k])!==JSON.stringify(patch[k]));if(!changed.length)return p;
  if(p.locks.some(l=>(l.shotId===shotId||l.shotId==='*')&&l.fields.some(f=>changed.includes(f))))fail('shot field is locked');
  Object.assign(shot,patch);shot.revision++;p.revision++;stale(p,new Set([shotId]));return validateMusicVideoPlan(p);
}
export function invalidateDependents(plan,change){
  const p=validateMusicVideoPlan(plan);obj(change,'change');let affected;
  if(change.type==='shot'){if(!p.shots.some(s=>s.id===change.shotId))fail('unknown changed shot');affected=new Set([change.shotId]);}
  else if(change.type==='reference'){if(!p.references.some(r=>r.assetId===change.assetId))fail('unknown changed reference');affected=new Set(p.shots.filter(s=>s.referenceIds.includes(change.assetId)).map(s=>s.id));}
  else if(['song','concept','analysis'].includes(change.type))affected=new Set(p.shots.map(s=>s.id));else fail('unknown dependency change');
  const staleTakeIds=stale(p,affected);for(const s of p.shots)if(affected.has(s.id))s.revision++;p.revision++;return {plan:validateMusicVideoPlan(p),staleTakeIds};
}
