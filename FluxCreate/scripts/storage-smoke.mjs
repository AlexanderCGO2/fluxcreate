import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/api/recent'?'application/json':'text/html');res.end(req.url==='/api/recent'?'{}':'<!doctype html><title>Isolated storage check</title>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const bundle=await build({entryPoints:[fileURLToPath(new URL('../shared/browser.mjs',import.meta.url))],bundle:true,write:false,format:'iife',globalName:'StorageChecks',platform:'browser'});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);await page.addScriptTag({content:bundle.outputFiles[0].text});
 const result=await page.evaluate(async()=>{
  const key='storage-abort-regression',original={name:'Preserved artwork',value:7};
  await StorageChecks.saveStoredProject(key,original);
  const realTransaction=IDBDatabase.prototype.transaction,realClose=IDBDatabase.prototype.close;let closes=0;
  IDBDatabase.prototype.close=function(){closes++;return realClose.apply(this,arguments);};
  function abortTransaction(afterRead=false){IDBDatabase.prototype.transaction=function(){const tx=realTransaction.apply(this,arguments);if(afterRead){const realStore=tx.objectStore.bind(tx);tx.objectStore=(...args)=>{const store=realStore(...args),realGet=store.get.bind(store);store.get=(...values)=>{const request=realGet(...values);request.addEventListener('success',()=>tx.abort());return request;};return store;};}else queueMicrotask(()=>tx.abort());return tx;};}
  const settle=promise=>Promise.race([promise.then(()=>({resolved:true}),error=>({rejected:true,message:error?.message||''})),new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),1500))]);
  abortTransaction();const write=await settle(StorageChecks.saveStoredProject(key,{name:'Must not replace',value:9}));
  IDBDatabase.prototype.transaction=realTransaction;const retained=await StorageChecks.readStoredProject(key);
  abortTransaction(true);const read=await settle(StorageChecks.readStoredProject(key));
  await new Promise(resolve=>setTimeout(resolve,30));IDBDatabase.prototype.transaction=realTransaction;IDBDatabase.prototype.close=realClose;
  return{write,read,retained,closes};
 });
 assert.equal(result.write.rejected,true,'aborted writes must reject');assert.ok(result.write.message,'aborted writes must explain failure');assert.deepEqual(result.retained,{name:'Preserved artwork',value:7},'aborted writes preserve the prior saved document');assert.equal(result.read.rejected,true,'an aborted read must not be reported as completed');assert.equal(result.closes,3,'every completed or aborted transaction closes its database connection');
 console.log('PASS actual IndexedDB aborts reject, preserve prior data and close every connection');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
