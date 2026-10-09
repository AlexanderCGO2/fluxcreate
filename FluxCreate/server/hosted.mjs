import {createAIService,connectionStatus} from './ai.mjs';
import {createAIService as createMotionAI} from '../../Fluxiffects/server/ai-service.mjs';
import {createLabService} from '../../FluxLab/server/service.mjs';
import {planChange,modelStatus} from '../../Haidini/server/planner.mjs';
import {parseProject} from '../../Haidini/src/engine/project.ts';
import {buildSceneContext} from '../../Haidini/src/flux/context.ts';

const apps=new Set(['fluxcreate','fluxoto','fluxidesign','fluximiere','flux3d','fluxiffects','fluxini','fluxlab']);
function fail(message,status=400){throw Object.assign(Error(message),{status});}
function safeJSON(body,limit){const encoded=typeof body==='string'?body:JSON.stringify(body);if(typeof encoded!=='string'||Buffer.byteLength(encoded)>limit)fail('The request is too large.',413);let value;try{value=JSON.parse(encoded);}catch{fail('Send valid JSON.');}if(!value||typeof value!=='object'||Array.isArray(value))fail('Send a request object.');const visit=(v,depth=0)=>{if(depth>32)fail('The request is too deeply nested.');if(v&&typeof v==='object')for(const key of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(key))fail('Unsupported request field.');visit(v[key],depth+1);}};visit(value);return value;}
async function bodyFor(req,limit){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail('Send an application/json request.',415);if(req.body!==undefined)return safeJSON(req.body,limit);let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)fail('The request is too large.',413);chunks.push(chunk);}return safeJSON(Buffer.concat(chunks).toString('utf8'),limit);}
function answer(res,status,value){if(res.destroyed)return;const json=JSON.stringify(value);if(Buffer.byteLength(json)>4*1024*1024)return answer(res,413,{error:'This result is too large. Choose a smaller image or response.'});res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(json);}
export function prepareSceneRequest(body){const project=parseProject(body.project);if(typeof body.intent!=='string'||!body.intent.trim()||body.intent.length>2000)fail('Describe a change in up to 2,000 characters.');const selection=body.selection??[];if(!Array.isArray(selection)||selection.length>64||selection.some(id=>!project.graph.nodes.some(n=>n.id===id)))fail('Invalid scene selection.');const preferences=body.preferences??[];if(!Array.isArray(preferences)||preferences.length>100)fail('Too many creative preferences.');const approved=preferences.map(p=>{if(!p||p.status!=='approved'||!p.decided_at||typeof p.statement!=='string'||p.statement.length>240||typeof p.id!=='string'||p.id.length>100||typeof p.source_id!=='string'||p.source_id.length>100||(p.node_id!=null&&!project.graph.nodes.some(n=>n.id===p.node_id)))fail('Invalid approved preference.');return{id:p.id,statement:p.statement,source_id:p.source_id,node_id:p.node_id??null};});return{project,intent:body.intent,selection,memory:{assemble:()=>{const context=buildSceneContext(project,body.intent,selection,[],[],approved);context.retrieval='Browser project preferences';return context;}}};}
export function createHostedHandler({services={},lab=createLabService(),scenePlanner=planChange,status=connectionStatus}={}){
 const editors=new Map(Object.entries(services));for(const id of ['fluxoto','fluxidesign','fluximiere','flux3d'])if(!editors.has(id))editors.set(id,createAIService(id));if(!editors.has('fluxiffects'))editors.set('fluxiffects',createMotionAI());
 return async(req,res)=>{try{const url=new URL(req.url,'https://workspace.invalid'),match=url.pathname.match(/^\/api\/([^/]+)(\/.*)?$/),appId=match?.[1],route=match?.[2]||'/';if(!apps.has(appId))fail('Unknown workspace.',404);const host=req.headers.host,origin=req.headers.origin;if(origin){let incoming;try{incoming=new URL(origin);}catch{fail('Invalid request origin.',403);}if(incoming.host!==host||!['http:','https:'].includes(incoming.protocol))fail('Open this request from your FluxCreate workspace.',403);}if(req.headers['sec-fetch-site']==='cross-site')fail('Open this request from your FluxCreate workspace.',403);
 if(req.method==='GET'&&route==='/health')return answer(res,200,{app:appId,version:'0.2.0'});
 if(req.method==='GET'&&route==='/ai/status'&&appId!=='fluxlab')return answer(res,200,editors.has(appId)?await editors.get(appId).status():await status());
 if(appId==='fluxini'&&req.method==='GET'&&route==='/status')return answer(res,200,{model:await status()});
 if(appId==='fluxlab'&&req.method==='GET'&&route==='/status')return answer(res,200,await lab.status());
 if(appId==='fluxlab'&&req.method==='GET'&&route==='/models')return answer(res,200,await lab.models());
 if(req.method!=='POST')fail('Unknown service endpoint.',404);
 const controller=new AbortController();req.once('aborted',()=>controller.abort());res.once('close',()=>{if(!res.writableEnded)controller.abort();});
 if(appId==='fluxlab'&&route==='/generate')return answer(res,200,await lab.generate(await bodyFor(req,64000),{signal:controller.signal}));
 if(editors.has(appId)&&route==='/ai/plan')return answer(res,200,await editors.get(appId).plan(await bodyFor(req,1100000),{signal:controller.signal}));
 if(appId==='fluxini'&&route==='/plan'){const input=prepareSceneRequest(await bodyFor(req,1100000));return answer(res,200,await scenePlanner(input.project,input.intent,input.memory,undefined,input.selection,controller.signal));}
 fail('Unknown service endpoint.',404);
 }catch(e){const known=Number.isInteger(e?.status)&&e.status>=400&&e.status<=599;answer(res,known?e.status:500,{error:known?e.message:'The request could not be completed. Try again.'});}};
}
export default createHostedHandler();
