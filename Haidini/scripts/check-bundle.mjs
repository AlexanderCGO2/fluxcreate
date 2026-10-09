import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { createWorkbench } from '../server-dist/server.mjs';
await mkdir('.test-data',{recursive:true});
const dir=await mkdtemp(path.resolve('.test-data/bundle-'));
const app=await createWorkbench({dataDir:dir,webDir:path.resolve('dist'),port:0});
try{
  const page=await fetch(app.origin);assert.equal(page.status,200);assert.ok((await page.text()).includes('Fluxini'));
  const session=await (await fetch(app.origin+'/api/session')).json();assert.equal(session.app,'fluxini');
  const projects=await (await fetch(app.origin+'/api/projects',{headers:{'x-fluxini-token':session.token}})).json();assert.equal(projects.length,1);
  assert.equal(app.memory.history(app.projects.get(projects[0].id).project).length,1);
  console.log('Bundled service: static assets, session, project database and Flux memory verified.');
}finally{await app.close();assert(path.resolve(dir).startsWith(path.resolve('.test-data')+path.sep));await rm(dir,{recursive:true,force:true});}
