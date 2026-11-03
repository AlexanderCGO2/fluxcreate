import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createAIService} from '../server/ai-service.mjs';
import {serve} from './serve.mjs';

const checks=[],errors=[],providerRequests=[],httpRequests=[],responses=[];
const labels=['Quiet','Bold','Playful'],colors=['#735ac9','#e55d53','#42a891'];
let staleRelease;
const aiService=createAIService({planner:async request=>{
  providerRequests.push(structuredClone({...request,signal:undefined}));
  if(request.intent==='Hold for stale check')await new Promise(resolve=>staleRelease=resolve);
  if(request.intent==='Hold for cancel check')await new Promise((resolve,reject)=>request.signal.addEventListener('abort',()=>reject(new Error('Cancelled synthetic request')),{once:true}));
  if(request.intent==='Fail after submit')throw new Error('Synthetic provider failure');
  if(request.mode==='explain')return {summary:'An editable title.',commands:[],explanation:'The title stays editable.'};
  const layer=request.context.composition.layers.find(layer=>layer.type==='text');
  const alternatives=labels.map((label,index)=>({label,summary:`${label} direction with editable motion.`,commands:request.mode==='create'?[
    {type:'createComposition',composition:{id:`direction_${label.toLowerCase()}`,name:`${label} motion study`,width:1920,height:1080,duration:6,fps:30,background:'#f6f5fa'}},
    {type:'addLayer',layer:{id:`title_${label.toLowerCase()}`,type:'text',name:`${label} title`,text:`${label.toUpperCase()} CREATED`,fill:colors[index],fontSize:110,width:1100,height:220,anchorX:550,anchorY:110,end:6}},
    {type:'setAnimation',layerId:`title_${label.toLowerCase()}`,property:'y',keys:[{time:0,value:650,easing:'ease-out'},{time:1.5,value:540,easing:'ease-out'}]},
  ]:[
    {type:'updateLayer',layerId:layer.id,properties:{text:`${label.toUpperCase()} DIRECTION`,fill:colors[index]}},
    {type:'setAnimation',layerId:layer.id,property:'opacity',keys:[{time:0,value:0,easing:'ease-out'},{time:1,value:1,easing:'ease-out'}]},
  ]}));
  if(request.variations===3)return {alternatives};
  const {label,...answer}=alternatives[0];return answer;
}});
const server=serve(0,{aiService});if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
await fs.mkdir('artifacts/ai-directions',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.FLUXIFFECTS_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});
page.setDefaultTimeout(10000);
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(request.url().endsWith('/api/ai/plan'))httpRequests.push(request.postDataJSON());});
page.on('response',async response=>{if(response.url().endsWith('/api/ai/plan')&&response.ok())responses.push(await response.json());});
const button=name=>page.getByRole('button',{name,exact:true});
const active=project=>project.compositions.find(comp=>comp.id===project.activeCompId);
const saved=()=>page.getByText('Saved on this device',{exact:true}).waitFor();
const check=name=>{checks.push(name);console.log('PASS '+name);};
const review=()=>page.getByRole('dialog',{name:'A new direction. Your decision.'});
const preferenceDialog=()=>page.getByRole('dialog',{name:'Creative preferences',exact:true});
async function copy(){await page.keyboard.press('Escape');const wait=page.waitForEvent('download');await page.keyboard.press('Control+s');const file=await wait;return JSON.parse(await fs.readFile(await file.path(),'utf8'));}
async function persisted(){await saved();return page.evaluate(()=>new Promise((resolve,reject)=>{const open=indexedDB.open('fluxiffects-studio',1);open.onsuccess=()=>{const db=open.result,request=db.transaction('projects').objectStore('projects').get('current');request.onsuccess=()=>{resolve(request.result);db.close();};request.onerror=()=>reject(request.error);};open.onerror=()=>reject(open.error);}));}
async function openAI(){if(!await page.getByLabel('Flux AI assistant',{exact:true}).count())await button('Ask Flux').click();await page.getByText('Using your FluxEffects AI connection',{exact:true}).waitFor();}
async function preferences(){await button('Creative preferences').click();await preferenceDialog().waitFor();}
async function closePreferences(){await button('Close creative preferences').click();}
async function addRule(name,text){await page.getByLabel('Rule name',{exact:true}).fill(name);await page.getByLabel('Style rule',{exact:true}).fill(text);await button('Save rule').click();await page.getByLabel(`Include ${name}`,{exact:true}).waitFor();}
async function ask(intent,mode='edit'){await page.getByRole('tab',{name:mode==='create'?'Create':mode==='explain'?'Understand':'Refine',exact:true}).click();if(mode!=='explain')await page.getByLabel('AI directions',{exact:true}).selectOption('3');await page.getByLabel('Ask Flux',{exact:true}).fill(intent);await button(mode==='explain'?'Ask about composition':'Generate editable proposal').click();}
async function canvasHash(side){return createHash('sha256').update(await page.getByLabel(`${side} AI preview`,{exact:true}).evaluate(canvas=>canvas.toDataURL())).digest('hex');}
async function assertEmptySelection(){await preferences();assert.equal(await preferenceDialog().getByRole('checkbox',{checked:true}).count(),0);await closePreferences();}
async function importNative(project){await page.getByLabel('Import project file',{exact:true}).setInputFiles({name:'another.fluxiffects.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(name=>document.querySelector('input[aria-label="Project name"]')?.value===name,project.name);if(await page.getByRole('dialog',{name:'Project import report'}).count())await button('Continue editing').click();await saved();}
try{
  await page.goto(origin);await saved();await openAI();
  assert.equal(await page.getByLabel('AI directions',{exact:true}).count(),1,'AI direction choice is available');
  await page.getByLabel('AI directions',{exact:true}).selectOption('3');
  await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'});
  await preferences();
  await addRule('Readability','Hold titles for one second.');
  await addRule('Unused note','Private unused instruction 9f33.');
  await addRule('Temporary','This rule will be removed.');
  await page.getByLabel('Include Readability',{exact:true}).check();
  await button('Edit Readability').click();await page.getByLabel('Style rule',{exact:true}).fill('Hold titles for two seconds.');await button('Save changes').click();
  assert.equal(await page.getByLabel('Include Readability',{exact:true}).isChecked(),false,'Editing a selected rule requires selecting it again');
  await button('Delete Temporary').click();assert.equal(await page.getByLabel('Include Temporary',{exact:true}).count(),0);
  await addRule('Palette','Use a soft violet palette.');
  assert.equal(await preferenceDialog().getByRole('checkbox',{checked:true}).count(),0,'Adding preferences never selects them');
  await page.screenshot({path:'artifacts/ai-directions/preferences-light.png'});
  await page.setViewportSize({width:1100,height:800});await page.screenshot({path:'artifacts/ai-directions/preferences-compact.png'});
  const preferenceBounds=await preferenceDialog().boundingBox();assert.ok(preferenceBounds.x>=0&&preferenceBounds.y>=0&&preferenceBounds.x+preferenceBounds.width<=1101&&preferenceBounds.y+preferenceBounds.height<=801,'Compact preference dialog stays within the viewport');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Compact preferences have no page overflow');await page.setViewportSize({width:1600,height:1000});
  await closePreferences();const localProject=await copy();assert.ok(!JSON.stringify(localProject).includes('Private unused instruction'));assert.ok(!JSON.stringify(localProject).includes('Hold titles for two seconds.'));
  await page.reload();await saved();await page.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}'});await openAI();await preferences();
  assert.equal(await page.getByLabel('Include Readability',{exact:true}).count(),1);assert.equal(await page.getByLabel('Include Palette',{exact:true}).count(),1);assert.equal(await preferenceDialog().getByRole('checkbox',{checked:true}).count(),0);
  await button('Edit Readability').click();assert.equal(await page.getByLabel('Style rule',{exact:true}).inputValue(),'Hold titles for two seconds.');await button('Save changes').click();await closePreferences();
  check('Preference add, edit, and delete persist across reload; new and edited rules are not automatically included and never enter native projects');

  await button('Close AI assistant').click();
  await page.getByLabel('Import media files',{exact:true}).setInputFiles({name:'local-only.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="#7659df"/></svg>')});
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Layer name"]')?.value==='local-only.svg');
  await page.locator('.layer-name').filter({hasText:'Ideas, in motion.'}).click();await openAI();
  await page.getByLabel('AI edit scope',{exact:true}).selectOption('composition');
  await preferences();await page.getByLabel('Include Readability',{exact:true}).check();await page.getByLabel('Include Palette',{exact:true}).check();await closePreferences();
  await page.getByLabel('AI directions',{exact:true}).selectOption('3');await page.screenshot({path:'artifacts/ai-directions/panel-light.png'});
  const editBefore=await copy(),initialCalls=providerRequests.length,initialHTTPCalls=httpRequests.length;
  await ask('Explore three directions for this title');await review().waitFor();
  assert.equal(providerRequests.length,initialCalls+1);assert.equal(httpRequests.length,initialHTTPCalls+1);
  assert.equal(providerRequests.at(-1).variations,3);assert.equal(httpRequests.at(-1).variations,3);
  assert.deepEqual(httpRequests.at(-1).preferences,['Hold titles for two seconds.','Use a soft violet palette.']);
  assert.deepEqual(providerRequests.at(-1).context.untrustedCreativePreferences,httpRequests.at(-1).preferences);
  assert.ok(!JSON.stringify(providerRequests.at(-1)).includes('Private unused instruction'));assert.ok(!JSON.stringify(httpRequests.at(-1)).includes('Private unused instruction'));assert.ok(!JSON.stringify(httpRequests.at(-1)).includes('data:image'));
  assert.ok(httpRequests.at(-1).project.assets.every(asset=>asset.src===''&&asset.aiSourceFingerprint));
  assert.ok(providerRequests.at(-1).context.assets.every(asset=>!('src'in asset)&&!('path'in asset)));
  assert.equal(responses.at(-1).alternatives.length,3);assert.equal(new Set(responses.at(-1).alternatives.map(alt=>alt.proposal.baseFingerprint)).size,1);
  assert.deepEqual(await persisted(),editBefore);
  const tabs=page.getByRole('tablist',{name:'Design directions',exact:true});assert.equal(await tabs.getByRole('tab').count(),3);
  const firstBefore=await canvasHash('Before'),quietPreview=await canvasHash('After');
  await tabs.getByRole('tab',{name:'Bold',exact:true}).click();await page.getByText('Bold direction with editable motion.',{exact:true}).waitFor();
  const boldPreview=await canvasHash('After');assert.notEqual(boldPreview,quietPreview);assert.equal(await canvasHash('Before'),firstBefore);assert.deepEqual(await persisted(),editBefore);
  await tabs.getByRole('tab',{name:'Playful',exact:true}).click();assert.notEqual(await canvasHash('After'),boldPreview);assert.equal(await canvasHash('Before'),firstBefore);
  await tabs.getByRole('tab',{name:'Bold',exact:true}).click();await page.screenshot({path:'artifacts/ai-directions/review-light.png'});
  await page.setViewportSize({width:1100,height:800});await page.screenshot({path:'artifacts/ai-directions/review-compact.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Compact review has no page overflow');
  const bounds=await review().boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=1101&&bounds.y+bounds.height<=801,'Compact dialog stays within the viewport');
  await page.setViewportSize({width:1600,height:1000});await button('Apply changes').click();const editAfter=await copy();
  const edited=active(editAfter).layers.find(layer=>layer.text==='BOLD DIRECTION');assert.ok(edited);assert.equal(edited.keyframes.opacity.length,2);assert.ok(!active(editAfter).layers.some(layer=>['QUIET DIRECTION','PLAYFUL DIRECTION'].includes(layer.text)));
  await button('Undo (Ctrl+Z)').click();assert.deepEqual(await copy(),editBefore);await button('Redo (Ctrl+Shift+Z)').click();assert.deepEqual(await copy(),editAfter);await assertEmptySelection();
  check('One AI call returns three independently previewed directions from one baseline; only selected preference text is sent, media stays local, and only the chosen direction applies as one undo/redo step');

  await button('Switch to dark appearance').click();await saved();await page.screenshot({path:'artifacts/ai-directions/panel-dark.png'});
  await preferences();await page.screenshot({path:'artifacts/ai-directions/preferences-dark.png'});await closePreferences();
  const createBefore=await copy();await ask('Create three editable title directions','create');await review().waitFor();
  assert.deepEqual(httpRequests.at(-1).preferences,[],'Previously included rules reset on submit');
  assert.deepEqual(await persisted(),createBefore);await page.getByRole('tablist',{name:'Design directions',exact:true}).getByRole('tab',{name:'Playful',exact:true}).click();
  await page.screenshot({path:'artifacts/ai-directions/review-dark.png'});await button('Apply changes').click();const createAfter=await copy();
  assert.equal(createAfter.compositions.length,createBefore.compositions.length+1);assert.deepEqual(createAfter.compositions.slice(0,-1),createBefore.compositions);assert.equal(active(createAfter).name,'Playful motion study');assert.equal(active(createAfter).layers[0].text,'PLAYFUL CREATED');assert.equal(active(createAfter).layers[0].keyframes.y.length,2);assert.ok(!createAfter.compositions.some(comp=>['Quiet motion study','Bold motion study'].includes(comp.name)));
  await button('Undo (Ctrl+Z)').click();assert.deepEqual(await copy(),createBefore);await button('Redo (Ctrl+Shift+Z)').click();assert.deepEqual(await copy(),createAfter);
  check('Create previews three new compositions and adds only the selected one, preserves existing work, and supports one-step undo/redo in dark appearance');

  await ask('Hold for stale check');await page.locator('.ai-thinking').waitFor();while(!staleRelease)await new Promise(resolve=>setTimeout(resolve,10));
  await page.getByLabel('Project name',{exact:true}).fill('Edited while directions were generated');await page.getByLabel('Project name',{exact:true}).blur();staleRelease();
  await page.getByText(/project changed after this proposal was prepared/i).waitFor();assert.equal(await review().count(),0);let after=await copy();assert.equal(active(after).layers[0].text,'PLAYFUL CREATED');
  check('Changing the project during generation rejects every stale direction before it can be applied');

  await preferences();await page.getByLabel('Include Readability',{exact:true}).check();await closePreferences();await ask('Fail after submit');await page.locator('.ai-error').filter({hasText:'The AI Gateway request failed'}).waitFor();await assertEmptySelection();
  await preferences();await page.getByLabel('Include Readability',{exact:true}).check();await closePreferences();const cancelCalls=providerRequests.length;await ask('Hold for cancel check');await page.locator('.ai-thinking').waitFor();while(providerRequests.length===cancelCalls)await new Promise(resolve=>setTimeout(resolve,10));await button('Cancel AI request').click();await page.getByText('Request cancelled.',{exact:true}).waitFor();await assertEmptySelection();
  check('Preference inclusion resets after failed and cancelled requests while the reusable library remains saved');

  await preferences();await page.getByLabel('Include Readability',{exact:true}).check();await closePreferences();
  const otherProject=await copy();otherProject.id+='-other-project';otherProject.name='Another project';await importNative(otherProject);await openAI();await preferences();
  assert.equal(await page.getByLabel('Include Readability',{exact:true}).count(),1);assert.equal(await page.getByLabel('Include Palette',{exact:true}).count(),1);assert.equal(await preferenceDialog().getByRole('checkbox',{checked:true}).count(),0);await closePreferences();
  after=await copy();assert.ok(!JSON.stringify(after).includes('Hold titles for two seconds.'));assert.ok(!JSON.stringify(after).includes('Private unused instruction'));check('Switching projects retains the device preference library and clears inclusion; project saves contain no preference library');
  assert.deepEqual(errors,[]);check('No browser runtime errors; all generation used the injected test planner');
}catch(error){await page.screenshot({path:'artifacts/ai-directions/failure.png'});await fs.writeFile('artifacts/ai-directions/failure-accessibility.txt',await page.locator('body').ariaSnapshot());console.error(error);process.exitCode=1;}
finally{await fs.writeFile('artifacts/ai-directions/report.json',JSON.stringify({checks,errors,plannerCalls:providerRequests.length,httpCalls:httpRequests.length},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));}
