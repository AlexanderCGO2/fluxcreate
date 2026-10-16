import {build} from 'esbuild';
import {mkdir,cp,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const suite=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function buildApp(rootURL){
 const root=fileURLToPath(rootURL),dist=path.join(root,'dist');await mkdir(dist,{recursive:true});
 await build({entryPoints:[path.join(root,'src/main.jsx')],bundle:true,outdir:dist,format:'esm',target:'es2022',jsx:'automatic',minify:true,sourcemap:true,logLevel:'info',alias:Object.fromEntries(['react','react-dom','lucide-react'].map(n=>[n,path.join(suite,'node_modules',n)])),define:{'process.env.NODE_ENV':'"production"'},loader:{'.svg':'dataurl'}});
 if(path.basename(root)==='Fluximiere')await build({entryPoints:[path.join(root,'src/music-video/analysis-worker.mjs')],bundle:true,format:'esm',target:'es2022',minify:true,outfile:path.join(dist,'music-analysis-worker.js')});
 await cp(path.join(root,'public'),dist,{recursive:true});
 const title=({Fluxoto:'Fluxfoto',Fluxidesign:'FluxDesign',Fluximiere:'Fluximiére'})[path.basename(root)]||path.basename(root);await writeFile(path.join(dist,'index.html'),`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f6f6f7"><title>${title}</title><link rel="stylesheet" href="./main.css"></head><body><div id="root"></div><script type="module" src="./main.js"></script></body></html>`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildApp(new URL('../',import.meta.url));
