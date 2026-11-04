import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';

// Exercises the actual browser Canvas/media APIs without involving the editor UI.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'artifacts', 'renderer');
await mkdir(output, { recursive: true });
const sources = new Map(await Promise.all(['renderer', 'core'].map(async name => { const result = await build({ entryPoints: [path.join(root, 'src', `${name}.mjs`)], bundle: true, format: 'esm', platform: 'browser', write: false }); return [`/${name}.mjs`, result.outputFiles[0].text]; }))); 
const server = http.createServer((request, response) => {
  if (sources.has(request.url)) {
    response.writeHead(200, { 'Content-Type': 'text/javascript' }); response.end(sources.get(request.url)); return;
  }
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end('<!doctype html><html><body style="margin:32px;background:#eee;font:16px system-ui"><h1>FluxMotion renderer verification</h1><canvas id="output" width="256" height="144" style="width:768px;image-rendering:pixelated"></canvas></body></html>');
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
const report = { startedAt: new Date().toISOString(), checks: [], errors: [] };
try {
  let executablePath = process.env.FLUXIFFECTS_BROWSER;
  if (!executablePath) {
    for (const candidate of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe']) {
      try { await access(candidate); executablePath = candidate; break; } catch { /* Try the next browser. */ }
    }
  }
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 650 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    window.renderer = await import('/renderer.mjs');
    window.model = await import('/core.mjs');
    window.sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
    window.check = (condition, message) => { if (!condition) throw new Error(message); };
    window.readBlob = blob => new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
    window.decodePng = async blob => {
      const image = await createImageBitmap(blob), canvas = document.createElement('canvas');
      canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return { image, canvas, ctx, pixel: (x, y) => [...ctx.getImageData(x, y, 1, 1).data] };
    };
    window.centroid = ctx => {
      const { data, width, height } = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      let count = 0, sum = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        if (data[index] > 180 && data[index + 1] < 160 && data[index + 2] > 100) { count++; sum += x; }
      }
      return count ? sum / count : null;
    };
    let layer = model.createLayer('rectangle', { id: 'moving', x: 16, y: 48, width: 64, height: 48, anchorX: 0, anchorY: 0, cornerRadius: 0, fill: '#f75999', start: 0, end: 2 });
    layer = model.setKeyframe(layer, 'x', 0, 16, 'linear'); layer = model.setKeyframe(layer, 'x', 2, 176, 'linear');
    window.fixture = { id: 'renderer-fixture', width: 256, height: 144, fps: 24, duration: 2, background: '#102030', layers: [layer] };
  });

  const png = await page.evaluate(async () => {
    const blob = await renderer.exportFrame(fixture, [], 1);
    const decoded = await decodePng(blob);
    check(decoded.image.width === 256 && decoded.image.height === 144, 'PNG must preserve full composition resolution.');
    check(decoded.pixel(0, 0).join() === '16,32,48,255', 'PNG background color differs.');
    check(decoded.pixel(120, 70).join() === '247,89,153,255', 'PNG keyframe position/color differs.');
    check(decoded.pixel(40, 70).join() === '16,32,48,255', 'PNG rendered the wrong animation time.');
    document.querySelector('#output').getContext('2d').drawImage(decoded.image, 0, 0);
    return { bytes: blob.size, base64: await readBlob(blob) };
  });
  await writeFile(path.join(output, 'frame-at-1s.png'), Buffer.from(png.base64, 'base64'));
  report.checks.push({ name: 'PNG export dimensions, exact pixels, evaluated animation', passed: true, bytes: png.bytes });

  await page.evaluate(() => {
    const parent = model.createLayer('null', { id: 'parent', x: 100, y: 50, scaleX: 2, scaleY: 2, rotation: 90, anchorX: 0, anchorY: 0 });
    const child = model.createLayer('rectangle', { id: 'child', parentId: 'parent', x: 10, y: 20, width: 40, height: 30, anchorX: 0, anchorY: 0 });
    const comp = { ...fixture, layers: [child, parent] };
    const bounds = renderer.getLayerBounds(child, comp, 1);
    check(Math.abs(bounds.x) < 0.001 && Math.abs(bounds.y - 70) < 0.001 && Math.abs(bounds.width - 60) < 0.001 && Math.abs(bounds.height - 80) < 0.001, 'Parent affine bounds differ.');
    check(renderer.hitTest(comp, 1, 30, 100)?.id === 'child', 'Inverse parent hit test failed.');
    child.locked = true; check(renderer.hitTest(comp, 1, 30, 100) === null, 'Locked layer was selected.');
    child.locked = false; child.type = 'ellipse'; check(renderer.hitTest(comp, 1, 1, 71) === null, 'Ellipse corner should not be selected.');
    check(renderer.hitTest(comp, 9, 30, 100) === null, 'Layer out-point should not be selectable.');
  });
  report.checks.push({ name: 'Parent transforms, bounds, inverse hits, locks, ellipse contours, out-points', passed: true });

  await page.evaluate(async () => {
    const base = model.createLayer('rectangle', { x: 20, y: 20, width: 60, height: 60, anchorX: 0, anchorY: 0, cornerRadius: 0, fill: '#ff0000', effects: [{ type: 'grayscale', amount: 100 }] });
    const gray = await decodePng(await renderer.exportFrame({ ...fixture, layers: [base] }, [], 1));
    const pixel = gray.pixel(40, 40); check(Math.abs(pixel[0] - pixel[1]) < 2 && Math.abs(pixel[1] - pixel[2]) < 2, 'Grayscale effect was not rendered.');
    base.effects = [{ type: 'hue', amount: 120 }];
    const hue = await decodePng(await renderer.exportFrame({ ...fixture, layers: [base] }, [], 1));
    check(hue.pixel(40, 40)[1] > hue.pixel(40, 40)[0], 'Hue effect was not rendered.');
    base.effects = [{ type: 'sepia', amount: 100 }];
    const sepia = await decodePng(await renderer.exportFrame({ ...fixture, layers: [base] }, [], 1));
    const tinted = sepia.pixel(40, 40); check(tinted[0] > tinted[1] && tinted[1] > tinted[2] && tinted[2] > 5, 'Sepia effect was not rendered.');
    base.effects = [{ type: 'shadow', amount: 20 }];
    const shadow = await decodePng(await renderer.exportFrame({ ...fixture, background: '#ffffff', layers: [base] }, [], 1));
    check(shadow.pixel(50, 87)[0] < 255, 'Shadow effect was not rendered.');
  });
  report.checks.push({ name: 'Browser pixels verify grayscale, hue, sepia, and shadow effects', passed: true });

  await page.evaluate(async () => {
    const source = document.createElement('canvas'); source.width = 64; source.height = 48;
    const ctx = source.getContext('2d'); ctx.fillStyle = '#31c48d'; ctx.fillRect(0, 0, 64, 48);
    const asset = { id: 'image-fixture', type: 'image', src: source.toDataURL() };
    let notices = 0; const unsubscribe = renderer.subscribeMedia(() => notices++);
    const prepared = await renderer.prepareAssets([asset]);
    check(prepared[0].status === 'fulfilled', 'PNG image asset did not decode.');
    check(await renderer.loadAsset(asset) === await renderer.loadAsset(asset), 'Image cache failed.');
    check(notices > 0, 'Loaded image did not request a preview redraw.'); unsubscribe();
    const layer = model.createLayer('image', { id: 'still', assetId: asset.id, x: 0, y: 0, width: 256, height: 144, anchorX: 0, anchorY: 0, cornerRadius: 0 });
    const exported = await decodePng(await renderer.exportFrame({ ...fixture, layers: [layer] }, [asset], 0));
    check(exported.pixel(30, 30).join() === '49,196,141,255', 'Imported PNG did not appear in exported output.');
  });
  report.checks.push({ name: 'Image decode/cache, load notifications, full-resolution image export', passed: true });

  const video = await page.evaluate(async () => {
    const progress = [];
    const result = await renderer.exportVideo(fixture, [], fraction => progress.push(fraction));
    check(result.blob.size > 1000 && result.mimeType.startsWith('video/webm'), 'WebM export is empty or has the wrong MIME type.');
    check(result.hasAudio === false, 'WebM must explicitly report its silent audio status.');
    check(progress[0] === 0 && progress.at(-1) === 1 && progress.length > 10, 'Export progress did not run through completion.');
    window.videoSource = URL.createObjectURL(result.blob);
    const element = document.createElement('video'); element.muted = true; element.preload = 'auto'; element.src = videoSource;
    await new Promise((resolve, reject) => { element.onloadeddata = resolve; element.onerror = () => reject(new Error('Exported WebM cannot be decoded.')); });
    check(element.videoWidth === 256 && element.videoHeight === 144, 'WebM resolution differs.');
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 144; const ctx = canvas.getContext('2d');
    const frame = async time => {
      await new Promise((resolve, reject) => { const timeout = setTimeout(() => reject(new Error('WebM seeking timed out.')), 10000); element.onseeked = () => { clearTimeout(timeout); resolve(); }; element.currentTime = time; });
      ctx.drawImage(element, 0, 0); return centroid(ctx);
    };
    const first = await frame(0.25), last = await frame(1.5);
    check(first !== null && last !== null && last - first > 70, `WebM motion was not encoded: ${first} → ${last}.`);
    return { bytes: result.blob.size, mimeType: result.mimeType, first, last, progressEvents: progress.length, base64: await readBlob(result.blob) };
  });
  await writeFile(path.join(output, 'motion-2s.webm'), Buffer.from(video.base64, 'base64'));
  const { base64: ignored, ...videoDetails } = video;
  report.checks.push({ name: 'Two-second WebM encodes, decodes, seeks, and contains moving frames', passed: true, ...videoDetails });

  await page.evaluate(async () => {
    const asset = { id: 'video-fixture', type: 'video', src: videoSource };
    const layer = model.createLayer('video', { id: 'video-layer', assetId: asset.id, x: 0, y: 0, width: 256, height: 144, anchorX: 0, anchorY: 0, cornerRadius: 0, start: 0, end: 2 });
    const comp = { ...fixture, id: 'video-import', layers: [layer] };
    const prepared = await renderer.prepareAssets([asset]); check(prepared[0].status === 'fulfilled', 'Video import did not decode.');
    const png = await decodePng(await renderer.exportFrame(comp, [asset], 1.5));
    check(centroid(png.ctx) > 140, 'Video-to-PNG export did not seek to the requested frame.');
    const canvas = document.querySelector('#output'), ctx = canvas.getContext('2d');
    let notifications = 0, previewTime = 0.25;
    const unsubscribe = renderer.subscribeMedia(() => { notifications++; renderer.renderComposition(ctx, comp, [asset], previewTime); });
    renderer.syncMedia(comp, [asset], previewTime, false);
    await sleep(250); renderer.syncMedia(comp, [asset], previewTime, false); await sleep(250);
    const first = centroid(ctx);
    check(first !== null && first < 95, 'Paused preview did not render the decoded first video frame.');
    const beforeSeek = notifications; previewTime = 1.5;
    renderer.syncMedia(comp, [asset], previewTime, false); await sleep(350);
    const last = centroid(ctx);
    check(notifications > beforeSeek && last - first > 65, `Paused seek did not notify and redraw a new frame: ${first} → ${last}.`);
    let plays = 0, pauses = 0;
    const originalPlay = HTMLMediaElement.prototype.play, originalPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function() { plays++; return originalPlay.call(this); };
    HTMLMediaElement.prototype.pause = function() { pauses++; return originalPause.call(this); };
    try {
      previewTime = 0.5; renderer.syncMedia(comp, [asset], previewTime, true); await sleep(200);
      renderer.syncMedia(comp, [asset], previewTime + 0.2, false);
      check(plays > 0 && pauses > 0, 'Preview playback was not synchronized with play/pause.');
    } finally { HTMLMediaElement.prototype.play = originalPlay; HTMLMediaElement.prototype.pause = originalPause; }
    unsubscribe(); renderer.disposeCompositionMedia(comp.id);
  });
  report.checks.push({ name: 'Video import, exact PNG seeking, paused seek redraw events, preview play/pause', passed: true });

  await page.evaluate(async () => {
    const sampleRate = 8000, samples = sampleRate, buffer = new ArrayBuffer(44 + samples * 2), view = new DataView(buffer);
    const label = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
    label(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); label(8, 'WAVE'); label(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); label(36, 'data'); view.setUint32(40, samples * 2, true);
    for (let index = 0; index < samples; index++) view.setInt16(44 + index * 2, Math.sin(index * Math.PI * 2 * 440 / sampleRate) * 1000, true);
    const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
    const asset = { id: 'audio-fixture', type: 'audio', src: url };
    const layer = model.createLayer('audio', { id: 'audio-layer', assetId: asset.id, start: 0, end: 1, volume: 0.25, muted: true, sourceIn: 0.1 });
    const comp = { ...fixture, id: 'audio-import', layers: [layer] };
    check((await renderer.prepareAssets([asset]))[0].status === 'fulfilled', 'WAV audio did not decode.');
    renderer.syncMedia(comp, [asset], 0.2, false); await sleep(200);
    const originalPlay = HTMLMediaElement.prototype.play; let played;
    HTMLMediaElement.prototype.play = function() { played = this; return originalPlay.call(this); };
    try {
      renderer.syncMedia(comp, [asset], 0.2, true); await sleep(100);
      check(played?.tagName === 'AUDIO' && played.muted && played.volume === 0.25 && played.currentTime >= 0.3, 'Audio gain, mute, source offset, or playback did not synchronize.');
      renderer.syncMedia(comp, [asset], 0.3, false); check(played.paused, 'Paused timeline did not pause audio.');
    } finally { HTMLMediaElement.prototype.play = originalPlay; renderer.disposeCompositionMedia(comp.id); URL.revokeObjectURL(url); }
  });
  report.checks.push({ name: 'WAV audio decode, playback, gain, mute, source offset, and pause', passed: true });

  await page.evaluate(async () => {
    const controller = new AbortController(); setTimeout(() => controller.abort(), 250);
    let aborted = false; try { await renderer.exportVideo(fixture, [], () => {}, { signal: controller.signal }); } catch (error) { aborted = error.name === 'AbortError'; }
    check(aborted, 'Recording cancellation did not reject with AbortError.');
    let limited = false; try { await renderer.exportVideo({ ...fixture, duration: 61 }, []); } catch (error) { limited = error.message.includes('60 seconds'); }
    check(limited, 'Duration limit was not enforced.');
  });
  report.checks.push({ name: 'Video export cancellation and 60-second duration validation', passed: true });
  await page.screenshot({ path: path.join(output, 'renderer-browser.png') });
  assert.deepEqual(report.errors, [], 'Browser raised uncaught errors.');
  report.completedAt = new Date().toISOString(); report.passed = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.passed = false; report.failure = error.stack || String(error);
  console.error(JSON.stringify(report, null, 2)); process.exitCode = 1;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
