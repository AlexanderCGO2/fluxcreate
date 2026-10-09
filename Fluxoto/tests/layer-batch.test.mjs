import test from 'node:test';
import assert from 'node:assert/strict';
import * as order from '../src/layer-order.mjs';
const fixture=()=>['a','b','c','d'].map(id=>({id,name:id,x:0,y:0,width:20,height:20,locked:false}));
test('moving selected layers retains their stack order and ignores an internal target',()=>{
 assert.equal(typeof order.moveLayers,'function');const layers=fixture();
 assert.deepEqual(order.moveLayers(layers,['c','a'],'d','after').map(l=>l.id),['b','d','a','c']);
 assert.strictEqual(order.moveLayers(layers,['a','c'],'c','before'),layers);
});
test('locked selections and stale ids cannot partially move or edit layers',()=>{
 assert.equal(typeof order.editLayers,'function');const layers=fixture();layers[2].locked=true;
 assert.throws(()=>order.editLayers(layers,['a','c'],{type:'move',dx:5,dy:4}),/Unlock/);
 assert.deepEqual(layers.map(l=>l.x),[0,0,0,0]);
 assert.throws(()=>order.editLayers(layers,['gone'],{type:'delete'}),/no longer/);
 assert.strictEqual(order.moveLayers(layers,['a','c'],'d','after'),layers);
});
test('batch translation and duplication retain ordering, originals and unique ids',()=>{
 assert.equal(typeof order.editLayers,'function');const layers=fixture();
 const moved=order.editLayers(layers,['a','c'],{type:'move',dx:5,dy:-3});assert.deepEqual(moved.map(l=>[l.x,l.y]),[[5,-3],[0,0],[5,-3],[0,0]]);
 const copied=order.editLayers(layers,['c','a'],{type:'duplicate'});assert.equal(copied.length,6);assert.equal(new Set(copied.map(l=>l.id)).size,6);
 assert.deepEqual(copied.map(l=>l.name),['a copy','a','b','c copy','c','d']);
 assert.deepEqual(order.editLayers(layers,['a','c'],{type:'delete'}).map(l=>l.id),['b','d']);
 assert.deepEqual(layers,fixture());
});
