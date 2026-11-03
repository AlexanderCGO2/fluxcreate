import { spawn } from 'node:child_process';
import { serve } from './serve.mjs';
const url='http://localhost:4320';
let existing=false;
try{const response=await fetch(url,{signal:AbortSignal.timeout(1000)});existing=(await response.text()).includes('FluxMotion');}catch{}
if(!existing){const server=serve(4320);await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});}
if(process.platform==='win32')spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,detached:true,stdio:'ignore'}).unref();
else console.log(`Open ${url}`);
