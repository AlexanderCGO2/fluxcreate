import {encodeExchange} from '@flux-studio/exchange';
import {parseProject} from '../../Fluxiffects/src/core.mjs';

/** Convert only the validated portable scene; keep source-app data inert. */
export function suiteExchangeMarkdown(text){
  let data;try{data=JSON.parse(text);}catch{return null;}
  if(data?.format!=='fluxcreate-project')return null;
  if(data.app==='flux3d'&&!data.motion)throw Error('Export a PNG render or GLB from Flux3D to use this scene outside its native editor.');
  const {project,warnings}=parseProject(text);
  return encodeExchange({app:'fluxiffects',project,brief:project.brief??'',notes:[`Transferred from ${data.app} through its portable 2D composition. Keep the native file for the complete source project.`,...warnings].join('\n')});
}
