import test from 'node:test';
import assert from 'node:assert/strict';
import {template} from '../src/model.mjs';
import {compareWorkflowGraphs} from '../src/workflow-diff.mjs';
test('comparison reports prompt, model, limits and approvals without mutating graphs',()=>{
 const before=template(),after=structuredClone(before);after.name='Reviewed title';after.limits.budgetUSD=2;const writer=after.nodes.find(n=>n.id==='write');writer.config.prompt='Different brief\n{{input}}';writer.config.model='anthropic/claude-sonnet-4';after.nodes.find(n=>n.id==='review').config.message='Review this revised result';const original=structuredClone(before),copy=structuredClone(after);
 const diff=compareWorkflowGraphs(before,after);assert.deepEqual(before,original);assert.deepEqual(after,copy);assert.equal(diff.identical,false);assert.deepEqual(diff.workflow.map(c=>c.path),['name','limits.budgetUSD']);assert.deepEqual(diff.nodes.find(n=>n.id==='write').changes.map(c=>c.path),['config.model','config.prompt']);assert.equal(diff.nodes.find(n=>n.id==='review').changes[0].after,'Review this revised result');assert.deepEqual(diff.connections,{added:[],removed:[]});
});
test('stable node IDs ignore nonsemantic order and object key order',()=>{
 const before=template('branch'),after=structuredClone(before);after.nodes.reverse();after.limits={...Object.fromEntries(Object.entries(after.limits).reverse())};assert.equal(compareWorkflowGraphs(before,after).identical,true);
});
test('added and removed nodes plus ordered join and branch connections are explicit',()=>{
 const before=template('branch'),after=structuredClone(before);after.nodes.find(n=>n.id==='join').from.reverse();after.nodes.find(n=>n.id==='priority').when.equals=false;const diff=compareWorkflowGraphs(before,after);assert.equal(diff.connections.added.length,2);assert.equal(diff.connections.removed.length,2);assert.equal(diff.nodes.find(n=>n.id==='priority').changes[0].path,'when.equals');
 const a=template('quiet'),b=structuredClone(a);b.nodes=b.nodes.filter(n=>n.id!=='pause');b.nodes.find(n=>n.id==='review').from='write';const removed=compareWorkflowGraphs(a,b);assert.equal(removed.nodes.find(n=>n.id==='pause').kind,'removed');assert.equal(compareWorkflowGraphs(b,a).nodes.find(n=>n.id==='pause').kind,'added');
});
test('comparison retains full text as data and rejects invalid or secret-bearing graphs',()=>{
 const before=template(),after=structuredClone(before);after.nodes[0].config.value='<img src=x onerror=alert(1)>\n'+ 'x'.repeat(10000);const diff=compareWorkflowGraphs(before,after);assert.equal(diff.nodes[0].changes[0].after,after.nodes[0].config.value);assert.throws(()=>compareWorkflowGraphs(before,{...after,apiKey:'secret'}));assert.throws(()=>compareWorkflowGraphs(before,{...after,nodes:[]}));
});
