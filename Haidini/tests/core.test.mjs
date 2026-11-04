import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createProject, applyPatch, validatePatch, parseProject, edge } from '../src/engine/project.ts';
import { buildLandscape, distanceToTrail } from '../src/engine/geometry.ts';
import { GraphEvaluator } from '../src/engine/evaluator.ts';
import { particlePose, glyphPose } from '../src/engine/motion.ts';
import { defaults } from '../src/engine/catalog.ts';
import { FluxMemory } from '../server/memory.mjs';
import { ProjectStore } from '../server/projects.mjs';
import { planChange } from '../server/planner.mjs';
import { createWorkbench } from '../server/index.mjs';
const makePatch=(p,commands=[{op:'set',nodeId:'title',param:'text',value:'HELLO'}])=>({baseRevision:p.revision,summary:'Change the scene.',commands});
const node=(p,id)=>p.graph.nodes.find(n=>n.id===id);
const legacy=()=>({schemaVersion:1,id:randomUUID(),workspaceId:'local',branchId:'main',name:'Saved Alpine',revision:4,params:{seed:42,height:6.4,roughness:.54,pathWidth:3.2,rocks:.48,trees:.6},locks:['pathWidth']});
async function temp(){await mkdir('.test-data',{recursive:true});return mkdtemp(path.resolve('.test-data/test-'));}
test('graph commands are atomic, bounded, locked and revision-aware',()=>{
  const p=createProject(randomUUID());p.locks=[{nodeId:'title',param:'text'}];const original=structuredClone(p);
  for(const commands of [[{op:'set',nodeId:'sparks',param:'count',value:2000},{op:'set',nodeId:'title',param:'text',value:'NO'}],[{op:'set',nodeId:'sparks',param:'count',value:5001}],[{op:'set',nodeId:'sparks',param:'seed',value:1.5}],[{op:'set',nodeId:'sparks',param:'size',value:NaN}],[{op:'remove',nodeId:'title'}],[{op:'remove',nodeId:'output'}]])assert.throws(()=>applyPatch(p,makePatch(p,commands)));
  assert.deepEqual(p,original);const next=applyPatch(p,makePatch(p,[{op:'set',nodeId:'sparks',param:'count',value:2400}]));assert.equal(node(next,'sparks').params.count,2400);assert.throws(()=>validatePatch(next,makePatch(p)),{status:409});
});
test('typed connections reject cycles, duplicates and rendering-budget amplification',()=>{
  const p=createProject(randomUUID());assert.throws(()=>applyPatch(p,makePatch(p,[{op:'connect',edge:edge('title','orbit','particles')}])) ,/incompatible/);
  assert.throws(()=>applyPatch(p,makePatch(p,[{op:'connect',edge:edge('title','letterMotion','text')}])));
  assert.throws(()=>applyPatch(p,makePatch(p,[{op:'add',id:'a',type:'transform',x:0,y:0},{op:'add',id:'b',type:'transform',x:1,y:0},{op:'connect',edge:edge('a','b','scene')},{op:'connect',edge:edge('b','a','scene')}])) ,/cycle/);
  const commands=[{op:'set',nodeId:'sparks',param:'count',value:5000},...Array.from({length:3},(_,i)=>[{op:'add',id:'copy'+i,type:'transform',x:i*200,y:300},{op:'connect',edge:edge('sparks','copy'+i,'scene')},{op:'connect',edge:edge('copy'+i,'output','scene')}]).flat()];assert.throws(()=>applyPatch(p,makePatch(p,commands)),/budget/);
});
test('a blank project becomes a rendered graph and disconnecting removes its output',()=>{
  let p=createProject(randomUUID(),'blank');const evaluator=new GraphEvaluator();assert.deepEqual(evaluator.evaluate(p.graph).items,[]);
  p=applyPatch(p,makePatch(p,[{op:'add',id:'greeting',type:'text',x:0,y:0},{op:'set',nodeId:'greeting',param:'text',value:'FLUX'},{op:'connect',edge:edge('greeting','output','scene')}]));
  assert.equal(evaluator.evaluate(p.graph).items[0].params.text,'FLUX');
  p=applyPatch(p,makePatch(p,[{op:'disconnect',edgeId:edge('greeting','output','scene').id}]));assert.deepEqual(evaluator.evaluate(p.graph).items,[]);
});
test('evaluation caches unaffected branches and ignores layout changes',()=>{
  let p=createProject(randomUUID());const evaluator=new GraphEvaluator();assert.equal(evaluator.evaluate(p.graph).computed,5);assert.equal(evaluator.evaluate(p.graph).computed,0);
  p=applyPatch(p,makePatch(p,[{op:'move',nodeId:'title',x:123,y:456}]));assert.equal(evaluator.evaluate(p.graph).computed,0);
  p=applyPatch(p,makePatch(p));const result=evaluator.evaluate(p.graph);assert.equal(result.computed,3);assert.equal(result.cached,2);assert.equal(result.items.find(i=>i.kind==='text').params.text,'HELLO');
});
test('old project files migrate with the same terrain, scatter, identity and locks',()=>{
  const old=legacy(),p=parseProject(old);assert.equal(p.schemaVersion,2);assert.equal(p.id,old.id);assert.equal(p.revision,4);assert.deepEqual(p.locks,[{nodeId:'mask',param:'width'}]);
  const result=new GraphEvaluator().evaluate(p.graph),surface=result.items.find(i=>i.kind==='surface'),land=buildLandscape(surface.surface.params,surface.surface.settings),original=buildLandscape(old.params);
  assert.deepEqual(land.positions,original.positions);assert.deepEqual(result.items.find(i=>i.nodeId==='rockInstances').points,original.rocks);
  const dense=buildLandscape({...old.params,rocks:.9});const map=new Map(dense.rocks.map(i=>[i.id,i]));for(const rock of original.rocks){assert.deepEqual(map.get(rock.id),rock);assert.ok(distanceToTrail(rock.x,rock.z)>=old.params.pathWidth/2+rock.scale*1.1);}
});
test('particle scrubbing is deterministic, seed-sensitive and independent of previous frames',()=>{
  const p=createProject(randomUUID()),item=new GraphEvaluator().evaluate(p.graph).items.find(i=>i.kind==='particles');
  const frame=Array.from({length:30},(_,i)=>particlePose(i,2.75,item));for(let t=0;t<8;t+=.1)particlePose(4,t,item);
  assert.deepEqual(Array.from({length:30},(_,i)=>particlePose(i,2.75,item)),frame);assert.notDeepEqual(particlePose(4,2.8,item),frame[4]);
  assert.notDeepEqual(particlePose(4,2.75,{...item,params:{...item.params,seed:18}}),frame[4]);
  for(const pose of frame)assert.ok(Object.values(pose).every(Number.isFinite));
});
test('character reveal staggers and wave motion is reversible by scrubbing',()=>{
  const params={...defaults('textAnimate'),mode:'reveal',stagger:.2,duration:1};assert.ok(glyphPose(0,.5,params).scale>glyphPose(3,.5,params).scale);assert.equal(glyphPose(5,4,params).scale,1);
  assert.equal(glyphPose(5,0,{...params,mode:'typewriter'}).scale,.0001);assert.equal(glyphPose(5,2,{...params,mode:'typewriter'}).scale,1);
  const wave={...params,mode:'wave'};const pose=glyphPose(2,1.2,wave);glyphPose(2,7,wave);assert.deepEqual(glyphPose(2,1.2,wave),pose);
});
test('undo and graph identities survive restart; new edits discard redo',async t=>{
  const dir=await temp(),memory=new FluxMemory(path.join(dir,'memory.sqlite'));let store=new ProjectStore(path.join(dir,'projects.sqlite'),memory);t.after(async()=>{store.close();memory.close();await rm(dir,{recursive:true,force:true});});
  const p=store.get(store.list()[0].id).project;let s=store.patch(p.id,makePatch(p));s=store.move(p.id,s.project.revision,-1);assert.equal(node(s.project,'title').params.text,'FluxEffects');assert.equal(s.project.revision,2);assert.equal(s.canRedo,true);
  store.close();store=new ProjectStore(path.join(dir,'projects.sqlite'),memory);s=store.move(p.id,2,1);assert.equal(node(s.project,'title').params.text,'HELLO');s=store.move(p.id,3,-1);s=store.patch(p.id,makePatch(s.project,[{op:'set',nodeId:'sparks',param:'count',value:2000}]));assert.equal(s.project.revision,5);assert.equal(s.canRedo,false);assert.equal(memory.history(p).length,6);
});
test('a legacy database and its undo snapshots remain readable without rewriting the source',async t=>{
  const dir=await temp(),file=path.join(dir,'projects.sqlite'),old=legacy(),db=new DatabaseSync(file);db.exec('CREATE TABLE projects(id TEXT PRIMARY KEY,state TEXT,cursor INTEGER);CREATE TABLE snapshots(project_id TEXT,step INTEGER,state TEXT,PRIMARY KEY(project_id,step));');db.prepare('INSERT INTO projects VALUES(?,?,0)').run(old.id,JSON.stringify(old));db.prepare('INSERT INTO snapshots VALUES(?,0,?)').run(old.id,JSON.stringify(old));db.close();
  const memory=new FluxMemory(path.join(dir,'memory.sqlite')),store=new ProjectStore(file,memory);t.after(async()=>{store.close();memory.close();await rm(dir,{recursive:true,force:true});});
  const p=store.get(old.id).project;assert.equal(p.schemaVersion,2);assert.equal(JSON.parse(store.db.prepare('SELECT state FROM projects').get().state).schemaVersion,1);
  let s=store.patch(old.id,makePatch(p,[{op:'set',nodeId:'height',param:'height',value:9}]));s=store.move(old.id,s.project.revision,-1);assert.equal(node(s.project,'height').params.height,old.params.height);assert.equal(s.project.revision,6);
});
test('outbox recovers from memory failure without duplicate node events',async t=>{
  const dir=await temp(),memory=new FluxMemory(path.join(dir,'memory.sqlite'));let fail=true;const adapter={remember(e){if(fail)throw new Error('Storage unavailable');memory.remember(e);}};let store=new ProjectStore(path.join(dir,'projects.sqlite'),adapter);t.after(async()=>{store.close();memory.close();await rm(dir,{recursive:true,force:true});});
  let p=store.get(store.list()[0].id).project;p=store.patch(p.id,makePatch(p)).project;assert.equal(store.status(p.id).pendingMemory,2);store.close();fail=false;store=new ProjectStore(path.join(dir,'projects.sqlite'),adapter);assert.equal(store.status(p.id).pendingMemory,0);assert.deepEqual(memory.history(p)[0].nodeIds,['title']);store.db.prepare('UPDATE outbox SET delivered=0').run();store.flush();assert.equal(memory.history(p).length,2);
});
test('Flux isolates projects, links selected nodes and gates sourced preferences',async t=>{
  const dir=await temp(),m=new FluxMemory(path.join(dir,'memory.sqlite'));t.after(async()=>{m.close();await rm(dir,{recursive:true,force:true});});const a=createProject(randomUUID()),b=createProject(randomUUID());
  const event=(p,summary,nodeIds=['title'])=>({id:randomUUID(),projectId:p.id,branchId:p.branchId,revision:0,kind:'test',summary,nodeIds,createdAt:new Date().toISOString()});const ea=event(a,'Slow title animation'),eb=event(b,'Private secret title');m.remember(ea);m.remember(eb);
  assert.equal(m.search(a,'title').length,1);assert.equal(m.search(a,'secret').length,0);assert.throws(()=>m.proposePreference(a,'Slow title',eb.id));
  const id=m.proposePreference(a,'Prefer subtle motion',ea.id,'title');assert.equal(m.preferences(a,true).length,0);assert.throws(()=>m.decidePreference(b,id,'approved'));m.decidePreference(a,id,'approved');
  const context=m.assemble(a,'title',['title']);assert.ok(context.sections.find(s=>s.id==='preferences').lines[0].includes('node title'));assert.ok(context.sections.find(s=>s.id==='selection').lines[0].includes('title'));assert.throws(()=>m.assemble(a,'title',['foreign']));
  const deleted=applyPatch(a,makePatch(a,[{op:'remove',nodeId:'title'}]));assert.equal(m.assemble(deleted,'title').sections.find(s=>s.id==='preferences').lines.length,0);
  m.decidePreference(a,id,'rejected');assert.equal(m.preferences(a,true).length,0);
});
test('planner validates complete graph proposals independently and cannot mutate state',async t=>{
  const dir=await temp(),m=new FluxMemory(path.join(dir,'memory.sqlite'));t.after(async()=>{m.close();await rm(dir,{recursive:true,force:true});});const p=createProject(randomUUID());
  const result=await planChange(p,'Add a blue text branch',m,async args=>{assert.equal(args.maxRetries,0);return {object:{summary:'Add another title.',commands:[{op:'add',id:'subtitle',type:'text',x:0,y:300},{op:'set',nodeId:'subtitle',param:'color',value:'#3399ff'},{op:'connect',edge:edge('subtitle','output','scene')}]}};},['title']);
  assert.equal(result.patch.baseRevision,0);assert.equal(p.graph.nodes.length,5);assert.equal(applyPatch(p,result.patch).graph.nodes.length,6);
  p.locks=[{nodeId:'title',param:'text'}];await assert.rejects(()=>planChange(p,'Change the title',m,async()=>({object:{summary:'Unsafe',commands:[{op:'set',nodeId:'title',param:'text',value:'NO'}]}})),{status:409});
});
test('HTTP authenticates sessions and rejects an AI plan when the graph changed during generation',async t=>{
  const dir=await temp();let release,entered;const waiting=new Promise(r=>release=r),started=new Promise(r=>entered=r);const app=await createWorkbench({dataDir:dir,port:0,planner:async p=>{entered();await waiting;return {patch:makePatch(p)};}});t.after(async()=>{await app.close();await rm(dir,{recursive:true,force:true});});
  const session=await (await fetch(app.origin+'/api/session')).json();assert.equal(session.app,'fluxini');assert.equal((await fetch(app.origin+'/api/projects')).status,403);assert.equal((await fetch(app.origin+'/api/session',{headers:{origin:'https://foreign.example'}})).status,403);
  const headers={'x-fluxini-token':session.token,'content-type':'application/json'},id=app.projects.list()[0].id,p=app.projects.get(id).project,post=(action,body)=>fetch(app.origin+'/api/projects/'+id+'/'+action,{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal((await post('preview',makePatch(p))).status,200);assert.equal(app.projects.get(id).project.revision,0);const planning=post('plan',{intent:'A new title'});await started;assert.equal((await post('plan',{intent:'Again'})).status,429);assert.equal((await post('patch',makePatch(p))).status,200);release();assert.equal((await planning).status,409);assert.equal((await post('patch',makePatch(p))).status,409);
});
