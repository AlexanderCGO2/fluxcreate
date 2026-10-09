import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp} from 'node:fs/promises';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';
import {ProjectStore} from '../server/projects.mjs';import {createWorkbench} from '../server/index.mjs';
const memory={remember(){}};
test('Undo is unbounded across 520 edits, restart and redo; abandoned futures stay restorable',async()=>{
 const dir=await mkdtemp(path.resolve('.test-data/history-')),file=path.join(dir,'projects.sqlite');let store=new ProjectStore(file,memory);
 try{let s=store.create(undefined,'blank'),id=s.project.id;
  for(let i=1;i<=520;i++)s=store.patch(id,{baseRevision:s.project.revision,summary:'Name '+i,commands:[{op:'projectName',name:'Version '+i}]});
  assert.equal(s.undoDepth,520);assert.equal(store.history(id).total,521);
  store.close();store=new ProjectStore(file,memory);
  for(let i=0;i<520;i++)s=store.move(id,s.project.revision,-1);
  assert.equal(s.canUndo,false);assert.equal(s.redoDepth,520);
  for(let i=0;i<520;i++)s=store.move(id,s.project.revision,1);
  assert.equal(s.project.name,'Version 520');assert.equal(s.canRedo,false);
  s=store.move(id,s.project.revision,-1);
  s=store.patch(id,{baseRevision:s.project.revision,summary:'New branch',commands:[{op:'projectName',name:'New branch'}]});assert.equal(s.canRedo,false);
  s=store.restoreRevision(id,s.project.revision,520);assert.equal(s.project.name,'Version 520');
  s=store.move(id,s.project.revision,-1);assert.equal(s.project.name,'New branch');
  const revisions=[];let page;do{page=store.history(id,{before:page?.nextBefore??undefined,limit:37});revisions.push(...page.entries.map(e=>e.revision));assert(page.entries.every(e=>!('state' in e)));}while(page.nextBefore!==null);
  assert.equal(revisions.length,store.history(id).total);assert.equal(new Set(revisions).size,revisions.length);assert.equal(revisions.at(-1),0);
  const archived=store.history(id).total;store.remove(id,s.project.revision);store.restore(id);assert.equal(store.history(id).total,archived);
 }finally{store.close();}
});
test('History migration retains existing snapshots and transaction failures leave no phantom revision',async()=>{
 const dir=await mkdtemp(path.resolve('.test-data/history-migration-')),file=path.join(dir,'projects.sqlite');let store=new ProjectStore(file,memory);const initial=store.create(undefined,'blank');let s=store.patch(initial.project.id,{baseRevision:0,summary:'First',commands:[{op:'projectName',name:'First'}]});const id=s.project.id;
 store.db.exec('DROP TABLE revision_archive; DROP TABLE history_migrations;');const before=store.db.prepare('SELECT * FROM snapshots WHERE project_id=?').all(id);store.close();store=new ProjectStore(file,memory);
 try{assert.deepEqual(store.db.prepare('SELECT * FROM snapshots WHERE project_id=?').all(id),before);assert.equal(store.history(id).total,2);
  store.db.exec("CREATE TRIGGER reject_update BEFORE UPDATE ON projects BEGIN SELECT RAISE(ABORT,'test failure'); END;");
  assert.throws(()=>store.patch(id,{baseRevision:1,summary:'Rejected',commands:[{op:'projectName',name:'Rejected'}]}));assert.equal(store.history(id).total,2);assert.equal(store.get(id).project.name,'First');store.db.exec('DROP TRIGGER reject_update');
  assert.throws(()=>store.restoreRevision(id,0,0),e=>e.status===409);assert.throws(()=>store.history(id,{before:-1}));assert.throws(()=>store.restoreRevision(id,1,99999),e=>e.status===404);
  const other=store.create(undefined,'blank');assert.throws(()=>store.restoreRevision(other.project.id,0,1),e=>e.status===404);
  s=store.restoreRevision(id,1,0);assert.equal(s.project.revision,2);assert.equal(store.history(id).entries[0].sourceRevision,0);
 }finally{store.close();}
});
test('Revision APIs require a session and reject stale restores without changing history',async()=>{
 const app=await createWorkbench({dataDir:await mkdtemp(path.resolve('.test-data/history-http-')),port:0});
 try{const s=app.projects.create(undefined,'blank'),id=s.project.id,session=await(await fetch(app.origin+'/api/session')).json(),headers={'x-fluxini-token':session.token,'content-type':'application/json'};
  assert.equal((await fetch(app.origin+'/api/projects/'+id+'/history')).status,403);
  const post=body=>fetch(app.origin+'/api/projects/'+id+'/restore-revision',{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal((await post({baseRevision:9,revision:0})).status,409);assert.equal(app.projects.history(id).total,1);
  const result=await post({baseRevision:0,revision:0});assert.equal(result.status,200);assert.equal((await result.json()).undoDepth,1);
  const page=await(await fetch(app.origin+'/api/projects/'+id+'/history?limit=1',{headers})).json();assert.equal(page.entries.length,1);assert.equal(page.nextBefore,1);
 }finally{await app.close();}
});
