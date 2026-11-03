import {chromium,expect} from '@playwright/test';
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {preview} from '../deploy/preview.mjs';

const release=path.resolve(process.env.FLUXCREATE_RELEASE_DIR||fileURLToPath(new URL('../../FluxCreateSuite/',import.meta.url)));
const artifacts=new URL('../artifacts/music-handoff/',import.meta.url);await mkdir(artifacts,{recursive:true});
const bundle=await build({stdin:{contents:"export {sendLabResult} from './shared/asset-handoff.mjs';",resolveDir:fileURLToPath(new URL('../',import.meta.url))},write:false,bundle:true,format:'iife',globalName:'labHandoff'});
const server=await preview(release,{files:{'/music-handoff-test.js':bundle.outputFiles[0].text}}),origin='http://127.0.0.1:'+server.address().port;
// The same decodable, silent MPEG fixture as FluxLab's music-browser-smoke.mjs.
// This verifies actual encoded media and browser playback without paid inference.
const frame=Buffer.alloc(417);frame.set([255,251,144,192]);const mp3=Buffer.concat(Array(116).fill(frame)),encoded=mp3.toString('base64');
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']}),context=await browser.newContext({viewport:{width:1600,height:1050}});
const checks=[],errors=[],results=[];let generationRequests=0;
context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
await context.route('**/api/fluxlab/models',r=>r.fulfill({json:{models:[{id:'test/text',name:'Text fixture',provider:'Test',capabilities:['text'],type:'language'}]}}));
await context.route('**/api/fluxlab/status',r=>r.fulfill({json:{available:false,reason:'Simulated handoff verification'}}));
await context.route('**/api/fluxlab/music/status',r=>r.fulfill({json:{available:false,mode:'none',scopeId:'',model:'elevenlabs/music-v2'}}));
await context.route(/\/api\/fluxlab\/(?:generate|audio\/generate|music\/generate|video\/start)$/,r=>{generationRequests++;return r.fulfill({status:500,json:{error:'Paid generation is forbidden in this smoke test.'}});});
const check=message=>{checks.push(message);console.log('PASS '+message);};
const saved=(page,app)=>page.evaluate(async app=>{const effects=app==='fluxiffects',db=await new Promise((resolve,reject)=>{const r=indexedDB.open(effects?'fluxiffects-studio':'fluxcreate-local',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});try{return await new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get(effects?'current':'fluximiere-project-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}},app);
const priorContent=project=>({name:project.name,assets:project.assets,clips:project.clips,compositions:project.compositions});
let source;
async function handoff(app,result){const popup=context.waitForEvent('page');await source.evaluate(({app,result})=>{if(result.kind==='audio'){const bytes=Uint8Array.from(atob(result.encoded),c=>c.charCodeAt(0));result.audios=[{id:result.id+'-audio',mimeType:'audio/mpeg',blob:new Blob([bytes],{type:'audio/mpeg'}),duration:result.duration}];delete result.encoded;delete result.duration;}window.musicHandoff=labHandoff.sendLabResult({targetApp:app,result});},{app,result});const dest=await popup;await dest.getByRole('dialog',{name:'From FluxLab'}).waitFor();await source.evaluate(()=>window.musicHandoff);return dest;}
async function accept(page){await page.getByRole('button',{name:'Add to project',exact:true}).click();await page.getByRole('dialog',{name:'From FluxLab'}).waitFor({state:'detached'});}
try{
 source=await context.newPage();await source.goto(origin+'/fluxlab/');await source.addScriptTag({url:origin+'/music-handoff-test.js'});
 const fixture=await source.evaluate(async encoded=>{const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),ctx=new AudioContext();try{const decoded=await ctx.decodeAudioData(bytes.buffer);return {duration:decoded.duration,channels:decoded.numberOfChannels,sampleRate:decoded.sampleRate};}finally{await ctx.close();}},encoded);
 assert.ok(fixture.duration>2.9&&fixture.duration<3.2);check('The actual MP3 fixture decodes to approximately three seconds before any handoff.');
 for(const [app,name]of [['fluximiere','FluxVideo'],['fluxiffects','FluxMotion']]){
  const text='Keep this existing editable title in '+name;
  let dest=await handoff(app,{id:'music-prior-'+app,kind:'text',text,model:'test/fixture',prompt:'Existing project content',createdAt:new Date().toISOString()});await accept(dest);await expect.poll(async()=>JSON.stringify(await saved(dest,app))).toContain(text);await dest.close();
  dest=await handoff(app,{id:'music-result-'+app,kind:'audio',operation:'music',gateway:'cloudflare',model:'elevenlabs/music-v2',prompt:'Simulated three-second instrumental score',durationSeconds:3,instrumental:true,createdAt:new Date().toISOString(),encoded,duration:fixture.duration});
  const before=await saved(dest,app),previewAudio=dest.getByLabel('FluxLab audio preview',{exact:true});await expect(dest.getByRole('button',{name:'Add to project',exact:true})).toBeEnabled();const previewDuration=await previewAudio.evaluate(async audio=>{await audio.play();const duration=audio.duration;audio.pause();return duration;});assert.ok(Math.abs(previewDuration-fixture.duration)<.1);assert.deepEqual(priorContent(await saved(dest,app)),priorContent(before));check(name+' reviews and plays the received MP3 before changing the existing project.');
  await accept(dest);await expect.poll(async()=>(await saved(dest,app))?.assets?.length).toBe(before.assets.length+1);const imported=await saved(dest,app),asset=imported.assets.find(a=>!before.assets.some(old=>old.id===a.id));assert.equal(asset.type,'audio');assert.equal(asset.src,'data:audio/mpeg;base64,'+encoded);assert.ok(Math.abs(asset.duration-fixture.duration)<.1);assert.ok(JSON.stringify(imported).includes(text));
  for(const old of before.assets)assert.deepEqual(imported.assets.find(a=>a.id===old.id),old);
  if(app==='fluximiere')assert.deepEqual(imported.clips,before.clips);else{for(const old of before.compositions){const current=imported.compositions.find(c=>c.id===old.id);for(const layer of old.layers)assert.deepEqual(current.layers.find(l=>l.id===layer.id),layer);}assert.ok(imported.compositions.some(c=>c.layers.some(l=>l.type==='audio'&&l.assetId===asset.id)));}
  check(name+' stores the exact MP3 bytes and keeps every prior editable item unchanged.');
  const undo=app==='fluximiere'?'Undo':'Undo (Ctrl+Z)',redo=app==='fluximiere'?'Redo':'Redo (Ctrl+Shift+Z)';await dest.getByRole('button',{name:undo,exact:true}).click();await expect.poll(async()=>priorContent(await saved(dest,app))).toEqual(priorContent(before));check(name+' removes the handoff in one Undo and restores the prior project.');
  await dest.getByRole('button',{name:redo,exact:true}).click();await expect.poll(async()=>priorContent(await saved(dest,app))).toEqual(priorContent(imported));
  if(app==='fluximiere'){await dest.locator('.asset-main').filter({hasText:asset.name}).click();await expect.poll(async()=>(await saved(dest,app))?.clips?.some(c=>c.type==='audio'&&c.assetId===asset.id)).toBe(true);}
  const withTimeline=await saved(dest,app);await dest.reload();await expect.poll(async()=>priorContent(await saved(dest,app))).toEqual(priorContent(withTimeline));await expect(dest.getByRole('button',{name:'Play',exact:true})).toBeVisible();
  const persisted=await saved(dest,app),persistedAsset=persisted.assets.find(a=>a.id===asset.id),decoded=await dest.evaluate(async src=>{const bytes=await fetch(src).then(r=>r.arrayBuffer()),ctx=new AudioContext(),audio=new Audio(src);try{const buffer=await ctx.decodeAudioData(bytes);await audio.play();audio.pause();return {duration:buffer.duration,channels:buffer.numberOfChannels,mediaDuration:audio.duration};}finally{audio.removeAttribute('src');audio.load();await ctx.close();}},persistedAsset.src);assert.ok(Math.abs(decoded.duration-fixture.duration)<.1);assert.ok(Number.isFinite(decoded.mediaDuration));
  await dest.getByRole('button',{name:'Go to start',exact:true}).click();const clock=dest.locator(app==='fluximiere'?'.current-time':'.transport .timecode'),atStart=await clock.textContent();await dest.getByRole('button',{name:'Play',exact:true}).click();await expect(dest.getByRole('button',{name:'Pause',exact:true})).toBeVisible();await expect.poll(()=>clock.textContent()).not.toBe(atStart);await dest.getByRole('button',{name:'Pause',exact:true}).click();check(name+' reloads the stored audio, decodes and plays it, and advances timeline playback.');
  await dest.screenshot({path:fileURLToPath(new URL(app+'.png',artifacts)),fullPage:true});results.push({app,sourceBytes:mp3.length,fixture,previewDuration,decoded,assetId:asset.id,priorItems:app==='fluximiere'?before.clips.length:before.compositions.reduce((n,c)=>n+c.layers.length,0)});await dest.close();
 }
 assert.equal(generationRequests,0);assert.deepEqual(errors,[]);check('Both hosted editor handoffs complete with zero generation requests and zero browser runtime errors.');
}finally{await writeFile(new URL('report.json',artifacts),JSON.stringify({checks,results,errors,generationRequests,release},null,2));await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
