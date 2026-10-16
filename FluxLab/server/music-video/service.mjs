import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadConnection} from '../../../Haidini/server/connection.mjs';
import {directMusicVideo,DirectorError} from './director.mjs';

async function existingCredential(){await loadConnection(process.env.FLUXINI_DATA_DIR||fileURLToPath(new URL('../../../Haidini/.data',import.meta.url)));return process.env.AI_GATEWAY_API_KEY||'';}
export function createMusicVideoDirectorService({direct=directMusicVideo,credential=existingCredential,fetchImpl=globalThis.fetch}={}){
 const active=new Set();
 return {async direct(body,{connection,signal}={}){
  const supplied=connection!==undefined,key=supplied?connection?.apiKey:await credential();
  if(typeof key!=='string'||!key||connection?.available===false)throw new DirectorError('Connect your AI Gateway account in Settings before using the director.',503);
  const scope=createHash('sha256').update(key).digest('hex');if(active.has(scope))throw new DirectorError('A music-video direction pass is already running on this connection.',409);if(active.size>=32)throw new DirectorError('The music-video director is busy. Try again shortly.',429);active.add(scope);
  try{
   const input=structuredClone(body);
   // The browser owns canonical PCM in this first milestone. Inspection uses its
   // measured map; no tool claims to cut server-side PCM that has not been retained.
   const tools={
    analyze_music:async()=>({source:'client-measured',analysis:input.analysis}),
    get_beat_grid:async({startSample,endSample})=>({analysisId:input.analysis.id,source:'client-measured',confidence:input.analysis.confidence,beats:(input.analysis.beats??[]).filter(b=>b.sample>=startSample&&b.sample<endSample),manualAnchors:(input.analysis.manualAnchors??[]).filter(b=>b.sample>=startSample&&b.sample<endSample)}),
    preview_edit:async()=>({planId:input.planId,revision:input.revision,kind:'timing-scaffold',sections:input.sections,shots:input.shots.map(({id,sectionId,startFrame,endFrame})=>({id,sectionId,startFrame,endFrame})),masterAudio:'continuous',applied:false}),
   };
   const result=await direct(input,{connection:{apiKey:key,available:true},signal,tools,fetchImpl});
   return {...result,capabilities:{listening:true,referenceImages:true,editableProposal:true,canonicalAudioCuts:false,videoGeneration:false},warnings:[...(result.warnings??[]),'Listening uses a reduced-resolution song proxy. Canonical audio cuts and video generation are not exposed by this preview service.']};
  }finally{active.delete(scope);}
 }};
}
export function directorErrorFields(error){if(!(error instanceof DirectorError))return {};const fields={code:error.code};if(error.code==='DIRECTOR_LIMIT'&&error.checkpoint){const encoded=JSON.stringify(error.checkpoint);if(Buffer.byteLength(encoded)<=512*1024)fields.checkpoint=error.checkpoint;}return fields;}
