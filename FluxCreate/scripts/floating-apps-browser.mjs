import http from 'node:http';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createWorkbench} from '../../Haidini/server/index.mjs';
import {serve as serveMotion} from '../../Fluxiffects/scripts/serve.mjs';
import {createAIService} from '../../Fluxiffects/server/ai-service.mjs';
import {createEditorMcpHandler} from '../../FluxLab/server/mcp-http.mjs';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const services={status:async()=>({available:true}),models:async()=>({models:[{id:'mock/text',name:'Mock text',capabilities:['text']},{id:'mock/image',name:'Mock image',capabilities:['image']}]}),generate:async(args)=>({id:crypto.randomUUID(),kind:args.kind,model:args.model,prompt:args.prompt,text:args.kind==='text'?'HELLO AI':'',images:args.kind==='image'?[{mimeType:'image/png',width:1,height:1,src:'data:image/png;base64,'+png}]:[],warnings:[]})};
const motionAI=createAIService({planner:async({selection,mode})=>mode==='explain'?{summary:'An editable layer.',commands:[],explanation:'This layer has editable transform properties.'}:{summary:'Rename selected layer',commands:[{type:'updateLayer',layerId:selection[0],properties:{name:'AI renamed layer'}}]}});
const handlers={fluxiffects:createEditorMcpHandler({appId:'fluxiffects',service:services,editor:{appId:'fluxiffects',plan:motionAI.plan}}),fluxini:createEditorMcpHandler({appId:'fluxini',service:services,editor:{appId:'fluxini',plan:async input=>input.mode==='explain'?{summary:'Editable object',explanation:'This object has editable properties.'}:{patch:{baseRevision:input.project.revision,summary:'Rename selected scene object',commands:[{op:'rename',nodeId:input.selection[0],label:'AI renamed object'}]}}}})};
const proxy=http.createServer((req,res)=>handlers[req.url.split('/')[2]](req,res,{connection:{apiKey:'mock-key',scopeId:'mock',available:true}}));await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const proxyOrigin=`http://127.0.0.1:${proxy.address().port}`;
const dataDir=await mkdtemp(path.join(os.tmpdir(),'flux-ai-apps-')),scene=await createWorkbench({dataDir,port:0}),motion=serveMotion(0);await new Promise(r=>motion.listening?r():motion.once('listening',r));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),errors=[];
try{
 for(const [app,origin]of [['fluxini',scene.origin],['fluxiffects',`http://127.0.0.1:${motion.address().port}`]]){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',error=>errors.push(app+': '+error.message));
  await page.route('**/api/mcp',async route=>{const request=route.request(),headers={...request.headers(),origin:proxyOrigin};delete headers.host;delete headers.cookie;const response=await fetch(`${proxyOrigin}/api/${app}/mcp`,{method:request.method(),headers,body:request.postData()});await route.fulfill({status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/json'},body:Buffer.from(await response.arrayBuffer())});});
  await page.goto(origin);await page.getByRole('button',{name:'Open floating AI helper'}).waitFor();if(app==='fluxini')await page.waitForFunction(()=>new URL(location.href).searchParams.has('project'));else await page.getByText('Saved on this device',{exact:true}).waitFor();
  const sceneId=app==='fluxini'?new URL(page.url()).searchParams.get('project'):null;
  const baseline=app==='fluxini'?scene.projects.get(sceneId).project.graph.nodes.length:null;
  await page.getByRole('button',{name:'Open floating AI helper'}).click();await page.getByText('Connected through FluxLab').waitFor();await page.getByLabel('Floating AI request').fill('Rename the selected object');await page.getByRole('button',{name:'Prepare for review'}).click();await page.getByRole('button',{name:'Apply reviewed changes'}).waitFor();
  if(app==='fluxini'){assert.equal(scene.projects.get(sceneId).project.graph.nodes.some(n=>n.label==='AI renamed object'),false);}
  else assert.notEqual(await page.getByLabel('Layer name',{exact:true}).inputValue(),'AI renamed layer');
  await page.getByRole('button',{name:'Apply reviewed changes'}).click();await page.getByText('Added to your document. Undo is available in the editor.').waitFor();
  if(app==='fluxini')assert.ok(scene.projects.get(sceneId).project.graph.nodes.some(n=>n.label==='AI renamed object'));else assert.equal(await page.getByLabel('Layer name',{exact:true}).inputValue(),'AI renamed layer');
  await page.getByLabel('AI action',{exact:true}).selectOption('explain');await page.getByRole('button',{name:'Prepare for review'}).click();await page.getByText(app==='fluxini'?'This object has editable properties.':'This layer has editable transform properties.').waitFor();assert.equal(await page.getByRole('button',{name:'Apply reviewed changes'}).count(),0);
  await page.getByLabel('AI action',{exact:true}).selectOption('text');await page.getByLabel('Floating AI request').fill('Write a short title');await page.getByRole('button',{name:'Prepare for review'}).click();await page.getByLabel('Review generated text').waitFor();await page.getByRole('button',{name:'Insert reviewed result'}).click();await page.getByText('Added to your document. Undo is available in the editor.').waitFor();
  if(app==='fluxini'){const current=scene.projects.get(sceneId).project;assert.equal(current.graph.nodes.length,baseline+1);assert.ok(current.graph.nodes.some(n=>n.type==='text'&&n.params.text==='HELLO AI'));}else assert.equal(await page.getByLabel('Layer name',{exact:true}).inputValue(),'FluxLab text');
  await page.getByLabel('AI action',{exact:true}).selectOption('image');await page.getByRole('button',{name:'Prepare for review'}).click();await page.getByRole('img',{name:'Generated image for review'}).waitFor();await page.getByRole('button',{name:'Insert reviewed result'}).click();await page.getByText('Added to your document. Undo is available in the editor.').waitFor();
  if(app==='fluxini'){const current=scene.projects.get(sceneId).project;assert.equal(current.graph.nodes.length,baseline+2);const plane=current.graph.nodes.find(n=>n.type==='studioImage');assert.ok(plane.studioObject.preview.src.startsWith('data:image/png'));assert.equal(JSON.parse(plane.studioObject.suiteSource.text).app,'fluxoto');await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForTimeout(150);assert.equal(scene.projects.get(sceneId).project.graph.nodes.length,baseline+1);}
  else{assert.equal(await page.getByLabel('Layer name',{exact:true}).inputValue(),'FluxLab image');await page.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();await page.waitForTimeout(150);assert.equal(await page.getByLabel('Layer name',{exact:true}).inputValue(),'FluxLab text');}
  await page.close();console.log(`PASS ${app}: actual adapter proposal stays uncommitted until Apply, explain stays read-only, generated text/image inserted, one-step image undo.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await scene.close();motion.closeAllConnections();await new Promise(r=>motion.close(r));proxy.closeAllConnections();await new Promise(r=>proxy.close(r));}
