import {makeClip,validateProject,uid} from './model.mjs';

export const PREMIERE_TICKS=254016000000;
const MAX_INPUT=12*1024*1024,MAX_XML=32*1024*1024;
const children=(node,name)=>Array.from(node?.childNodes??[]).filter(n=>n.nodeType===1&&(!name||n.nodeName===name));
const child=(node,name)=>children(node,name)[0];
const at=(node,path)=>path.split('/').reduce((n,key)=>child(n,key),node);
const value=(node,path,fallback='')=>at(node,path)?.textContent?.trim()??fallback;
const attr=(node,key)=>node?.getAttribute(key)??'';
const number=(text,label,fallback)=>{if(text===''&&fallback!==undefined)return fallback;const n=Number(text);if(!String(text).trim()||!Number.isFinite(n))throw new Error(`Invalid ${label}.`);return n;};
const frames=(node,name,fallback)=>number(value(node,name),`${name} frame`,fallback);
const ticks=(node,path,fallback=0)=>{const text=value(node,path);if(!text)return fallback;if(!/^-?\d{1,24}$/.test(text))throw new Error(`Invalid Premiere ${path}.`);return Number(BigInt(text))/PREMIERE_TICKS;};
const filename=path=>path.split(/[\\/]/).pop()||'Offline source';
function sourcePath(path){if(/^file:/i.test(path)){try{return decodeURIComponent(path.replace(/^file:\/\/(?:localhost)?/i,''));}catch{throw new Error('A media path contains invalid URL encoding.');}}return path;}
function frameRate(node,fallback=30){const rate=child(node,'rate');if(!rate)return fallback;const base=number(value(rate,'timebase'),'frame rate');return base*(value(rate,'ntsc').toUpperCase()==='TRUE'?1000/1001:1);}

