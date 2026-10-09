import * as THREE from 'three';
const states=new WeakMap();
export const getStudioTexture=mesh=>states.get(mesh);
export function forgetStudioTexture(mesh){const state=states.get(mesh);if(state)state.disposed=true;states.delete(mesh);}
// The mesh owns the texture, including loads completing after a replacement or removal.
export function disposeObjectMaterial(mesh){
 const state=states.get(mesh);if(state){state.disposed=true;state.texture.dispose();states.delete(mesh);}
 mesh.material.dispose();
}
export function syncObjectMaterial(mesh,object){
 const src=object.studioObject?.preview.src||null,previous=states.get(mesh);
 if(src!==previous?.src&&(src||previous)){
  disposeObjectMaterial(mesh);
  if(src){
   const texture=new THREE.Texture();texture.colorSpace=THREE.SRGBColorSpace;
   const state={src,texture,disposed:false,ready:null};states.set(mesh,state);
   state.ready=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{if(state.disposed){texture.dispose();resolve();return;}texture.image=image;texture.needsUpdate=true;resolve();};image.onerror=()=>{reject(Error('The studio preview could not be decoded. Replace its source to rebuild the preview.'));};image.src=src;});
   // Consumers await the original promise for truthful export errors; avoid an unhandled stale load.
   state.ready.catch(()=>{});
   mesh.material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,toneMapped:false});
  }else mesh.material=new THREE.MeshStandardMaterial({side:THREE.DoubleSide});
 }
 mesh.material.color.set(object.color);mesh.material.opacity=object.opacity;mesh.material.transparent=Boolean(src)||object.opacity<1;
 if(!src){mesh.material.metalness=object.metalness;mesh.material.roughness=object.roughness;}
 return states.get(mesh)?.ready||Promise.resolve();
}
export async function readyObjectTextures(meshes){await Promise.all([...meshes].map(mesh=>states.get(mesh)?.ready));}
