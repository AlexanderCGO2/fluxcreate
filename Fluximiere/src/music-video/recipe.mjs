import {MUSIC_VIDEO_LIMITS,validateMusicVideoPlan} from './model.mjs';
const bytes=text=>new TextEncoder().encode(text).byteLength;
export function encodeRecipe(raw){
  const plan=validateMusicVideoPlan(raw);
  const text='# Fluximiére music video recipe\n\nMedia files are stored separately. Import this recipe with its matching local assets.\n\n```fluxmusicvideo-json\n'+JSON.stringify(plan,null,2)+'\n```\n';
  if(bytes(text)>MUSIC_VIDEO_LIMITS.recipeBytes)throw new Error('Music video recipe is too large');return text;
}
export function decodeRecipe(text){
  if(typeof text!=='string'||text.length>MUSIC_VIDEO_LIMITS.recipeBytes||bytes(text)>MUSIC_VIDEO_LIMITS.recipeBytes)throw new Error('Music video recipe is too large');
  const matches=[...text.matchAll(/^```fluxmusicvideo-json[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm)];
  if(matches.length!==1||(text.match(/^```fluxmusicvideo-json\b/gm)??[]).length!==1)throw new Error('Music video recipe must contain exactly one fluxmusicvideo-json block');
  let raw;try{raw=JSON.parse(matches[0][1]);}catch{throw new Error('Music video recipe contains invalid JSON');}return validateMusicVideoPlan(raw);
}
