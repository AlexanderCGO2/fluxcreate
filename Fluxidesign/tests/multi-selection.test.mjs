import test from 'node:test';
import assert from 'node:assert/strict';
import * as multi from '../src/multi-selection.mjs';
const a={id:'a',name:'A',x:10,y:20,width:40,height:20,rotation:90,visible:true,locked:false};
const b={id:'b',name:'B',x:100,y:60,width:20,height:40,rotation:0,visible:true,locked:false};
const c={id:'c',name:'C',x:200,y:100,width:40,height:20,rotation:0,visible:true,locked:false};
test('selection toggles without retaining missing page IDs and select-all excludes hidden or locked frames',()=>{
 assert.equal(typeof multi.toggleSelection,'function');
 assert.deepEqual(multi.toggleSelection(['a'],'b',[a,b]),['a','b']);
 assert.deepEqual(multi.toggleSelection(['a','b','missing'],'a',[a,b]),['b']);
 assert.deepEqual(multi.editableIds([a,{...b,locked:true},{...c,visible:false}]),['a']);
});
test('translation clamps a shared delta preserving spacing and rejects locked selection atomically',()=>{
 assert.equal(typeof multi.translateFrames,'function');
 const input=[{...a,x:32760},b];const out=multi.translateFrames(input,['a','b'],30,-5);
 assert.equal(out[0].x,32768);assert.equal(out[1].x,108);assert.equal(out[0].y,15);assert.equal(out[1].y,55);assert.equal(input[0].x,32760);
 assert.throws(()=>multi.translateFrames([a,{...b,locked:true}],['a','b'],10,0),/Unlock/);
});
test('alignment uses rotated visible bounds and distribution equalizes edge gaps with fixed endpoints',()=>{
 assert.equal(typeof multi.arrangeFrames,'function');
 const aligned=multi.arrangeFrames([a,b,c],['a','b','c'],'left');
 assert.deepEqual(aligned.map(o=>o.x),[10,20,20]);
 const distributed=multi.arrangeFrames([a,b,c],['a','b','c'],'horizontal');
 assert.deepEqual(distributed.map(o=>o.x),[10,110,200]);
 assert.throws(()=>multi.arrangeFrames([a,b],['a','b'],'horizontal'),/three/i);
});
test('duplicate and delete preserve stack order, enforce locks, and leave source immutable',()=>{
 assert.equal(typeof multi.duplicateFrames,'function');let i=0;const input=[a,b,c],out=multi.duplicateFrames(input,['c','a'],()=>`copy${++i}`);
 assert.deepEqual(out.ids,['copy1','copy2']);assert.deepEqual(out.objects.map(o=>o.id),['a','b','c','copy1','copy2']);assert.deepEqual(out.objects.slice(3).map(o=>[o.x,o.y]),[[26,36],[216,116]]);assert.equal(input.length,3);
 assert.deepEqual(multi.deleteFrames(input,['c','a']).map(o=>o.id),['b']);
 assert.throws(()=>multi.deleteFrames([a,{...b,locked:true}],['a','b']),/Unlock/);
 assert.throws(()=>multi.duplicateFrames([a,{...b,locked:true}],['a','b'],()=>''),/Unlock/);
});
test('group snapping excludes selected members and preserves spacing',()=>{
 assert.equal(typeof multi.moveSelection,'function');
 const page={width:500,height:400,margin:0,columns:1,gutter:0,objects:[{...a,x:101,y:101,rotation:0,width:40,height:20},{...b,x:180,y:101,width:20,height:20}]};
 const out=multi.moveSelection(page,['a','b'],3,7,{enabled:true,scale:1});
 assert.equal(out.objects[0].x,104);assert.equal(out.objects[1].x,183);assert.equal(out.objects[0].y,108);assert.deepEqual(out.lines,[]);
});
test('rotated union outside coordinate range snaps without jumping member positions',()=>{
 const page={width:500,height:400,margin:0,columns:1,gutter:0,objects:[{...a,x:-32760,y:100,width:20,height:100,rotation:90},{...b,x:-32700,y:100,width:20,height:100},{...c,id:'anchor',x:-32756,y:300,width:20,height:100,rotation:90}]};
 const out=multi.moveSelection(page,['a','b'],0,0,{enabled:true,scale:1});
 assert.equal(out.objects[0].x,-32756);assert.equal(out.objects[1].x,-32696);
 assert.deepEqual(out.lines.filter(line=>line.axis==='x'),[{axis:'x',value:-32796,label:'C'}]);
});
test('stale or duplicate IDs reject batch operations without partially changing valid members',()=>{
 for(const ids of [['a','foreign'],['a','a']]){
  assert.throws(()=>multi.translateFrames([a,b],ids,10,0),/selection/i);
  assert.throws(()=>multi.deleteFrames([a,b],ids),/selection/i);
  assert.throws(()=>multi.duplicateFrames([a,b],ids,()=>''),/selection/i);
  assert.throws(()=>multi.arrangeFrames([a,b],ids,'left'),/selection/i);
 }
 assert.equal(a.x,10);
});
test('nested bounds distribute deterministically with negative gaps and fixed outside-by-start frames',()=>{
 const input=[{...a,x:0,y:0,width:100,height:100,rotation:0},{...b,x:20,y:20,width:10,height:10},{...c,x:40,y:40,width:20,height:20}];
 const result=multi.arrangeFrames(input,['c','b','a'],'horizontal');
 assert.deepEqual(result.map(o=>o.x),[0,65,40]);assert.deepEqual(input.map(o=>o.x),[0,20,40]);
 const vertical=multi.arrangeFrames(input,['a','b','c'],'vertical');assert.deepEqual(vertical.map(o=>o.y),[0,65,40]);
});
