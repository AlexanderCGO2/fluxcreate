import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'))('playwright'));}
const root=path.resolve('.'),artifacts=path.join(root,'artifacts/hosted-storage');
await mkdir(artifacts,{recursive:true});
const bundle=await build({stdin:{contents:`import {createHostedAdapter} from './src/hosted/api.mjs';import {createProject} from './src/engine/project.ts';import {encodeExchange,decodeExchange,toFluxiffects} from '@flux-studio/exchange';import {connect,api} from './src/api.ts';Object.assign(window,{createHostedAdapter,createProject,encodeExchange,decodeExchange,toFluxiffects,connect,api});`,resolveDir:root},bundle:true,format:'esm',platform:'browser',write:false,target:'es2022',logLevel:'silent'});
const appBuild=await build({entryPoints:['src/main.tsx','src/engine/simulation.worker.ts'],outdir:artifacts,bundle:true,format:'esm',platform:'browser',write:false,target:'es2022',loader:{'.woff2':'file'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
const files=new Map(appBuild.outputFiles.map(f=>['/'+path.relative(artifacts,f.path).replaceAll('\\','/'),f.contents]));
const requests=[],server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),pathname=url.pathname;
 if(pathname.startsWith('/api/')){requests.push(pathname);res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Test deliberately runs without cloud AI.'}));return;}
 const appPath=pathname.replace(/^\/fluxini/, '')||'/';
 if(appPath==='/harness'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><script type="module" src="./harness.js"></script>');return;}
 if(appPath==='/harness.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(bundle.outputFiles[0].contents);return;}
 if(appPath==='/'){res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><html><head><title>FluxEffects hosted verification</title><link rel="stylesheet" href="/fluxini/main.css"></head><body><div id="root"></div><script type="module" src="/fluxini/main.js"></script></body></html>');return;}
 const file=files.get(appPath);if(file){res.writeHead(200,{'Content-Type':appPath.endsWith('.css')?'text/css':appPath.endsWith('.woff2')?'font/woff2':'text/javascript'});res.end(file);return;}
 res.writeHead(404);res.end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,report={checks:[],browserErrors:[]};let browser;
try{
 browser=await chromium.launch({executablePath:process.env.FLUXINI_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-gpu-sandbox']});
 const context=await browser.newContext({viewport:{width:1600,height:1000},acceptDownloads:true}),page=await context.newPage();
 page.on('pageerror',e=>report.browserErrors.push(e.message));
 const openHarness=async target=>{await target.goto(origin+'/fluxini/harness');await target.waitForFunction(()=>!!window.createHostedAdapter);await target.evaluate(()=>{window.adapter=createHostedAdapter({databaseName:'fluxini-hosted-smoke',request:async()=>new Response(JSON.stringify({available:false}),{status:200,headers:{'Content-Type':'application/json'}})});});};
 const call=(url,body)=>page.evaluate(({url,body})=>adapter.api(url,body),{url,body});
 const rejects=async(url,body,pattern)=>{const result=await page.evaluate(async({url,body})=>{try{await adapter.api(url,body);return null;}catch(e){return{message:e.message,status:e.status};}},{url,body});assert.ok(result,'Expected request to fail');assert.match(result.message,pattern);return result;};
 await openHarness(page);
 const session=await page.evaluate(()=>adapter.connect());assert.equal(session.model.available,false);
 let projects=await call('/projects');assert.equal(projects.length,1);const seedId=projects[0].id;assert.equal((await call('/fonts')).length,6);
 report.checks.push('Offline AI boot seeds one durable project and six built-in fonts');
 const fixture=await page.evaluate(()=>{const p=createProject('11111111-1111-4111-8111-111111111111','motion');p.name='Hosted regression fixture';return p;});
 let state=await call('/projects',{project:fixture}),id=state.project.id;
 const route=action=>`/projects/${id}${action?'/'+action:''}`,text=state=>state.project.graph.nodes.find(n=>n.id==='title').params.text;
 const patch=(revision,commands,summary='Hosted edit')=>({baseRevision:revision,summary,commands});
 let preview=patch(0,[{op:'set',nodeId:'title',param:'text',value:'BROWSER SAVED'}]);
 await call(route('preview'),preview);assert.equal((await call(route())).project.revision,0);
 state=await call(route('patch'),preview);assert.equal(text(state),'BROWSER SAVED');assert.equal(state.project.revision,1);
 assert.equal((await rejects(route('patch'),preview,/scene changed/i)).status,409);
 await rejects(route('patch'),patch(1,[{op:'projectName',name:'Partial'},{op:'set',nodeId:'missing',param:'x',value:2}]),/not found/i);
 assert.equal((await call(route())).project.name,fixture.name);
 await rejects(route('patch'),patch(1,[{op:'add',id:'bad',type:'bad',x:0,y:0}]),/unsupported/i);
 report.checks.push('Preview is read-only; patches are atomic and stale revisions are rejected');
 state=await call(route('lock'),{baseRevision:1,nodeId:'title',param:'text',locked:true});
 await rejects(route('patch'),patch(2,[{op:'set',nodeId:'title',param:'text',value:'NO'}]),/locked/i);
 await rejects(route('patch'),patch(2,[{op:'remove',nodeId:'title'}]),/unlock/i);
 state=await call(route('undo'),{baseRevision:2});assert.equal(state.project.revision,3);assert.equal(state.project.locks.length,0);assert.ok(state.canRedo);
 state=await call(route('redo'),{baseRevision:3});assert.equal(state.project.revision,4);assert.equal(state.project.locks.length,1);
 state=await call(route('undo'),{baseRevision:4});
 state=await call(route('patch'),patch(5,[{op:'set',nodeId:'title',param:'text',value:'NEW BRANCH'}]));assert.equal(state.canRedo,false);
 const history=await call(route('history')+'?limit=2');assert.equal(history.total,7);assert.deepEqual(history.entries.map(e=>e.revision),[6,5]);assert.equal(history.nextBefore,5);
 const oldHistory=await call(route('history')+'?before=5&limit=100');assert.ok(oldHistory.entries.some(e=>e.revision===4&&e.kind==='patch_redone'));
 state=await call(route('restore-revision'),{baseRevision:6,revision:2});assert.equal(state.project.revision,7);assert.equal(state.project.locks.length,1);assert.equal(text(state),'BROWSER SAVED');
 state=await call(route('undo'),{baseRevision:7});assert.equal(text(state),'NEW BRANCH');assert.equal(state.project.locks.length,0);
 report.checks.push('Locks, monotonic undo/redo, abandoned redo history, paged history and revision restore work');
 const other=await context.newPage();await openHarness(other);
 const raced=await Promise.allSettled([call(route('patch'),patch(8,[{op:'projectName',name:'First tab'}])),other.evaluate(({route,body})=>adapter.api(route,body),{route:route('patch'),body:patch(8,[{op:'projectName',name:'Second tab'}])})]);
 assert.equal(raced.filter(r=>r.status==='fulfilled').length,1);assert.match(raced.find(r=>r.status==='rejected').reason.message,/scene changed/i);
 state=await call(route());assert.equal(state.project.revision,9);await other.close();
 report.checks.push('Concurrent tabs serialize edits and reject the losing stale revision without data loss');
 let memory=await call(route('memory')+'?q=title&node=title');assert.equal(memory.context.retrieval,'Browser project history');
 const source=memory.events[0].id;
 let preferences=await call(route('preferences'),{action:'propose',statement:'Keep the title calm.',sourceId:source,nodeId:'title'});const pref=preferences.preferences[0];assert.equal(pref.status,'candidate');
 memory=await call(route('memory'));assert.ok(!JSON.stringify(memory.context.sections.find(s=>s.id==='preferences')).includes('Keep the title calm.'));
 await call(route('preferences'),{id:pref.id,status:'approved'});
 memory=await call(route('memory'));assert.ok(JSON.stringify(memory.context.sections.find(s=>s.id==='preferences')).includes('Keep the title calm.'));
 await rejects(`/projects/${seedId}/preferences`,{action:'propose',statement:'Cross-project',sourceId:source},/source from this project/i);
 await rejects(route('memory')+'?node=missing',undefined,/selection/i);
 report.checks.push('Preferences require project-owned evidence; only approved preferences enter AI context');
 const font=await call('/fonts/import',{data:{familyName:'Hosted fixture',resolution:1000,glyphs:{A:{ha:700,o:'m 0 0 l 350 800 l 700 0 l 0 0'}}}});
 assert.match(font.id,/^font_[0-9a-f]{32}$/);await call('/fonts/'+font.id,{name:'Browser font',favorite:true});
 state=await call(route('patch'),patch(9,[{op:'set',nodeId:'title',param:'font',value:font.id}]));
 await call('/fonts/'+font.id,{hidden:true});assert.equal((await call('/fonts')).length,6);assert.equal((await call('/fonts/'+font.id)).name,'Browser font');
 let native=await call(route('export'));assert.equal(native.fonts.length,1);assert.equal(native.fonts[0].id,font.id);
 const badNative=structuredClone(native);badNative.fonts[0].id='font_'+ '0'.repeat(32);
 await rejects('/projects',{project:badNative},/identifier/i);
 assert.equal((await call('/projects')).length,2);
 await rejects('/fonts/__proto__',undefined,/missing/i);
 report.checks.push('Imported font bytes, stable identifiers and hidden styles survive project packaging; invalid packages are atomic');
 const savedExchange=await call(route('exchange'),{baseRevision:10,brief:'Preserve the letterforms.',notes:'Browser handoff',canvas:{width:1080,height:1080,pixelsPerUnit:100}});
 assert.match(savedExchange.markdown,/Preserve the letterforms/);
 const previewExchange=await call('/exchange/import',{markdown:savedExchange.markdown,preview:true});assert.equal(previewExchange.report.sourceApp,'fluxini');assert.equal((await call('/projects')).length,2);
 const imported=await call('/exchange/import',{markdown:savedExchange.markdown});assert.equal(imported.project.revision,0);assert.equal(text(imported),'NEW BRANCH');assert.equal(imported.project.graph.nodes.find(n=>n.id==='title').params.font,font.id);
 assert.equal((await call(`/projects/${imported.project.id}/exchange-info`)).notes,'Browser handoff');
 native=await call(route('export'));assert.ok(native.exchange.snapshots.fluxini);await writeFile(path.join(artifacts,'hosted.fluxini.json'),JSON.stringify(native,null,2));
 const copy=await call('/projects',{project:native});assert.equal((await call(`/projects/${copy.project.id}/exchange-info`)).brief,'Preserve the letterforms.');
 const returned=await page.evaluate(async({markdown})=>{const first=decodeExchange(markdown),converted=toFluxiffects(first);const motion=converted.project;motion.name='Changed in FluxMotion';return encodeExchange({app:'fluxiffects',project:motion,previous:first});},{markdown:savedExchange.markdown});
 const original=await call('/exchange/import',{markdown:returned,restoreOriginal:true});assert.equal(text(original),'NEW BRANCH');assert.equal(original.report.restoredOriginal,true);
 report.checks.push('Native and Markdown exchange retain fonts, brief, notes and recoverable original FluxEffects snapshots');
 const planResult=await page.evaluate(async({id})=>{let payload;const ai=createHostedAdapter({databaseName:'fluxini-hosted-smoke',request:async(url,options)=>{payload=JSON.parse(options.body);return new Response(JSON.stringify({patch:{baseRevision:payload.project.revision,summary:'AI title',commands:[{op:'set',nodeId:'title',param:'text',value:'AI PREVIEW'}]}}),{status:200});}});const result=await ai.api(`/projects/${id}/plan`,{intent:'Revise the title',selection:['title']});await ai.close();return{result,payload};},{id});
 assert.equal(planResult.payload.preferences.length,1);assert.equal(planResult.payload.preferences[0].status,'approved');assert.deepEqual(planResult.payload.selection,['title']);assert.equal(text(await call(route())),'NEW BRANCH');assert.equal(planResult.result.patch.baseRevision,10);
 const stale=await page.evaluate(async({id})=>{let release,requested;const ready=new Promise(resolve=>requested=resolve);const ai=createHostedAdapter({databaseName:'fluxini-hosted-smoke',request:async(url,options)=>{const body=JSON.parse(options.body);requested();await new Promise(resolve=>release=resolve);return new Response(JSON.stringify({patch:{baseRevision:body.project.revision,summary:'Old AI',commands:[{op:'projectName',name:'Do not overwrite'}]}}),{status:200});}});const plan=ai.api(`/projects/${id}/plan`,{intent:'Change name'}).then(()=>({ok:true}),e=>({ok:false,status:e.status,message:e.message}));await ready;const state=await adapter.api(`/projects/${id}`);await adapter.api(`/projects/${id}/patch`,{baseRevision:state.project.revision,summary:'Edit while planning',commands:[{op:'projectName',name:'Keep new edit'}]});release();const result=await plan;await ai.close();return result;},{id});
 assert.equal(stale.status,409);assert.equal((await call(route())).project.name,'Keep new edit');
 report.checks.push('Hosted AI receives validated project context and approved preferences; stale AI plans cannot overwrite newer edits');
 const duplicated=await call(route('duplicate'),{baseRevision:11});assert.equal(duplicated.project.revision,0);assert.notEqual(duplicated.project.id,id);assert.match(duplicated.project.name,/copy/);assert.equal((await call(`/projects/${duplicated.project.id}/exchange-info`)).notes,'Browser handoff');
 await call(`/projects/${duplicated.project.id}/delete`,{baseRevision:0});assert.ok((await call('/trash')).some(p=>p.id===duplicated.project.id));await rejects(`/projects/${duplicated.project.id}`,undefined,/Trash/);
 await call(`/projects/${duplicated.project.id}/restore`,{});assert.equal((await call(`/projects/${duplicated.project.id}`)).project.revision,0);
 await page.evaluate(()=>adapter.close());await openHarness(page);await page.evaluate(()=>adapter.connect());
 assert.equal((await call(route())).project.name,'Keep new edit');assert.equal((await call(route('history'))).total,12);assert.equal((await call('/projects')).length,6);assert.equal((await call('/fonts/'+font.id)).name,'Browser font');assert.equal((await call(route('memory'))).preferences[0].status,'approved');assert.equal((await call(route('exchange-info'))).notes,'Browser handoff');
 report.checks.push('Reload restores projects, undo cursor, full revision archive, fonts, preferences and exchange metadata');
 // A real app uses the default hosted database, with no REST project server available.
 await page.goto(origin+'/fluxini/');await page.getByRole('textbox',{name:'Text',exact:true}).waitFor({timeout:30000});
 const title=page.getByRole('textbox',{name:'Text',exact:true});await title.fill('DURABLE BROWSER');await title.press('Enter');await page.waitForFunction(()=>document.querySelector('.status-bar')?.textContent.includes('Revision 1'));
 await page.reload();await page.getByRole('textbox',{name:'Text',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Text',exact:true}).inputValue(),'DURABLE BROWSER');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.status-bar')?.textContent.includes('Revision 2'));assert.notEqual(await page.getByRole('textbox',{name:'Text',exact:true}).inputValue(),'DURABLE BROWSER');
 await page.getByRole('button',{name:'Redo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.status-bar')?.textContent.includes('Revision 3'));
 await page.getByRole('button',{name:'Export',exact:true}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save a copy',exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(artifacts,'ui.fluxini.json'));
 const uiProject=JSON.parse(await readFile(path.join(artifacts,'ui.fluxini.json'),'utf8'));assert.equal(uiProject.project.graph.nodes.find(n=>n.id==='title').params.text,'DURABLE BROWSER');
 await page.keyboard.press('Escape');await page.screenshot({path:path.join(artifacts,'hosted-fluxini.png')});
 assert.ok(requests.length>0&&requests.every(p=>p==='/api/fluxini/status'));assert.deepEqual(report.browserErrors,[]);
 report.checks.push('Actual hosted editor renders, edits, reloads, undoes, redoes and exports without a project backend');
 // Removing the final scene must leave a usable blank project, never an empty editor.
 await openHarness(page);for(const p of await call('/projects'))await call(`/projects/${p.id}/delete`,{baseRevision:p.revision});
 projects=await call('/projects');assert.equal(projects.length,1);assert.equal((await call(`/projects/${projects[0].id}`)).project.graph.nodes.length,1);
 report.checks.push('Trash is recoverable and deleting the last scene creates a blank replacement');
}catch(error){report.failure=error.stack;throw error;}finally{await writeFile(path.join(artifacts,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));}
