import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,link,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {connectionStatus} from './ai.mjs';
import {loadConnection} from '../../Haidini/server/connection.mjs';
import {cloudflareFor,cloudflareCookieName,resolveCloudflareConnection,publicCloudflareStatus,validateCloudflare,sealCloudflareConnection,checkCloudflareToken,CLOUDFLARE_TTL} from './cloudflare-connection.mjs';

const LOCAL_COOKIE='fluxcreate_connection',HOSTED_COOKIE='__Host-fluxcreate_connection';
const TTL=30*24*60*60*1000,AAD=Buffer.from('fluxcreate:gateway-connection:v1');
const dataDir=fileURLToPath(new URL('../.data/',import.meta.url));
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const invalid=reason=>Object.freeze({apiKey:'',available:false,mode:'invalid',scopeId:'invalid',reason});
const fingerprint=key=>createHash('sha256').update(key).digest('hex');
let localSecret;

// A shared local secret lets the independent localhost apps read the same cookie.
// Link a completed file atomically: concurrent server starts never replace a winner.
async function localKey(){
 if(!localSecret)localSecret=(async()=>{
  const file=path.join(dataDir,'connection-secret');await mkdir(dataDir,{recursive:true});
  try{return await readFile(file);}catch(error){if(error.code!=='ENOENT')throw error;}
  const temp=file+'.'+randomBytes(12).toString('hex');
  try{await writeFile(temp,randomBytes(32),{flag:'wx',mode:0o600});try{await link(temp,file);}catch(error){if(error.code!=='EEXIST')throw error;}return await readFile(file);}finally{await unlink(temp).catch(()=>{});}
 })().catch(error=>{localSecret=undefined;throw error;});
 const key=await localSecret;if(key.length!==32)throw fail('The local connection settings need a new encryption secret.',503);return key;
}
async function secretFor(hosted){
 const configured=process.env.FLUXCREATE_CONNECTION_SECRET;
 if(configured){if(!/^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{43})$/i.test(configured))throw fail('Private connection settings are not configured on this server.',503);return createHash('sha256').update(configured).digest();}
 if(hosted||process.env.VERCEL)throw fail('Private connection settings are not configured on this server.',503);
 return localKey();
}
export function sealConnection(payload,key){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(AAD);
 return Buffer.concat([iv,cipher.update(JSON.stringify(payload)),cipher.final(),cipher.getAuthTag()]).toString('base64url');
}
export function openConnection(value,key,now=Date.now()){
 try{if(typeof value!=='string'||value.length>3000||!/^[A-Za-z0-9_-]+$/.test(value))return null;const bytes=Buffer.from(value,'base64url');if(bytes.length<30)return null;const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));decipher.setAAD(AAD);decipher.setAuthTag(bytes.subarray(-16));const payload=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString('utf8'));if(payload.v!==1||!Number.isFinite(payload.expiresAt)||payload.expiresAt<=now||payload.expiresAt>now+TTL+60000)return null;validateKey(payload.apiKey);return payload;}catch{return null;}
}
function cookieValue(req,name){const matches=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):matches.length?'invalid':undefined;}
function validateKey(value){if(typeof value!=='string'||value.length<16||value.length>1024||!/^[\x21-\x7e]+$/.test(value))throw fail('Enter a valid Vercel AI Gateway key.');return value;}
async function resolveVercelConnection(req,{hosted=false,key:injectedKey,now=Date.now()}={}){
 const cookie=cookieValue(req,hosted?HOSTED_COOKIE:LOCAL_COOKIE);if(cookie===undefined)return undefined;
 let key;try{key=injectedKey||await secretFor(hosted);}catch{return invalid('Private connection settings are unavailable. Reconnect in General settings.');}
 const value=openConnection(cookie,key,now);if(!value)return invalid('Your personal connection expired or could not be read. Reconnect in General settings.');
 return Object.freeze({apiKey:value.apiKey,model:process.env.FLUXINI_MODEL||'anthropic/claude-sonnet-5',scopeId:fingerprint(value.apiKey),available:true,mode:'personal',expiresAt:value.expiresAt});
}
export async function resolveRequestConnection(req,options={}){
 // Capture the suite billing account before any asynchronous request work.
 const suiteCloudflare=cloudflareFor(undefined);
 const base=await resolveVercelConnection(req,options),personalCloudflare=await resolveCloudflareConnection(req,{...options,getKey:secretFor});
 const cloudflare=personalCloudflare??(base===undefined||base.mode==='suite'?suiteCloudflare:undefined);
 if(cloudflare===undefined)return base;
 if(base!==undefined)return Object.freeze({...base,cloudflare});
 let reason;try{await loadConnection(fileURLToPath(new URL('../../Haidini/.data/',import.meta.url)));}catch{reason='The suite AI connection is unavailable.';}
 const apiKey=reason?'':process.env.AI_GATEWAY_API_KEY||'';
 return Object.freeze({apiKey,model:process.env.FLUXINI_MODEL||'anthropic/claude-sonnet-5',scopeId:apiKey?fingerprint(apiKey):'suite:unavailable',mode:'suite',available:!!apiKey,...(reason?{reason}:{}),cloudflare});
}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(JSON.stringify(body));}
async function safeBody(req,fields=['apiKey']){
 if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw fail('Send JSON content.',415);
 let value;if(req.body!==undefined){const encoded=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(encoded)>4096)throw fail('The settings request is too large.',413);try{value=JSON.parse(encoded);}catch{throw fail('Send a valid settings request.');}}
 else{if(Number(req.headers['content-length'])>4096){req.resume();throw fail('The settings request is too large.',413);}const chunks=[];let size=0;for await(const part of req){size+=part.length;if(size>4096)throw fail('The settings request is too large.',413);chunks.push(part);}try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('Send a valid settings request.');}}
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!fields.includes(k)))throw fail('Unsupported connection settings.');if(value.apiKey!==undefined&&typeof value.apiKey!=='string')throw fail('Enter a valid Vercel AI Gateway key.');return value;
}
export async function checkGatewayKey(apiKey,{fetchImpl=fetch}={}){
 validateKey(apiKey);
 try{
  const response=await fetchImpl('https://ai-gateway.vercel.sh/v1/credits',{headers:{Authorization:`Bearer ${apiKey}`,Accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error',cache:'no-store'});
  if(!response.ok)await response.body?.cancel().catch(()=>{});
  if(response.status===401||response.status===403)throw fail('This Gateway key was not accepted. Check it and try again.',401);
  if(response.status===429)throw fail('Gateway is receiving too many connection checks. Try again shortly.',429);
  if(!response.ok)throw fail('Gateway could not verify this connection. Try again shortly.',502);
  const reader=response.body?.getReader();let bytes=0;const chunks=[];if(!reader)throw fail('Gateway returned an incomplete connection response.',502);
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>65536){await reader.cancel();throw fail('Gateway returned an unexpected connection response.',502);}chunks.push(Buffer.from(part.value));}}finally{reader.releaseLock();}
  let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('Gateway returned an unexpected connection response.',502);}
  const balance=body?.balance;if(typeof balance!=='number'&&(typeof balance!=='string'||! /^-?\d+(?:\.\d+)?$/.test(balance)))throw fail('Gateway returned an unexpected connection response.',502);
  const credits=Number(balance);if(!Number.isFinite(credits))throw fail('Gateway returned an unexpected connection response.',502);
  return {valid:true,credits,checkedAt:new Date().toISOString()};
 }catch(error){if(error.status)throw error;throw fail('Gateway could not be reached. Check your connection and try again.',502);}
}
function sameOrigin(req,hosted){const expected=(hosted?'https:':'http:')+'//'+req.headers.host;return req.headers.origin===expected&&req.headers['sec-fetch-site']!=='cross-site';}
const attempts=new Map();
function limitChecks(req){const now=Date.now();for(const[k,v]of attempts)if(v.until<=now)attempts.delete(k);const id=req.socket?.remoteAddress||'hosted';const entry=attempts.get(id)||{count:0,until:now+60000};if(++entry.count>12||(!attempts.has(id)&&attempts.size>=1000))throw fail('Too many connection checks. Try again in a minute.',429);attempts.set(id,entry);}
async function publicStatus(connection,status=connectionStatus){
 if(connection!==undefined)return {mode:connection.mode,available:connection.available,configured:connection.mode==='personal',storage:'browser',...(connection.expiresAt?{expiresAt:connection.expiresAt}:{}),...(connection.reason?{reason:connection.reason}:{})};
 const suite=await status();return{mode:suite.available?'suite':'none',available:!!suite.available,configured:false,storage:'browser',...(suite.reason?{reason:suite.reason}:{})};
}
export async function handleSettings(req,res,route,{hosted=false,key,validate=checkGatewayKey,status=connectionStatus,validateCloudflare:checkCloudflare=checkCloudflareToken}={}){
 if(['/settings/cloudflare','/settings/cloudflare/check'].includes(route))return handleCloudflareSettings(req,res,route,{hosted,key,checkCloudflare});
 if(!['/settings/connection','/settings/connection/check'].includes(route))return false;
 try{
  if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&!sameOrigin(req,hosted)))throw fail('Open settings from your FluxCreate workspace.',403);
  if(req.method==='GET'&&route==='/settings/connection'){send(res,200,await publicStatus(await resolveVercelConnection(req,{hosted,key}),status));return true;}
  if(!['POST','DELETE'].includes(req.method)||(req.method==='DELETE'&&route.endsWith('/check')))throw fail('Method not allowed.',405);
  if(!sameOrigin(req,hosted))throw fail('Save connection settings from your FluxCreate workspace.',403);
  const name=hosted?HOSTED_COOKIE:LOCAL_COOKIE,attributes=`; Path=/; HttpOnly; SameSite=Strict${hosted?'; Secure':''}`;
  if(req.method==='DELETE'){res.setHeader('Set-Cookie',`${name}=${attributes}; Max-Age=0`);send(res,200,await publicStatus(undefined,status));return true;}
  limitChecks(req);const input=await safeBody(req);let apiKey=input.apiKey?.trim();
  if(route.endsWith('/check')&&!apiKey){const current=await resolveVercelConnection(req,{hosted,key});if(current!==undefined){if(!current.available)throw fail(current.reason,401);apiKey=current.apiKey;}else{await loadConnection(fileURLToPath(new URL('../../Haidini/.data/',import.meta.url)));apiKey=process.env.AI_GATEWAY_API_KEY;}}
  validateKey(apiKey);
  // Check storage readiness before a network call. Failed checks never replace a cookie.
  const wrappingKey=route.endsWith('/check')?undefined:key||await secretFor(hosted);
  const result=await validate(apiKey);
  if(route.endsWith('/check')){send(res,200,{valid:true,credits:result.credits,checkedAt:result.checkedAt});return true;}
  const expiresAt=Date.now()+TTL;
  // Keep the expired envelope present longer than its credential lifetime so an
  // expired personal connection cannot silently charge the suite connection.
  res.setHeader('Set-Cookie',`${name}=${sealConnection({v:1,apiKey,expiresAt},wrappingKey)}${attributes}; Max-Age=31536000`);
  send(res,200,{mode:'personal',available:true,configured:true,storage:'browser',expiresAt,credits:result.credits});
 }catch(error){send(res,error.status||500,{error:error.status?error.message:'Connection settings could not be updated.'});}
 return true;
}
async function handleCloudflareSettings(req,res,route,{hosted,key,checkCloudflare}){
 try{
  if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&!sameOrigin(req,hosted)))throw fail('Open settings from your FluxCreate workspace.',403);
  const active=async()=>cloudflareFor(await resolveRequestConnection(req,{hosted,key}));
  if(req.method==='GET'&&!route.endsWith('/check')){send(res,200,publicCloudflareStatus(await active()));return true;}
  if(!['POST','DELETE'].includes(req.method)||(req.method==='DELETE'&&route.endsWith('/check')))throw fail('Method not allowed.',405);
  if(!sameOrigin(req,hosted))throw fail('Save connection settings from your FluxCreate workspace.',403);
  const name=cloudflareCookieName(hosted),attributes=`; Path=/; HttpOnly; SameSite=Strict${hosted?'; Secure':''}`;
  if(req.method==='DELETE'){res.setHeader('Set-Cookie',`${name}=${attributes}; Max-Age=0`);send(res,200,publicCloudflareStatus(cloudflareFor(await resolveVercelConnection(req,{hosted,key}))));return true;}
  limitChecks(req);const input=await safeBody(req,['accountId','gatewayId','apiToken','allowMusic','allowTextFallback']);
  let value;
  if(route.endsWith('/check')&&Object.keys(input).length===0){value=await active();if(!value?.available)throw fail('Add a Cloudflare connection before checking its token.',401);}
  else{const trim=v=>typeof v==='string'?v.trim():v;value={...input,accountId:trim(input.accountId),gatewayId:trim(input.gatewayId)??'default',apiToken:trim(input.apiToken)};validateCloudflare(value);}
  if(route.endsWith('/check')){const result=await checkCloudflare(value);send(res,200,{valid:result.valid===true,verified:result.verified===true,accessVerified:false,creditsVerified:false,checkedAt:result.checkedAt,message:'Token is active. Account access, Workers AI Read permission, model access and billing credits are not verified.'});return true;}
  const secret=key||await secretFor(hosted),expiresAt=Date.now()+CLOUDFLARE_TTL;
  res.setHeader('Set-Cookie',`${name}=${sealCloudflareConnection({...value,v:1,expiresAt},secret)}${attributes}; Max-Age=31536000`);
  send(res,200,publicCloudflareStatus({...value,mode:'personal',expiresAt}));
 }catch(error){send(res,error.status||500,{error:error.status?error.message:'Cloudflare settings could not be updated.'});}
 return true;
}
