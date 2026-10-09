import {inspectSceneFile} from '../../Flux3D/src/scene-loader.mjs';
import {uid} from './core.mjs';
export function isNativeScene(text){try{const value=JSON.parse(typeof text==='string'?text.replace(/^\uFEFF/,''):text);return value?.format==='flux3d-project'||value?.format==='fluxcreate-project'&&value.app==='flux3d';}catch{return false;}}
function base64(bytes){let result='';for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(result);}
export async function prepareSceneAsset(file){
 if(!file||file.size>64*1024*1024)throw Error('Keep 3D scenes under 64 MB.');
 const bytes=await file.arrayBuffer(),info=await inspectSceneFile(bytes,file.name);
 const mime={glb:'model/gltf-binary',gltf:'model/gltf+json',flux3d:'application/vnd.flux3d+json'}[info.modelFormat];if(!mime)throw Error('This 3D scene format is unsupported.');
 return {asset:{id:uid(),name:file.name,type:'model3d',modelFormat:info.modelFormat,src:`data:${mime};base64,${base64(new Uint8Array(bytes))}`,width:1000,height:750,duration:info.duration||0,clips:info.clips||[]},warnings:info.warnings||[]};
}
