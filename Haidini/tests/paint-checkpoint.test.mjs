import test from 'node:test';
import assert from 'node:assert/strict';
import * as checkpoints from '../src/engine/paintCheckpoint.ts';

test('forward paint seeks reuse the nearest retained checkpoint without passing the target',()=>{
 assert.equal(typeof checkpoints.checkpointForSeek,'function');
 const keys=[0,120,240,360,480,600];
 assert.equal(checkpoints.checkpointForSeek(180,420,keys),360);
 assert.equal(checkpoints.checkpointForSeek(180,360,keys),360);
 assert.equal(checkpoints.checkpointForSeek(360,420,keys),null);
 assert.equal(checkpoints.checkpointForSeek(420,420,keys),null);
});
test('backward and evicted paint seeks use retained history independently of insertion order',()=>{
 assert.equal(typeof checkpoints.checkpointForSeek,'function');
 assert.equal(checkpoints.checkpointForSeek(800,420,[0,600,360,120]),360);
 assert.equal(checkpoints.checkpointForSeek(800,180,[0,600,360]),0);
 assert.equal(checkpoints.checkpointForSeek(0,60,[0,120]),null);
 assert.equal(checkpoints.checkpointForSeek(20,0,[0,120]),0);
});
