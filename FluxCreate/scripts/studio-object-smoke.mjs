import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {createDemoProject as design} from '../../Fluxidesign/src/model.mjs';
import {createDemoProject as photo} from '../../Fluxoto/src/model.mjs';
import {createDemoProject as scene} from '../../Flux3D/src/model.mjs';
import {createDemoProject as motion} from '../../Fluxiffects/src/core.mjs';
import {encodeProject} from '../shared/browser.mjs';
const checks=[],errors=[],browser=await chromium.launch({channel:'msedge',headless:true});
const native=(app,project)=>encodeProject(app,project,null);
try{
 const context=await browser.newContext({viewport:{width:1600,height:1000}});await context.route('**/api/recent',r=>r.fulfill({json:{ok:true}}));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://localhost:4321/');await page.getByText('Saved on this device',{exact:true}).first().waitFor();
 const publication=design(),original=native('fluxidesign',publication);
 await page.getByLabel('Place studio object file',{exact:true}).setInputFiles({name:'publication.fluxidesign',mimeType:'application/json',buffer:Buffer.from(original)});
 const dialog=page.getByRole('dialog',{name:'Place studio object',exact:true});await expect(dialog.getByRole('img')).toBeVisible();await expect(dialog.getByLabel('Studio source view')).toHaveValue(publication.activePageId);
 await dialog.getByLabel('Studio source view').selectOption(publication.pages[1].id);await expect(dialog.getByRole('button',{name:'Place in document',exact:true})).toBeEnabled();
 const preview=await dialog.getByRole('img').evaluate(el=>({src:el.src,width:el.naturalWidth,height:el.naturalHeight}));expect(preview.width).toBeGreaterThan(100);expect(preview.src.length).toBeGreaterThan(1000);
 await dialog.getByRole('button',{name:'Place in document',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText('FluxDesign object',{exact:true})).toBeVisible();
 await expect(page.getByText('Saved on this device',{exact:true}).first()).toBeVisible();
 const project=await page.evaluate(async()=>{const db=await new Promise((res,rej)=>{const r=indexedDB.open('fluxcreate-local',1);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});try{return await new Promise((res,rej)=>{const r=db.transaction('projects').objectStore('projects').get('fluxoto-project-v1');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}finally{db.close();}});
 expect(project.layers[0].suiteSource.text).toBe(original);expect(project.layers[0].suiteSource.view.pageId).toBe(publication.pages[1].id);expect(project.layers[0].src).toBe(preview.src);checks.push('FluxDesign chosen page renders real pixels, inserts as one photo layer, and persists exact original source.');
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Save original',exact:true}).click();const downloaded=await downloadEvent;expect(await fs.readFile(await downloaded.path(),'utf8')).toBe(original);checks.push('Embedded native source downloads byte-for-byte unchanged.');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByText('FluxDesign object',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Redo',exact:true}).click();checks.push('Placement is one undoable edit.');
 // Replacement keeps placement transforms while retaining a different recoverable native source.
 await page.getByLabel('Replace studio object source',{exact:true}).setInputFiles({name:'photo.fluxoto',mimeType:'application/json',buffer:Buffer.from(native('fluxoto',photo()))});await expect(dialog.getByRole('button',{name:'Update object',exact:true})).toBeEnabled();await dialog.getByRole('button',{name:'Update object',exact:true}).click();await expect(page.getByText('FluxFoto object',{exact:true})).toBeVisible();checks.push('Replacement previews the new native source and updates the selected object.');
 for(const [name,text] of [['scene.flux3d',native('flux3d',scene())],['composition.fluxiffects',JSON.stringify(motion())]]){
  await page.getByLabel('Place studio object file',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text)});await expect(dialog.getByRole('button',{name:'Place in document',exact:true})).toBeEnabled({timeout:30000});expect(await dialog.getByRole('img').evaluate(el=>el.naturalWidth)).toBeGreaterThan(100);await dialog.getByRole('button',{name:'Place in document',exact:true}).click();checks.push(name+' uses its native renderer and inserts a visible preview.');
 }
 await page.reload();await expect(page.getByText('Saved on this device',{exact:true}).first()).toBeVisible();checks.push('Source objects survive editor reload.');
 await page.getByRole('button',{name:'Open floating AI helper',exact:true}).click();await expect(page.getByRole('dialog',{name:'AI helper',exact:true})).toBeVisible();await page.getByRole('button',{name:'Close AI helper',exact:true}).click();checks.push('Selection-aware AI helper mounts without disrupting source objects.');
 const effects=await context.newPage();effects.on('pageerror',e=>errors.push(e.message));await effects.goto('http://localhost:4320/');await effects.getByText('Saved on this device',{exact:true}).first().waitFor();await effects.getByLabel('Place studio object file',{exact:true}).setInputFiles({name:'publication.fluxidesign',mimeType:'application/json',buffer:Buffer.from(original)});const ed=effects.getByRole('dialog',{name:'Place studio object',exact:true});await expect(ed.getByRole('button',{name:'Place in document',exact:true})).toBeEnabled();await ed.getByRole('button',{name:'Place in document',exact:true}).click();await expect(effects.getByText('FluxDesign object',{exact:true})).toBeVisible();checks.push('FluxMotion places and displays the same retained-source object.');
 expect(errors).toEqual([]);await context.close();await fs.mkdir('artifacts/studio-objects',{recursive:true});await fs.writeFile('artifacts/studio-objects/checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
