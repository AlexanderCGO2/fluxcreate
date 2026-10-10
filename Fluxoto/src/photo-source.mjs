import {validateProject} from './model.mjs';
const TYPES={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml'};
export function checkPhotoFile(file){if(!file||!Number.isFinite(file.size)||file.size<=0||file.size>45000000)throw Error('Choose a photo up to 45 MB.');const mime=Object.values(TYPES).includes(file.type)?file.type:TYPES[file.name?.split('.').at(-1).toLowerCase()];if(!mime)throw Error('Choose PNG, JPEG, WebP, GIF or SVG.');return mime;}
export function checkPhotoSize(width,height){if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>16384||height>16384||width*height>33554432)throw Error('Resize this photo to at most 16384 pixels per side and 32 megapixels.');}
export function replacePhotoSource(raw,id,src){const project=validateProject(raw),layer=project.layers.find(l=>l.id===id);if(!layer||layer.type!=='image')throw Error('Select a photo layer to replace.');if(layer.locked)throw Error('Unlock this photo before replacing its source.');if(layer.suiteSource)throw Error('Use Replace source to update this studio object and its original document together.');if(typeof src!=='string'||!src)throw Error('Choose a decoded local photo.');layer.src=src;return validateProject(project);}
export function readPhotoSource(file,{signal}={}){
 const mime=checkPhotoFile(file);signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const reader=new FileReader(),image=new Image();let settled=false;
  const clean=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reader.onload=reader.onerror=null;image.onload=image.onerror=null;image.src='';};
  const finish=(error,value)=>{if(settled)return;settled=true;clean();if(reader.readyState===1)reader.abort();error?reject(error):resolve(value);};
  const cancel=()=>finish(new DOMException('Photo replacement cancelled.','AbortError'));
  const timer=setTimeout(()=>finish(Error('Reading this photo timed out. Try a smaller image.')),20000);
  signal?.addEventListener('abort',cancel,{once:true});
  reader.onerror=()=>finish(Error('Could not read this photo.'));image.onerror=()=>finish(Error('This photo could not be decoded. Try PNG, JPEG or WebP.'));
  reader.onload=()=>{if(settled)return;const src=reader.result;if(typeof src!=='string')return finish(Error('Could not read this photo.'));image.onload=()=>{if(settled)return;try{checkPhotoSize(image.naturalWidth,image.naturalHeight);finish(null,{src,width:image.naturalWidth,height:image.naturalHeight});}catch(error){finish(error);}};image.src=src;};
  reader.readAsDataURL(file.type===mime?file:new Blob([file],{type:mime}));
 });
}
