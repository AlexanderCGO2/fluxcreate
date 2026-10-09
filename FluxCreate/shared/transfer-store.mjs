export const TRANSFER_LIMITS=Object.freeze({bytes:128*1024*1024,pending:12,receipts:100,age:7*86400000});
const terminal=new Set(['applied','declined','expired']),states=new Set(['waiting','received','review','applying','applied','declined','failed','expired']);
function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('fluxcreate-transfers',1);r.onupgradeneeded=()=>r.result.createObjectStore('records',{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Transfer storage is unavailable.'));r.onblocked=()=>reject(Error('Close another FluxCreate tab to unlock transfer storage.'));});}
export function transferBytes(result){if(!result)return 0;return (result.text?.length||0)*2+(result.images||[]).reduce((n,v)=>n+(v.src?.length||0)*2,0)+(result.videos||[]).reduce((n,v)=>n+(v.blob?.size||0),0)+(result.audios||[]).reduce((n,v)=>n+(v.blob?.size||0),0);}
function signalChange(){globalThis.dispatchEvent?.(new Event('fluxcreate-transfers-changed'));}
async function transaction(fn){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),request=store.getAll();let result,error;tx.oncomplete=()=>{signalChange();resolve(result);};tx.onabort=()=>reject(error||tx.error||Error('Could not save the transfer.'));request.onsuccess=()=>{try{result=fn(store,request.result);}catch(e){error=e;tx.abort();}};request.onerror=()=>{error=request.error;};});}finally{db.close();}}
export async function listTransfers({direction,appId}={}){const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('records').objectStore('records').getAll();r.onsuccess=()=>resolve(r.result.filter(v=>(!direction||v.direction===direction)&&(!appId||v.targetApp===appId)&&Date.now()-v.updatedAt<TRANSFER_LIMITS.age).sort((a,b)=>b.updatedAt-a.updatedAt));r.onerror=()=>reject(r.error);});}finally{db.close();}}
export async function saveTransfer({id,direction,sourceApp,targetApp,result,status=direction==='in'?'review':'waiting'}){
 if(!/^[\w-]{36}$/.test(id)||!['in','out'].includes(direction)||!states.has(status))throw Error('Invalid transfer record.');
 return transaction((store,records)=>{
  const key=direction+':'+targetApp+':'+id,existing=records.find(v=>v.key===key);if(existing)return existing;
  const now=Date.now(),current=records.filter(v=>now-v.updatedAt<TRANSFER_LIMITS.age),pending=current.filter(v=>v.result&&!terminal.has(v.status));
  for(const old of records)if(now-old.updatedAt>=TRANSFER_LIMITS.age)store.delete(old.key);
  const size=transferBytes(result);if(pending.length>=TRANSFER_LIMITS.pending||pending.reduce((n,v)=>n+v.bytes,0)+size>TRANSFER_LIMITS.bytes)throw Error('Your transfer inbox is full. Finish or dismiss existing transfers, then try again.');
  const receipts=current.filter(v=>!v.result).sort((a,b)=>b.updatedAt-a.updatedAt);for(const old of receipts.slice(TRANSFER_LIMITS.receipts-1))store.delete(old.key);
  const record={key,id,direction,sourceApp,targetApp,status,createdAt:now,updatedAt:now,bytes:size,result};store.put(record);return record;
 });
}
export async function updateTransfer(id,targetApp,status,{direction='in',error=''}={}){
 if(!states.has(status))throw Error('Invalid transfer state.');
 return transaction((store,records)=>{const key=direction+':'+targetApp+':'+id,record=records.find(v=>v.key===key);if(!record)throw Error('This transfer no longer exists.');if(status==='applying'&&record.status!=='review')throw Error('This transfer is already being applied or has been resolved.');
  if(terminal.has(record.status))return record;
  const next={...record,status,error:String(error).slice(0,300),updatedAt:Date.now()};if(terminal.has(status)||status==='received'){delete next.result;next.bytes=0;}store.put(next);return next;
 });
}