async function textInput(input){
  if(typeof input==='string'){if(input.length>MAX_XML)throw new Error('Timeline XML exceeds the 32 MB limit.');return input;}
  if(input?.size>MAX_INPUT)throw new Error('Timeline files must be smaller than 12 MB.');
  let data=input instanceof Uint8Array?input:input instanceof ArrayBuffer?new Uint8Array(input):new Uint8Array(await input.arrayBuffer());
  if(data.byteLength>MAX_INPUT)throw new Error('Timeline files must be smaller than 12 MB.');
  if(data[0]===0x1f&&data[1]===0x8b){
    const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_XML){await reader.cancel();throw new Error('Expanded Premiere XML exceeds the 32 MB limit.');}parts.push(value);}}catch(e){if(/limit/.test(e.message))throw e;throw new Error('This compressed Premiere project is damaged or incomplete.');}finally{reader.releaseLock();}
    data=new Uint8Array(size);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}
  }
  try{return new TextDecoder(data[0]===0xff&&data[1]===0xfe?'utf-16le':data[0]===0xfe&&data[1]===0xff?'utf-16be':'utf-8',{fatal:true}).decode(data);}catch{throw new Error('This project does not contain readable XML. Export Final Cut Pro XML from Premiere.');}
}
function xmlDocument(text,Parser){
  // Only the unadorned legacy xmeml declaration is permitted. No DTD, entities or external XML references are resolved.
  text=text.replace(/<!DOCTYPE\s+xmeml\s*>/i,'');
  if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))throw new Error('External entities and document declarations are not supported.');
  const markup=text.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>/g,'');let depth=0,count=0;
  for(const tag of markup.matchAll(/<\/?[A-Za-z_][^>]*>/g)){if(++count>150000)throw new Error('The timeline has too many XML elements.');if(tag[0].startsWith('</'))depth--;else if(!tag[0].endsWith('/>'))depth++;if(depth>64)throw new Error('The timeline XML is nested too deeply.');}
  if(!Parser)throw new Error('XML import is unavailable in this browser.');
  const doc=new Parser({onError(level){if(level==='error'||level==='fatalError')throw new Error('The timeline XML is malformed.');}}).parseFromString(text,'application/xml');
  if(!doc?.documentElement||doc.getElementsByTagName('parsererror').length)throw new Error('The timeline XML is malformed.');
  return doc;
}
function builder(name,width,height,fps){
  const project={format:'fluximiere',version:1,id:uid(),name,width,height,fps,duration:.1,background:'#101019',assets:[],clips:[],tracks:[]},warnings=new Set(),assets=new Map();
  return {project,warnings,track(kind,index){if(!Number.isInteger(index)||index<0||index>=16)throw new Error('Fluximiére supports up to 16 picture tracks and 16 sound tracks per sequence.');const id=kind+(index+1);if(!project.tracks.includes(id))project.tracks.push(id);return id;},asset(path,type,name,duration=0,sourceId=''){
    const key=type+':'+(path?'path:'+path:'source:'+(sourceId||uid()));let asset=assets.get(key);if(!asset){asset={id:uid(),type,name:name||filename(path),path:sourcePath(path),src:'',width:type==='audio'?0:width,height:type==='audio'?0:height,duration:Math.min(86400,Math.max(0,duration)),missing:true};assets.set(key,asset);project.assets.push(asset);}else asset.duration=Math.max(asset.duration,Math.min(86400,duration));return asset.id;
  },add(type,options){if(options.duration<.01)throw new Error('A clip is shorter than the supported 0.01 seconds.');project.clips.push(makeClip(type,{x:width/2,y:height/2,width,height,...options}));project.duration=Math.max(project.duration,options.start+options.duration);},finish(){if(!project.clips.length)throw new Error('No supported timeline clips were found in this sequence. Choose another sequence or export Final Cut Pro XML from Premiere.');if(project.assets.length)warnings.add('Media is offline. Select a source in the media bin to relink it. Original paths are saved as hints; no local files or URLs are opened automatically.');return {project:validateProject(project),warnings:[...warnings]};}};
}
function choose(sequences,sequenceId){if(!sequences.length)throw new Error('No sequences were found in this project.');const selected=sequenceId?sequences.find(s=>s.id===sequenceId):sequences[0];if(!selected)throw new Error('The selected sequence no longer exists.');return selected;}
function parsePremiere(root,sequenceId){
  const objects=children(root),ids=new Map(),uids=new Map();
  for(const object of objects){for(const [key,map]of [['ObjectID',ids],['ObjectUID',uids]]){const id=attr(object,key);if(id){if(map.has(id))throw new Error(`Duplicate Premiere object ${id}.`);map.set(id,object);}}}
  const resolve=(reference,required=true)=>{const result=attr(reference,'ObjectRef')?ids.get(attr(reference,'ObjectRef')):uids.get(attr(reference,'ObjectURef'));if(!result&&required)throw new Error('The Premiere project contains an unresolved object reference. Export Final Cut Pro XML from Premiere.');return result;};
  const sequences=objects.filter(n=>n.nodeName==='Sequence'&&(attr(n,'ObjectID')||attr(n,'ObjectUID'))).map((node,i)=>({id:attr(node,'ObjectUID')||attr(node,'ObjectID')||String(i),name:value(node,'Name','Untitled sequence'),node})),selected=choose(sequences,sequenceId),sequence=selected.node;
  if(!sequenceId&&sequences.length>1)return {project:null,warnings:[],sequences:sequences.map(({id,name})=>({id,name})),sequenceId:null};
  const groups=children(at(sequence,'TrackGroups'),'TrackGroup').map(n=>resolve(child(n,'Second'))),video=groups.find(n=>n.nodeName==='VideoTrackGroup'),rect=value(video,'FrameRect','0,0,1920,1080').split(',').map(Number),fps=video?PREMIERE_TICKS/number(value(video,'TrackGroup/FrameRate'),'Premiere frame rate'):30;
  if(rect.length!==4||rect.some(n=>!Number.isFinite(n)))throw new Error('Invalid Premiere sequence dimensions.');
  const b=builder(selected.name,rect[2]-rect[0],rect[3]-rect[1],fps);
  b.warnings.add('Premiere import preserves supported cuts, track order, timing and media references. Effects, transitions, color grading, audio routing and title graphics are not reproduced. Keep the original project for full fidelity.');
  if(value(video,'PixelAspectRatio','1,1')!=='1,1')b.warnings.add('Non-square pixels are shown as square pixels.');
  for(const group of groups){const kind=group.nodeName==='VideoTrackGroup'?'V':group.nodeName==='AudioTrackGroup'?'A':null;if(!kind){b.warnings.add(`Unsupported ${group.nodeName} was omitted.`);continue;}
    const refs=children(at(group,'TrackGroup/Tracks'),'Track');
    for(let i=0;i<refs.length;i++){
      const track=resolve(refs[i]),base=child(track,'ClipTrack'),index=number(value(base,'Track/Index',attr(refs[i],'Index')||String(i)),'track index'),trackId=b.track(kind,index),locked=value(base,'Track/IsLocked')==='true',muted=value(base,'Track/IsMuted')==='true';
      if(children(at(base,'TransitionItems/TrackItems')).length)b.warnings.add('Transitions are omitted; overlapping clip timing is retained.');
      for(const ref of children(at(base,'ClipItems/TrackItems'),'TrackItem')){
        const item=resolve(ref),entry=child(item,'ClipTrackItem');if(!entry){b.warnings.add(`Unsupported ${item.nodeName} was omitted.`);continue;}
        const start=ticks(entry,'TrackItem/Start'),end=ticks(entry,'TrackItem/End'),duration=end-start;if(start<0||duration<=0)throw new Error('A Premiere clip has invalid timeline timing.');b.project.duration=Math.max(b.project.duration,end);
        const sub=resolve(child(entry,'SubClip')),clipObject=resolve(child(sub,'Clip')),clip=child(clipObject,'Clip'),name=value(sub,'Name','Offline clip');
        if(value(clipObject,'AdjustmentLayer')==='true'){b.warnings.add(`${name}: adjustment layer and its effects were omitted.`);continue;}
        const source=resolve(child(clip,'Source')),nested=/SequenceSource$/.test(source.nodeName),mediaRef=at(source,'MediaSource/Media'),media=mediaRef?resolve(mediaRef):null;
        const path=media?(value(media,'ActualMediaFilePath')||value(media,'FilePath')||value(media,'RelativePath')):'',generated=media&&value(media,'Infinite')==='true'&&/^\d+$/.test(path);
        const type=kind==='A'?'audio':/\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(path)?'image':'video';
        const sourceIn=nested||type==='image'||generated?0:ticks(clip,'InPoint'),out=nested||type==='image'||generated?sourceIn+duration:ticks(clip,'OutPoint',sourceIn+duration),rate=(out-sourceIn)/duration;
        if(!Number.isFinite(rate)||rate<.1||rate>16)throw new Error(`${name}: reverse playback or speed outside 0.1–16× is not supported. Export a rendered source or Final Cut Pro XML.`);
        if(!clip)throw new Error(`${name}: unsupported Premiere clip structure.`);
        if(nested)b.warnings.add(`${name}: nested or multicamera sequence needs a rendered source. Its timeline position is preserved as an offline clip.`);
        if(generated||!media&&!nested)b.warnings.add(`${name}: generated media or title graphics need a rendered replacement.`);
        if(Math.abs(rate-1)>1e-5)b.warnings.add(`${name}: source in/out points imply ${rate.toFixed(3)}× playback. Variable speed curves are not reproduced; verify this clip.`);
        const original=ticks(source,'OriginalDuration'),identity=media?attr(media,'ObjectUID')||attr(media,'ObjectID'):attr(source,'ObjectUID')||attr(source,'ObjectID'),assetId=b.asset(generated||nested?'':path,type,name,Math.max(out,original<=86400?original:0),identity);
        b.add(type,{name,assetId,track:trackId,start,duration,sourceIn,playbackRate:Math.abs(rate-1)<1e-5?1:rate,locked,muted:kind==='V'||muted,opacity:kind==='V'&&muted?0:1});
      }
    }
  }
  return {...b.finish(),sequences:sequences.map(({id,name})=>({id,name})),sequenceId:selected.id};
}
function parseXmeml(root,sequenceId){
  const all=Array.from(root.getElementsByTagName('sequence')),sequences=all.filter(n=>{for(let p=n.parentNode;p&&p!==root;p=p.parentNode)if(['clipitem','generatoritem','sequence'].includes(p.nodeName))return false;return true;}).map((node,i)=>({id:attr(node,'id')||String(i),name:value(node,'name','Untitled sequence'),node}));
  const selected=choose(sequences,sequenceId),sequence=selected.node;
  if(!sequenceId&&sequences.length>1)return {project:null,warnings:[],sequences:sequences.map(({id,name})=>({id,name})),sequenceId:null};
  const fps=frameRate(sequence),format=at(sequence,'media/video/format/samplecharacteristics'),width=frames(format,'width',1920),height=frames(format,'height',1080),b=builder(selected.name,width,height,fps);
  const files=new Map();for(const file of Array.from(root.getElementsByTagName('file'))){const id=attr(file,'id');if(id&&children(file).length){if(files.has(id)&&value(files.get(id),'pathurl')!==value(file,'pathurl'))throw new Error('Conflicting media references in Final Cut XML.');files.set(id,file);}}
  b.warnings.add('Imported legacy Final Cut Pro XML (xmeml). Cuts and basic text titles remain editable. Effects, transitions, keyframes, nested sequences and audio routing require review.');
  if(value(format,'pixelaspectratio','square')!=='square')b.warnings.add('Non-square pixels are shown as square pixels.');
  for(const [kind,mediaType]of [['V','video'],['A','audio']]){
    const tracks=children(at(sequence,`media/${mediaType}`),'track');
    for(let i=0;i<tracks.length;i++){
      const track=tracks[i],trackId=b.track(kind,i),locked=value(track,'locked').toUpperCase()==='TRUE',trackMuted=value(track,'enabled','TRUE').toUpperCase()==='FALSE',items=children(track);
      for(let j=0;j<items.length;j++){
        const item=items[j];if(item.nodeName==='transitionitem'){b.warnings.add('Transitions are omitted; overlapping clip timing is retained.');continue;}if(!['clipitem','generatoritem'].includes(item.nodeName))continue;
        let start=frames(item,'start'),end=frames(item,'end');
        if(start===-1&&items[j-1]?.nodeName==='transitionitem')start=frames(items[j-1],'start');
        if(end===-1&&items[j+1]?.nodeName==='transitionitem')end=frames(items[j+1],'end');
        if(start<0||end<=start)throw new Error('A clip has unsupported transition timing. Export XML with transitions removed.');
        const duration=(end-start)/fps,name=value(item,'name','Untitled clip'),muted=trackMuted||value(item,'enabled','TRUE').toUpperCase()==='FALSE',common={name,track:trackId,start:start/fps,duration,locked,muted:kind==='V'||muted,opacity:kind==='V'&&muted?0:1};
        const effect=child(item,'effect'),effectId=value(effect,'effectid').toLowerCase(),parameter=children(effect,'parameter').find(n=>['str','string','text'].includes(value(n,'parameterid').toLowerCase()));
        if(item.nodeName==='generatoritem'&&kind==='V'&&['text','text generator','textgenerator'].includes(effectId)&&parameter){b.add('title',{...common,text:value(parameter,'value'),fontSize:Math.min(112,height/5)});b.warnings.add('Basic text generator content is editable; font styling and animation are simplified.');continue;}
        let file=child(item,'file');if(file&&!children(file).length)file=files.get(attr(file,'id'));if(child(item,'file')&&!file)throw new Error(`Unresolved file reference for ${name}.`);
        const nested=!!child(item,'sequence'),path=value(file,'pathurl'),type=kind==='A'?'audio':value(item,'stillframe').toUpperCase()==='TRUE'||/\.(png|jpe?g|webp|gif|bmp|tiff?)(?:$|\?)/i.test(path)?'image':'video',sourceFps=frameRate(item,frameRate(file,fps)),sourceIn=frames(item,'in',0)/sourceFps,sourceOut=frames(item,'out',sourceIn*sourceFps+duration*sourceFps)/sourceFps;
        let playbackRate=type==='image'?1:(sourceOut-sourceIn)/duration;if(Math.abs(playbackRate-1)<1e-6)playbackRate=1;
        if(playbackRate<.1||playbackRate>16)throw new Error(`${name}: reverse playback or unsupported speed. Render this clip before XML export.`);
        if(playbackRate!==1)b.warnings.add(`${name}: playback speed was inferred from source and timeline durations; verify any time remapping.`);
        if(nested||!file)b.warnings.add(`${name}: nested sequence or unsupported generator needs a rendered replacement. Timing is preserved as an offline clip.`);
        if(child(item,'filter'))b.warnings.add('Clip effects and animated parameters are not reproduced.');
        const identity=file?'file:'+attr(file,'id'):nested?'sequence:'+attr(child(item,'sequence'),'id'):'generator:'+attr(item,'id'),assetId=b.asset(path,type,value(file,'name',name),Math.max(sourceOut,frames(file,'duration',0)/frameRate(file,fps)),identity.endsWith(':')?'':identity);
        b.add(type,{...common,assetId,sourceIn,playbackRate});
      }
    }
  }
  b.project.duration=Math.max(b.project.duration,frames(sequence,'duration',0)/fps);
  return {...b.finish(),sequences:sequences.map(({id,name})=>({id,name})),sequenceId:selected.id};
}

/** Parse locally only: paths remain metadata, and the caller commits the normalized result atomically. */
export async function readTimelineFile(input,name='',{sequenceId,DOMParser:Parser=globalThis.DOMParser}={}){
  const document=xmlDocument(await textInput(input),Parser),root=document.documentElement;
  if(root.nodeName==='PremiereData')return parsePremiere(root,sequenceId);
  if(root.nodeName==='xmeml')return parseXmeml(root,sequenceId);
  if(root.nodeName==='fcpxml')throw new Error('This is modern Final Cut Pro XML. In Premiere choose File → Export → Final Cut Pro XML to create a legacy xmeml XML file.');
  throw new Error('Choose a Premiere .prproj or Premiere-exported Final Cut Pro XML file. Renaming another format does not convert it.');
}
