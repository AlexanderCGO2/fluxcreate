import {buildApp} from '../../FluxCreate/scripts/build.mjs';
import {cp,mkdir,copyFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
await buildApp(new URL('../',import.meta.url));
const require=createRequire(import.meta.url),pdf=path.dirname(require.resolve('pdfjs-dist/package.json')),output=new URL('../dist/pdfjs/',import.meta.url);
await mkdir(output,{recursive:true});await copyFile(path.join(pdf,'build/pdf.worker.mjs'),new URL('pdf.worker.js',output));
for(const folder of ['cmaps','standard_fonts','wasm'])await cp(path.join(pdf,folder),new URL(folder,output),{recursive:true});
