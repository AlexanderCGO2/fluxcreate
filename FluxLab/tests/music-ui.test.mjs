import test from 'node:test';
import assert from 'node:assert/strict';
import {validateMusicDraft,validateMusicWorkspace} from '../src/music-jobs.mjs';
import {validateRecipe,describeRecipe} from '../src/recipes.mjs';
import {validateResult} from '../src/library.mjs';
test('music drafts reject unsupported or unbounded provider inputs',()=>{
 assert.deepEqual(validateMusicDraft({prompt:'  A calm score  ',durationSeconds:30,instrumental:true}),{prompt:'  A calm score  ',durationSeconds:30,instrumental:true});
 for(const patch of [{durationSeconds:61},{durationSeconds:2},{durationSeconds:3.5},{instrumental:'yes'},{prompt:'x'.repeat(2001)},{apiToken:'secret'}])assert.throws(()=>validateMusicDraft({prompt:'Score',durationSeconds:30,instrumental:true,...patch}));
});
test('music recipes keep voice-free controls and never accept credentials',()=>{
 const recipe={version:1,input:{kind:'music',model:'elevenlabs/music-v2',prompt:'  Score  ',durationSeconds:30,instrumental:true}};
 const value=validateRecipe(recipe);assert.equal(value.input.prompt,'Score');assert.equal(value.input.durationSeconds,30);assert.match(describeRecipe(value),/30 seconds/);
 assert.throws(()=>validateRecipe({...recipe,input:{...recipe.input,voice:'alloy'}}));
 assert.throws(()=>validateRecipe({...recipe,input:{...recipe.input,model:'elevenlabs/speech'}}));
 assert.equal(validateRecipe({version:1,input:{kind:'audio',model:'openai/tts-1',prompt:'Speech',voice:'alloy'}}).input.voice,'alloy');
});
test('music library validation retains bounded provenance and exact audio blob',()=>{
 const blob=new Blob(['fixture'],{type:'audio/mpeg'}),raw={id:'music',kind:'audio',operation:'music',gateway:'cloudflare',model:'elevenlabs/music-v2',prompt:'Score',durationSeconds:30,instrumental:true,createdAt:new Date().toISOString(),audios:[{id:'track',mimeType:'audio/mpeg',blob,duration:30}],recipe:{version:1,input:{kind:'music',model:'elevenlabs/music-v2',prompt:'Score',durationSeconds:30,instrumental:true}}};
 const result=validateResult(raw);assert.equal(result.operation,'music');assert.equal(result.gateway,'cloudflare');assert.equal(result.durationSeconds,30);assert.equal(result.audios[0].blob,blob);assert.equal(result.recipe.input.kind,'music');
 assert.throws(()=>validateResult({...raw,durationSeconds:600}));
});
test('music workspace validates uncertain records without repairing or discarding them',()=>{
 const draft={prompt:'Score',durationSeconds:30,instrumental:true},record={version:1,revision:'r1',draft,job:{requestId:'12345678-1234-4234-8234-123456789012',connectionScope:'fingerprint',createdAt:new Date().toISOString(),input:{model:'elevenlabs/music-v2',...draft},state:'uncertain'}};
 assert.equal(validateMusicWorkspace(record).job.state,'uncertain');
 assert.throws(()=>validateMusicWorkspace({...record,job:{...record.job,apiToken:'secret'}}));
 assert.throws(()=>validateMusicWorkspace({...record,job:{...record.job,state:'retry'}}));
});

test('library retains routing and music billing without saving arbitrary provider fields',()=>{
 const route={provider:'anthropic',model:'anthropic/test',gateway:'Cloudflare AI Gateway',attempts:[{provider:'anthropic',model:'anthropic/test',gateway:'Vercel AI Gateway',outcome:'rejected',status:429},{provider:'anthropic',model:'anthropic/test',gateway:'Cloudflare AI Gateway',outcome:'completed'}]};
 const raw={id:'text',kind:'text',model:'anthropic/test',prompt:'Hello',text:'Hi',createdAt:new Date().toISOString(),routing:{...route,apiToken:'secret'}};
 assert.deepEqual(validateResult(raw).routing,route);assert.equal(validateResult({...raw,routing:{...route,attempts:[]}}).routing,undefined);
 const music={...raw,kind:'audio',model:'elevenlabs/music-v2',operation:'music',gateway:'cloudflare',durationSeconds:30,instrumental:true,audios:[{mimeType:'audio/mpeg',blob:new Blob(['sample'],{type:'audio/mpeg'}),duration:30}],billing:{estimatedUsd:.075,keySource:'Unified',apiToken:'secret'}};
 assert.deepEqual(validateResult(music).billing,{estimatedUsd:.075,keySource:'Unified'});assert.equal(validateResult({...music,billing:{estimatedUsd:-1}}).billing,undefined);
});
