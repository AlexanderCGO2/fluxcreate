import {appURL} from './registry.mjs';
import {isHosted} from './hosting.mjs';
const targets=new Set(['fluxoto','fluxidesign','fluximiere','fluxiffects']);
export function validateLabResult(value){
 if(!value||!['text','image'].includes(value.kind)||typeof value.id!=='string'||value.id.length>200)throw Error('This FluxLab result is not supported.');
 const result={id:value.id,kind:value.kind,model:String(value.model||'').slice(0,160),prompt:String(value.prompt||'').slice(0,6000),createdAt:String(value.createdAt||'').slice(0,50)};
 if(value.kind==='text'){if(typeof value.text!=='string'||!value.text.trim()||value.text.length>100000)throw Error('This text result is empty or too large.');result.text=value.text;}
 else{const im=value.images?.[0];if(!im||!['image/png','image/jpeg','image/webp'].includes(im.mimeType)||typeof im.src!=='string'||im.src.length>4000000||!im.src.startsWith(`data:${im.mimeType};base64,`)||!/^[A-Za-z0-9+/]*={0,2}$/.test(im.src.split(',')[1]))throw Error('Send one PNG, JPEG or WebP result smaller than 3 MB.');result.images=[{mimeType:im.mimeType,src:im.src}];}
 return result;
}
export function sendLabResult({targetApp,result}){
 if(!targets.has(targetApp))return Promise.reject(Error('Choose a compatible visual editor.'));
 let payload;try{payload=validateLabResult(result);}catch(e){return Promise.reject(e);}
 const nonce=crypto.randomUUID(),url=new URL(appURL(targetApp),location.href);url.hash=new URLSearchParams({fluxlab:nonce,from:location.origin}).toString();
 // Open during the click gesture so ordinary popup protection does not discard the handoff.
 const child=window.open(url.href,'_blank');if(!child)return Promise.reject(Error('Allow this popup to send the result, or download it and import it into your editor.'));
 return new Promise((resolve,reject)=>{const timer=setTimeout(()=>finish(Error('The editor did not receive this result. Open it from FluxCreate, then try again.')),25000);function finish(error){clearTimeout(timer);removeEventListener('message',receive);error?reject(error):resolve({sent:true});}function receive(e){if(e.source!==child||e.origin!==url.origin||e.data?.nonce!==nonce)return;if(e.data.type==='fluxlab-ready')child.postMessage({type:'fluxlab-result',nonce,result:payload},url.origin);if(e.data.type==='fluxlab-received')finish();}addEventListener('message',receive);});
}
export function receiveLabResult(callback){
 const params=new URLSearchParams(location.hash.slice(1)),nonce=params.get('fluxlab'),parent=window.opener;if(!nonce||!parent||!/^[\w-]{36}$/.test(nonce))return()=>{};
 const canonical=new URL(appURL('fluxlab'),location.href).origin,allowed=new Set(isHosted()?[canonical]:['http://localhost:4326','http://127.0.0.1:4326']),origin=params.get('from')||canonical;if(!allowed.has(origin))return()=>{};let received=false;
 const ready=()=>parent.postMessage({type:'fluxlab-ready',nonce},origin);
 const listener=e=>{if(received||e.source!==parent||e.origin!==origin||e.data?.nonce!==nonce||e.data?.type!=='fluxlab-result')return;let result;try{result=validateLabResult(e.data.result);}catch{return;}received=true;clearInterval(timer);callback(result);parent.postMessage({type:'fluxlab-received',nonce},origin);history.replaceState(null,'',location.pathname+location.search);};
 addEventListener('message',listener);const timer=setInterval(ready,400);ready();const expiry=setTimeout(()=>clearInterval(timer),26000);return()=>{removeEventListener('message',listener);clearInterval(timer);clearTimeout(expiry);};
}
export function labImageFile(result){const im=validateLabResult(result).images?.[0];if(!im)throw Error('Choose an image result.');const bytes=Uint8Array.from(atob(im.src.split(',')[1]),c=>c.charCodeAt(0));return new File([bytes],`FluxLab-${result.id.slice(0,40)}.${im.mimeType==='image/jpeg'?'jpg':im.mimeType.split('/')[1]}`,{type:im.mimeType});}
