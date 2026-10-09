import assert from 'node:assert/strict';import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';import {createWorkbench} from '../server/index.mjs';
const {chromium}=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'))('playwright');
const app=await createWorkbench({dataDir:await mkdtemp(path.resolve('.test-data/studio-tools-')),webDir:path.resolve('.staging-dist'),port:0}),project=app.projects.create(undefined,'studio-turntable').project;
await mkdir('artifacts/studio-tools',{recursive:true});let browser;const errors=[],checks=[];
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:1000},acceptDownloads:true});page.setDefaultTimeout(15000);
 await page.addInitScript(()=>{window.encodedFrames=[];const original=VideoEncoder.prototype.encode;VideoEncoder.prototype.encode=function(frame,options){window.encodedFrames.push({timestamp:frame.timestamp,duration:frame.duration});return original.call(this,frame,options);};});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
 const saved=()=>page.waitForFunction(()=>document.querySelector('.status-bar')?.textContent.includes('All changes saved locally'));
 const button=name=>page.getByRole('button',{name,exact:true});
 await page.goto(app.origin+'/?project='+project.id);await page.getByLabel('Viewport camera',{exact:true}).waitFor();await page.waitForTimeout(500);
 assert.equal(await page.getByLabel('Viewport camera',{exact:true}).inputValue(),'camera');
 await page.screenshot({path:'artifacts/studio-tools/workbench.png'});
 await button('Copper finish').click();await button('Glass').click();await saved();assert.equal(app.projects.get(project.id).project.graph.nodes.find(n=>n.id==='finish').params.transmission,1);
 await page.screenshot({path:'artifacts/studio-tools/glass.png'});await button('Undo').click();await saved();assert.equal(app.projects.get(project.id).project.graph.nodes.find(n=>n.id==='finish').params.metalness,.85);checks.push('Surface material presets and undo');
 await button('Turntable model').click();await page.getByLabel('Viewport camera',{exact:true}).selectOption('front');await page.waitForTimeout(500);
 await page.screenshot({path:'artifacts/studio-tools/handles.png'});
 // Front view: translate handle is a stable world-space axis at the selected origin.
 const rect=await page.locator('.viewport-canvas canvas').boundingBox();const centerX=rect.x+rect.width/2,centerY=rect.y+rect.height/2-1.7/(24*Math.tan(19*Math.PI/180))*rect.height/2;
 const revision=app.projects.get(project.id).project.revision;
 await page.mouse.move(centerX+rect.height*.12,centerY);await page.mouse.down();await page.mouse.move(centerX+rect.height*.12+55,centerY,{steps:12});await page.mouse.up();await page.waitForTimeout(400);await saved();
 const moved=app.projects.get(project.id).project;assert.equal(moved.revision,revision+1,'A drag must create exactly one edit');assert(Math.abs(moved.graph.nodes.find(n=>n.id==='model').params.x)>.1);
 await button('Undo').click();await saved();assert.equal(app.projects.get(project.id).project.graph.nodes.find(n=>n.id==='model').params.x,0);checks.push('Viewport drag changes saved position once; undo restores it');
 await page.getByLabel('Viewport camera',{exact:true}).selectOption('camera');await page.reload();await page.waitForFunction(()=>document.querySelector('[aria-label="Viewport camera"]')?.value==='camera');assert.equal(await page.getByLabel('Viewport camera',{exact:true}).inputValue(),'camera');
 await button('Frame all').click();assert.equal(await page.getByLabel('Viewport camera',{exact:true}).inputValue(),'editor');await page.getByLabel('Viewport camera',{exact:true}).selectOption('camera');
 const originalSize=await page.locator('.viewport-canvas canvas').evaluate(c=>[c.width,c.height]);
 for(const [kind,action,file] of [['Image','Save image','studio.png'],['3D scene','Export GLB','studio.glb'],['Video','Render video','studio.webm']]){
  await button('Export').click();await button(kind).click();if(kind!=='3D scene')await page.getByLabel('Output size',{exact:true}).selectOption('hd');
  const pending=page.waitForEvent('download',{timeout:120000});await button(action).click();const download=await pending;await download.saveAs('artifacts/studio-tools/'+file);await saved();
 }
 const encoded=await page.evaluate(()=>window.encodedFrames);assert.equal(encoded.length,240);assert.equal(encoded[0].timestamp,0);assert.equal(encoded.at(-1).timestamp+encoded.at(-1).duration,8000000);
 const file=await readFile('artifacts/studio-tools/studio.webm');
 const playback=await browser.newPage();
 const metadata=await playback.evaluate(async base64=>{const video=document.createElement('video');video.src=URL.createObjectURL(new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],{type:'video/webm'}));try{await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('Export cannot be decoded'));});await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=()=>reject(Error('Frame decode failed'));video.currentTime=4;});return {duration:video.duration,width:video.videoWidth,height:video.videoHeight,decoded:video.readyState>=2};}finally{URL.revokeObjectURL(video.src);video.remove();}},file.toString('base64'));
 await playback.close();assert(metadata.decoded);assert(Math.abs(metadata.duration-8)<1/30);assert.equal(metadata.width,1280);assert.equal(metadata.height,720);assert.deepEqual(await page.locator('.viewport-canvas canvas').evaluate(c=>[c.width,c.height]),originalSize);
 const glb=await readFile('artifacts/studio-tools/studio.glb'),json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString());assert(json.cameras.length>0);assert(json.extensions.KHR_lights_punctual.lights.length>0);assert(json.materials.some(m=>m.pbrMetallicRoughness.metallicFactor===.85));
 checks.push('HD PNG and GLB preserve materials/lights/camera; WebM has 240 frames and 8-second duration');console.log(metadata);
 let downloads=0;page.on('download',()=>downloads++);await button('Export').click();await button('Video').click();await button('Render video').click();await button('Cancel export').click();await saved();await page.waitForTimeout(500);assert.equal(downloads,0);assert.deepEqual(await page.locator('.viewport-canvas canvas').evaluate(c=>[c.width,c.height]),originalSize);checks.push('Cancellation restores viewport and produces no partial download');
 assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({checks,errors}));
}catch(e){await browser?.contexts()[0]?.pages()[0]?.screenshot({path:'artifacts/studio-tools/failure.png'});throw e;}finally{await writeFile('artifacts/studio-tools/checks.json',JSON.stringify({checks,errors},null,2));await browser?.close();await app.close();}
