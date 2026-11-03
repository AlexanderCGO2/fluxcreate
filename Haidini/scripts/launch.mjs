import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConnection } from '../server/connection.mjs';
import { createWorkbench } from '../server/index.mjs';
if(Number(process.versions.node.split('.')[0])<24)throw new Error('FluxEffects requires Node.js 24 or later.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const port=Number(process.env.FLUXINI_PORT||4318);
let origin=`http://127.0.0.1:${port}`,app;
try{const response=await fetch(origin+'/api/session',{signal:AbortSignal.timeout(1000)});const session=await response.json();if(session.app!=='fluxini')throw new Error('Another service is using this port.');}
catch{
  try{await access('dist/index.html');}catch{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['scripts/build.mjs'],{stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Build failed. Run pnpm install first.')));});}
  await loadConnection(path.resolve('.data'));app=await createWorkbench({port});origin=app.origin;
}
console.log(`FluxEffects is running at ${origin}. Keep this terminal open while using the workbench.`);
if(!process.argv.includes('--no-open')){
  const edge=path.join(process.env['ProgramFiles(x86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe');
  const child=spawn(edge,['--app='+origin,'--new-window'],{windowsHide:true,detached:true,stdio:'ignore'});child.on('error',()=>console.log('Open '+origin+' in your browser.'));child.unref();
}
if(app)for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
