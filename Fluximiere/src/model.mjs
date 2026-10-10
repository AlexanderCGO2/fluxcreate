import {createBlankProject, createLayer, getComp, parseProject, uid} from '../../Fluxiffects/src/core.mjs';

export {uid};
const clone = value => structuredClone(value);
const TYPES = ['video','image','audio','title','card','shape'];
const validTrack = value => typeof value==='string'&&/^[VA](?:[1-9]|1[0-6])$/.test(value);
export const trackOrder = track => track.startsWith('A')?100+Number(track.slice(1)):-Number(track.slice(1));
export function getTracks(project){return [...new Set(['V2','V1','A1',...(project.tracks??[]),...project.clips.map(c=>c.track)])].sort((a,b)=>trackOrder(a)-trackOrder(b));}
const COLOR = /^#[\da-f]{6}$/i;
const num = (v, fallback, min, max, label) => {v ??= fallback;if(typeof v !== 'number'||!Number.isFinite(v)||v<min||v>max) throw new Error(`${label} must be between ${min} and ${max}.`);return v;};
const str = (v, fallback='', max=2000) => {v ??=fallback;if(typeof v!=='string'||v.length>max)throw new Error(`Text must contain at most ${max} characters.`);return v;};
const color = (v,fallback) => {v??=fallback;if(!COLOR.test(v))throw new Error('Use a six-digit hex color.');return v;};
const bool = (v,fallback=false) => {v??=fallback;if(typeof v!=='boolean')throw new Error('Expected a true or false value.');return v;};
const id = value => {value=str(value,uid(),200);if(!value||['__proto__','constructor','prototype'].includes(value))throw new Error('Invalid identifier.');return value;};
export function makeClip(type='card', overrides={}) {
  return {id:uid(),type,name:type==='title'?'A new perspective':type==='card'?'Color story':'Untitled clip',track:type==='audio'?'A1':type==='title'?'V2':'V1',start:0,duration:4,sourceIn:0,playbackRate:1,volume:1,fadeIn:0,fadeOut:0,opacity:1,x:960,y:540,width:1920,height:1080,rotation:0,color:type==='title'?'#ffffff':'#8d7aeb',secondary:'#eecbd6',text:type==='title'?'A new perspective':'',fontSize:112,align:'center',assetId:null,locked:false,muted:false,...overrides};
}
export function createProject() {
  return {format:'fluximiere',version:1,id:uid(),name:'A change of pace',width:1920,height:1080,fps:30,duration:16,background:'#101019',assets:[],clips:[
    makeClip('card',{id:'dawn',name:'01 · First light',start:0,duration:5,color:'#a296e1',secondary:'#f4cbc3'}),
    makeClip('card',{id:'drift',name:'02 · Finding a rhythm',start:5,duration:5,color:'#69958e',secondary:'#d3e6c4'}),
    makeClip('card',{id:'afterglow',name:'03 · Afterglow',start:10,duration:6,color:'#ab6d87',secondary:'#f3ccb2'}),
    makeClip('title',{id:'opening',name:'Opening title',text:'A change\nof pace.',start:0.4,duration:4.3,fontSize:150,fadeIn:0.6,fadeOut:0.5,y:540}),
    makeClip('title',{id:'middle',name:'Second thought',text:'Make room\nfor the unexpected.',start:5.3,duration:4.4,fontSize:115,fadeIn:0.5,fadeOut:0.5}),
    makeClip('title',{id:'outro',name:'End title',text:'Every frame,\na fresh beginning.',start:10.4,duration:5.1,fontSize:120,fadeIn:0.6,fadeOut:0.8}),
  ]};
}
export function validateProject(raw) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.format!=='fluximiere'||raw.version!==1)throw new Error('Choose a Fluximiére project.');
  const p={format:'fluximiere',version:1,id:id(raw.id),name:str(raw.name,'Untitled sequence'),width:num(raw.width,1920,16,8192,'Width'),height:num(raw.height,1080,16,8192,'Height'),fps:num(raw.fps,30,1,120,'Frame rate'),duration:num(raw.duration,16,0.1,86400,'Duration'),background:color(raw.background,'#101019'),assets:[],clips:[]};
  if(!Array.isArray(raw.assets)||raw.assets.length>500||!Array.isArray(raw.clips)||raw.clips.length>2000)throw new Error('This project has too many assets or clips.');
  const seen=new Set();
  p.assets=raw.assets.map(a=>{if(!a||!['video','image','audio'].includes(a.type))throw new Error('Unsupported media type.');const src=str(a.src,'',140000000);if(src&&!/^data:(?:image|video|audio)\/[a-z0-9.+-]+[;,]/i.test(src))throw new Error('Media must be embedded locally; relink this source.');const result={id:id(a.id),type:a.type,name:str(a.name,'Untitled media'),src,width:num(a.width,0,0,32768,'Media width'),height:num(a.height,0,0,32768,'Media height'),duration:num(a.duration,0,0,86400,'Media duration'),missing:!src};if(a.path!==undefined)result.path=str(a.path,'',4000);if(seen.has(result.id))throw new Error('Duplicate asset identifier.');seen.add(result.id);return result;});
  const clips=new Set();
  p.clips=raw.clips.map(c=>{
    if(!c||!TYPES.includes(c.type)||!validTrack(c.track))throw new Error('Use video tracks V1–V16 or audio tracks A1–A16.');
    const b=makeClip(c.type),out={id:id(c.id),type:c.type,name:str(c.name,b.name),track:c.track,assetId:c.assetId==null?null:id(c.assetId),text:str(c.text,'',20000),color:color(c.color,b.color),secondary:color(c.secondary,b.secondary),align:['left','center','right'].includes(c.align)?c.align:'center',locked:bool(c.locked),muted:bool(c.muted)};
    const ranges={start:[0,86400],duration:[0.01,86400],sourceIn:[0,86400],playbackRate:[0.1,16],volume:[0,1],fadeIn:[0,86400],fadeOut:[0,86400],opacity:[0,1],x:[-32768,32768],y:[-32768,32768],width:[1,32768],height:[1,32768],rotation:[-36000,36000],fontSize:[1,2000]};
    for(const [key,range]of Object.entries(ranges))out[key]=num(c[key],b[key],...range,key);
    if((out.type==='audio')!==out.track.startsWith('A'))throw new Error('Audio belongs on an audio track; visual clips belong on a video track.');
    if(out.fadeIn>out.duration||out.fadeOut>out.duration)throw new Error('A fade cannot be longer than its clip.');
    if(clips.has(out.id))throw new Error('Duplicate clip identifier.');clips.add(out.id);return out;
  });
  if(raw.tracks!==undefined){if(!Array.isArray(raw.tracks)||raw.tracks.length>32||raw.tracks.some(t=>!validTrack(t)))throw new Error('Invalid sequence tracks.');p.tracks=[...new Set(raw.tracks)];}
  if(raw.brief!==undefined)p.brief=str(raw.brief,'',6000);
  return p;
}
export function splitClip(project, clipId, time, newId=uid()) {
  const p=clone(project),index=p.clips.findIndex(c=>c.id===clipId),clip=p.clips[index];
  if(!clip)throw new Error('Select a clip to split.');if(clip.locked)throw new Error('Unlock this clip before editing.');
  if(time<=clip.start+0.01||time>=clip.start+clip.duration-0.01)throw new Error('Place the playhead inside the clip to split it.');
  const leftLength=time-clip.start,rightLength=clip.duration-leftLength;
  p.clips.splice(index,1,{...clip,duration:leftLength,fadeIn:Math.min(clip.fadeIn,leftLength),fadeOut:0},{...clip,id:newId,name:`${clip.name} · B`,start:time,duration:rightLength,sourceIn:clip.sourceIn+leftLength*clip.playbackRate,fadeIn:0,fadeOut:Math.min(clip.fadeOut,rightLength)});
  return validateProject(p);
}
/** Remove one interval, preserving the source position and gain of every surviving sample. */
export function planRippleEdit(project,{clipId,operation='delete',scope='track',time}={}) {
  const p=validateProject(project),selected=p.clips.find(c=>c.id===clipId),epsilon=1e-7;
  if(!selected)throw Error('Select a clip for ripple editing.');
  if(!['track','all'].includes(scope))throw Error('Choose the selected track or all tracks as the ripple scope.');
  if(!['delete','trim-start','trim-end'].includes(operation))throw Error('Choose a supported ripple operation.');
  let from=selected.start,to=selected.start+selected.duration;
  if(operation!=='delete'){
    if(!Number.isFinite(time))throw Error('Place the playhead inside the selected clip.');
    const boundary=Math.round(time*p.fps)/p.fps,minimum=Math.max(.01,1/p.fps);
    if(boundary-from<minimum-epsilon||to-boundary<minimum-epsilon)throw Error('Place the playhead inside the clip, leaving at least one frame on each side.');
    if(operation==='trim-start')to=boundary;else from=boundary;
  }
  const amount=to-from,changes=[],result=[];
  for(const c of p.clips){
    const end=c.start+c.duration;
    if(scope==='track'&&c.track!==selected.track||end<=from+epsilon){result.push(c);continue;}
    if(c.locked)throw Error(`“${c.name}” is locked on ${c.track}. Unlock it or choose another track scope.`);
    if(c.start>=to-epsilon){result.push({...c,start:Math.max(0,c.start-amount)});changes.push({id:c.id,name:c.name,track:c.track,action:'Move earlier'});continue;}
    // This clip intersects the removed interval. Cuts inside a fade would alter
    // its gain envelope in the current model, so refuse the entire operation.
    for(const point of [from,to])if(point>c.start+epsilon&&point<end-epsilon&&((c.fadeIn&&point<c.start+c.fadeIn-epsilon)||(c.fadeOut&&point>end-c.fadeOut+epsilon)))throw Error(`The cut crosses a fade in “${c.name}”. Move the cut outside the fade or adjust that fade first.`);
    const left=Math.max(0,from-c.start),right=Math.max(0,end-to),minimum=Math.max(.01,1/p.fps);
    if(left>epsilon&&left<minimum-epsilon||right>epsilon&&right<minimum-epsilon)throw Error(`This edit leaves less than one frame of “${c.name}”. Move the cut to its edge.`);
    if(left>epsilon)result.push({...c,duration:left,fadeOut:0});
    if(right>epsilon)result.push({...c,id:left>epsilon?uid():c.id,name:left>epsilon?`${c.name} · B`:c.name,start:from,duration:right,sourceIn:['video','audio'].includes(c.type)?c.sourceIn+(to-c.start)*c.playbackRate:c.sourceIn,fadeIn:0});
    changes.push({id:c.id,name:c.name,track:c.track,action:left>epsilon&&right>epsilon?'Split and close gap':left>epsilon||right>epsilon?'Trim':'Remove'});
  }
  p.clips=result;
  if(scope==='all')p.duration=Math.max(p.duration-amount,...result.map(c=>c.start+c.duration),0);
  if(p.duration<.1-epsilon)throw Error('The edit would leave an empty sequence duration. Keep at least 0.1 seconds.');
  return {project:validateProject(p),from,to,amount,scope,track:selected.track,changes,playhead:Math.min(from,p.duration)};
}
/** Source seconds; one sequence-frame slip advances playbackRate / fps seconds. */
export function slipBounds(project,clipId,{sourceDuration}={}) {
  const clip=project.clips.find(c=>c.id===clipId);
  if(!clip||!['video','audio'].includes(clip.type))throw Error('Select a video or audio clip to slip its source.');
  if(clip.locked)throw Error('Unlock this clip before slipping its source.');
  const asset=project.assets.find(a=>a.id===clip.assetId);
  if(!asset?.src)throw Error('Relink the offline source before slipping this clip.');
  if(clip.type==='video'&&asset.type!=='video'||clip.type==='audio'&&!['audio','video'].includes(asset.type))throw Error('Relink this clip to a matching timed media source.');
  const duration=sourceDuration===undefined?asset.duration:sourceDuration;
  if(!Number.isFinite(duration)||duration<=0)throw Error('The source duration is unknown. Relink a file with a readable duration before slipping.');
  const span=clip.duration*clip.playbackRate,max=duration-span;
  if(max< -1e-8)throw Error('The source is shorter than this clip at its current speed. Shorten the clip or reduce its speed first.');
  return {min:0,max:Math.max(0,max),sourceDuration:duration,sourceSpan:span,frameStep:clip.playbackRate/project.fps};
}
export function planSlipEdit(project,{clipId,sourceIn,deltaFrames,sourceDuration}={}) {
  const p=validateProject(project),bounds=slipBounds(p,clipId,{sourceDuration}),clip=p.clips.find(c=>c.id===clipId);
  if((sourceIn===undefined)===(deltaFrames===undefined))throw Error('Choose a source-in time or a whole-frame slip.');
  if(deltaFrames!==undefined&&!Number.isInteger(deltaFrames))throw Error('Slip by a whole number of sequence frames.');
  const next=sourceIn===undefined?clip.sourceIn+deltaFrames*bounds.frameStep:sourceIn;
  if(!Number.isFinite(next)||next<bounds.min-1e-8||next>bounds.max+1e-8)throw Error(`Source in must be between 0 and ${bounds.max.toFixed(6)} seconds to retain the whole clip.`);
  const offset=Math.max(bounds.min,Math.min(bounds.max,next)),delta=offset-clip.sourceIn;clip.sourceIn=offset;
  return {project:validateProject(p),sourceIn:offset,sourceOut:offset+bounds.sourceSpan,delta,...bounds};
}
export function toMotion(project) {
  const p=validateProject(project),motion=createBlankProject({name:p.name,width:p.width,height:p.height,fps:p.fps,duration:p.duration,background:p.background});
  motion.id=p.id;motion.assets=p.assets.map(a=>({...a}));if(p.brief)motion.brief=p.brief;
  getComp(motion).layers=[...p.clips].reverse().sort((a,b)=>trackOrder(a.track)-trackOrder(b.track)).map(c=>{
    const layer=createLayer(c.type==='title'?'text':c.type==='card'||c.type==='shape'?'rectangle':c.type,{id:c.id,name:c.name,start:c.start,end:c.start+c.duration,x:c.x,y:c.y,width:c.width,height:c.height,anchorX:c.width/2,anchorY:c.height/2,text:c.text,fontSize:c.fontSize,textAlign:c.align,fill:c.color,cornerRadius:0,rotation:c.rotation,locked:c.locked,opacity:c.opacity,assetId:c.assetId,sourceIn:c.sourceIn,playbackRate:c.playbackRate,volume:c.volume,muted:c.muted,fadeIn:c.fadeIn,fadeOut:c.fadeOut});
    if(c.type==='card')layer.gradient={from:c.color,to:c.secondary,angle:125};
    if(c.fadeIn||c.fadeOut){const keys=[];if(c.fadeIn)keys.push({id:uid(),time:c.start,value:0,easing:'linear'},{id:uid(),time:c.start+c.fadeIn,value:c.opacity,easing:'linear'});if(c.fadeOut)keys.push({id:uid(),time:c.start+c.duration-c.fadeOut,value:c.opacity,easing:'linear'},{id:uid(),time:c.start+c.duration,value:0,easing:'linear'});layer.keyframes.opacity=keys.sort((a,b)=>a.time-b.time);}
    return layer;
  });return parseProject(JSON.stringify(motion)).project;
}
export function fromMotion(input) {
  const {project:motion,warnings}=parseProject(JSON.stringify(input)),comp=getComp(motion),p={format:'fluximiere',version:1,id:uid(),name:motion.name,width:comp.width,height:comp.height,fps:comp.fps,duration:comp.duration,background:COLOR.test(comp.background)?comp.background:'#101019',assets:[],clips:[],brief:motion.brief??''};
  p.assets=motion.assets.filter(a=>a.type!=='model3d').map(a=>({...a,src:a.src?.startsWith('data:')?a.src:'',missing:!a.src?.startsWith('data:')}));
  for(const layer of [...comp.layers].reverse()){
    if(layer.type==='scene3d'){warnings.push(`${layer.name}: live 3D scenes stay editable in Fluxiffects. Export PNG or WebM there for Fluximiére; keep the original project for geometry and animation.`);continue;}
    if(layer.type==='null')continue;
    const type=layer.type==='text'?'title':['video','image','audio'].includes(layer.type)?layer.type:'shape';
    if(layer.end<=Math.max(0,layer.start))continue;
    const radians=layer.rotation*Math.PI/180,dx=(layer.width/2-layer.anchorX)*layer.scaleX,dy=(layer.height/2-layer.anchorY)*layer.scaleY;
    p.clips.push(makeClip(type,{id:layer.id,name:layer.name,track:type==='audio'?'A1':type==='title'?'V2':'V1',start:Math.max(0,layer.start),duration:layer.end-Math.max(0,layer.start),sourceIn:layer.sourceIn??0,playbackRate:layer.playbackRate??1,volume:layer.volume??1,muted:layer.muted??false,fadeIn:Math.min(layer.fadeIn??0,layer.end-Math.max(0,layer.start)),fadeOut:Math.min(layer.fadeOut??0,layer.end-Math.max(0,layer.start)),assetId:layer.assetId,text:layer.text,fontSize:Math.min(2000,layer.fontSize),align:layer.textAlign,x:layer.x+dx*Math.cos(radians)-dy*Math.sin(radians),y:layer.y+dx*Math.sin(radians)+dy*Math.cos(radians),width:Math.max(1,layer.width*Math.abs(layer.scaleX)),height:Math.max(1,layer.height*Math.abs(layer.scaleY)),rotation:layer.rotation,opacity:layer.visible?layer.opacity:0,color:COLOR.test(layer.fill)?layer.fill:'#a296e1',locked:layer.locked}));
    if(layer.scaleX<0||layer.scaleY<0)warnings.push(`${layer.name}: mirrored scale is simplified to positive size. Keep the source file to preserve the exact reflection.`);
    if(Object.keys(layer.keyframes??{}).length||layer.effects.length||layer.parentId||layer.gradient||layer.type==='ellipse')warnings.push(`${layer.name}: animation, effects, gradients, parenting and non-rectangular shapes are simplified. Keep the source file for full fidelity.`);
  }
  if(motion.compositions.length>1)warnings.push('Imported the active composition only.');
  if(p.assets.some(a=>a.missing))warnings.push('Some media sources need to be relinked locally.');
  return {project:validateProject(p),warnings:[...new Set(warnings)]};
}
export function timecode(seconds,fps=30){const frame=Math.max(0,Math.round(seconds*Math.round(fps))),f=Math.round(fps),s=Math.floor(frame/f);return [Math.floor(s/3600),Math.floor(s/60)%60,s%60,frame%f].map(v=>String(v).padStart(2,'0')).join(':');}
export function exportEDL(project){
  const p=validateProject(project),clips=p.clips.filter(c=>c.track==='V1').sort((a,b)=>a.start-b.start),warnings=[];
  if(p.fps!==Math.round(p.fps))throw new Error('EDL export currently requires an integer frame rate.');
  if(clips.some((c,i)=>i&&c.start<clips[i-1].start+clips[i-1].duration-1/p.fps))throw new Error('EDL requires non-overlapping cuts on V1.');
  if(clips.some(c=>c.playbackRate!==1))throw new Error('EDL export requires 100% playback speed.');
  if(p.clips.some(c=>c.track!=='V1'))warnings.push('EDL includes V1 cuts only. Titles, audio, fades and color cards need to be recreated in the receiving editor.');
  const safe=s=>String(s).replace(/[\r\n]/g,' ').slice(0,200);
  const rows=[`TITLE: ${safe(p.name)}`,'FCM: NON-DROP FRAME',`* FLUX FPS: ${p.fps}`,''];
  clips.forEach((c,i)=>{const asset=p.assets.find(a=>a.id===c.assetId);rows.push(`${String(i+1).padStart(3,'0')}  AX       V     C        ${timecode(c.sourceIn,p.fps)} ${timecode(c.sourceIn+c.duration,p.fps)} ${timecode(c.start,p.fps)} ${timecode(c.start+c.duration,p.fps)}`,`* FROM CLIP NAME: ${safe(asset?.name??c.name)}`,'');});
  return {text:rows.join('\n'),warnings};
}
export function importEDL(text,fps=30){
  if(text.length>1000000)throw new Error('EDL is too large.');if(/DROP FRAME/i.test(text)&&!/NON-DROP FRAME/i.test(text))throw new Error('Drop-frame EDL import is not supported yet.');
  const declared=/\* FLUX FPS:\s*(\d+)/.exec(text);fps=declared?Number(declared[1]):fps;
  const p={...createProject(),id:uid(),name:/TITLE:\s*([^\r\n]+)/.exec(text)?.[1]??'Imported edit',fps,clips:[],assets:[],duration:1};
  const lines=text.split(/\r?\n/);const read=t=>{const [h,m,s,f]=t.split(':').map(Number);if(m>59||s>59||f>=fps)throw new Error('Invalid EDL timecode.');return h*3600+m*60+s+f/fps;};
  for(let i=0;i<lines.length;i++){
    if(!/^\d{3,}\s/.test(lines[i]))continue;
    const m=/^\d+\s+\S+\s+V\s+C\s+(\d\d:\d\d:\d\d:\d\d)\s+(\d\d:\d\d:\d\d:\d\d)\s+(\d\d:\d\d:\d\d:\d\d)\s+(\d\d:\d\d:\d\d:\d\d)\s*$/.exec(lines[i]);
    if(!m)throw new Error('Only V-track cut events are supported. Flatten transitions and remove audio events before importing this EDL.');
    const sourceIn=read(m[1]),sourceOut=read(m[2]),start=read(m[3]),end=read(m[4]);if(end<=start||Math.abs(sourceOut-sourceIn-(end-start))>1/fps)throw new Error('EDL source and record durations must match.');
    const name=/\* FROM CLIP NAME:\s*(.+)/.exec(lines[i+1]??'')?.[1]??`Offline clip ${p.clips.length+1}`,assetId=uid();p.assets.push({id:assetId,name,type:'video',src:'',width:p.width,height:p.height,duration:sourceOut});p.clips.push(makeClip('video',{name,assetId,start,duration:end-start,sourceIn}));p.duration=Math.max(p.duration,end);
  }
  if(!p.clips.length)throw new Error('No supported cut events were found in this EDL.');
  return {project:validateProject(p),warnings:['EDL contains edit decisions only. Select each offline source in the media bin to relink it. Titles, effects, audio and transitions are not included.']};
}

