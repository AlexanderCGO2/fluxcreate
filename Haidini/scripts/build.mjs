import { build } from 'esbuild';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const alias=Object.fromEntries(['react','react-dom','lucide-react'].map(name=>[name,fileURLToPath(new URL(`../../FluxCreate/node_modules/${name}`,import.meta.url))]));
// Shared renderers and MCP use these same versions; resolve one physical copy
// across sibling installs as well as the consolidated production workspace.
Object.assign(alias,{three:fileURLToPath(new URL('../node_modules/three',import.meta.url)),'three/addons':fileURLToPath(new URL('../node_modules/three/examples/jsm',import.meta.url)),zod:fileURLToPath(new URL('../node_modules/zod',import.meta.url))});
const out=process.argv.includes('--staging')?'.staging-dist':'dist';
await mkdir(out,{recursive:true});
await build({entryPoints:['src/main.tsx','src/engine/simulation.worker.ts'],bundle:true,outdir:out,format:'esm',target:'es2022',sourcemap:true,minify:!process.argv.includes('--debug'),loader:{'.woff2':'file'},alias,define:{'process.env.NODE_ENV':'"production"'}});
await writeFile(out+'/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#161a1c"><title>Fluxini — Motion + Procedural</title><link rel="stylesheet" href="./main.css"></head><body><div id="root"></div><script type="module" src="./main.js"></script></body></html>');
await copyFile('src/assets/FONT-LICENSE.txt',out+'/FONT-LICENSE.txt');
console.log('Workbench built.');
