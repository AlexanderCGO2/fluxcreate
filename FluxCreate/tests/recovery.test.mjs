import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverStoredDocument} from '../shared/recovery.mjs';
test('empty workspace, invalid data and unavailable storage are distinguishable',async()=>{
 const validate=raw=>{if(raw.version!==1)throw Error('Unsupported project version');return {...raw,validated:true};};
 assert.deepEqual(await recoverStoredDocument(async()=>null,validate),{project:null,recovery:null});
 const original={version:99,name:'Saved artwork',layers:[{id:'keep-me'}]},invalid=await recoverStoredDocument(async()=>original,validate);assert.equal(invalid.project,null);assert.equal(invalid.recovery.raw,original);assert.match(invalid.recovery.message,/version/);
 const failed=await recoverStoredDocument(async()=>{throw Error('Read denied');},validate);assert.equal(failed.project,null);assert.match(failed.recovery.message,/Read denied/);assert.equal(Object.hasOwn(failed.recovery,'raw'),false);
 assert.deepEqual(await recoverStoredDocument(async()=>({version:1}),validate),{project:{version:1,validated:true},recovery:null});
});