const CLIP_PROPS=new Set(['name','start','duration','sourceIn','playbackRate','volume','fadeIn','fadeOut','opacity','x','y','width','height','rotation','color','secondary','text','fontSize','align','muted']);
const COMMAND_KEYS={updateClip:['type','clipId','properties'],deleteClip:['type','clipId'],splitClip:['type','clipId','time','newId'],duplicateClip:['type','clipId','start','newId'],addTitle:['type','id','properties'],updateSequence:['type','properties']};
function properties(value,allowed){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Expected properties.');for(const key of Object.keys(value))if(!allowed.has(key))throw new Error(`AI cannot change ${key}.`);return value;}
export function applyAICommands(project,commands,{selection=[],scope='composition'}={}){
  if(!Array.isArray(commands)||commands.length>40)throw new Error('Expected at most 40 editing commands.');let p=clone(project);const selected=new Set(selection);
  const editable=clipId=>{const clip=p.clips.find(c=>c.id===clipId);if(!clip)throw new Error('The requested clip no longer exists.');if(clip.locked)throw new Error('AI cannot edit locked clips.');if(scope==='selection'&&!selected.has(clipId))throw new Error('AI can only edit the selected clips.');return clip;};
  for(const command of commands){if(!command||typeof command!=='object'||Array.isArray(command))throw new Error('Invalid editing command.');const allowed=Object.hasOwn(COMMAND_KEYS,command.type)?COMMAND_KEYS[command.type]:null;if(!allowed)throw new Error(`Unsupported AI command: ${command.type}`);for(const key of Object.keys(command))if(!allowed.includes(key))throw new Error(`Unsupported ${command.type} command field: ${key}`);
    if(command.type==='updateClip'){Object.assign(editable(command.clipId),properties(command.properties,CLIP_PROPS));}
    else if(command.type==='deleteClip'){editable(command.clipId);p.clips=p.clips.filter(c=>c.id!==command.clipId);}
    else if(command.type==='splitClip'){editable(command.clipId);const newId=command.newId??uid();p=splitClip(p,command.clipId,command.time,newId);if(scope==='selection')selected.add(newId);}
    else if(command.type==='duplicateClip'){const c=editable(command.clipId),copy={...clone(c),id:command.newId??uid(),start:command.start??c.start+c.duration,name:`${c.name} copy`};p.clips.push(copy);selected.add(copy.id);}
    else if(command.type==='addTitle'){if(scope==='selection')throw new Error('Switch to sequence scope to add a title.');const props=properties(command.properties,CLIP_PROPS);p.clips.push(makeClip('title',{...props,id:command.id??uid()}));}
    else if(command.type==='updateSequence'){if(scope==='selection')throw new Error('Switch to sequence scope to change the sequence.');Object.assign(p,properties(command.properties,new Set(['name','duration','background'])));}
    else throw new Error(`Unsupported AI command: ${command.type}`);
  }
  return validateProject(p);
}
export function getAIContext(project,{selection=[],scope='composition'}={}){
  const p=validateProject(project),clips=scope==='selection'?p.clips.filter(c=>selection.includes(c.id)):p.clips;
  return {name:p.name,width:p.width,height:p.height,fps:p.fps,duration:p.duration,background:p.background,clips:clips.map(c=>({...c})),assets:p.assets.filter(a=>clips.some(c=>c.assetId===a.id)).map(({id,type,width,height,duration,missing})=>({id,type,width,height,duration,missing}))};
}
export const AI_SPEC={description:'Fluximiére is a video timeline. Return commands for editable cuts and titles. Times are seconds. V1 contains visual footage; V2 contains titles; A1 contains audio. Do not create media URLs or pretend to generate video.',commands:[{type:'updateClip',clipId:'existing id',properties:{start:2,duration:4,fadeIn:0.4,fadeOut:0.5}},{type:'addTitle',properties:{text:'A new beginning',name:'Opening',start:0,duration:4,fontSize:110,color:'#ffffff',x:960,y:540}},{type:'splitClip',clipId:'existing id',time:3},{type:'deleteClip',clipId:'existing id'},{type:'duplicateClip',clipId:'existing id',start:6},{type:'updateSequence',properties:{name:'New name',duration:20,background:'#101019'}}],rules:'Use only supported property names. Preserve locked clips. Selection scope must not add titles or update the sequence. Numeric ranges: start 0..86400, duration .01..86400, speed .1..16, opacity and volume 0..1, fontSize 1..2000. Fades cannot exceed duration. Colors must be #RRGGBB. Make at most 40 commands.'};
