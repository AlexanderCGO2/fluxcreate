import {ParticleSimulation} from '../src/engine/simulation.ts';
import {defaults} from '../src/engine/catalog.ts';
import {mkdir,writeFile} from 'node:fs/promises';
const report=[];
for(const kind of ['water','cloud'])for(const count of (kind==='water'?[1200,2400,4800,8000]:[700,1800,3600,7200])){
 const sim=new ParticleSimulation(kind,{...defaults(kind),count});sim.seek(.5);const steps=[],frames=[];
 for(let i=31;i<=150;i++){const start=performance.now();sim.seek(i/60);steps.push(performance.now()-start);if(i%2===0){const start=performance.now();sim.frame();frames.push(performance.now()-start);}}
 const stats=a=>{a.sort((a,b)=>a-b);return {median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)]};};
 const sample={kind,count,step:stats(steps),frame:stats(frames)};report.push(sample);console.log(JSON.stringify(sample));
}
await mkdir('artifacts/simulation-capacity',{recursive:true});await writeFile('artifacts/simulation-capacity/cpu.json',JSON.stringify(report,null,2));
