import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {ParticleDynamics} from '../src/engine/particleDynamics.ts';
import {defaults} from '../src/engine/catalog.ts';
const dir=path.resolve('artifacts/fluid-capacity');await mkdir(dir,{recursive:true});
await build({entryPoints:['scripts/particle-benchmark.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:path.join(dir,'benchmark.js')});
await build({entryPoints:['src/engine/simulation.worker.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:path.join(dir,'simulation.worker.js')});
const resources=new Map([['/',{type:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"><title>Fluxini particle benchmark</title><style>html,body{margin:0;background:#171f23}canvas{display:block}</style></head><body><script type="module" src="/benchmark.js"></script></body></html>'}],['/benchmark.js',{type:'text/javascript',body:await readFile(path.join(dir,'benchmark.js'))}],['/engine/simulation.worker.js',{type:'text/javascript',body:await readFile(path.join(dir,'simulation.worker.js'))}]]);
const server=createServer((req,res)=>{const resource=resources.get(req.url);if(!resource){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':resource.type,'Cache-Control':'no-store'});res.end(resource.body);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {chromium}=createRequire(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json'))('playwright');
let browser;const result={createdAt:new Date().toISOString(),cpu:os.cpus()[0].model.trim(),logicalCores:os.cpus().length,ramGiB:Math.round(os.totalmem()/1024**3),method:'Actual Fluxini simulation backend, particle renderer and shaders; 1280x720 DPR1; one box source, one box collider, turbulence, all particles alive; normal project limits bypassed only inside this harness. Each sample has 1.5s render-only then 3s playback, after warmup. Two rounds in reverse order. Existing desktop load is uncontrolled.',errors:[],cases:[],cpuCases:[]};
result.method='Actual water/cloud view at 1280x720 DPR1, five seconds playback after one simulated second warmup, two reversed rounds. Cloud density uses the GPU; parcel and fluid physics use CPU workers. Existing desktop load is uncontrolled.';
const save=()=>writeFile(path.join(dir,'results.json'),JSON.stringify(result,null,2));
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});result.browser=browser.version();const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});page.on('pageerror',error=>result.errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('404'))result.errors.push(message.text());});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.particleBenchmark);result.hardware=await page.evaluate(()=>window.particleBenchmark.hardware);console.log(JSON.stringify({hardware:result.hardware,cpu:result.cpu}));
 if(/SwiftShader|llvmpipe|software/i.test(result.hardware.renderer))throw new Error('Software WebGL detected; aborting hardware benchmark.');
 result.baseline=await page.evaluate(()=>window.particleBenchmark.baseline());await save();
 for(let round=1;round<=2;round++)for(const kind of (round===1?['water','cloud']:['cloud','water']))for(const count of (round===1?(kind==='water'?[2400,4800,8000]:[1800,3600,7200]):(kind==='water'?[8000,4800,2400]:[7200,3600,1800]))){const sample=await page.evaluate(({kind,count})=>window.particleBenchmark.fluid(kind,count),{kind,count});result.cases.push({...sample,round});await save();console.log(JSON.stringify({round,kind,count,gpuDensity:sample.gpuDensity,fps:+sample.playback.fps.toFixed(1),lagMs:+sample.simLagMs.p95.toFixed(1),stepMs:+sample.workerStepMs.median.toFixed(2),framePrepareMs:+sample.messageMs.median.toFixed(2)}));}
 await page.screenshot({path:path.join(dir,'benchmark-completed.png')});if(result.errors.length)throw new Error('Browser errors: '+result.errors.join('; '));console.log('Particle benchmark complete: '+path.join(dir,'results.json'));
}catch(error){result.failure=String(error);await save();console.error(error);process.exitCode=1;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
