import { build } from 'esbuild';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)throw new Error('Prepare this Windows prototype with Node.js 24 or later.');
process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
await import('./build.mjs');
await mkdir('.runtime',{recursive:true});await mkdir('server-dist',{recursive:true});
await build({entryPoints:['server/index.mjs'],outfile:'server-dist/server.mjs',bundle:true,platform:'node',target:'node24',format:'esm',banner:{js:'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);'},legalComments:'eof'});
await copyFile(process.execPath,'.runtime/node.exe');
// Keep the runtime's redistribution notices alongside its binary.
const licensePath=path.resolve(path.dirname(process.execPath),'../node_modules/node/LICENSE');
try{await copyFile(licensePath,'.runtime/NODE-LICENSE.txt');}catch{await writeFile('.runtime/NODE-LICENSE-REQUIRED.txt','Before distributing this build, include the LICENSE from the exact Node.js runtime distribution used. https://github.com/nodejs/node/blob/main/LICENSE\n');}
console.log('Windows resources prepared. Rust + MSVC are required to compile the Tauri shell.');
