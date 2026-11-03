import {noteRecentProject} from '../../FluxCreate/shared/recent.mjs';
const DB_NAME = 'fluxiffects-studio';
function database() {
  return new Promise((resolve, reject) => {
    let failed=false;
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {if(!req.result.objectStoreNames.contains('projects'))req.result.createObjectStore('projects');};
    req.onsuccess = () => {if(failed)req.result.close();else resolve(req.result);};
    req.onerror = () => {failed=true;reject(req.error||Error('Local storage could not open.'));};
    req.onblocked = () => {failed=true;reject(Error('Another FluxMotion tab is blocking local storage.'));};
  });
}
export async function readSession() {
  const db = await database();
  try { return await new Promise((resolve, reject) => { let value,requestError;const tx=db.transaction('projects'),req=tx.objectStore('projects').get('current');req.onsuccess=()=>{value=req.result;};req.onerror=()=>{requestError=req.error;};tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error||requestError||Error('The saved project could not be read.')); }); }
  finally { db.close(); }
}
export async function saveSession(project,{recoveryToken=null}={}) {
  const db = await database();
  try { await new Promise((resolve, reject) => { const tx = db.transaction('projects', 'readwrite'),store=tx.objectStore('projects');
    if(recoveryToken){const previous=store.get('recovery-backup');previous.onsuccess=()=>{if(previous.result?.recoveryToken===recoveryToken){store.put(project,'current');return;}const saved=store.get('current');saved.onsuccess=()=>{if(saved.result!==undefined)store.put({recoveryToken,savedAt:new Date().toISOString(),project:saved.result},'recovery-backup');store.put(project,'current');};};}else store.put(project, 'current');
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error||Error('The project could not be saved.')); tx.onabort = () => reject(tx.error||Error('The project could not be saved.')); }); }
  finally { db.close(); }
  noteRecentProject('fluxiffects',project.name);
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function fileData(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(`Could not read ${file.name}.`)); reader.readAsDataURL(file); });
}
