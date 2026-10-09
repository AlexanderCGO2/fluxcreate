import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../Fluxiffects/scripts/serve.mjs';
import {createWorkbench} from '../../Haidini/server/index.mjs';
import {createBlankProject,createLayer,getComp} from '../../Fluxiffects/src/core.mjs';

const root=fileURLToPath(new URL('../artifacts/legacy/',import.meta.url));await mkdir(root,{recursive:true});const dataDir=await mkdtemp(path.join(root,'state-'));
const effects=serve(0);if(!effects.listening)await new Promise(resolve=>effects.once('listening',resolve));
const fini=await createWorkbench({port:0,dataDir,webDir:fileURLToPath(new URL('../../Haidini/dist',import.meta.url))});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const errors=[],checks=[];
const motion=createBlankProject({name:'A connected creative suite'});getComp(motion).layers=[createLayer('text',{name:'Suite headline',text:'MADE TOGETHER',x:700,y:500,fontSize:100})];const buffer=Buffer.from(JSON.stringify({format:'fluxcreate-project',version:1,app:'fluxidesign',project:{pages:[]},motion}));
try{
 const fxPage=await browser.newPage({viewport:{width:1600,height:1000}});fxPage.on('pageerror',error=>errors.push(error.message));await fxPage.goto(`http://127.0.0.1:${effects.address().port}/`);await fxPage.getByRole('link',{name:'FluxCreate home',exact:true}).waitFor();assert.equal(await fxPage.getByRole('link',{name:'FluxCreate home',exact:true}).getAttribute('href'),'http://localhost:4325/');
 await fxPage.getByLabel('Import project file',{exact:true}).setInputFiles({name:'suite.fluxidesign',mimeType:'application/json',buffer});await fxPage.getByRole('dialog',{name:'Project import report',exact:true}).waitFor();await fxPage.getByText(/Imported the portable composition from fluxidesign/).waitFor();await fxPage.getByRole('button',{name:'Continue editing',exact:true}).click();assert.equal(await fxPage.getByLabel('Project name',{exact:true}).inputValue(),'A connected creative suite');await fxPage.getByRole('button',{name:'Suite headline',exact:false}).first().waitFor();await fxPage.screenshot({path:path.join(root,'fluxiffects-suite.png')});checks.push('Fluxiffects imports native suite wrapper into editable motion layers with source warning and suite home link');
 const fiPage=await browser.newPage({viewport:{width:1600,height:1000}});fiPage.on('pageerror',error=>errors.push(error.message));await fiPage.goto(fini.origin);await fiPage.getByRole('button',{name:'Export',exact:true}).waitFor();await fiPage.getByRole('link',{name:'FluxCreate home',exact:true}).waitFor();const before=fini.projects.list().length;
 await fiPage.locator('input[type=file][accept*=".fluxini"]').setInputFiles({name:'suite.fluxidesign',mimeType:'application/json',buffer});await fiPage.getByRole('dialog',{name:'Review Flux exchange',exact:true}).waitFor();assert.equal(fini.projects.list().length,before);await fiPage.getByRole('button',{name:'Import as new scene',exact:true}).click();await fiPage.getByRole('dialog',{name:'Scene imported',exact:true}).waitFor();const current=fini.projects.get(new URL(fiPage.url()).searchParams.get('project')).project;assert.equal(current.graph.nodes.find(n=>n.type==='text').params.text,'MADE TOGETHER');assert.equal(fini.projects.list().length,before+1);await fiPage.getByRole('button',{name:'Close report',exact:true}).click();await fiPage.screenshot({path:path.join(root,'fluxini-suite.png')});checks.push('Fluxini reviews converted native suite scene before creating a project, with editable text and suite home link');
 assert.deepEqual(errors,[]);await writeFile(path.join(root,'smoke.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();await fini.close();await new Promise(resolve=>effects.close(resolve));}
