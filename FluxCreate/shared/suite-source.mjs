// Embedded sources are inert documents. Only the preview is used for rendering.
export const SUITE_SOURCE_LIMITS=Object.freeze({bytes:16*1024*1024,projectBytes:32*1024*1024,previewBytes:4*1024*1024,dimension:2048,pixels:4*1024*1024});
const APPS=new Set(['fluxoto','fluxidesign','fluximiere','fluxiffects','fluxini','flux3d']);
const trusted=new WeakSet(),byteCounts=new WeakMap();
const fail=message=>{throw Error(message);};
const text=(value,max,label)=>typeof value==='string'&&value.length<=max?value:fail(`Invalid embedded object ${label}.`);
function filename(value){const name=text(value,240,'filename').replaceAll('\\','/').split('/').at(-1).replace(/[\u0000-\u001f<>:"|?*]/g,'_');if(!name||!/(?:\.json|\.md|\.fluxoto|\.fluxidesign|\.fluximiere|\.fluxiffects|\.fluxini|\.flux3d|\.fluxcreate)$/i.test(name))fail('Embedded object source must be a native FluxCreate project or FluxExchange document.');return name;}
export function normalizeSuiteSource(raw){
 if(raw===undefined||raw===null)return null;if(trusted.has(raw))return raw;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.format!=='fluxcreate-object-source'||raw.version!==1||!['native','exchange'].includes(raw.kind))fail('Invalid embedded object source.');
 if(!APPS.has(raw.app))fail('Invalid embedded object source app.');
 const original=text(raw.text,SUITE_SOURCE_LIMITS.bytes,'document'),bytes=new TextEncoder().encode(original).byteLength;if(!bytes||bytes>SUITE_SOURCE_LIMITS.bytes)fail('Embedded object source must be smaller than 16 MiB.');
 const view={};if(raw.view!==undefined){if(!raw.view||typeof raw.view!=='object'||Array.isArray(raw.view))fail('Invalid embedded object view.');for(const key of Object.keys(raw.view)){if(['pageId','compositionId'].includes(key))view[key]=text(raw.view[key],100,'view');else if(key==='time'){if(typeof raw.view.time!=='number'||!Number.isFinite(raw.view.time)||raw.view.time<0||raw.view.time>86400)fail('Invalid embedded object frame time.');view.time=raw.view.time;}else fail('Unknown embedded object view.');}}
 const warnings=raw.warnings??[];if(!Array.isArray(warnings)||warnings.length>100)fail('Invalid embedded object notices.');
 const result=Object.freeze({format:'fluxcreate-object-source',version:1,app:raw.app,name:text(raw.name,240,'name'),filename:filename(raw.filename),kind:raw.kind,text:original,view:Object.freeze(view),warnings:Object.freeze(warnings.map(w=>text(w,500,'notice')))});trusted.add(result);byteCounts.set(result,bytes);return result;
}
export function makeSuiteSource(values){return normalizeSuiteSource({format:'fluxcreate-object-source',version:1,kind:'native',view:{},warnings:[],...values});}
export function suiteSourceBytes(source){const normalized=normalizeSuiteSource(source);return normalized?byteCounts.get(normalized):0;}
export function suiteSourceSummary(source){const s=normalizeSuiteSource(source);return s?{app:s.app,name:s.name,kind:s.kind,view:s.view}:null;}
export function suiteSourceDownload(source){const s=normalizeSuiteSource(source);if(!s)fail('This layer has no embedded source.');return {blob:new Blob([s.text],{type:s.kind==='exchange'?'text/markdown;charset=utf-8':'application/json;charset=utf-8'}),filename:s.filename};}
export function validateSuitePreview(src){
 if(typeof src!=='string'||src.length>SUITE_SOURCE_LIMITS.previewBytes||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(src))fail('Embedded objects need a PNG preview smaller than 4 MiB.');
 let bytes;try{bytes=Uint8Array.from(atob(src.slice(src.indexOf(',')+1,src.indexOf(',')+1+44)),c=>c.charCodeAt(0));}catch{fail('Invalid embedded PNG preview.');}
 if(bytes.length<24||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)||String.fromCharCode(...bytes.slice(12,16))!=='IHDR')fail('Invalid embedded PNG preview.');
 const view=new DataView(bytes.buffer),width=view.getUint32(16),height=view.getUint32(20);if(!width||!height||width>SUITE_SOURCE_LIMITS.dimension||height>SUITE_SOURCE_LIMITS.dimension||width*height>SUITE_SOURCE_LIMITS.pixels)fail('Embedded object previews must fit within 2048 × 2048 pixels.');return {width,height};
}
