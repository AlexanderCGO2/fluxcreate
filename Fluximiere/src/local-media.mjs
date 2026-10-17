export const MEDIA_FILE_BYTES=512*1024*1024;
export const MEDIA_TOTAL_BYTES=2*1024*1024*1024;
export const mediaSource=asset=>asset?.blob instanceof Blob?asset.blob:asset?.src||'';
export const hasMedia=asset=>!!mediaSource(asset);
export function validateMediaBlob(blob,type){
 if(!(blob instanceof Blob)||!blob.size||blob.size>MEDIA_FILE_BYTES||!(blob.type.startsWith(type+'/')||type==='audio'&&blob.type.startsWith('video/')))throw Error('Use a supported local media file up to 512 MiB.');
 return blob;
}
export function openMediaURL(asset){const source=mediaSource(asset);if(source instanceof Blob){const url=URL.createObjectURL(source);return {url,release:()=>URL.revokeObjectURL(url)};}return {url:source,release:()=>{}};}

// Fixed-size chunks keep integrity checks bounded even for large originals.
const CHUNK=2*1024*1024,hex=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
export async function digestMedia(blob,algorithm='sha256',signal){
 const check=()=>{if(signal?.aborted)throw new DOMException('Media check cancelled.','AbortError');};check();
 if(algorithm==='sha256'){const result=hex(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));check();return result;}
 if(algorithm!=='sha256-chunks-v1')throw Error('Unsupported media fingerprint.');
 const hashes=[];for(let offset=0;offset<blob.size;offset+=CHUNK){check();hashes.push(hex(await crypto.subtle.digest('SHA-256',await blob.slice(offset,offset+CHUNK).arrayBuffer())));}
 check();return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({algorithm,chunkSize:CHUNK,size:blob.size,hashes}))));
}
