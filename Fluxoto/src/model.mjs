import {normalizeLevels,hasActiveLevels} from './levels.mjs';
import {normalizeMask} from './masks.mjs';
import {normalizeSuiteSource,suiteSourceSummary,suiteSourceBytes,validateSuitePreview,SUITE_SOURCE_LIMITS} from '../../FluxCreate/shared/suite-source.mjs';
import { createBlankProject, createLayer, parseProject, evaluateLayer } from '../../Fluxiffects/src/core.mjs';

export const uid=()=>globalThis.crypto?.randomUUID?.()??`oto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const BLENDS=['normal','multiply','screen','overlay','darken','lighten','difference','soft-light','hard-light'];
const TYPES=['text','shape','image','stroke'];
const COLOR=/^(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\)|transparent|white|black)$/i;
const fail=message=>{throw new Error(message);};
const num=(v,d,min=-100000,max=100000)=>v===undefined?d:typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:fail(`A number between ${min} and ${max} is required.`);
const str=(v,d='',max=10000)=>v===undefined?d:typeof v==='string'&&v.length<=max?v:fail('Text is too long or invalid.');
const color=(v,d)=>v===undefined?d:typeof v==='string'&&COLOR.test(v)?v:fail('Use a hex color or transparent.');
const boolean=(v,d)=>v===undefined?d:typeof v==='boolean'?v:fail('Expected true or false.');
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:fail('Expected an object.');
const list=(v,d,max)=>v===undefined?d:Array.isArray(v)&&v.length<=max?v:fail('Too many items or invalid list.');

export function newLayer(type='shape',values={}) {
  return {id:uid(),name:type==='text'?'New text':type==='image'?'Photo':type==='stroke'?'Brush stroke':'Shape',x:180,y:180,width:360,height:240,rotation:0,opacity:1,visible:true,locked:false,blend:'normal',fill:'#2767ed',shape:'rectangle',radius:24,gradient:null,text:'Make something\nbeautiful.',fontSize:80,fontWeight:600,fontFamily:'Arial',textAlign:'left',lineHeight:1.12,src:'',points:[],brushSize:24,eraser:false,brightness:100,contrast:100,saturation:100,blur:0,mask:null,...values,type};
}

function normalizeLayer(raw) {
  obj(raw);if(!TYPES.includes(raw.type))fail('Unsupported layer type.');
  const b=newLayer(raw.type);
  const layer={id:str(raw.id,b.id,100),type:raw.type,name:str(raw.name,b.name,240),x:num(raw.x,b.x),y:num(raw.y,b.y),width:num(raw.width,b.width,1,16384),height:num(raw.height,b.height,1,16384),rotation:num(raw.rotation,0,-36000,36000),opacity:num(raw.opacity,1,0,1),visible:boolean(raw.visible,true),locked:boolean(raw.locked,false),blend:raw.blend===undefined?'normal':BLENDS.includes(raw.blend)?raw.blend:fail('Unsupported blend mode.'),fill:color(raw.fill,b.fill),shape:raw.shape===undefined?'rectangle':['rectangle','ellipse'].includes(raw.shape)?raw.shape:fail('Unsupported shape.'),radius:num(raw.radius,24,0,8192),gradient:null,text:str(raw.text,b.text,20000),fontSize:num(raw.fontSize,80,1,4000),fontWeight:num(raw.fontWeight,600,100,900),fontFamily:str(raw.fontFamily,'Arial',120),textAlign:raw.textAlign===undefined?'left':['left','center','right'].includes(raw.textAlign)?raw.textAlign:fail('Invalid text alignment.'),lineHeight:num(raw.lineHeight,1.12,0.5,4),src:str(raw.src,'',60000000),points:list(raw.points,[],50000).map(p=>{if(!Array.isArray(p)||p.length!==2)fail('Invalid brush point.');return[num(p[0],0),num(p[1],0)];}),brushSize:num(raw.brushSize,24,1,2000),eraser:boolean(raw.eraser,false),brightness:num(raw.brightness,100,0,300),contrast:num(raw.contrast,100,0,300),saturation:num(raw.saturation,100,0,300),blur:num(raw.blur,0,0,100)};
  if(!layer.id)fail('Layer id is required.');
  if(layer.src&&!/^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)[;,]/i.test(layer.src))fail('Import local images; remote or executable image sources are not supported.');
  if(raw.gradient!==undefined&&raw.gradient!==null){obj(raw.gradient);layer.gradient={from:color(raw.gradient.from,layer.fill),to:color(raw.gradient.to,layer.fill),angle:num(raw.gradient.angle,90,-36000,36000)};}
  layer.mask=normalizeMask(raw.mask);
  layer.levels=normalizeLevels(raw.levels);if(layer.levels&&layer.type!=='image')fail('Levels are supported on photo image layers only.');
  if(raw.suiteSource!==undefined&&raw.suiteSource!==null){if(layer.type!=='image')fail('Embedded objects require an image layer.');layer.suiteSource=normalizeSuiteSource(raw.suiteSource);validateSuitePreview(layer.src);}
  return layer;
}

export function validateProject(raw) {
  obj(raw);if(raw.format!=='fluxoto-project'||raw.version!==1)fail('Choose a Fluxfoto project or compatible FluxCreate file.');
  const layers=list(raw.layers,[],400).map(normalizeLayer),seen=new Set();for(const l of layers){if(seen.has(l.id))fail('Duplicate layer ids.');seen.add(l.id);}
  if(layers.reduce((sum,l)=>sum+suiteSourceBytes(l.suiteSource),0)>SUITE_SOURCE_LIMITS.projectBytes)fail('Embedded source documents in one canvas must total at most 32 MiB.');
  return {format:'fluxoto-project',version:1,id:str(raw.id,uid(),100),name:str(raw.name,'Untitled canvas',240),width:num(raw.width,1200,1,8192),height:num(raw.height,1500,1,8192),background:color(raw.background,'#f4efe6'),layers};
}

export function createDemoProject() {
  return validateProject({format:'fluxoto-project',version:1,id:'fluxoto-first-light',name:'The art of slowing down',width:1200,height:1500,background:'#f3efe5',layers:[
    newLayer('text',{id:'edition',name:'Edition / 001',text:'FLUX JOURNAL                                   VOLUME 01 / 2026',x:82,y:66,width:1040,height:40,fontSize:20,fontWeight:500,fill:'#202e26'}),
    newLayer('text',{id:'headline',name:'The art of slowing down',text:'The art of\nslowing down.',x:77,y:150,width:1080,height:300,fontSize:129,fontFamily:'Georgia',fontWeight:400,lineHeight:0.96,fill:'#1e3d32'}),
    newLayer('text',{id:'caption',name:'A little room to breathe',text:'A LITTLE ROOM TO BREATHE.',x:84,y:1330,width:760,height:36,fontSize:20,fontWeight:600,fill:'#273e33'}),
    newLayer('text',{id:'footer',name:'Made with intention',text:'Stories, spaces, and everyday things.\nMade with intention. Collected with care.',x:84,y:1380,width:870,height:70,fontSize:21,fontWeight:400,fill:'#637064'}),
    newLayer('shape',{id:'sun',name:'A warm sun',shape:'ellipse',x:760,y:513,width:258,height:258,fill:'#f9d18b',gradient:{from:'#ffe9b0',to:'#eeae68',angle:120}}),
    newLayer('shape',{id:'river',name:'River / blue',x:270,y:614,width:360,height:674,rotation:30,radius:180,fill:'#7da3b1',gradient:{from:'#b4d0cb',to:'#658d9f',angle:130}}),
    newLayer('shape',{id:'leaf',name:'Leaf / olive',x:566,y:685,width:330,height:620,rotation:-34,radius:165,fill:'#788466',gradient:{from:'#a8b899',to:'#596d50',angle:120}}),
    newLayer('shape',{id:'stone',name:'Stone / terracotta',shape:'ellipse',x:85,y:863,width:398,height:398,fill:'#d49878',gradient:{from:'#e9b693',to:'#bc7f64',angle:120}}),
    newLayer('shape',{id:'artboard',name:'Quiet blue backdrop',x:64,y:481,width:1072,height:810,radius:400,fill:'#dae3da',gradient:{from:'#e4e7dc',to:'#c4d3c7',angle:90}}),
  ]});
}

export function resizeProject(project,width,height,scaleContent=false) {
  const sx=width/project.width,sy=height/project.height;
  return validateProject({...project,width,height,layers:scaleContent?project.layers.map(l=>({...l,x:l.x*sx,y:l.y*sy,width:l.width*sx,height:l.height*sy,fontSize:l.fontSize*Math.min(sx,sy),radius:l.radius*Math.min(sx,sy),brushSize:l.brushSize*Math.min(sx,sy),points:l.points.map(([x,y])=>[x*sx,y*sy])})):project.layers});
}
export function cropProject(project,rect){return validateProject({...project,width:rect.width,height:rect.height,layers:project.layers.map(l=>({...l,x:l.x-rect.x,y:l.y-rect.y}))});}

function strokeSource(l){const path=l.points.map(p=>p.join(',')).join(' ');return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}" height="${l.height}" viewBox="0 0 ${l.width} ${l.height}"><polyline points="${path}" fill="none" stroke="${l.fill}" stroke-width="${l.brushSize}" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`;}
export function toMotion(raw) {
  const project=validateProject(raw),motion=createBlankProject({name:project.name,width:project.width,height:project.height,background:project.background,duration:8});
  motion.id=project.id;const comp=motion.compositions[0];comp.id=`${project.id}-canvas`;motion.activeCompId=comp.id;
  comp.layers=project.layers.filter(l=>!l.eraser).map(l=>{
    let type=l.type==='shape'?l.shape:l.type==='stroke'?'image':l.type;
    const assetId=type==='image'?`asset-${l.id}`:null;
    if(assetId)motion.assets.push({id:assetId,name:l.name,type:'image',src:l.type==='stroke'?strokeSource(l):l.src,width:l.width,height:l.height,missing:l.type==='image'&&!l.src});
    return createLayer(type,{id:l.id,name:l.name,x:l.x+l.width/2,y:l.y+l.height/2,anchorX:l.width/2,anchorY:l.height/2,width:l.width,height:l.height,rotation:l.rotation,opacity:l.opacity,visible:l.visible,locked:l.locked,fill:l.fill,gradient:l.gradient??undefined,cornerRadius:l.radius,text:l.text,fontSize:l.fontSize,fontWeight:l.fontWeight,fontFamily:l.fontFamily,textAlign:l.textAlign,letterSpacing:0,blendMode:l.blend,assetId,end:8,effects:[['brightness',l.brightness],['contrast',l.contrast],['saturate',l.saturation],['blur',l.blur]].filter(([type,a])=>a!==(type==='blur'?0:100)).map(([type,amount])=>({id:uid(),type,amount,enabled:true}))});
  });
  if(project.layers.some(l=>l.eraser))motion.warnings=['Eraser strokes stay editable in Fluxfoto native projects. Export a PNG to preserve their composite appearance in other apps.'];
  if(project.layers.some(l=>hasActiveLevels(l.levels)))motion.warnings=[...(motion.warnings||[]),'Levels remain editable in Fluxfoto. Use the rendered portable export to preserve their appearance in other apps.'];
  if(project.layers.some(l=>l.mask?.enabled))motion.warnings=[...(motion.warnings||[]),'Layer masks remain editable in Fluxfoto. Use the rendered portable export to preserve them in other apps.'];
  if(project.layers.some(l=>l.suiteSource))motion.warnings=[...(motion.warnings||[]),'Embedded suite objects are rendered snapshots in the portable scene. Save the native Fluxfoto project to retain their original source documents.'];
  return parseProject(JSON.stringify(motion)).project;
}
function stillTransform(layer){
  const radians=layer.rotation*Math.PI/180,dx=(layer.width/2-layer.anchorX)*layer.scaleX,dy=(layer.height/2-layer.anchorY)*layer.scaleY;
  const width=Math.max(1,layer.width*Math.abs(layer.scaleX)),height=Math.max(1,layer.height*Math.abs(layer.scaleY));
  return {x:layer.x+dx*Math.cos(radians)-dy*Math.sin(radians)-width/2,y:layer.y+dx*Math.sin(radians)+dy*Math.cos(radians)-height/2,width,height};
}
export function fromMotion(raw) {
  const {project:motion,warnings}=parseProject(JSON.stringify(raw));const c=motion.compositions.find(c=>c.id===motion.activeCompId)||motion.compositions[0];
  const layers=[];for(const input of c.layers){
    if(input.type==='scene3d'){warnings.push(`${input.name}: live 3D scenes stay editable in Fluxiffects. Export a PNG frame there to preserve their appearance in Fluxfoto; keep the original project for geometry and animation.`);continue;}
    if(input.type==='audio'||input.type==='null'){warnings.push(`Skipped ${input.name}: no still image content.`);continue;}
    if(input.type==='video'){warnings.push(`${input.name}: import a still frame or PNG into Fluxfoto.`);continue;}
    const l=evaluateLayer(input,0),asset=motion.assets.find(a=>a.id===l.assetId);
    if(l.parentId)warnings.push(`${l.name}: parent transforms need a rendered image for exact appearance.`);
    if(Object.keys(l.keyframes).length)warnings.push('Animation imported as the first frame. Use Fluxiffects to edit motion.');
    const src=asset?.src||'';if(src&&!src.startsWith('data:image/'))warnings.push(`${l.name}: relink its image locally.`);
    const fx=Object.fromEntries(l.effects.filter(e=>e.enabled).map(e=>[e.type,e.amount]));
    layers.push(newLayer(l.type==='text'?'text':l.type==='image'?'image':'shape',{id:l.id,name:l.name,x:l.x-l.anchorX*l.scaleX,y:l.y-l.anchorY*l.scaleY,width:Math.max(1,l.width*Math.abs(l.scaleX)),height:Math.max(1,l.height*Math.abs(l.scaleY)),rotation:l.rotation,opacity:l.opacity,visible:l.visible,locked:l.locked,blend:BLENDS.includes(l.blendMode)?l.blendMode:'normal',fill:l.fill,shape:l.type==='ellipse'?'ellipse':'rectangle',radius:l.cornerRadius,gradient:l.gradient??null,text:l.text,fontSize:l.fontSize,fontWeight:l.fontWeight,fontFamily:l.fontFamily,textAlign:l.textAlign,src:src.startsWith('data:image/')?src:'',brightness:Math.min(300,Math.max(0,fx.brightness??100)),contrast:Math.min(300,Math.max(0,fx.contrast??100)),saturation:Math.min(300,Math.max(0,fx.saturate??100)),blur:Math.min(100,Math.max(0,fx.blur||0))}));
  }
  for(const layer of layers){const source=c.layers.find(l=>l.id===layer.id);if(source){const sampled=evaluateLayer(source,0);Object.assign(layer,stillTransform(sampled));if(sampled.scaleX<0||sampled.scaleY<0)warnings.push(`${layer.name}: mirrored content needs a rendered PNG for exact appearance.`);}}
  return {project:validateProject({format:'fluxoto-project',version:1,id:uid(),name:motion.name,width:Math.min(c.width,8192),height:Math.min(c.height,8192),background:c.background,layers}),warnings:[...new Set(warnings)]};
}

