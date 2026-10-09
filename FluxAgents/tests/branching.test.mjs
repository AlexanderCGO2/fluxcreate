import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {template,validateGraph,simulate,encodeGraph,decodeGraph,conditionFor} from '../src/model.mjs';
import {Runner} from '../server/engine.mjs';
import {RunStore} from '../server/store.mjs';
import {removeTestDirectory} from './helpers.mjs';

const service={status:async()=>({available:true}),models:async()=>({models:[{id:'mock/writer',capabilities:['text'],pricing:{input:'0.000001',output:'0.000002'}}]}),generate:async()=>({text:'Reviewed model output',usage:{inputTokens:1,outputTokens:2}})};
const writing={model:'mock/writer',prompt:'Write: {{input}}',maxOutputTokens:128};
const body=graph=>({graph,requestId:randomUUID(),billing:'suite'});
async function until(fn){for(let i=0;i<150;i++){const result=fn();if(result)return result;await new Promise(r=>setTimeout(r,10));}throw Error('Run did not reach the expected checkpoint.');}
async function fixture(fn){const dir=await mkdtemp(path.join(os.tmpdir(),'fluxagents-branches-')),file=path.join(dir,'runs.sqlite');let store=new RunStore(file),runner=new Runner(store,{service});const reopen=(options={})=>{runner.close();store.close();store=new RunStore(file);runner=new Runner(store,{service,...options});};try{await fn({get runner(){return runner;},get store(){return store;},reopen});}finally{runner.close();store.close();await removeTestDirectory(dir);}}

