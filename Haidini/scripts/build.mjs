import { build } from 'esbuild';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
const out=process.argv.includes('--staging')?'.staging-dist':'dist';
await mkdir(out,{recursive:true});
await build({entryPoints:['src/main.tsx','src/engine/simulation.worker.ts'],bundle:true,outdir:out,format:'esm',target:'es2022',sourcemap:true,minify:!process.argv.includes('--debug'),loader:{'.woff2':'file'},define:{'process.env.NODE_ENV':'"production"'}});
await writeFile(out+'/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#161a1c"><title>Fluxini — Motion + Procedural</title><link rel="stylesheet" href="./main.css"></head><body><div id="root"></div><script type="module" src="./main.js"></script></body></html>');
await copyFile('src/assets/FONT-LICENSE.txt',out+'/FONT-LICENSE.txt');
console.log('Workbench built.');
