import {spawnSync} from 'node:child_process';
import {copyFile, cp, mkdir, mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PUBLIC_DEMO_APP_IDS} from '../shared/hosting.mjs';
import {getApp} from '../shared/registry.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const artifacts = path.join(root, 'artifacts');
await mkdir(artifacts, {recursive: true});
const staging = await mkdtemp(path.join(artifacts, 'public-demo-'));
const output = path.join(staging, '.vercel', 'output');
const assets = path.join(output, 'static');
await mkdir(assets, {recursive: true});

for (const id of PUBLIC_DEMO_APP_IDS) {
  const workspace = path.join(root, getApp(id).folder);
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: workspace,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.status !== 0) throw result.error ?? new Error('Demo build failed for ' + id);

  const destination = path.join(assets, id);
  const source = path.join(workspace, 'dist');
  await cp(source, destination, {
    recursive: true,
    filter: file => {
      const relative = path.relative(source, file);
      const top = relative.split(path.sep)[0];
      if (file.endsWith('.map') || path.basename(file) === '.gitkeep') return false;
      if (['', 'index.html', 'main.js', 'main.css', 'favicon.svg'].includes(top)) return true;
      return (id === 'fluxoto' && top === 'AG-PSD-LICENSE.txt') ||
        (id === 'fluxidesign' && top === 'pdfjs') ||
        (id === 'fluxiffects' && ['bridge', 'examples'].includes(top));
    },
  });
  const entry = path.join(destination, 'index.html');
  const html = await readFile(entry, 'utf8');
  if (!html.includes('<head>')) throw new Error('Missing HTML head for ' + id);
  await writeFile(entry, html.replace('<head>', '<head><script>globalThis.__FLUXCREATE_HOSTED__=true;globalThis.__FLUXCREATE_PUBLIC_DEMO__=true;</script>'));
}

await copyFile(new URL('./public-demo.html', import.meta.url), path.join(assets, 'index.html'));
await copyFile(path.join(root, 'LICENSE'), path.join(assets, 'LICENSE.txt'));
await copyFile(path.join(root, 'FluxExchange', 'LICENSE'), path.join(assets, 'FLUXEXCHANGE-LICENSE.txt'));
const designRequire = createRequire(path.join(root, 'Fluxidesign', 'package.json'));
const pdfPackage = path.dirname(designRequire.resolve('pdfjs-dist/package.json'));
await copyFile(path.join(pdfPackage, 'LICENSE'), path.join(assets, 'fluxidesign', 'pdfjs', 'LICENSE'));
const editors = PUBLIC_DEMO_APP_IDS.join('|');

// This deployment contains only the static directory. The normal suite API
// dispatcher, runtime configuration and provider connections are absent.
const routes = [
  {
    src: '/(.*)',
    headers: {
      'Content-Security-Policy': "connect-src 'self' data: blob:; object-src 'none'; base-uri 'self'",
      'Referrer-Policy': 'same-origin',
      'X-Content-Type-Options': 'nosniff',
    },
    continue: true,
  },
  {src: '/(' + editors + ')', status: 308, headers: {Location: '/$1/'}},
  {src: '/(' + editors + ')/', dest: '/$1/index.html'},
  {src: '/', dest: '/index.html'},
  {handle: 'filesystem'},
  {src: '/(.*)', status: 404},
];
await writeFile(path.join(output, 'config.json'), JSON.stringify({version: 3, routes}, null, 2));
console.log('Demo deployment directory: ' + staging);