test('v1 round trips unchanged; v2 decisions produce bounded typed results and deterministic branches',()=>{
 const old=template();assert.equal(decodeGraph(encodeGraph(old)).version,1);assert.deepEqual(decodeGraph(encodeGraph(old,true)),old);
 const graph=template('branch'),yes=simulate(graph),no=simulate(graph,{input:'Prepare notes'});
 assert.deepEqual(yes,simulate(graph));assert.equal(yes.outputs.condition,true);assert.equal(yes.artifacts.condition.type,'boolean');assert.equal(yes.artifacts.condition.value,true);assert.equal(yes.artifacts.output.type,'text');assert.equal(yes.artifacts.output.version,1);assert.equal(yes.steps.standard.status,'skipped');assert.equal(yes.outputs.standard,undefined);assert.match(yes.outputs.output,/^Priority queue:/);
 assert.equal(no.outputs.condition,false);assert.equal(no.steps.priority.status,'skipped');assert.match(no.outputs.output,/^Standard queue:/);assert.deepEqual(decodeGraph(encodeGraph(graph,true)),graph);
 assert.equal(conditionFor({config:{operation:'empty',text:'',caseSensitive:false}},' \n'),true);
 assert.equal(conditionFor({config:{operation:'equals',text:'Hello',caseSensitive:true}},'hello'),false);
});
test('boolean ports, joins, guarded cycles and unknown branch fields fail validation',()=>{
 const change=fn=>{const g=template('branch');fn(g);return g;};
 assert.throws(()=>validateGraph(change(g=>g.nodes.find(n=>n.id==='priority').from='condition')),/text source/);
 assert.throws(()=>validateGraph(change(g=>g.nodes.find(n=>n.id==='priority').when.nodeId='input')),/condition step/);
 assert.throws(()=>validateGraph(change(g=>g.nodes.find(n=>n.id==='condition').from='output')),/loop/);
 assert.throws(()=>validateGraph(change(g=>g.nodes.find(n=>n.id==='join').from.push('join'))),/loop/);
 assert.throws(()=>validateGraph(change(g=>g.nodes.find(n=>n.id==='join').from=['priority','priority'])),/distinct/);
 assert.throws(()=>validateGraph(change(g=>g.nodes.find(n=>n.id==='priority').when.expression='run()')),/unsupported/);
 assert.throws(()=>validateGraph(change(g=>g.version=1)),/version 2|unsupported/);
 assert.throws(()=>validateGraph(change(g=>delete g.nodes[0].id)),/Step IDs/);
 assert.throws(()=>validateGraph(change(g=>g.nodes[0].id=null)),/Step IDs/);
});
test('all-input joins skip when a branch is skipped; active joins preserve input order and bounds',()=>{
 const graph=template('branch');graph.nodes.find(n=>n.id==='join').config.mode='all';let result=simulate(graph);assert.equal(result.steps.join.status,'skipped');assert.equal(result.steps.review.status,'skipped');assert.equal(result.steps.output.status,'skipped');assert.equal(result.artifacts.output,undefined);
 delete graph.nodes.find(n=>n.id==='priority').when;delete graph.nodes.find(n=>n.id==='standard').when;graph.nodes.find(n=>n.id==='join').from=['standard','priority'];result=simulate(graph);assert.match(result.outputs.join,/^Standard queue:.*\n\nPriority queue:/s);
 graph.nodes[0].config.value='a'.repeat(23990);assert.throws(()=>simulate(graph),/24,000/);
});
test('unchosen paid steps never reserve or call; decisions, skips and typed artifacts survive restart',async()=>fixture(async f=>{
 let calls=0;f.reopen({service:{...service,generate:async()=>{calls++;return service.generate();}}});const graph=template('branch');graph.nodes[0].config.value='A normal request';const priority=graph.nodes.find(n=>n.id==='priority');priority.type='text';priority.config=writing;const request=body(graph),run=await f.runner.start(request);await until(()=>f.runner.get(run.id).status==='waiting-approval');
 const waiting=f.runner.get(run.id),artifacts=structuredClone(waiting.artifacts);assert.equal(waiting.steps.priority.status,'skipped');assert.equal(waiting.outputs.condition,false);assert.equal(waiting.modelCalls,0);assert.equal(waiting.reservedTokens,0);assert.equal(waiting.estimatedUSD,0);assert.equal(calls,0);assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM operations').get().n,0);
 f.reopen({service:{...service,generate:async()=>{calls++;return service.generate();}}});assert.deepEqual(f.runner.get(run.id).artifacts,artifacts);assert.equal((await f.runner.start(request)).id,run.id);assert.throws(()=>f.runner.action(run.id,'approve',{nodeId:'priority'}));f.runner.action(run.id,'approve',{nodeId:'review'});await until(()=>f.runner.get(run.id).status==='completed');assert.equal(calls,0);assert.match(f.runner.get(run.id).outputs.output,/Standard queue/);assert.deepEqual(f.runner.get(run.id).artifacts.standard,artifacts.standard);
}));
test('chosen paid branch retains uncertain attempt and requires reviewed retry after process loss',async()=>fixture(async f=>{
 let calls=0;f.reopen({service:{...service,generate:()=>{calls++;return new Promise(()=>{});}}});const graph=template('branch');graph.nodes[0].config.value='Ordinary request';const standard=graph.nodes.find(n=>n.id==='standard');standard.type='text';standard.config=writing;const run=await f.runner.start(body(graph));await until(()=>f.runner.get(run.id).steps.standard?.status==='calling');assert.equal(f.runner.get(run.id).steps.priority.status,'skipped');
 f.reopen({service:{...service,generate:async()=>{calls++;return service.generate();}}});assert.equal(f.runner.get(run.id).status,'uncertain');assert.equal(calls,1);assert.equal(f.runner.get(run.id).outputs.condition,false);assert.throws(()=>f.runner.action(run.id,'retry',{nodeId:'standard'}));f.runner.action(run.id,'retry',{nodeId:'standard',acceptPossibleCharge:true});await until(()=>f.runner.get(run.id).status==='waiting-approval');assert.equal(calls,2);assert.equal(f.runner.get(run.id).modelCalls,2);assert.equal(f.runner.get(run.id).reservedTokens,256);assert.equal(f.runner.get(run.id).artifacts.standard.type,'text');assert.equal(f.store.db.prepare('SELECT count(*) AS n FROM operations').get().n,2);
}));
test('selected branch delay resumes, inactive delays and approvals are skipped, and join finishes once',async()=>fixture(async f=>{
 let now=Date.now();f.reopen({now:()=>now});const graph=template('branch');const priority=graph.nodes.find(n=>n.id==='priority');priority.type='delay';priority.config={seconds:10};const standard=graph.nodes.find(n=>n.id==='standard');standard.type='approval';standard.config={message:'This must not pause.'};const run=await f.runner.start(body(graph));await until(()=>f.runner.get(run.id).status==='waiting-delay');const wake=f.runner.get(run.id).steps.priority.wakeAt;now+=11000;f.reopen({now:()=>now});await until(()=>f.runner.get(run.id).status==='waiting-approval');assert.equal(f.runner.get(run.id).steps.standard.status,'skipped');assert.equal(f.runner.get(run.id).steps.priority.status,'completed');assert.ok(wake<now);assert.equal(f.runner.get(run.id).events.filter(e=>e.nodeId==='join').length,1);f.runner.action(run.id,'approve',{nodeId:'review'});await until(()=>f.runner.get(run.id).status==='completed');assert.equal(f.runner.get(run.id).outputs.output,graph.nodes[0].config.value);
}));
test('cancelling a paid branch prevents late output and never starts its join',async()=>fixture(async f=>{
 let release;f.reopen({service:{...service,generate:()=>new Promise(r=>release=r)}});const graph=template('branch');const priority=graph.nodes.find(n=>n.id==='priority');priority.type='text';priority.config=writing;const run=await f.runner.start(body(graph));await until(()=>release);f.runner.action(run.id,'cancel');release({text:'Too late'});await new Promise(r=>setTimeout(r,30));const current=f.runner.get(run.id);assert.equal(current.status,'cancelled');assert.equal(current.artifacts.priority,undefined);assert.equal(current.outputs.join,undefined);
}));
