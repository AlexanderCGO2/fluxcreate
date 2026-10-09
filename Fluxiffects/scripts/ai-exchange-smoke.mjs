import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createAIService} from '../server/ai-service.mjs';
import {serve} from './serve.mjs';
import {encodeExchange,decodeExchange} from '@flux-studio/exchange';
import {createProject} from '../../Haidini/src/engine/project.ts';

const checks=[],errors=[],providerRequests=[],httpRequests=[];let deferred;
const aiService=createAIService({planner:async request=>{
  providerRequests.push(structuredClone({...request,signal:undefined}));
  if(request.intent==='Hold for stale check')await new Promise(resolve=>deferred=resolve);
  if(request.mode==='explain')return {summary:'Readability explained',commands:[],explanation:'The title uses editable opacity keys. Keep the final hold long enough to read.'};
  if(request.mode==='create')return {summary:'Create an editable violet title with a gentle rise.',commands:[
    {type:'createComposition',composition:{id:'ai_smoke_composition',name:'AI motion study',width:1920,height:1080,duration:6,fps:30,background:'#f6f5fa'}},
    {type:'addLayer',layer:{id:'ai_smoke_title',type:'text',name:'AI title',text:'Made to move',fill:'#7659df',fontSize:110,width:1100,height:220,anchorX:550,anchorY:110,end:6}},
    {type:'setAnimation',layerId:'ai_smoke_title',property:'y',keys:[{time:0,value:650,easing:'ease-out'},{time:1.5,value:540,easing:'ease-out'}]},
  ]};
  const layer=request.context.composition.layers.find(layer=>layer.type==='text')||request.context.composition.layers[0];
  return {summary:'Refine the selected title and its entrance.',commands:[{type:'updateLayer',layerId:layer.id,properties:{text:'AI REFINED',fill:'#7659df'}},{type:'setAnimation',layerId:layer.id,property:'opacity',keys:[{time:0,value:0,easing:'ease-out'},{time:1,value:1,easing:'ease-out'}]}]};
}});
const server=serve(0,{aiService});if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
await fs.mkdir('artifacts/ai-exchange',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.FLUXIFFECTS_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(request.url().endsWith('/api/ai/plan'))httpRequests.push(request.postDataJSON());});
const button=name=>page.getByRole('button',{name,exact:true}),active=project=>project.compositions.find(comp=>comp.id===project.activeCompId);
const saved=()=>page.getByText('Saved on this device',{exact:true}).waitFor();
const check=name=>{checks.push(name);console.log('PASS '+name);};
async function copy(){await page.keyboard.press('Escape');const wait=page.waitForEvent('download');await page.keyboard.press('Control+s');const file=await wait;return JSON.parse(await fs.readFile(await file.path(),'utf8'));}
async function persisted(){await saved();return page.evaluate(()=>new Promise((resolve,reject)=>{const open=indexedDB.open('fluxiffects-studio',1);open.onsuccess=()=>{const db=open.result,request=db.transaction('projects').objectStore('projects').get('current');request.onsuccess=()=>{resolve(request.result);db.close();};request.onerror=()=>reject(request.error);};open.onerror=()=>reject(open.error);}));}
async function ask(intent,mode='edit'){await page.getByRole('tab',{name:mode==='edit'?'Refine':mode==='create'?'Create':'Understand',exact:true}).click();await page.getByLabel('Ask Flux',{exact:true}).fill(intent);await button(mode==='explain'?'Ask about composition':'Generate editable proposal').click();}
async function importMD(markdown){await page.getByLabel('Import project file',{exact:true}).setInputFiles({name:'studio-handoff.flux.md',mimeType:'text/markdown',buffer:Buffer.from(markdown)});await page.getByRole('dialog',{name:'Welcome from the other studio'}).waitFor();}
try{
  await page.goto(origin);await saved();await page.locator('canvas').first().waitFor();
  await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'});
  await page.getByLabel('Import media files',{exact:true}).setInputFiles({name:'local-only.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#7659df"/></svg>')});await page.waitForFunction(()=>document.querySelector('input[aria-label="Layer name"]')?.value==='local-only.svg');
  await page.locator('.layer-name').filter({hasText:'Ideas, in motion.'}).click();await button('Ask Flux').click();await page.getByLabel('Flux AI assistant').waitFor();await page.getByText('Using your Fluxini AI connection',{exact:true}).waitFor();
  await page.locator('.ai-brief summary').click();await page.getByLabel('Creative brief',{exact:true}).fill('Quiet, readable violet motion for a design studio.');await page.getByLabel('Ask Flux',{exact:true}).click();await saved();
  await page.screenshot({path:'artifacts/ai-exchange/ai-panel.png'});
  await page.getByLabel('AI edit scope',{exact:true}).selectOption('composition');const explainBefore=await copy();
  await ask('Explain this composition','explain');await page.getByText('The title uses editable opacity keys. Keep the final hold long enough to read.',{exact:true}).waitFor();assert.deepEqual(await copy(),explainBefore);assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(providerRequests.at(-1).context.untrustedCreativeBrief,explainBefore.brief);assert.equal(providerRequests.at(-1).scope,'composition');assert.ok(providerRequests.at(-1).context.assets.length);assert.ok(providerRequests.at(-1).context.assets.every(asset=>!('src'in asset)&&!('path'in asset)));assert.ok(httpRequests.at(-1).project.assets.every(asset=>asset.src===''&&asset.aiSourceFingerprint));assert.ok(!JSON.stringify(httpRequests.at(-1)).includes('data:image'));assert.ok(!('exchange'in httpRequests.at(-1).project));
  check('Understand is nonmodifying; brief and composition scope reach the injected planner; media bytes and exchange snapshots stay local');
  await page.getByLabel('AI edit scope',{exact:true}).selectOption('selection');const editBefore=await copy();await ask('Refine my selected title');await page.getByRole('dialog',{name:'A new direction. Your decision.'}).waitFor();assert.deepEqual(await persisted(),editBefore);assert.equal(providerRequests.at(-1).context.composition.layers.length,1);assert.equal(providerRequests.at(-1).scope,'selection');
  await page.screenshot({path:'artifacts/ai-exchange/ai-review.png'});await button('Apply changes').click();let after=await copy();const title=active(after).layers.find(layer=>layer.text==='AI REFINED');assert.ok(title);assert.equal(title.keyframes.opacity.length,2);
  await button('Undo (Ctrl+Z)').click();assert.deepEqual(await copy(),editBefore);await button('Redo (Ctrl+Shift+Z)').click();assert.deepEqual(await copy(),after);check('Selected-layer AI proposals show before/after before committing; two edits apply as one undo/redo step');
  const createBefore=after;await ask('Create an editable title sequence','create');await page.getByRole('dialog',{name:'A new direction. Your decision.'}).waitFor();assert.deepEqual(await persisted(),createBefore);assert.equal(providerRequests.at(-1).scope,'composition');assert.equal(httpRequests.at(-1).scope,'composition');await button('Apply changes').click();after=await copy();assert.equal(after.compositions.length,createBefore.compositions.length+1);assert.deepEqual(after.compositions.slice(0,-1),createBefore.compositions);assert.equal(active(after).layers[0].keyframes.y.length,2);
  await button('Undo (Ctrl+Z)').click();assert.deepEqual(await copy(),createBefore);await button('Redo (Ctrl+Shift+Z)').click();assert.deepEqual(await copy(),after);check('Create produces a new editable composition and keyframes, preserves existing compositions, and supports one-step undo/redo');
  await ask('Hold for stale check');await page.waitForFunction(()=>!!document.querySelector('.ai-thinking'));while(!deferred)await new Promise(resolve=>setTimeout(resolve,10));await page.getByLabel('Project name',{exact:true}).fill('Changed while Flux was thinking');await page.getByLabel('Project name',{exact:true}).blur();deferred();await page.getByText(/project changed after this proposal was prepared/i).waitFor();assert.equal(await page.getByRole('dialog').count(),0);after=await copy();assert.equal(active(after).layers[0].text,'Made to move');check('An edit made while AI is running rejects the stale proposal before review/apply');
  await button('Close AI assistant').click();await button('Exchange').click();await page.getByLabel('Exchange creative brief').fill('Shared studio title.');await page.getByLabel('Handoff notes',{exact:true}).fill('Preserve the violet palette and editable title.');await page.screenshot({path:'artifacts/ai-exchange/exchange-export.png'});
  const download=page.waitForEvent('download');await button('Save Flux exchange file').click();const handoff=await download;assert.ok(handoff.suggestedFilename().endsWith('.flux.md'));const envelope=decodeExchange(await fs.readFile(await handoff.path(),'utf8'));assert.equal(envelope.brief,'Shared studio title.');assert.equal(envelope.notes,'Preserve the violet palette and editable title.');const exchangeBefore=await copy();
  const native=createProject(randomUUID(),'title');native.name='From the procedural studio';native.graph.nodes.find(node=>node.type==='text').params.text='LATEST FLUXINI';const markdown=encodeExchange({app:'fluxini',project:native,previous:envelope});
  await importMD(markdown);assert.deepEqual(await persisted(),exchangeBefore);await page.locator('.restore-source').click();await page.locator('.restore-source').click();await page.screenshot({path:'artifacts/ai-exchange/exchange-import.png'});await button('Open in Fluxiffects').click();after=await copy();assert.equal(active(after).layers.find(layer=>layer.type==='text').text,'LATEST FLUXINI');assert.equal(after.exchange.notes,envelope.notes);
  await button('Undo (Ctrl+Z)').click();assert.deepEqual(await copy(),exchangeBefore);await importMD(markdown);await page.locator('.restore-source').click();await button('Open in Fluxiffects').click();after=await copy();assert.deepEqual(after.compositions,envelope.snapshots.fluxiffects.compositions);assert.equal(after.exchange.notes,envelope.notes);check('Markdown exchange reviews conversion, imports latest Fluxini work, and restores saved native source only when explicitly chosen');
  await saved();await page.reload();await saved();assert.deepEqual(await copy(),after);const nativeFile=Buffer.from(JSON.stringify(after));await page.getByLabel('Import project file',{exact:true}).setInputFiles({name:'roundtrip.fluxiffects.json',mimeType:'application/json',buffer:nativeFile});await page.getByRole('dialog',{name:'Project import report'}).waitFor();await button('Continue editing').click();assert.equal((await copy()).exchange.notes,envelope.notes);check('Brief, notes and source snapshots survive ordinary native copies and IndexedDB reload');
  await button('Ask Flux').click();await page.locator('.ai-brief summary').click();await page.getByLabel('Creative brief',{exact:true}).fill('');await page.getByLabel('Ask Flux',{exact:true}).click();await saved();assert.equal((await copy()).brief,'');await button('Close AI assistant').click();await button('Ask Flux').click();await page.locator('.ai-brief summary').click();assert.equal(await page.getByLabel('Creative brief',{exact:true}).inputValue(),'');await button('Close AI assistant').click();await button('Exchange').click();assert.equal(await page.getByLabel('Exchange creative brief').inputValue(),'');await page.keyboard.press('Escape');check('Clearing the creative brief stays empty in AI and exchange instead of restoring older metadata');
  assert.deepEqual(errors,[]);check('No browser runtime errors; all AI generation used only the injected test planner');
}catch(error){await page.screenshot({path:'artifacts/ai-exchange/failure.png'});console.error(error);process.exitCode=1;}
finally{await fs.writeFile('artifacts/ai-exchange/report.json',JSON.stringify({checks,errors,plannerCalls:providerRequests.length},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
