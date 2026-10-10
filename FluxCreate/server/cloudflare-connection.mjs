import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';

export const CLOUDFLARE_TTL=30*24*60*60*1000;
const AAD=Buffer.from('fluxcreate:cloudflare-connection:v1');
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export const invalidCloudflare=()=>Object.freeze({mode:'invalid',accountId:'',gatewayId:'',apiToken:'',scopeId:'cloudflare:invalid',available:false,allowMusic:false,allowTextFallback:false,reason:'Your Cloudflare connection expired or could not be read. Reconnect or remove it in General settings.'});
export function validateCloudflare(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw fail('Enter valid Cloudflare settings.');
 if(typeof value.accountId!=='string'||! /^[a-f0-9]{32}$/i.test(value.accountId))throw fail('Enter a 32-character Cloudflare account ID.');
 if(typeof value.gatewayId!=='string'||! /^[a-z0-9][a-z0-9_-]{0,63}$/.test(value.gatewayId))throw fail('Enter a valid Cloudflare gateway ID.');
 if(typeof value.apiToken!=='string'||value.apiToken.length<16||value.apiToken.length>1024||! /^[\x21-\x7e]+$/.test(value.apiToken))throw fail('Enter a valid Cloudflare API token.');
 for(const field of ['allowMusic','allowTextFallback'])if(value[field]!==undefined&&typeof value[field]!=='boolean')throw fail('Choose whether to enable Cloudflare music and text fallback.');
 return value;
}
// Copy only bounded primitive fields. The caller's object and environment may change
// after this request starts; neither may change its billing account in flight.
export function snapshotCloudflare(value){
 if(value===undefined||value===null)return undefined;
 if(value.mode==='invalid'||value.available===false)return invalidCloudflare();
 try{validateCloudflare(value);}catch{return invalidCloudflare();}
 const mode=value.mode==='suite'?'suite':'personal',accountId=value.accountId.toLowerCase(),gatewayId=value.gatewayId,apiToken=value.apiToken;
 const scopeId='cloudflare:'+createHash('sha256').update(JSON.stringify([mode,accountId,gatewayId,apiToken])).digest('hex');
 return Object.freeze({mode,accountId,gatewayId,apiToken,scopeId,available:true,allowMusic:value.allowMusic===true,allowTextFallback:value.allowTextFallback===true,...(Number.isFinite(value.expiresAt)?{expiresAt:value.expiresAt}:{})});
}
export function cloudflareFor(connection,{env=process.env}={}){
 if(connection&&Object.hasOwn(connection,'cloudflare'))return snapshotCloudflare(connection.cloudflare);
 if(connection!==undefined&&connection?.mode!=='suite')return undefined;
 if(!env.CLOUDFLARE_ACCOUNT_ID||!env.CLOUDFLARE_API_TOKEN)return undefined;
 return snapshotCloudflare({mode:'suite',accountId:env.CLOUDFLARE_ACCOUNT_ID,gatewayId:env.CLOUDFLARE_GATEWAY_ID||'default',apiToken:env.CLOUDFLARE_API_TOKEN,allowMusic:env.FLUXCREATE_CLOUDFLARE_MUSIC==='true',allowTextFallback:env.FLUXCREATE_CLOUDFLARE_FALLBACK==='true'});
}
export function publicCloudflareStatus(context){
 const value=snapshotCloudflare(context);
 return {mode:value?.mode||'none',available:value?.available===true,configured:!!value&&value.mode!=='invalid',verified:false,accessVerified:false,creditsVerified:false,storage:'browser',allowMusic:value?.allowMusic===true,allowTextFallback:value?.allowTextFallback===true,...(value?.available?{accountId:value.accountId,gatewayId:value.gatewayId,scopeId:value.scopeId}:{}),...(value?.expiresAt?{expiresAt:value.expiresAt}:{}),...(value?.reason?{reason:value.reason}:{})};
}
export const cloudflareCookieName=hosted=>hosted?'__Host-fluxcreate_cloudflare':'fluxcreate_cloudflare';
export function cloudflareCookie(req,hosted=false){const name=cloudflareCookieName(hosted),matches=(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):matches.length?'invalid':undefined;}
export function sealCloudflareConnection(value,key){
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(AAD);
 return Buffer.concat([iv,cipher.update(JSON.stringify(value)),cipher.final(),cipher.getAuthTag()]).toString('base64url');
}
export async function resolveCloudflareConnection(req,{hosted=false,key,getKey,now=Date.now()}={}){
 const cookie=cloudflareCookie(req,hosted);if(cookie===undefined)return undefined;
 try{
  if(typeof cookie!=='string'||cookie.length>3000||! /^[A-Za-z0-9_-]+$/.test(cookie))return invalidCloudflare();
  const secret=key||await getKey?.(hosted);if(!secret)return invalidCloudflare();
  const bytes=Buffer.from(cookie,'base64url');if(bytes.length<30)return invalidCloudflare();const decipher=createDecipheriv('aes-256-gcm',secret,bytes.subarray(0,12));decipher.setAAD(AAD);decipher.setAuthTag(bytes.subarray(-16));
  const value=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(12,-16)),decipher.final()]).toString('utf8'));
  if(value.v!==1||!Number.isFinite(value.expiresAt)||value.expiresAt<=now||value.expiresAt>now+CLOUDFLARE_TTL+60000)return invalidCloudflare();
  return snapshotCloudflare({...value,mode:'personal'});
 }catch{return invalidCloudflare();}
}
export async function checkCloudflareToken(value,{fetchImpl=fetch}={}){
 validateCloudflare(value);
 try{
  const response=await fetchImpl('https://api.cloudflare.com/client/v4/user/tokens/verify',{headers:{Authorization:`Bearer ${value.apiToken}`,Accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error',cache:'no-store'});
  if(!response.ok){await response.body?.cancel().catch(()=>{});if(response.status===401||response.status===403)throw fail('Cloudflare did not accept this token. Check it and try again.',401);throw fail('Cloudflare could not verify this token. Try again shortly.',response.status===429?429:502);}
  const reader=response.body?.getReader();if(!reader)throw fail('Cloudflare returned an incomplete token response.',502);const chunks=[];let size=0;
  try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>65536){await reader.cancel();throw fail('Cloudflare returned an unexpected token response.',502);}chunks.push(Buffer.from(part.value));}}finally{reader.releaseLock();}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(body?.success!==true||body.result?.status!=='active')throw fail('Cloudflare did not confirm an active token.',401);
  return {valid:true,verified:true,accessVerified:false,creditsVerified:false,checkedAt:new Date().toISOString(),message:'Token is active. Account access, Workers AI Read permission, model access and billing credits are not verified.'};
 }catch(error){if(error.status)throw error;throw fail('Cloudflare could not be reached or returned an unreadable response. Try again.',502);}
}
