// Documented Gateway image-edit integrations. A model name alone is insufficient:
// require both this explicit integration and current catalog image input/output.
const EDIT_MODELS=new Set(['openai/gpt-image-2','bfl/flux-kontext-pro','bfl/flux-pro-1.0-fill','google/gemini-3.1-flash-image','spacexai/grok-imagine-image']);
export function imageEditCapability(raw){
 if(!EDIT_MODELS.has(raw.id)||raw.type!=='image'||!raw.modalities?.input?.includes('image'))return undefined;
 return {supported:true,operation:'reference-image-edit',mask:false,upscale:false,referenceCount:1,maxBase64:3500000,maxDimension:8192,maxPixels:32000000,limits:'One PNG, JPEG or WebP source, up to 3.5 MB base64 and 32 megapixels. Output dimensions are chosen by the model.',priceBasis:'Gateway bills provider usage; catalog rates are indicative, not a quote. Cancellation may not stop provider charges.',documentation:'https://vercel.com/docs/ai-gateway/modalities/image-generation/openai#editing-images'};
}
