import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {createWorkbench} from '../server/index.mjs';
import {encodeExchange,decodeExchange,toFluxiffects} from '@flux-studio/exchange';

async function workspace(t){
  const dataDir=await mkdtemp('.test-data/exchange-');let app=await createWorkbench({dataDir,port:0}),token=(await (await fetch(app.origin+'/api/session')).json()).token;
  t.after(()=>app.close());
  return {get app(){return app;},async restart(){await app.close();app=await createWorkbench({dataDir,port:0});token=(await (await fetch(app.origin+'/api/session')).json()).token;},async call(route,body){const response=await fetch(app.origin+'/api'+route,{headers:{'x-fluxini-token':token,'Content-Type':'application/json'},method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,data:await response.json()};}};
}

test('exchange preview validates without creating scenes or importing fonts',async t=>{
  const work=await workspace(t),first=work.app.projects.list()[0],project=work.app.projects.get(first.id).project;
  const markdown=encodeExchange({app:'fluxini',project,brief:'A quiet title',notes:'Keep it editable.'}),before=work.app.projects.list().length;
  const preview=await work.call('/exchange/import',{markdown,preview:true});assert.equal(preview.status,200);assert.equal(preview.data.report.name,project.name);assert.equal(preview.data.report.warnings.length,0);assert.equal(work.app.projects.list().length,before);
  const unauth=await fetch(work.app.origin+'/api/exchange/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({markdown})});assert.equal(unauth.status,403);
  assert.equal((await work.call('/exchange/import',{markdown:'not an exchange',preview:true})).status,400);
  const bad=structuredClone(project);bad.graph.nodes.find(node=>node.type==='text').params.size=9999;
  assert.equal((await work.call('/exchange/import',{markdown:encodeExchange({app:'fluxini',project:bad}),preview:true})).status,400);
  assert.equal((await work.call('/exchange/import',{markdown,restoreOriginal:true,preview:true})).status,400);
  assert.equal(work.app.projects.list().length,before);
  const valid=await work.call('/exchange/import',{markdown});assert.equal(valid.status,201);assert.notEqual(valid.data.project.id,project.id);assert.equal(valid.data.project.revision,0);
});

test('notes, native font assets and provenance survive edits, restart, duplication and native packages',async t=>{
  const work=await workspace(t),fontData=JSON.parse(await readFile('src/assets/optimer_regular.typeface.json','utf8'));fontData.familyName='Exchange Portable Serif';
  const font=work.app.fonts.import({data:fontData}),source=(await work.call('/projects',{template:'title'})).data.project;
  const patched=await work.call('/projects/'+source.id+'/patch',{baseRevision:0,summary:'Portable typeface',commands:[{op:'set',nodeId:'title',param:'font',value:font.id}]});assert.equal(patched.status,200);
  const saved=await work.call('/projects/'+source.id+'/exchange',{baseRevision:1,brief:'Bold studio ident',notes:'Keep the custom typeface.'});assert.equal(saved.status,200);
  const original=decodeExchange(saved.data.markdown);assert.equal(original.snapshots.fluxini.fonts[0].id,font.id);
  const imported=await work.call('/exchange/import',{markdown:saved.data.markdown});assert.equal(imported.status,201);const id=imported.data.project.id;
  assert.equal((await work.call('/projects/'+id+'/patch',{baseRevision:0,summary:'Continue editing',commands:[{op:'set',nodeId:'title',param:'text',value:'EDITED'}]})).status,200);
  await work.restart();
  const info=(await work.call('/projects/'+id+'/exchange-info')).data;assert.equal(info.brief,'Bold studio ident');assert.equal(info.notes,'Keep the custom typeface.');
  const exported=decodeExchange((await work.call('/projects/'+id+'/exchange')).data.markdown);assert.equal(exported.snapshots.fluxini.project.graph.nodes.find(node=>node.id==='title').params.text,'EDITED');assert.equal(exported.snapshots.fluxini.fonts[0].id,font.id);
  const duplicate=(await work.call('/projects/'+id+'/duplicate',{baseRevision:1})).data.project;assert.equal((await work.call('/projects/'+duplicate.id+'/exchange-info')).data.notes,info.notes);
  await work.call('/projects/'+id+'/delete',{baseRevision:1});await work.call('/projects/'+id+'/restore',{});assert.equal((await work.call('/projects/'+id+'/exchange-info')).data.notes,info.notes);
  const pack=(await work.call('/projects/'+id+'/export')).data;assert.equal(pack.exchange.brief,info.brief);assert.equal(pack.fonts[0].id,font.id);
  const fromNative=await work.call('/projects',{project:pack});assert.equal(fromNative.status,201);assert.equal((await work.call('/projects/'+fromNative.data.project.id+'/exchange-info')).data.notes,info.notes);
  assert.equal((await work.call('/projects/'+id+'/exchange',{baseRevision:0,brief:'Stale'})).status,409);
});

test('return trip converts the latest scene and only restores native source when requested',async t=>{
  const work=await workspace(t),source=work.app.projects.get(work.app.projects.list()[0].id).project;
  const previous=decodeExchange(encodeExchange({app:'fluxini',project:source,brief:'Two-app handoff',notes:'Native simulation stays recoverable.'}));
  const effects=toFluxiffects(previous).project;effects.compositions[0].layers.find(layer=>layer.type==='text').text='LATEST TITLE';
  const markdown=encodeExchange({app:'fluxiffects',project:effects,previous});
  const preview=await work.call('/exchange/import',{markdown,preview:true});assert.equal(preview.status,200);assert.equal(preview.data.report.canRestoreOriginal,true);assert.ok(preview.data.report.warnings.length>0);
  const latest=await work.call('/exchange/import',{markdown});assert.equal(latest.status,201);assert.equal(latest.data.project.graph.nodes.find(node=>node.type==='text').params.text,'LATEST TITLE');assert.equal(latest.data.project.graph.nodes.some(node=>node.type==='emitter'),false);
  const restore=await work.call('/exchange/import',{markdown,restoreOriginal:true});assert.equal(restore.status,201);assert.equal(restore.data.report.restoredOriginal,true);assert.deepEqual(restore.data.project.graph,source.graph);
  const reexport=decodeExchange((await work.call('/projects/'+latest.data.project.id+'/exchange')).data.markdown);assert.equal(reexport.sourceApp,'fluxini');assert.equal(reexport.snapshots.fluxiffects.compositions[0].layers[0].text,'LATEST TITLE');assert.equal(reexport.notes,'Native simulation stays recoverable.');assert.equal(Object.keys(reexport.snapshots).length,2);
});
