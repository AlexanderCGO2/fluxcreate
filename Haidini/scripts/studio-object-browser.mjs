import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createWorkbench} from '../server/index.mjs';
import {createDemoProject} from '../../Fluxidesign/src/model.mjs';
import {encodeProject} from '../../FluxCreate/shared/browser.mjs';
const require=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json')),{chromium}=require('playwright');
const app=await createWorkbench({dataDir:await mkdtemp(path.join(os.tmpdir(),'fluxini-source-')),port:0});const browser=await chromium.launch({channel:'msedge',headless:true}),checks=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}});page.on('pageerror',e=>errors.push(e.message));await page.goto(app.origin);await page.waitForFunction(()=>new URL(location.href).searchParams.has('project'));
 const id=new URL(page.url()).searchParams.get('project'),before=app.projects.get(id).project,source=encodeProject('fluxidesign',createDemoProject(),null);
 await page.getByLabel('Place studio object file',{exact:true}).setInputFiles({name:'publication.fluxidesign',mimeType:'application/json',buffer:Buffer.from(source)});const dialog=page.getByRole('dialog',{name:'Place studio object',exact:true});await dialog.getByRole('img').waitFor();await page.waitForFunction(()=>!document.querySelector('.fc-object-dialog footer .primary').disabled);await dialog.getByRole('button',{name:'Place in document',exact:true}).click();await dialog.waitFor({state:'hidden'});
 const placed=app.projects.get(id).project,object=placed.graph.nodes.find(n=>n.type==='studioImage');assert(object);assert.equal(object.studioObject.suiteSource.text,source);assert.equal(placed.graph.nodes.length,before.graph.nodes.length+1);assert(placed.graph.edges.some(e=>e.source===object.id&&e.input==='scene'));assert(object.studioObject.preview.src.length>1000);checks.push('Native publication creates a real preview plane, connects to output and retains exact original source in one server patch.');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForTimeout(200);assert.equal(app.projects.get(id).project.graph.nodes.length,before.graph.nodes.length);await page.getByRole('button',{name:'Redo',exact:true}).click();await page.waitForTimeout(200);assert(app.projects.get(id).project.graph.nodes.some(n=>n.id===object.id));checks.push('Placement supports one-step server undo and redo.');
 await page.locator('.scene-node').filter({hasText:object.label}).click();await page.getByRole('button',{name:'Refresh preview',exact:true}).click();await dialog.getByRole('img').waitFor();await page.waitForFunction(()=>!document.querySelector('.fc-object-dialog footer .primary').disabled);await dialog.getByRole('button',{name:'Update object',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(app.projects.get(id).project.graph.nodes.find(n=>n.id===object.id).studioObject.suiteSource.text,source);await page.reload();await page.waitForFunction(()=>new URL(location.href).searchParams.has('project'));assert(app.projects.get(id).project.graph.nodes.some(n=>n.id===object.id));checks.push('Inspector refresh preserves source and placed object survives reload.');
 assert.deepEqual(errors,[]);await mkdir('artifacts/studio-objects',{recursive:true});await writeFile('artifacts/studio-objects/report.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();await app.close();}
