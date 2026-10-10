import {z} from 'zod';
import {cloudflareFor, snapshotCloudflare} from './cloudflare-connection.mjs';

const boundedText = (value, fallback = '') => typeof value === 'string' && value.length <= 200 ? value : fallback;
const providerFor = model => boundedText(model).split('/')[0] || 'unknown';
const checkAbort = signal => {if (signal?.aborted) throw signal.reason || new DOMException('Cancelled', 'AbortError');};
function provenance(result) {
 return {provider:boundedText(result.provider,'unknown'),model:boundedText(result.model,'unknown'),gateway:boundedText(result.gateway,'unknown')};
}
/** Explicit non-streaming HTTP rejections only; a wrapped output/parse error is not a rejection. */
export function normalizeTextError(error) {
 const forbidden = /Abort|Timeout|NoObject|NoOutput|Parse|Validation|InvalidRequest|InvalidArgument|ModelNotFound/.test(error?.name || '');
 const partialOutput = !!(error?.partialOutput || error?.text || error?.object || error?.output || error?.response?.body || error?.cause?.partialOutput || error?.cause?.text || error?.cause?.output);
 const status = Number(error?.statusCode ?? error?.status) || 0;
 const sdkRejection = error?.name === 'AI_APICallError' || (error?.name === 'GatewayRateLimitError' && error?.cause?.name === 'AI_APICallError' && error.cause.statusCode === 429);
 const rejected = !forbidden && !partialOutput && error?.outcome !== 'uncertain' && (error?.outcome === 'rejected' || sdkRejection);
 return Object.freeze({status: status >= 400 && status <= 599 ? status : 0, outcome:rejected?'rejected':'uncertain',partialOutput});
}

/** One Vercel attempt and at most one consented Cloudflare attempt, under the same deadline. */
export async function runRoutedText({primary, fallback, policy, connection, signal, primaryRoute}) {
 const cf = snapshotCloudflare(cloudflareFor(connection));
 const eligible = policy?.allowTextFallback === true && cf?.available === true && cf.allowTextFallback === true && typeof fallback === 'function';
 const attempts = [];
 checkAbort(signal);
 try {
  const result = await primary({signal});checkAbort(signal);
  attempts.push({...provenance(result),outcome:'completed'});
  return {...result,attempts,routing:{...provenance(result),attempts}};
 } catch(error) {
  checkAbort(signal);
  const failure = normalizeTextError(error);
  if (!eligible || failure.status !== 429 || failure.outcome !== 'rejected' || failure.partialOutput) throw error;
  attempts.push({...provenance(primaryRoute || {gateway:'Vercel AI Gateway'}),...failure});
 }
 checkAbort(signal);
 const result = await fallback({signal,cloudflare:cf});checkAbort(signal);
 attempts.push({...provenance(result),outcome:'completed'});
 return {...result,attempts,routing:{...provenance(result),attempts}};
}

/** Deployment approval is an explicit JSON object of identical Vercel and Cloudflare IDs.
 * Example: {"anthropic/claude-sonnet-4":"anthropic/claude-sonnet-4"}.
 * No implicit defaults, aliases, dynamic routes, or different-provider/model substitution.
 */
export function approvedTextModel(model, encoded = process.env.FLUX_CLOUDFLARE_TEXT_MODELS) {
 if (typeof model !== 'string' || model.startsWith('dynamic/') || !/^[a-z0-9-]+\/[a-zA-Z0-9._-]{1,160}$/.test(model) || typeof encoded !== 'string' || encoded.length > 8192) return undefined;
 try {const map=JSON.parse(encoded);if(!map || typeof map !== 'object' || Array.isArray(map) || Object.keys(map).length > 32) return undefined;return Object.hasOwn(map,model) && map[model] === model ? model : undefined;} catch {return undefined;}
}

async function boundedJSON(response, signal) {
 const reader=response.body?.getReader();if(!reader)throw new Error('The AI response was empty.');
 const chunks=[];let size=0;
 try {for(;;){checkAbort(signal);const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1048576)throw new Error('The AI response exceeded its size limit.');chunks.push(value);}}
 finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function cloudflareText(request,{cloudflare,model,signal,fetchImpl}) {
 checkAbort(signal);
 const response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cloudflare.accountId}/ai/v1/chat/completions`,{
  method:'POST',redirect:'error',signal,headers:{authorization:`Bearer ${cloudflare.apiToken}`,'content-type':'application/json','cf-aig-gateway-id':cloudflare.gatewayId},body:JSON.stringify({...request,model,stream:false}),
 });
 if(!response.ok){await response.body?.cancel().catch(()=>{});throw Object.assign(new Error(`Cloudflare AI Gateway rejected the request (HTTP ${response.status}).`),{statusCode:response.status,outcome:'rejected',partialOutput:false});}
 const value=await boundedJSON(response,signal);checkAbort(signal);
 if(value?.error || value?.success === false || !Array.isArray(value?.choices) || !value.choices.length)throw new Error('Cloudflare AI Gateway returned invalid text output.');
 const actualModel=boundedText(value.model,model);
 return {value,provider:providerFor(actualModel),model:actualModel,gateway:'Cloudflare AI Gateway',usage:value.usage};
}

/** For raw chat callers. primary returns the parsed Vercel response and never retries. */
export async function fetchRoutedText(request,{primary,connection,model=request.model,signal,fetchImpl=globalThis.fetch,approvedModels}={}) {
 const cf=snapshotCloudflare(cloudflareFor(connection));
 const approved=approvedTextModel(model,approvedModels);
 // Snapshot before awaiting primary; neither cookie removal nor env changes can switch billing.
 const routingConnection={cloudflare:cf};
 return runRoutedText({connection:routingConnection,signal,policy:{allowTextFallback:!!approved},primaryRoute:{provider:providerFor(model),model,gateway:'Vercel AI Gateway'},
  primary:async()=>{const value=await primary({signal});return {value,provider:providerFor(model),model:boundedText(value?.model,model),gateway:'Vercel AI Gateway',usage:value?.usage};},
  fallback:({signal,cloudflare})=>cloudflareText(request,{cloudflare,model:approved,signal,fetchImpl}),
 });
}

/** SDK-independent fallback preserves each caller's Zod schema and final editor validation. */
export async function generateRoutedObject(options,{generate,model,connection,fetchImpl=globalThis.fetch,approvedModels}={}) {
 const cf=snapshotCloudflare(cloudflareFor(connection)), approved=approvedTextModel(model,approvedModels);
 const result=await runRoutedText({connection:{cloudflare:cf},signal:options.abortSignal,policy:{allowTextFallback:!!approved},primaryRoute:{provider:providerFor(model),model,gateway:'Vercel AI Gateway'},
  primary:async()=>({value:await generate({...options,maxRetries:0}),provider:providerFor(model),model,gateway:'Vercel AI Gateway'}),
  fallback:async({signal,cloudflare})=>{
   const schema=z.toJSONSchema(options.schema,{unrepresentable:'throw'});
   const response=await cloudflareText({messages:[{role:'system',content:options.system},{role:'user',content:options.prompt}],max_tokens:options.maxOutputTokens,response_format:{type:'json_schema',json_schema:{name:'planner_response',strict:true,schema}}},{cloudflare,model:approved,signal,fetchImpl});
   const content=response.value.choices[0]?.message?.content;
   if(typeof content!=='string')throw new Error('The AI response did not contain a JSON proposal.');
   const object=options.schema.parse(JSON.parse(content));
   return {...response,value:{object,usage:response.usage}};
  },
 });
 return {object:result.value.object,usage:result.value.usage,routing:result.routing};
}
