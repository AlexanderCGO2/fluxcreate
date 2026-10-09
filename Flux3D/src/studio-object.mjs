import {normalizeSuiteSource,suiteSourceBytes,suiteSourceSummary,validateSuitePreview,SUITE_SOURCE_LIMITS} from '../../FluxCreate/shared/suite-source.mjs';
export const STUDIO_OBJECT_PIXEL_BUDGET=16*1024*1024;
const trusted=new WeakSet();
export function normalizeStudioObject(raw){
 if(raw==null)return null;if(trusted.has(raw))return raw;
 if(typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid studio object.');
 const suiteSource=normalizeSuiteSource(raw.suiteSource);if(!suiteSource)throw Error('Studio objects need their original source.');
 const src=raw.preview?.src,size=validateSuitePreview(src),preview=Object.freeze({src,...size});
 const object=Object.freeze({suiteSource,preview});trusted.add(object);return object;
}
export function validateStudioObjectBudget(objects){let bytes=0,pixels=0;for(const object of objects){const source=object.studioObject;if(!source)continue;bytes+=suiteSourceBytes(source.suiteSource)+source.preview.src.length;pixels+=source.preview.width*source.preview.height;if(bytes>SUITE_SOURCE_LIMITS.projectBytes)throw Error('Studio sources and previews exceed this scene’s 32 MiB budget.');if(pixels>STUDIO_OBJECT_PIXEL_BUDGET)throw Error('Studio preview textures exceed this scene’s 16 megapixel budget.');}}
export function studioObjectSummary(object){return object?{source:suiteSourceSummary(object.suiteSource),previewSize:{width:object.preview.width,height:object.preview.height},fidelity:'Rendered snapshot on a plane; original source retained.'}:null;}
export function preparedStudioObject(prepared){return normalizeStudioObject({suiteSource:prepared.source,preview:prepared.preview});}
