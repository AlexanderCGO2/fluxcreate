import {spawn} from 'node:child_process';
import {access,mkdir,open} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {APPS,appURL} from '../shared/registry.mjs';
const suite=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=path.dirname(suite),pending=new Map();
const home={id:'fluxcreate',folder:'FluxCreate',name:'FluxCreate',port:4325};
async function ready(app){try{const res=await fetch(`http://127.0.0.1:${app.port}${app.id==='fluxini'?'/api/session':'/api/health'}`,{signal:AbortSignal.timeout(900)});return res.ok&&(await res.json()).app===app.id;}catch{return false;}}
export async function launchApp(id){
 if(pending.has(id))return pending.get(id);const app=[home,...APPS].find(a=>a.id===id);if(!app)throw Error('Unknown FluxCreate app.');
 const operation=(async()=>{
  if(await ready(app))return {ready:true,url:appURL(app)};
  const root=path.join(base,app.folder),entry=['fluxini','fluxlab','fluxagents'].includes(app.id)?'server/index.mjs':'scripts/serve.mjs';
  await access(path.join(root,'dist/index.html'));await access(path.join(root,entry));
  const fallback=path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe');
  const runtime=Number(process.versions.node.split('.')[0])>=24?process.execPath:fallback;await access(runtime);
  await mkdir(path.join(root,'artifacts'),{recursive:true});const log=await open(path.join(root,'artifacts/studio-server.log'),'a');
  let child;try{child=spawn(runtime,[entry],{cwd:root,windowsHide:true,detached:true,stdio:['ignore',log.fd,log.fd]});await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();}finally{await log.close();}
  for(let i=0;i<60;i++){if(await ready(app))return {ready:true,url:appURL(app)};await new Promise(r=>setTimeout(r,150));}
  throw Error(`${app.name} could not start. Check its local studio-server.log; its port may be in use.`);
 })();pending.set(id,operation);try{return await operation;}finally{pending.delete(id);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const id=process.argv[2]||'fluxcreate';if(id==='all'){for(const app of [home,...APPS])console.log(app.name,await launchApp(app.id));}else console.log(await launchApp(id));}
