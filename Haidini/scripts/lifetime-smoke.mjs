import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import os from 'node:os';
import {createWorkbench} from '../server/index.mjs';
const {chromium}=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'))('playwright');
await mkdir('artifacts/lifetime',{recursive:true});
const dir=await mkdtemp(path.resolve('.test-data/lifetime-ui-')),app=await createWorkbench({dataDir:dir,webDir:path.resolve(process.argv.includes('--staging')?'.staging-dist':'dist'),port:0});
const fixtureArg=process.argv.find(a=>a.startsWith('--fixture=')),fixture=fixtureArg?JSON.parse(await readFile(fixtureArg.slice(10),'utf8')):undefined,scene=app.projects.create(fixture,fixture?undefined:'text-sparks').project,node=scene.graph.nodes.find(n=>n.type==='particleSim');
const backend=process.argv.includes('--cpu')?'CPU':'automatic';app.projects.patch(scene.id,{baseRevision:scene.revision,summary:'Lifetime backend test fixture',commands:[{op:'set',nodeId:node.id,param:'simulationBackend',value:backend}]});
let browser;const report={errors:[],measurements:[]};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>{
  const Original=window.Worker;window.particleWorkers=0;
  window.Worker=class extends Original{constructor(...args){super(...args);const id=++window.particleWorkers;this.addEventListener('message',e=>{const f=e.data.frame;if(!f?.ages)return;const ages=Array.from(f.ages).filter(a=>a>=0);window.particleFrame={worker:id,time:f.time,alive:ages.length,maxAge:Math.max(0,...ages),lifetimes:Array.from(new Set(f.lifetimes)).filter(v=>v>0)};});}};
  const read=WebGL2RenderingContext.prototype.readPixels;window.gpuParticleReadbacks=[];
  WebGL2RenderingContext.prototype.readPixels=function(...args){const result=read.apply(this,args),buffer=args[6];if(buffer instanceof Float32Array)window.gpuParticleReadbacks.push(Array.from(buffer));return result;};
 });
 const settled=()=>page.waitForFunction(()=>document.querySelector('.status-bar')?.textContent?.includes('All changes saved locally'));
 await page.goto(app.origin+'/?project='+scene.id);await page.locator('.scene-node').filter({hasText:node.label}).first().click();await page.getByText('Launch & lifetime',{exact:true}).click();await page.getByRole('slider',{name:'Timeline position'}).fill('6');
 for(const lifetime of [.5,12]){
  const before=await page.evaluate(()=>window.particleWorkers),field=page.getByRole('spinbutton',{name:'Lifetime value',exact:true});await field.fill(String(lifetime));await field.press('Enter');await settled();
  await page.evaluate(()=>{window.lifetimeReadySince=0;});await page.waitForFunction(()=>{if(document.querySelector('.simulation-status')?.textContent!=='Simulation ready · 6.00 s'){window.lifetimeReadySince=0;return false;}window.lifetimeReadySince ||=performance.now();return performance.now()-window.lifetimeReadySince>300;},{},{timeout:45000});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const actualBackend=await page.locator('[data-simulation-backend]').getAttribute('data-simulation-backend');let frame;
  if(backend==='CPU'){
   assert.equal(actualBackend,'CPU');await page.waitForFunction(({before,lifetime})=>window.particleWorkers>before&&window.particleFrame?.worker===window.particleWorkers&&window.particleFrame.time===6&&window.particleFrame.lifetimes.some(v=>Math.abs(v-lifetime)<.001),{before,lifetime},{timeout:45000});frame=await page.evaluate(()=>window.particleFrame);
  }else{
   assert.equal(actualBackend,'GPU');await page.evaluate(()=>{window.gpuParticleReadbacks=[];});await page.getByRole('button',{name:'Frame all',exact:true}).click();
   frame=await page.evaluate(()=>{const [positions,velocities]=window.gpuParticleReadbacks;if(!positions||!velocities)throw Error('Framing must read the current GPU state');const ages=positions.filter((_,i)=>i%4===3).filter(a=>a>=0),lifetimes=velocities.filter((_,i)=>i%4===3);return {time:6,alive:ages.length,maxAge:Math.max(0,...ages),lifetimes:Array.from(new Set(lifetimes)).filter(v=>v>0)};});
   assert(frame.lifetimes.some(v=>Math.abs(v-lifetime)<.001),'Edited lifetime reached the GPU state');
  }
  assert.equal(app.projects.get(scene.id).project.graph.nodes.find(n=>n.id===node.id).params.lifetime,lifetime);report.measurements.push({lifetime,backend:actualBackend,...frame});await page.screenshot({path:'artifacts/lifetime/lifetime-'+lifetime+'.png'});
 }
 assert(report.measurements[0].maxAge<.51);assert(report.measurements[1].maxAge>5.9);assert(report.measurements[1].alive>report.measurements[0].alive);assert.deepEqual(report.errors,[]);await writeFile('artifacts/lifetime/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){console.error(error);await browser?.contexts()[0]?.pages()[0]?.screenshot({path:'artifacts/lifetime/failure.png'});process.exitCode=1;}finally{await browser?.close();await app.close();}
