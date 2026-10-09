import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import path from 'node:path';

// Only the explicitly selected AI credential crosses the OMMAX boundary.
// connection.json stores a file path, never the credential itself.
export async function loadConnection(dataDir) {
  if(process.env.AI_GATEWAY_API_KEY)return;
  let envFile=process.env.FLUXINI_FLUX_ENV;
  if(!envFile){
    try{envFile=JSON.parse(await readFile(path.join(dataDir,'connection.json'),'utf8')).envFile;}
    catch(error){if(error.code!=='ENOENT')throw new Error('Cannot read the local AI connection settings.');}
  }
  if(!envFile)return;
  try{
    const values=parseEnv(await readFile(envFile,'utf8'));
    if(!values.AI_GATEWAY_API_KEY)throw new Error('Missing gateway credential.');
    process.env.AI_GATEWAY_API_KEY=values.AI_GATEWAY_API_KEY;
  }catch{throw new Error('The selected Flux environment file is unavailable or has no AI_GATEWAY_API_KEY.');}
}
