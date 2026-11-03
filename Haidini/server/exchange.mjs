import { encodeExchange, decodeExchange, toFluxini, validateExchange } from '@flux-studio/exchange';
import { parseProject, ProjectError } from '../src/engine/project.ts';

const MAX_EXCHANGE=16*1024*1024;
export function exchangeSummary(envelope){
  return {name:envelope.name,sourceApp:envelope.sourceApp,brief:envelope.brief||'',notes:envelope.notes||'',canvas:envelope.canvas,canRestoreOriginal:envelope.sourceApp!=='fluxini'&&!!envelope.snapshots?.fluxini};
}
export function readExchange(markdown){
  if(typeof markdown!=='string'||Buffer.byteLength(markdown)>MAX_EXCHANGE)throw new ProjectError('Choose a Flux exchange file under 16 MB.');
  try{return decodeExchange(markdown);}catch(error){throw new ProjectError(error.message||'This Flux exchange file could not be read.');}
}
export function readExchangeMetadata(envelope){try{return validateExchange(envelope);}catch(error){throw new ProjectError(error.message||'The saved exchange metadata is invalid.');}}
export function preparePackage(pack,fonts){
  if(pack?.format!=='fluxini-project-v1')throw new ProjectError('This file does not contain a FluxEffects scene.');
  const project=parseProject(pack.project),assets=fonts.prepareAssets(pack.fonts);
  for(const node of project.graph.nodes.filter(n=>n.type==='text'))if(!assets.some(asset=>asset.id===node.params.font))fonts.get(node.params.font);
  return {project,assets};
}
export function prepareExchange(markdown,fonts,restoreOriginal=false){
  const exchange=readExchange(markdown);
  if(restoreOriginal&&!exchangeSummary(exchange).canRestoreOriginal)throw new ProjectError('This file has no earlier FluxEffects scene to restore.');
  let result;
  try{result=toFluxini(exchange,{restoreOriginal});}catch(error){throw new ProjectError(error.message||'This exchange file could not be converted.');}
  const prepared=preparePackage(result.package,fonts);
  return {...prepared,exchange:result.exchange||exchange,report:{...exchangeSummary(exchange),warnings:result.warnings,nodeCount:prepared.project.graph.nodes.filter(node=>node.type!=='output').length,animationCount:prepared.project.animations.length,restoredOriginal:restoreOriginal}};
}
export function exportExchange(project,fonts,previous,options={}){
  for(const field of ['brief','notes'])if(options[field]!==undefined&&(typeof options[field]!=='string'||options[field].length>(field==='brief'?6000:12000)))throw new ProjectError(field==='brief'?'Keep the creative brief under 6,000 characters.':'Keep handoff notes under 12,000 characters.');
  let markdown;
  try{markdown=encodeExchange({app:'fluxini',project,fonts:fonts.assets(project),...(previous?{previous}:{}),...(options.brief===undefined?{}:{brief:options.brief}),...(options.notes===undefined?{}:{notes:options.notes}),...(options.canvas===undefined?{}:{canvas:options.canvas})});}catch(error){throw new ProjectError(error.message||'This scene could not be packaged.');}
  const exchange=readExchange(markdown);
  return {markdown,exchange,summary:exchangeSummary(exchange)};
}
