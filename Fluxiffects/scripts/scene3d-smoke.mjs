import assert from 'node:assert/strict';
import http from 'node:http';
import {once} from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {serve} from './serve.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'artifacts/scene3d');
await fs.mkdir(out,{recursive:true});
const fixturePath=path.resolve(root,'../Flux3D/artifacts/interop/animated-hierarchy.glb'),bytes=await fs.readFile(fixturePath),src='data:model/gltf-binary;base64,'+bytes.toString('base64');
const native=JSON.parse(await fs.readFile(path.resolve(root,'../Flux3D/artifacts/browser/scene.flux3d'),'utf8'));
const bundle=await build({stdin:{contents:'import * as renderer from "./src/renderer.mjs"; import * as model from "./src/core.mjs"; window.renderer=renderer; window.model=model;',resolveDir:root},bundle:true,format:'iife',platform:'browser',write:false});
const server=http.createServer((req,res)=>{if(req.url==='/harness.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(bundle.outputFiles[0].text);}else{res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><body><canvas id="view" width="320" height="240"></canvas><script src="/harness.js"></script></body></html>');}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const app=serve(0);await once(app,'listening');
let browser;const report={checks:[],errors:[]};const checked=name=>{report.checks.push(name);console.log('PASS '+name);};
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required']});
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.renderer&&window.model);
 await page.evaluate(async({src,native})=>{
  window.check=(value,message)=>{if(!value)throw Error(message);};
  window.webglCanvases=new Set();const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'||type==='webgl')webglCanvases.add(this);return get.call(this,type,...args);};
  window.asset={id:'animated-scene',name:'A little orbit',type:'model3d',modelFormat:'glb',src,width:320,height:240,duration:2,clips:[{name:'A little orbit',duration:2}]};
  window.layer=model.createLayer('scene3d',{id:'scene-layer',assetId:asset.id,x:0,y:0,anchorX:0,anchorY:0,width:320,height:240,start:0,end:4,cornerRadius:0,modelLoop:false});
  window.comp={id:'scene-preview',name:'3D motion',width:320,height:240,fps:12,duration:4,background:'transparent',layers:[layer]};
  window.canvas=document.querySelector('#view');window.ctx=canvas.getContext('2d');
  window.png=async(c,t)=>{const blob=await renderer.exportFrame(c,[asset],t);const image=await createImageBitmap(blob);const target=document.createElement('canvas');target.width=image.width;target.height=image.height;const context=target.getContext('2d');context.drawImage(image,0,0);image.close();return{blob,pixels:context.getImageData(0,0,target.width,target.height).data,url:target.toDataURL(),width:target.width,height:target.height};};
  window.stats=pixels=>{let count=0,x=0,y=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>20){count++;x+=(i/4)%320;y+=Math.floor(i/4/320);}return{count,x:x/count,y:y/count};};
  const prepared=await renderer.prepareAssets([asset]);check(prepared[0].status==='fulfilled',String(prepared[0].reason));renderer.renderComposition(ctx,comp,[asset],.25,{throwMediaErrors:true});
  window.nativeAsset={id:'native-scene',type:'model3d',modelFormat:'flux3d',name:'Saved Flux3D scene',src:'data:application/json;base64,'+btoa(unescape(encodeURIComponent(JSON.stringify(native)))),width:320,height:240,clips:[],duration:0};
 },{src,native});
 const frames=await page.evaluate(async()=>{
  const a=await png(comp,.25),b=await png(comp,1.5);check(a.width===320&&a.height===240,'PNG dimensions');check(a.pixels[3]===0,'3D background is not transparent');check(a.url!==b.url,'Source animation did not move');const sa=stats(a.pixels),sb=stats(b.pixels);check(sa.count>100&&sb.count>100,'3D geometry missing');check(Math.abs(sa.x-sb.x)+Math.abs(sa.y-sb.y)>10,'Hierarchical 3D motion missing');
  window.firstFrame=a.url;return{a:a.url,b:b.url,first:sa,last:sb};
 });
 await fs.writeFile(path.join(out,'animated-025.png'),Buffer.from(frames.a.split(',')[1],'base64'));await fs.writeFile(path.join(out,'animated-150.png'),Buffer.from(frames.b.split(',')[1],'base64'));checked('Hierarchical source motion renders to exact-size transparent PNG frames');
 await page.evaluate(async()=>{
  await png(comp,3);check((await png(comp,.25)).url===firstFrame,'Backward seek after clamping differs');
  check((await png({...comp,layers:[{...layer,modelLoop:true}]},2.25)).url===firstFrame,'Loop did not sample identical source time');
  check((await png({...comp,layers:[{...layer,start:1,sourceIn:.05,playbackRate:2}]},1.1)).url===firstFrame,'Trim/source offset/playback speed mapping differs');
  const animated=model.setKeyframe(model.setKeyframe(layer,'modelRotationY',0,0,'linear'),'modelRotationY',2,95,'linear');
  const camera=model.setKeyframe(model.setKeyframe(animated,'cameraYaw',0,0,'linear'),'cameraYaw',2,40,'linear');
  check((await png({...comp,layers:[camera]},1.5)).url!==(await png(comp,1.5)).url,'3D transform and camera keyframes did not render');
  check(webglCanvases.size===1,'Layer previews and frame exports allocated multiple WebGL contexts');
 });checked('Backward seek, loop, source timing, camera/model keyframes, shared single WebGL context');
 await page.evaluate(async()=>{
  const separate={...comp,id:'two-scenes',width:640,layers:[{...layer,id:'later',x:320,sourceIn:1},{...layer,id:'earlier'}]};
  const target=document.createElement('canvas');target.width=640;target.height=240;renderer.renderComposition(target.getContext('2d'),separate,[asset],.25,{throwMediaErrors:true});
  const context=target.getContext('2d'),left=context.getImageData(0,0,320,240),right=context.getImageData(320,0,320,240);check(stats(left.data).count>100&&stats(right.data).count>100,'Multiple 3D layers missing');check(Math.abs(stats(left.data).x-stats(right.data).x)+Math.abs(stats(left.data).y-stats(right.data).y)>8,'Layer animation state is shared incorrectly');
  renderer.disposeCompositionMedia('two-scenes');
  const cancelled=renderer.loadAsset({...asset,id:'superseded-load'});renderer.disposeUnusedAssets([asset]);let aborted=false;try{await cancelled;}catch(e){aborted=e.name==='AbortError';}check(aborted,'Superseded 3D load was not discarded');
  const nativeComp={...comp,id:'native-view',layers:[{...layer,assetId:nativeAsset.id}]};await renderer.prepareAssets([nativeAsset]);const nativeBlob=await renderer.exportFrame(nativeComp,[nativeAsset],0);check(nativeBlob.size>3000,'Native Flux3D scene did not render');renderer.disposeCompositionMedia(nativeComp.id);
 });checked('Independent layer mixers, superseded-load disposal, and native Flux3D rendering');

 const reviewFixtures=await Promise.all(['camera-roll','skin-follow-camera','brief-step'].map(async name=>({name,src:'data:model/gltf-binary;base64,'+(await fs.readFile(path.resolve(root,'../Flux3D/artifacts/interop/'+name+'.glb'))).toString('base64')})));
 const review=await page.evaluate(async fixtures=>{
  const result={};for(const fixture of fixtures){const other={...asset,id:fixture.name,name:fixture.name,src:fixture.src},otherComp={...comp,id:fixture.name,layers:[{...layer,assetId:fixture.name}]};check((await renderer.prepareAssets([other]))[0].status==='fulfilled','Review fixture failed to load');const draw=time=>{renderer.renderComposition(ctx,otherComp,[other],time,{throwMediaErrors:true});return{url:canvas.toDataURL(),pixels:ctx.getImageData(0,0,320,240).data};};const first=draw(0),last=draw(fixture.name==='brief-step'?.075:2),a=stats(first.pixels),b=stats(last.pixels);check(a.count>50&&b.count>50,fixture.name+' disappeared during animation');if(fixture.name==='camera-roll'){check(first.url!==last.url,'Embedded camera roll was ignored');}if(fixture.name==='skin-follow-camera'){check(Math.abs(a.x-b.x)<1&&Math.abs(a.y-b.y)<1&&Math.abs(a.count-b.count)<10,'Moving skeleton failed to follow its animated camera');}if(fixture.name==='brief-step'){check(Math.abs(a.x-b.x)>30,'Brief STEP motion was not shown');}result[fixture.name]={first:a,last:b,url:last.url};renderer.disposeCompositionMedia(fixture.name);}
  return result;
 },reviewFixtures);
 for(const[name,detail]of Object.entries(review))await fs.writeFile(path.join(out,name+'.png'),Buffer.from(detail.url.split(',')[1],'base64'));
 checked('Embedded camera roll, moving skeletal skin with camera, and brief STEP excursions render correctly');

 const video=await page.evaluate(async()=>{
  const result=await renderer.exportVideo({...comp,id:'movie',duration:1.7,background:'#ffffff'},[asset]);check(result.blob.size>1000,'3D WebM export empty');
  const url=URL.createObjectURL(result.blob),v=document.createElement('video');v.muted=true;v.src=url;await new Promise((resolve,reject)=>{v.onloadeddata=resolve;v.onerror=()=>reject(Error('WebM decode failed'));});
  const c=document.createElement('canvas');c.width=320;c.height=240;const cx=c.getContext('2d');
  const sample=async time=>{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Video seek timeout')),10000);v.onseeked=()=>{clearTimeout(timer);resolve();};v.currentTime=time;});cx.drawImage(v,0,0);const pixels=cx.getImageData(0,0,320,240).data;let count=0,x=0,y=0;for(let i=0;i<pixels.length;i+=4)if(Math.max(pixels[i],pixels[i+1],pixels[i+2])-Math.min(pixels[i],pixels[i+1],pixels[i+2])>15){count++;x+=(i/4)%320;y+=Math.floor(i/4/320);}return{count,x:x/count,y:y/count};};
  const first=await sample(.25),last=await sample(1.3);check(first.count>100&&last.count>100&&Math.abs(first.x-last.x)+Math.abs(first.y-last.y)>8,'Exported WebM has no moving scene');check(v.videoWidth===320&&v.videoHeight===240,'WebM dimensions');URL.revokeObjectURL(url);return{base64:await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(result.blob);}),bytes:result.blob.size,first,last};
 });await fs.writeFile(path.join(out,'animated-scene.webm'),Buffer.from(video.base64,'base64'));checked('Actual WebM encoding/decoding contains animated 3D frames at composition dimensions');
 await page.evaluate(()=>{renderer.disposeCompositionMedia(comp.id);renderer.disposeUnusedAssets([]);});
 const ui=await browser.newPage({viewport:{width:1600,height:1000}});ui.on('pageerror',e=>report.errors.push(e.message));await ui.goto(`http://127.0.0.1:${app.address().port}`);await ui.getByText('Saved on this device',{exact:true}).waitFor();
 await ui.getByLabel('Import 3D scene').setInputFiles(fixturePath);await ui.getByLabel('3D position X',{exact:true}).waitFor();await ui.waitForTimeout(900);
 await ui.getByLabel('3D rotation Y',{exact:true}).fill('35');await ui.getByLabel('3D rotation Y',{exact:true}).press('Enter');assert.equal(await ui.getByLabel('3D rotation Y',{exact:true}).inputValue(),'35');await ui.getByRole('button',{name:'Undo (Ctrl+Z)',exact:true}).click();await expect(ui.getByLabel('3D rotation Y',{exact:true})).toHaveValue('0');
 await ui.getByRole('button',{name:'Animate',exact:true}).click();await ui.getByLabel('Animated property').selectOption('modelRotationY');await ui.getByRole('button',{name:'Add first keyframe',exact:true}).click();
 const pending=ui.waitForEvent('download');await ui.keyboard.press('Control+s');const download=await pending;const project=JSON.parse(await fs.readFile(await download.path(),'utf8'));const sceneAsset=project.assets.find(a=>a.type==='model3d'),sceneLayer=project.compositions.flatMap(c=>c.layers).find(l=>l.type==='scene3d');assert.equal(sceneAsset.src,src);assert.equal(sceneAsset.clips[0].name,'A little orbit');assert.equal(sceneLayer.keyframes.modelRotationY.length,1);
 await fs.writeFile(path.join(out,'animated-scene.fluxiffects.json'),JSON.stringify(project,null,2));await ui.getByRole('button',{name:'Design',exact:true}).click();await ui.screenshot({path:path.join(out,'scene3d-editor.png')});await ui.getByRole('button',{name:'Switch to dark appearance',exact:true}).click();await ui.waitForFunction(()=>{const canvas=document.querySelector('canvas'),ctx=canvas?.getContext('2d');if(!ctx)return false;const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();for(let i=0;i<pixels.length;i+=40)if(pixels[i+3]>0)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);return colors.size>30;});await ui.waitForTimeout(300);await ui.screenshot({path:path.join(out,'scene3d-editor-dark.png')});checked('Editor imports original GLB motion, edits/undoes 3D properties, creates keyframes, and saves untouched source bytes');
 await ui.getByText('Saved on this device',{exact:true}).waitFor();await ui.reload();await ui.getByText('Saved on this device',{exact:true}).waitFor();const restoredDownload=ui.waitForEvent('download');await ui.keyboard.press('Control+s');const restored=JSON.parse(await fs.readFile(await(await restoredDownload).path(),'utf8'));assert.equal(restored.assets.find(a=>a.type==='model3d').src,src);assert.equal(restored.compositions.flatMap(c=>c.layers).find(l=>l.type==='scene3d').keyframes.modelRotationY.length,1);checked('Saved imported motion project restores after reloading the editor');
 assert.deepEqual(report.errors,[]);report.passed=true;report.video={bytes:video.bytes,first:video.first,last:video.last};report.frames={first:frames.first,last:frames.last};
}catch(error){report.passed=false;report.failure=error.stack;process.exitCode=1;console.error(error);}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>app.close(r))]);}
console.log(JSON.stringify(report,null,2));
