import {createMcpHandler} from '@modelcontextprotocol/server';
import {createHash} from 'node:crypto';
import {createMcpServer} from './mcp.mjs';
import {createLabService,LabError} from './service.mjs';
import {snapshotCloudflare,cloudflareFor} from '../../FluxCreate/server/cloudflare-connection.mjs';

const LIMIT=4*1024*1024;
const hash=value=>createHash('sha256').update(value).digest('hex');
const json=(res,status,value)=>{if(res.destroyed)return;res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
async function readBody(req){
 if(req.body!==undefined){const text=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(text)>LIMIT)throw new LabError('This request is too large.',413);return text;}
 if(Number(req.headers['content-length'])>LIMIT){req.resume();throw new LabError('This request is too large.',413);}
 return new Promise((resolve,reject)=>{let size=0,done=false;const parts=[];const fail=e=>{if(done)return;done=true;parts.length=0;req.resume();reject(e);};req.on('data',part=>{if(done)return;size+=part.length;if(size>LIMIT)return fail(new LabError('This request is too large.',413));parts.push(part);});req.once('end',()=>{if(!done){done=true;resolve(Buffer.concat(parts).toString());}});req.once('error',()=>fail(new LabError('Request could not be read.')));req.once('aborted',()=>fail(new LabError('Request cancelled.',499)));});
}

/** Process-local duplicate protection. Never retries an uncertain paid request. */
export function createRequestLedger({now=Date.now,maxEntries=128,maxBytes=32*1024*1024,ttl=30*60*1000}={}){
 const records=new Map();let bytes=0;
 return async function once(key,input,operation){
  for(const[k,r]of records)if(r.completed&&now()-r.time>ttl){records.delete(k);bytes-=r.bytes;}
  const digest=hash(JSON.stringify(input)),old=records.get(key);
  if(old){if(old.digest!==digest)throw new LabError('This request ID already belongs to a different request.',409);return old.promise;}
  if(records.size>=maxEntries||bytes>=maxBytes)throw new LabError('The AI request cache is full. Wait before starting another request.',429);
  const record={digest,time:now(),bytes:0,completed:false};
  record.promise=Promise.resolve().then(operation).then(result=>{record.bytes=Buffer.byteLength(JSON.stringify(result));bytes+=record.bytes;return result;}).finally(()=>{record.completed=true;record.time=now();});
  // Retain rejected promises too: a timeout must never silently repeat provider work.
  record.promise.catch(()=>{});records.set(key,record);return record.promise;
 };
}

export function createEditorMcpHandler({appId,service=createLabService(),editor,ledger=createRequestLedger(),hosted=false}={}){
 return async function handle(req,res,{connection}={}){
  let handler;const aborter=new AbortController(),abort=()=>{if(!res.writableEnded)aborter.abort();};
  const saved=connection===undefined?undefined:Object.freeze({...connection,cloudflare:snapshotCloudflare(connection?.cloudflare)}),cloudflare=cloudflareFor(saved);
  req.once('aborted',abort);res.once('close',abort);
  try{
   const expected=(hosted?'https://':'http://')+req.headers.host;
   if(req.headers['x-fluxcreate-mcp']!=='1'||req.headers.origin&&req.headers.origin!==expected||req.headers['sec-fetch-site']==='cross-site')throw new LabError('Open AI from this workspace.',403);
   if(req.method!=='POST')return json(res,405,{error:'Use the AI workspace connection.'});
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new LabError('Send a JSON MCP request.',415);
   const encoded=await readBody(req);let body;try{body=JSON.parse(encoded);}catch{throw new LabError('Send a valid MCP request.');}
   if(!body||Array.isArray(body)||typeof body!=='object')throw new LabError('Send one MCP request.');
   const scope=hash(JSON.stringify([saved===undefined?'suite\0'+(process.env.AI_GATEWAY_API_KEY||''):[saved.apiKey,saved.scopeId,saved.mode],cloudflare?.scopeId||'']));
   const requestId=body.params?._meta?.['fluxcreate/requestId'];
   const paid=body.method==='tools/call'&&!['fluxlab_catalog','fluxlab_music_status'].includes(body.params?.name);
   if(paid&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId||''))throw new LabError('Include a unique AI request ID.');
   const once=(name,input,operation)=>ledger(`${appId}:${scope}:${requestId}`,{name,input},operation);
   const guarded={...service};
   for(const name of ['generate','editImage','startVideo','generateAudio','generateMusic'])if(typeof service[name]==='function')guarded[name]=(input,options)=>once(name,input,()=>service[name](input,options));
   const edit=editor?{...editor,plan:(input,options)=>once('edit',input,()=>editor.plan(input,options))}:undefined;
   handler=createMcpHandler(()=>createMcpServer({service:guarded,connection:saved,signal:aborter.signal,editor:edit}),{legacy:'stateless',responseMode:'auto',maxRequestBodySize:LIMIT});
   const headers=new Headers();for(const[k,v]of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
   const request=new Request(expected+req.url,{method:'POST',headers,body:encoded,signal:aborter.signal});
   const response=await handler.fetch(request);
   if(res.destroyed)return;
   const outgoing=Object.fromEntries(response.headers);outgoing['cache-control']='no-store';outgoing['x-content-type-options']='nosniff';res.writeHead(response.status,outgoing);
   if(response.body){const reader=response.body.getReader();try{while(true){const part=await reader.read();if(part.done)break;if(res.destroyed){await reader.cancel();break;}res.write(part.value);}}finally{reader.releaseLock();}}
   res.end();
  }catch(error){if(!res.headersSent)json(res,error instanceof LabError?error.status:500,{error:error instanceof LabError?error.message:'The AI connection could not complete this request.'});else res.end();}
  finally{req.off('aborted',abort);res.off('close',abort);await handler?.close();}
 };
}
