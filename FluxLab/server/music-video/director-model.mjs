/** Reviewed transport profile; upgrading this registry requires adapter fixtures. */
export const DIRECTOR_MODEL = 'google/gemini-4-argon';
export const DIRECTOR_PROFILE = Object.freeze({model:DIRECTOR_MODEL,profile:'gemini-4-argon-gateway-chat-v1',transport:'gateway-chat-file',reviewedAt:'2026-10-17',audio:true,image:true,tools:true,livePilotVerified:false});
// Official contracts: https://vercel.com/docs/ai-gateway/inputs-and-tools/audio-input
// https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/tool-calling
// https://ai.google.dev/gemini-api/docs/models/gemini-4-argon
export function resolveDirectorModel(catalog,{model=DIRECTOR_MODEL,profile}={}){
 if(model!==DIRECTOR_MODEL||(profile&&profile!==DIRECTOR_PROFILE.profile))throw Object.assign(new Error('This director model/profile has no reviewed audio, image and tool transport. No fallback was used.'),{status:422});
 const items=Array.isArray(catalog)?catalog:catalog?.data??catalog?.models;
 const selected=items?.find(item=>item.id===model),modalities=selected?.modalities?.input??selected?.inputModalities;
 if(!selected||!Array.isArray(modalities)||!['audio','image','text'].every(v=>modalities.includes(v)))throw Object.assign(new Error('The pinned Gemini director is unavailable or its live catalog does not confirm audio and image input. No fallback was used.'),{status:503});
 return {...DIRECTOR_PROFILE};
}
