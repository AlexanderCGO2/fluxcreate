import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createBlankProject, createLayer, getComp, setKeyframe, parseProject} from '../src/core.mjs';
import {getLayerBounds} from '../src/renderer.mjs';
import {serve} from './serve.mjs';

const server = serve(0);
if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
await fs.mkdir('artifacts', {recursive: true});
const browser = await chromium.launch({executablePath: process.env.FLUXIFFECTS_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true});
const page = await browser.newPage({viewport: {width: 1600, height: 1000}, acceptDownloads: true});
page.setDefaultTimeout(12000);
const checks = [], errors = [], snapshots = {};
page.on('pageerror', error => errors.push(error.message));
const pass = name => {checks.push(name); console.log('PASS ' + name);};
const closeReport = async () => {const button = page.getByRole('button', {name: 'Continue editing', exact: true}); if (await button.isVisible()) await button.click();};
const openProject = async project => {
  await page.locator('input[aria-label="Import project file"]').setInputFiles({name: 'regression.fluxiffects.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project))});
  await page.waitForFunction(name => document.querySelector('input[aria-label="Project name"]')?.value === name, project.name);
  await closeReport();
  await page.getByText('Saved on this device', {exact: true}).waitFor();
};
const save = async () => {
  const pending = page.waitForEvent('download'); await page.keyboard.press('Control+s');
  const downloaded = await pending; return parseProject(await fs.readFile(await downloaded.path(), 'utf8')).project;
};
const fixture = name => createBlankProject({name, width: 1000, height: 600, duration: 8});
const screen = async point => {const rect = await page.locator('canvas').boundingBox(); return {x: rect.x + point.x / 1000 * rect.width, y: rect.y + point.y / 600 * rect.height};};
const drag = async (from, to) => {await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, {steps: 12}); await page.mouse.up();};
const near = (actual, expected, tolerance = 2) => assert.ok(Math.abs(actual - expected) < tolerance, `expected ${actual} near ${expected}`);
const scrub = async time => {const rect = await page.locator('.ruler-track').boundingBox(); await page.mouse.click(rect.x + rect.width * time / 8, rect.y + 8);};

try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByText('Saved on this device', {exact: true}).waitFor();

  const plain = fixture('Direct manipulation regression');
  getComp(plain).layers = [createLayer('rectangle', {id: 'box', name: 'Plain box', x: 400, y: 250, width: 120, height: 80, anchorX: 60, anchorY: 40})];
  await openProject(plain);
  await drag(await screen({x: 400, y: 250}), await screen({x: 500, y: 300}));
  let saved = await save(), layer = getComp(saved).layers[0];
  near(layer.x, 500); near(layer.y, 300);
  pass('Canvas drag updates serialized rectangle position');
  await drag(await screen({x: 560, y: 340}), await screen({x: 620, y: 380}));
  saved = await save(); layer = getComp(saved).layers[0];
  near(layer.scaleX, 1.5, .03); near(layer.scaleY, 1.5, .03);
  const resized = getLayerBounds(layer, getComp(saved), 0);
  near(resized.corners[0].x, 440); near(resized.corners[0].y, 260);
  snapshots.plain = saved;
  pass('Canvas corner resize updates scale and preserves opposite corner');

  const parented = fixture('Rotated parenting regression');
  const parent = createLayer('null', {id: 'parent', name: 'Rotated parent', x: 500, y: 300, width: 1, height: 1, anchorX: 0, anchorY: 0, rotation: 30, scaleX: 1.25, scaleY: 1.25});
  const child = createLayer('rectangle', {id: 'child', name: 'Parented box', parentId: parent.id, x: 0, y: 0, width: 120, height: 80, anchorX: 60, anchorY: 40, rotation: 20});
  getComp(parented).layers = [child, parent];
  await openProject(parented);
  const before = getLayerBounds(child, getComp(parented), 0), fixed = before.corners[0], corner = before.corners[2];
  await drag(await screen(corner), await screen({x: fixed.x + (corner.x - fixed.x) * 1.4, y: fixed.y + (corner.y - fixed.y) * 1.4}));
  saved = await save(); layer = getComp(saved).layers.find(item => item.id === 'child');
  near(layer.scaleX, 1.4, .03); near(layer.scaleY, 1.4, .03);
  const after = getLayerBounds(layer, getComp(saved), 0);
  near(after.corners[0].x, fixed.x); near(after.corners[0].y, fixed.y);
  const center = {x: (after.corners[0].x + after.corners[2].x) / 2, y: (after.corners[0].y + after.corners[2].y) / 2};
  await drag(await screen(center), await screen({x: center.x + 80, y: center.y - 30}));
  saved = await save(); const moved = getLayerBounds(getComp(saved).layers[0], getComp(saved), 0);
  near(moved.corners[0].x - after.corners[0].x, 80); near(moved.corners[0].y - after.corners[0].y, -30);
  snapshots.parented = saved;
  pass('Rotated parent and child resize pinning and drag use correct coordinate transforms');

  const animated = fixture('Keyframe retiming regression');
  let animatedBox = createLayer('rectangle', {id: 'animated', name: 'Animated box', x: 200, y: 250, width: 120, height: 80});
  animatedBox = setKeyframe(setKeyframe(animatedBox, 'x', 1, 200, 'linear'), 'x', 3, 500, 'linear');
  getComp(animated).layers = [animatedBox]; await openProject(animated);
  const key = page.getByRole('button', {name: 'Animated box x keyframe at 1', exact: true});
  const keyBox = await key.boundingBox(), lane = await page.locator('.timeline-row .track-lane').boundingBox();
  await drag({x: keyBox.x + keyBox.width / 2, y: keyBox.y + keyBox.height / 2}, {x: keyBox.x + keyBox.width / 2 + lane.width / 8, y: keyBox.y + keyBox.height / 2});
  saved = await save(); near(getComp(saved).layers[0].keyframes.x[0].time, 2, 1 / 30 + .001);
  assert.equal(getComp(saved).layers[0].keyframes.x[0].value, 200);
  pass('Timeline keyframe drag changes saved key time without changing its value');

  const audio = fixture('Media source offsets regression');
  audio.warnings = ['Fixture audio is intentionally missing; relink before playback.'];
  audio.assets = [{id: 'audio', name: 'fixture.wav', type: 'audio', src: '', missing: true}];
  getComp(audio).layers = [createLayer('audio', {id: 'audio-layer', name: 'Timing audio', assetId: 'audio', start: 1, end: 7, sourceIn: 2, playbackRate: 1.5})];
  await openProject(audio);
  const trim = await page.locator('.timeline-row .clip-trim.left').boundingBox(), track = await page.locator('.timeline-row .track-lane').boundingBox();
  await drag({x: trim.x + trim.width / 2, y: trim.y + trim.height / 2}, {x: trim.x + trim.width / 2 + track.width / 8, y: trim.y + trim.height / 2});
  saved = await save(); layer = getComp(saved).layers[0]; near(layer.start, 2, .04); near(layer.sourceIn, 3.5, .06);
  await scrub(4); await page.getByRole('button', {name: 'Split layer at playhead', exact: true}).click();
  saved = await save(); const right = getComp(saved).layers.find(item => item.name.endsWith(' · 2'));
  near(right.start, 4, .04); near(right.sourceIn, 6.5, .06); assert.equal(getComp(saved).layers.length, 2);
  snapshots.media = saved;
  pass('Audio trim and split preserve source offsets at non-unit playback speed');

  const name = page.getByRole('textbox', {name: 'Project name', exact: true});
  await name.fill('Focused save regression'); saved = await save(); assert.equal(saved.name, 'Focused save regression');
  pass('Ctrl+S downloads the current project while a text input has focus');
  await page.getByText('Saved on this device', {exact: true}).waitFor();
  await page.locator('canvas').click({position: {x: 20, y: 20}});
  await page.keyboard.press('Control+r'); await page.waitForTimeout(500);
  await page.getByText('Saved on this device', {exact: true}).waitFor();
  saved = await save(); assert.equal(getComp(saved).layers.length, 2); assert.ok(getComp(saved).layers.every(item => item.type === 'audio'));
  pass('Ctrl+R does not invoke the unmodified rectangle shortcut');
  await page.reload(); await page.getByText('Saved on this device', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'Workspace', exact: true}).click();
  await page.getByRole('button', {name: /^View import report/}).click();
  assert.ok(await page.getByText(audio.warnings[0], {exact: true}).isVisible());
  pass('Imported warnings remain accessible after session restoration');
  await page.keyboard.press('Escape');
  if (await page.getByRole('dialog').isVisible()) {errors.push('Escape does not close a dialog after Workspace → View import report changes its contents.'); await closeReport();}
  else pass('Escape closes the dialog after switching its contents');
  await page.screenshot({path: 'artifacts/editing-regression.png'});
  await page.getByRole('button', {name: 'Workspace', exact: true}).click();
  await page.getByRole('button', {name: 'Open the demo composition', exact: true}).click();
  await page.getByRole('button', {name: 'Switch to dark appearance', exact: true}).click();
  await page.waitForTimeout(600);
  await page.screenshot({path: 'artifacts/fluxiffects-dark-settled.png'});
  snapshots.darkStyles = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement), input = getComputedStyle(document.querySelector('input[aria-label="Project name"]'));
    return {textVariable: root.getPropertyValue('--text').trim(), surfaceSoft: root.getPropertyValue('--surface-soft').trim(), rootColor: root.color, inputColor: input.color, inputBackground: input.backgroundColor, colorScheme: root.colorScheme};
  });
  pass('Settled dark appearance captured after transitions');
  assert.deepEqual(errors, []); pass('No browser runtime errors during editing regressions');
} catch (error) {
  console.error(error); process.exitCode = 1; errors.push(error.message);
  await page.screenshot({path: 'artifacts/editing-regression-failure.png'});
} finally {
  await fs.writeFile('artifacts/editing-regression-report.json', JSON.stringify({checks, errors, snapshots}, null, 2));
  await browser.close(); server.close();
}
