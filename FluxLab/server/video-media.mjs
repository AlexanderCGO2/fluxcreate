import {lookup} from 'node:dns/promises';
import https from 'node:https';
import {isIP} from 'node:net';
import {Readable,Transform} from 'node:stream';

export const MAX_VIDEO_BYTES=64*1024*1024;
export function publicVideoURL(value){
 if(typeof value!=='string'||value.length>8192)throw Error('Invalid video URL.');
 let url;try{url=new URL(value);}catch{throw Error('Invalid video URL.');}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.port&&url.port!=='443'||isIP(url.hostname.replace(/^\[|\]$/g,''))||!url.hostname.includes('.')||/(?:^|\.)(?:localhost|local|internal|home|lan)$/.test(url.hostname))throw Error('The provider returned an unsupported video address.');
 return url;
}
export function publicAddress(address){
 if(isIP(address)===4){const [a,b,c]=address.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);}
 if(isIP(address)===6){const text=address.toLowerCase();return /^[23][0-9a-f]{3}:/.test(text)&&!/^2001:(?:0*:|0*db8:|0*1[0-9a-f]:)/.test(text)&&!text.startsWith('2002:')&&!text.includes('.');}return false;
}
export function videoSignature(bytes,mimeType){return mimeType==='video/mp4'?bytes.length>=12&&bytes.toString('ascii',4,8)==='ftyp':mimeType==='video/webm'&&bytes.length>=4&&bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));}

/** Fetch only provider-returned HTTPS media; pin a validated DNS result on every redirect. */
export async function fetchPublicVideo(value,{signal,mimeType,maxBytes=MAX_VIDEO_BYTES,redirects=3,lookupImpl=lookup}={}){
 const url=publicVideoURL(value),addresses=await lookupImpl(url.hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(item=>!publicAddress(item.address)))throw Error('The provider returned an inaccessible video address.');
 const pinned=addresses[0],requestSignal=AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(60000)]);
 return new Promise((resolve,reject)=>{
  const req=https.get(url,{signal:requestSignal,headers:{accept:mimeType},lookup:(_hostname,options,callback)=>options.all?callback(null,[pinned]):callback(null,pinned.address,pinned.family)},response=>{
   const status=response.statusCode;
   if([301,302,303,307,308].includes(status)){response.resume();if(!redirects||!response.headers.location){reject(Error('The provider video could not be downloaded.'));return;}fetchPublicVideo(new URL(response.headers.location,url).href,{signal:requestSignal,mimeType,maxBytes,redirects:redirects-1,lookupImpl}).then(resolve,reject);return;}
   const length=Number(response.headers['content-length']),receivedType=String(response.headers['content-type']||'').split(';')[0].toLowerCase();
   if(status!==200||length>maxBytes||receivedType&&![mimeType,'application/octet-stream','binary/octet-stream'].includes(receivedType)){response.destroy();reject(Error(length>maxBytes?'The video exceeds the 64 MiB download limit.':'The provider video is unavailable or has an unsupported format.'));return;}
   let size=0,checked=false,head=Buffer.alloc(0);const bounded=new Transform({transform(chunk,_encoding,callback){size+=chunk.length;if(size>maxBytes){callback(Error('The video exceeds the 64 MiB download limit.'));return;}if(!checked){head=Buffer.concat([head,chunk]);if(head.length<12){callback();return;}if(!videoSignature(head,mimeType)){callback(Error('The provider returned invalid video content.'));return;}checked=true;this.push(head);head=null;}else this.push(chunk);callback();},flush(callback){callback(checked?undefined:Error('The provider returned incomplete video content.'));}});
   response.on('error',error=>bounded.destroy(error));bounded.on('close',()=>response.destroy());response.pipe(bounded);
   resolve({body:Readable.toWeb(bounded),mimeType,...(Number.isFinite(length)&&length>0?{length}:{})});
  });req.on('error',reject);
 });
}

/** Chunked output avoids the hosted function's buffered JSON response ceiling. */
export async function sendVideoContent(res,content){
 const {body,mimeType}=content;if(!['video/mp4','video/webm'].includes(mimeType))throw Error('Unsupported video response.');
 const reader=Buffer.isBuffer(body)||body instanceof Uint8Array?null:body?.getReader?.();let sent=0;
 try{
  // Read the first chunk before sending headers so initial provider errors remain JSON errors.
  const first=reader?await reader.read():{done:false,value:body};if(first.done||!first.value?.byteLength)throw Error('The video content is empty.');
  res.writeHead(200,{'Content-Type':mimeType,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':`inline; filename="fluxlab-video.${mimeType==='video/mp4'?'mp4':'webm'}"`});
  async function write(value){sent+=value.byteLength;if(sent>MAX_VIDEO_BYTES)throw Error('The video exceeds the download limit.');for(let at=0;at<value.byteLength;at+=65536){if(res.destroyed)throw Error('Download cancelled.');if(!res.write(value.subarray(at,at+65536)))await new Promise((resolve,reject)=>{const clear=()=>{res.removeListener('drain',drain);res.removeListener('close',close);res.removeListener('error',close);},drain=()=>{clear();resolve();},close=()=>{clear();reject(Error('Download cancelled.'));};res.once('drain',drain);res.once('close',close);res.once('error',close);});}}
  await write(first.value);if(reader)while(true){const {done,value}=await reader.read();if(done)break;await write(value);}res.end();
 }catch(error){if(res.headersSent){res.destroy();return;}throw error;}finally{await reader?.cancel().catch(()=>{});reader?.releaseLock();}
}
