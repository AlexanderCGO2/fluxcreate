import {normalizeSuiteSource,validateSuitePreview} from '../../FluxCreate/shared/suite-source.mjs';
import {createLayer,getComp,parseProject,uid} from './core.mjs';

// Commit a prepared snapshot in one edit; retain source outside any AI-editable property.
export function placeSuiteObject(project,prepared,{replaceId}={}){
  const source=normalizeSuiteSource(prepared.source),preview=prepared.preview;
  if(!source)throw Error('A studio object needs its original source.');
  const size=validateSuitePreview(preview.src);if(size.width!==preview.width||size.height!==preview.height)throw Error('Studio preview dimensions do not match.');
  const next=structuredClone(project),comp=getComp(next),target=replaceId&&comp.layers.find(l=>l.id===replaceId);
  if(replaceId&&(!target||target.locked||!target.suiteSource))throw Error('Choose an unlocked studio object to refresh.');
  const asset={id:uid(),name:source.name,type:'image',src:preview.src,width:preview.width,height:preview.height};next.assets.push(asset);
  if(target){target.assetId=asset.id;target.suiteSource=source;}
  else{const scale=Math.min(1,comp.width/preview.width,comp.height/preview.height);comp.layers.unshift(createLayer('image',{name:source.name,assetId:asset.id,width:preview.width,height:preview.height,x:comp.width/2,y:comp.height/2,anchorX:preview.width/2,anchorY:preview.height/2,scaleX:scale,scaleY:scale,end:comp.duration,suiteSource:source}));}
  return {project:parseProject(JSON.stringify(next)).project,layerId:target?.id||comp.layers[0].id};
}
