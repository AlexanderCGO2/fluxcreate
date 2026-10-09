import {normalizeSuiteSource,validateSuitePreview} from '../../FluxCreate/shared/suite-source.mjs';
import {validateProject,newLayer} from './model.mjs';

export function placeSuiteObject(project,prepared,{replaceId}={}){
 const source=normalizeSuiteSource(prepared.source),size=validateSuitePreview(prepared.preview.src);
 if(!source||size.width!==prepared.preview.width||size.height!==prepared.preview.height)throw Error('This studio object preview is invalid.');
 const before=replaceId&&project.layers.find(l=>l.id===replaceId);
 if(replaceId&&(!before||before.locked||!before.suiteSource))throw Error('Select an unlocked studio object to update.');
 const factor=Math.min(1,project.width*.85/size.width,project.height*.85/size.height),width=size.width*factor,height=size.height*factor;
 const layer=before?{...before,src:prepared.preview.src,suiteSource:source}:newLayer('image',{name:source.name,src:prepared.preview.src,suiteSource:source,width,height,x:(project.width-width)/2,y:(project.height-height)/2});
 return {project:validateProject({...project,layers:before?project.layers.map(l=>l.id===before.id?layer:l):[layer,...project.layers]}),layerId:layer.id};
}
