import test from 'node:test';
import assert from 'node:assert/strict';
import * as renderer from '../src/renderer.mjs';

test('precise export validates duration and frame rate before accessing browser codecs', async()=>{
  for(const comp of [{duration:61,fps:30},{duration:1,fps:61},{duration:0,fps:30},{duration:NaN,fps:30}])
    await assert.rejects(()=>renderer.exportVideo({width:320,height:180,layers:[],...comp},[],()=>{}),/60|duration|frame rate/i);
});
test('precise export rejects excessive dimensions before allocating a canvas',async()=>{
  await assert.rejects(()=>renderer.exportVideo({width:7680,height:4320,duration:1,fps:30,layers:[]},[]),/4096|pixel|resolution/i);
});
test('precise export respects already cancelled requests before capability discovery',async()=>{
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>renderer.exportVideo({width:320,height:180,duration:1,fps:30,layers:[]},[],()=>{},{signal:controller.signal}),{name:'AbortError'});
});
test('precise export reports explicit fallback when browser encoding is unavailable',async()=>{
  await assert.rejects(()=>renderer.exportVideo({width:320,height:180,duration:1,fps:30,layers:[]},[]),/real-time/i);
});
