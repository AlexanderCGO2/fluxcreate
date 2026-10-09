import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createWorkbench} from '../server/index.mjs';
const require=createRequire(process.env.FLUXINI_PLAYWRIGHT_PACKAGE||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'));
const {chromium}=require('playwright');
await mkdir('.test-data',{recursive:true});
const output=path.resolve('artifacts/design-consistency');await mkdir(output,{recursive:true});
const dir=await mkdtemp(path.resolve('.test-data/design-consistency-'));
const app=await createWorkbench({dataDir:dir,webDir:path.resolve(process.argv.includes('--staging')?'.staging-dist':'dist'),port:0});
const report={checks:[],views:[],errors:[]};let browser;
try{
 browser=await chromium.launch({executablePath:process.env.FLUXINI_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(app.origin);await page.getByRole('combobox',{name:'Current project'}).waitFor();
 await page.waitForFunction(()=>document.querySelector('.status-bar')?.textContent.includes('7 characters'));
 const id=new URL(page.url()).searchParams.get('project'),original=structuredClone(app.projects.get(id).project);
 const button=name=>page.getByRole('button',{name,exact:true});
 const appearance=async theme=>{const current=await page.locator('html').getAttribute('data-fluxini-theme');if(current!==theme)await button('Switch to '+theme+' appearance').click();await page.waitForTimeout(250);};
 const capture=async name=>{
  const geometry=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,header:document.querySelector('.fc-header').getBoundingClientRect().height,theme:document.documentElement.dataset.fluxiniTheme,background:getComputedStyle(document.querySelector('.inspector')).backgroundColor,hint:getComputedStyle(document.querySelector('.viewport-bottom>span')).backgroundColor}));
  assert.equal(geometry.width,geometry.scrollWidth,'Desktop chrome must not overflow horizontally');assert.equal(geometry.height,geometry.scrollHeight,'Desktop chrome must fit vertically');assert.equal(geometry.header,70);
  report.views.push({name,...geometry});await page.screenshot({path:path.join(output,name+'.png')});
 };
 for(const viewport of [{width:1600,height:1000},{width:1280,height:800}]){
  await page.setViewportSize(viewport);
  for(const theme of ['light','dark']){
   await appearance(theme);await capture(theme+'-'+viewport.width);
   await button('General settings').click();await page.getByRole('dialog',{name:'General settings'}).waitFor();assert.equal(await page.locator('.fc-settings-portal').getAttribute('data-theme'),theme);
   await page.keyboard.press('Escape');assert.equal(await button('General settings').evaluate(el=>el===document.activeElement),true);
   await button('Export').click();await page.getByRole('dialog',{name:'Export composition'}).waitFor();for(const name of ['Video','Image','3D scene','Exchange'])assert(await button(name).isVisible());await button('Image').click();await page.screenshot({path:path.join(output,theme+'-export-'+viewport.width+'.png')});await button('Cancel').click();
  }
 }
 report.checks.push('70 px shared header; readable neutral light/dark chrome at 1600×1000 and 1280×800; actual theme passed to Settings; export choices/cancel preserved');
 await page.reload();await page.waitForFunction(()=>document.querySelector('.status-bar')?.textContent.includes('7 characters'));assert.equal(await page.locator('html').getAttribute('data-fluxini-theme'),'dark');
 await button('Switch FluxCreate app').click();const apps=page.getByRole('navigation',{name:'FluxCreate apps'});assert.equal(await apps.locator('a[aria-current=page] strong').textContent(),'Fluxini');assert((await apps.locator('a').count())>=8);await page.keyboard.press('Escape');assert.equal(await apps.count(),0);
 report.checks.push('Appearance persists after reload; registry-backed app switcher shows active Fluxini and closes with Escape');
 await button('Graph').click();await page.locator('.react-flow__node').first().waitFor();await page.waitForTimeout(400);
 const scale=()=>page.locator('.react-flow__viewport').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
 assert((await scale())>=.79,'Default graph text retains a readable scale');
 const divider=page.getByRole('separator',{name:'Graph height'}),beforeHeight=Number(await divider.getAttribute('aria-valuenow'));
 await divider.focus();await page.keyboard.press('ArrowUp');assert.equal(Number(await divider.getAttribute('aria-valuenow')),beforeHeight+20);
 const bounds=await divider.boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y-20,{steps:4});await page.mouse.up();assert(Number(await divider.getAttribute('aria-valuenow'))>beforeHeight+20);
 await button('Focus selection').click();await page.waitForTimeout(300);assert((await scale())>=.99);
 const docked=await page.locator('.graph-panel').boundingBox(),dockedView=await page.locator('.react-flow__viewport').getAttribute('style');
 for(const theme of ['dark','light']){
  await appearance(theme);await page.screenshot({path:path.join(output,theme+'-graph-docked.png')});await button('Expand graph to full screen').click();const full=page.getByRole('dialog',{name:'Procedural graph'});assert.deepEqual(await full.boundingBox(),{x:0,y:0,width:1280,height:800});
  await button('Fit all').click();await page.waitForTimeout(300);await page.screenshot({path:path.join(output,theme+'-graph-fullscreen.png')});
  await button('Add node').click();await page.getByRole('textbox',{name:'Search nodes'}).fill('water');await page.getByRole('region',{name:'Add nodes'}).waitFor();await page.keyboard.press('Escape');assert(await full.isVisible());
  await button('Exit full-screen graph').click();await page.waitForTimeout(250);assert.deepEqual(await page.locator('.graph-panel').boundingBox(),docked);assert.equal(await page.locator('.react-flow__viewport').getAttribute('style'),dockedView);assert.equal(await page.locator('[inert]').count(),0);
 }
 report.checks.push('Graph resize works with pointer and keyboard; default scale ≥0.8; Focus selection/ Fit all are separate; fullscreen returns to the exact dock view in both themes without graph edits');
 await button('Graph').click();await button('Ask Flux').click();await page.screenshot({path:path.join(output,'light-ai-preview.png')});assert(await button('Preview AI change').isVisible());await button('Close Flux').click();
 const inspector=page.getByRole('separator',{name:'Inspector width'}),previous=Number(await inspector.getAttribute('aria-valuenow'));await inspector.focus();await page.keyboard.press('ArrowLeft');assert.equal(Number(await inspector.getAttribute('aria-valuenow')),previous+10);
 await button('Rename project').click();await page.getByLabel('Project name').fill('A long scene name '.repeat(5));assert.deepEqual(app.projects.get(id).project,original,'Rename typing must not mutate the server');await button('Cancel').click();
 // The title slot must remain bounded even for pre-existing names at the 100-character limit.
 await page.locator('select[aria-label="Current project"] option:checked').evaluate(el=>{el.textContent='A long scene name '.repeat(6).slice(0,100);});
 await page.setViewportSize({width:1000,height:720});await capture('light-1000-minimum');
 const picker=await page.getByRole('combobox',{name:'Current project'}).boundingBox(),actions=await page.locator('.fc-header-actions').boundingBox();assert(picker.x+picker.width<actions.x,'Scene name must not overlap header actions');
 await button('Hide scene panel').click();assert.equal(await page.locator('.library').count(),0);await button('Show scene panel').click();assert.equal(await page.locator('.library').count(),1);
 assert.deepEqual(app.projects.get(id).project,original,'All appearance/layout/navigation/review interactions preserve project revision and data');
 report.checks.push('AI review frame, inspector resize, long names, panel collapse and 1000×720 minimum desktop verified; appearance-only interactions preserve exact project JSON and revision');
 assert.deepEqual(report.errors,[]);await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();await app.close();}
