import http from 'node:http';
import {once} from 'node:events';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = JSON.parse(await readFile(new URL('../public/examples/3d-motion-study.fluxiffects.json', import.meta.url), 'utf8'));
const output = new URL('../artifacts/3d-motion-study/', import.meta.url); await mkdir(output, {recursive: true});
const bundle = await build({stdin: {contents: 'import * as renderer from "./src/renderer.mjs";window.renderer=renderer;', resolveDir: root}, bundle: true, format: 'iife', platform: 'browser', write: false});
const server = http.createServer((request, response) => {
  if (request.url === '/render.js') {response.writeHead(200, {'Content-Type': 'text/javascript'}); response.end(bundle.outputFiles[0].text);}
  else {response.writeHead(200, {'Content-Type': 'text/html'}); response.end('<html><body style="margin:0"><canvas width="1280" height="720"></canvas><script src="/render.js"></script></body></html>');}
});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch({executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true, args: ['--use-angle=swiftshader']});
  const page = await browser.newPage({viewport: {width: 1280, height: 720}}); const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`); await page.waitForFunction(() => window.renderer);
  const frames = await page.evaluate(async project => {
    const comp = project.compositions[0], result = [];
    for (const time of [1.5, 3]) {
      const blob = await renderer.exportFrame(comp, project.assets, time);
      const dataURL = await new Promise(resolve => {const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(blob);});
      result.push({time, dataURL});
    }
    renderer.disposeCompositionMedia(comp.id); renderer.disposeUnusedAssets([]); return result;
  }, project);
  for (const frame of frames) await writeFile(new URL(`frame-${frame.time}.png`, output), Buffer.from(frame.dataURL.split(',')[1], 'base64'));
  if (errors.length) throw new Error(errors.join('\n'));
  if (frames[0].dataURL === frames[1].dataURL) throw new Error('The example did not animate.');
  console.log('Rendered two distinct 1280×720 frames without browser errors.');
} finally {await browser?.close(); await new Promise(resolve => server.close(resolve));}