const EDITABLE=['name','x','y','width','height','rotation','opacity','visible','blend','fill','shape','radius','gradient','text','fontSize','fontWeight','fontFamily','textAlign','lineHeight','brightness','contrast','saturation','blur','levels'];
function values(raw,allowed){obj(raw);for(const key of Object.keys(raw))if(!allowed.includes(key))fail(`AI cannot change ${key}.`);return raw;}
export function applyAICommands(raw,commands,{selection=[],scope='composition'}={}) {
  const project=validateProject(raw);if(!Array.isArray(commands)||commands.length>32)fail('AI proposals support at most 32 edits.');
  if(!['composition','selection','document','all'].includes(scope))fail('Unknown edit scope.');
  for(const c of commands){obj(c);values(c,c.type==='updateCanvas'?['type','values']:c.type==='addLayer'?['type','layer']:c.type==='updateLayer'?['type','id','values']:['type','id']);if(c.type==='updateCanvas'){if(scope==='selection')fail('Selection edits cannot change the canvas.');Object.assign(project,values(c.values,['name','width','height','background']));continue;}
    if(c.type==='addLayer'){if(scope==='selection')fail('Choose the whole canvas to add layers.');obj(c.layer);if(!['text','shape'].includes(c.layer.type))fail('AI can add editable text and shapes only.');values(c.layer,['id','type',...EDITABLE]);if(c.layer.id&&project.layers.some(l=>l.id===c.layer.id))fail('Duplicate layer id.');project.layers.unshift(newLayer(c.layer.type,c.layer));continue;}
    const index=project.layers.findIndex(l=>l.id===c.id);if(index<0)fail('The target layer no longer exists.');const l=project.layers[index];if(l.locked)fail(`Unlock ${l.name} before editing it.`);if(scope==='selection'&&!selection.includes(l.id))fail('AI can only edit selected layers.');
    if(c.type==='updateLayer')Object.assign(l,values(c.values,EDITABLE));else if(c.type==='deleteLayer')project.layers.splice(index,1);else if(c.type==='duplicateLayer'){if(scope==='selection')fail('Choose the whole canvas to duplicate layers.');project.layers.splice(index,0,{...structuredClone(l),id:uid(),name:`${l.name} copy`,x:l.x+24,y:l.y+24});}else fail(`Unsupported AI command: ${c.type}`);
  }
  return validateProject(project);
}
export function getAIContext(raw,{selection=[],scope='composition'}={}) {
  const p=validateProject(raw);return {name:p.name,width:p.width,height:p.height,background:p.background,layers:p.layers.filter(l=>scope!=='selection'||selection.includes(l.id)).map(l=>({...Object.fromEntries(Object.entries(l).filter(([key])=>!['src','points','mask','suiteSource'].includes(key))),...(l.suiteSource?{suiteSource:suiteSourceSummary(l.suiteSource)}:{})}))};
}
export const AI_SPEC={app:'Fluxfoto',description:'A layered image and graphic design editor. Coordinates are top-left pixels; layers are ordered topmost first. Keep compositions attractive and editable. Do not invent photo assets.',commands:[{type:'updateLayer',id:'existing-layer-id',values:{x:100,fill:'#316ee8'}},{type:'addLayer',layer:{type:'text',name:'Headline',text:'Create something beautiful',x:80,y:100,width:900,height:180,fontSize:80,fill:'#203c32'}},{type:'deleteLayer',id:'existing-layer-id'},{type:'duplicateLayer',id:'existing-layer-id'},{type:'updateCanvas',values:{background:'#f5f2e9',width:1200,height:1500}}],editableProperties:EDITABLE,limits:'Maximum 32 commands. No unlocking, media sources, code, or network. Selection scope edits only selected unlocked existing layers. Levels are for image layers only: {enabled:true,black:0,white:255,gamma:1}, black and white 0–255 with black below white, gamma 0.1–10. Levels alter RGB, not alpha; source pixels are not included in this context.'};
