import { build } from 'esbuild';
import { mkdir, copyFile, cp } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/main.jsx'], bundle: true, outdir: 'dist', format: 'esm', target: 'es2022', sourcemap: true, minify: !process.argv.includes('--debug'), define: { 'process.env.NODE_ENV': '"production"' } });
await copyFile('index.html', 'dist/index.html');
await cp('public', 'dist', { recursive: true });
console.log('Fluxiffects built successfully.');
