import test from 'node:test';import assert from 'node:assert/strict';
import {createMusicVideoPlan} from '../src/music-video/model.mjs';
import {attachSong,attachReference,activeAssets} from '../src/music-video/workspace.mjs';
import {validateMusicVideoPlan} from '../src/music-video/model.mjs';
const song={assetId:'original',hash:'a'.repeat(64),mime:'audio/wav',bytes:44,role:'song',duration:10,name:'Song',sampleRate:48000,sampleCount:480000};
const ref={assetId:'character',hash:'b'.repeat(64),mime:'image/png',bytes:100,role:'character',name:'Actor'};
const source={assetId:'full-song',hash:'d'.repeat(64),mime:'audio/mpeg',bytes:1000,role:'audio',name:'Full song'};
const excerpt={...song,duration:180,sampleCount:8640000,sourceAssetId:source.assetId,sourceDuration:600,fadeOutSeconds:5};
test('long-song metadata requires its retained source and exact edit duration',()=>{
 const p=createMusicVideoPlan({song:excerpt,references:[source]});assert.doesNotThrow(()=>validateMusicVideoPlan(p));
 assert.throws(()=>validateMusicVideoPlan({...p,references:[]}));
 assert.throws(()=>validateMusicVideoPlan({...p,song:{...excerpt,fadeOutSeconds:0}}));
 assert.throws(()=>validateMusicVideoPlan({...p,song:{...excerpt,sourceDuration:180}}));
 assert.throws(()=>validateMusicVideoPlan({...p,song:{...excerpt,duration:179,sampleCount:8592000}}));
});
test('relinking the prepared WAV preserves source; replacing song prunes it',()=>{
 const p=createMusicVideoPlan({song:excerpt,references:[source,ref]}),prepared={...song,duration:180,sampleCount:8640000};
 const linked=attachSong(p,{ref:prepared,asset:prepared});assert.equal(linked.plan.song.sourceAssetId,source.assetId);assert.deepEqual(linked.plan.references,[ref,source]);assert.doesNotThrow(()=>validateMusicVideoPlan(linked.plan));
 const replaced=attachSong(p,{ref:{...song,hash:'e'.repeat(64)},asset:song});assert.deepEqual(replaced.plan.references,[ref]);assert.equal(replaced.plan.song.sourceAssetId,undefined);
});
test('retained song source does not consume an image reference slot',()=>{
 const refs=Array.from({length:8},(_,i)=>({...ref,role:'scene',assetId:'scene-'+i,hash:String(i).repeat(64)}));
 const p=createMusicVideoPlan({song:excerpt,references:[source,...refs]});const result=attachReference(p,{ref,asset:ref});assert.equal(result.plan.references.length,10);
 assert.throws(()=>attachReference(result.plan,{ref:{...ref,role:'scene',hash:'f'.repeat(64)},asset:ref}),/nine/);
});
test('same original song relinks recipe asset ID without clearing story',()=>{const p=createMusicVideoPlan({song});p.concept='Keep this';const r=attachSong(p,{ref:{...song,assetId:'new-id'},asset:{...song,assetId:'new-id',blob:new Blob(['song'])}});assert.equal(r.plan.song.assetId,'original');assert.equal(r.asset.assetId,'original');assert.equal(r.plan.concept,p.concept);});
test('same character relinks existing identity and rejects a different second identity',()=>{const p=createMusicVideoPlan({references:[ref]});const r=attachReference(p,{ref:{...ref,assetId:'new'},asset:{...ref,assetId:'new'}});assert.equal(r.plan.references.length,1);assert.equal(r.asset.assetId,'character');assert.throws(()=>attachReference(p,{ref:{...ref,hash:'c'.repeat(64)},asset:ref}),/character/i);});
test('replacement prunes unreferenced Blob retention in browser state',()=>{const p=createMusicVideoPlan({song,references:[ref]}),assets=new Map([['old',{blob:new Blob(['discard'])}],['original',{blob:new Blob(['song'])}],['character',{blob:new Blob(['image'])}]]);assert.deepEqual([...activeAssets(p,assets).keys()],['original','character']);});
