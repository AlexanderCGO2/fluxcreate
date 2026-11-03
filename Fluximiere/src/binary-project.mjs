import {validateProject} from './model.mjs';
import {MEDIA_FILE_BYTES,MEDIA_TOTAL_BYTES} from './local-media.mjs';
const encoder=new TextEncoder(),MAGIC='FLUXIMIERE-BINARY-1\n',HEADER_LIMIT=4*1024*1024;
export async function embedProjectMedia(raw){
 const project=validateProject(raw);
 if(project.assets.reduce((n,a)=>n+(a.blob?.size??Math.ceil(a.src.length*.75)),0)>90*1024*1024)throw Error('Flux Exchange text export supports up to 90 MiB of media. Use the FluxVideo project export to preserve larger originals.');
 const assets=[];for(const a of project.assets){if(!a.blob){assets.push(a);continue;}const bytes=new Uint8Array(await a.blob.arrayBuffer()),pieces=[];for(let i=0;i<bytes.length;i+=32768)pieces.push(String.fromCharCode(...bytes.subarray(i,i+32768)));const {blob,...rest}=a;assets.push({...rest,src:`data:${blob.type};base64,${btoa(pieces.join(''))}`});}
 return validateProject({...project,assets});
}
export async function encodeBinaryProject(raw){
 const project=validateProject(raw),parts=[],media=[];
 for(const a of project.assets){const blob=a.blob??(a.src?await (await fetch(a.src)).blob():null);if(!blob)continue;if(blob.size>MEDIA_FILE_BYTES)throw Error('A source exceeds the 512 MiB project-file limit.');parts.push(blob);media.push({id:a.id,size:blob.size,mime:blob.type});}
 if(parts.reduce((n,b)=>n+b.size,0)>MEDIA_TOTAL_BYTES)throw Error('Project media exceeds 2 GiB.');
 const header=encoder.encode(JSON.stringify({format:'fluximiere-binary',version:1,project:{...project,assets:project.assets.map(({blob,...a})=>({...a,src:''}))},media}));
 if(header.length>HEADER_LIMIT)throw Error('The project metadata is too large.');const length=new Uint8Array(4);new DataView(length.buffer).setUint32(0,header.length);
 return new Blob([encoder.encode(MAGIC),length,header,...parts],{type:'application/octet-stream'});
}
export async function decodeBinaryProject(file){
 if(await file.slice(0,MAGIC.length).text()!==MAGIC)return null;
 if(file.size>MEDIA_TOTAL_BYTES+HEADER_LIMIT+MAGIC.length+4)throw Error('Binary project exceeds 2 GiB of media.');
 const prefix=await file.slice(MAGIC.length,MAGIC.length+4).arrayBuffer();if(prefix.byteLength!==4)throw Error('Truncated binary project header.');
 const length=new DataView(prefix).getUint32(0);let cursor=MAGIC.length+4+length;if(!length||length>HEADER_LIMIT||cursor>file.size)throw Error('Invalid binary project header size.');
 let data;try{data=JSON.parse(await file.slice(MAGIC.length+4,cursor).text());}catch{throw Error('Invalid binary project metadata.');}
 if(data?.format!=='fluximiere-binary'||data.version!==1||!Array.isArray(data.media)||data.media.length>500)throw Error('Unsupported binary project format.');
 const project=validateProject(data.project),seen=new Set();let size=0;
 for(const m of data.media){const a=project.assets.find(a=>a.id===m?.id);if(!a||seen.has(m.id)||!Number.isSafeInteger(m.size)||m.size<1||m.size>MEDIA_FILE_BYTES||typeof m.mime!=='string'||!(m.mime.startsWith(a.type+'/')||a.type==='audio'&&m.mime.startsWith('video/')))throw Error('Invalid binary media record.');seen.add(m.id);size+=m.size;if(size>MEDIA_TOTAL_BYTES||cursor+m.size>file.size)throw Error('Truncated binary media or invalid project size.');a.blob=file.slice(cursor,cursor+m.size,m.mime);a.src='';cursor+=m.size;}
 if(cursor!==file.size)throw Error('Unexpected trailing binary project data.');return validateProject(project);
}
