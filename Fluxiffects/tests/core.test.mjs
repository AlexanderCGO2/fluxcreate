import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { createLayer, createBlankProject, createDemoProject, getComp, setKeyframe, removeKeyframe, evaluateLayer, parseProject, ease } from '../src/core.mjs';

test('native projects round-trip, preserving animated editable demo layers', () => {
  const demo = createDemoProject();
  const result = parseProject(JSON.stringify(demo));
  assert.deepEqual(result.project, demo);
  assert.deepEqual(result.warnings, []);
  assert.equal(getComp(result.project).width, 1920);
  const headline = getComp(result.project).layers.find(layer => layer.name === 'Ideas, in motion.');
  assert.equal(evaluateLayer(headline, 1.4).opacity, 1);
  assert.equal(evaluateLayer(headline, 1.4).y, 285);
});

test('animation is immutable, sorted and interpolates its bounding keyframes', () => {
  const original = createLayer('rectangle');
  let animated = setKeyframe(original, 'x', 2, 200, 'linear');
  animated = setKeyframe(animated, 'x', 0, 0, 'linear');
  assert.deepEqual(original.keyframes, {});
  assert.deepEqual(animated.keyframes.x.map(key => key.time), [0, 2]);
  assert.equal(evaluateLayer(animated, 1).x, 100);
  assert.equal(evaluateLayer(animated, -5).x, 0);
  assert.equal(evaluateLayer(animated, 9).x, 200);
  assert.equal(animated.x, 960);
});

test('same-time keyframes replace existing values and retain selection ids', () => {
  const first = setKeyframe(createLayer('ellipse'), 'rotation', 1, 20);
  const second = setKeyframe(first, 'rotation', 1, 80, 'hold');
  assert.equal(second.keyframes.rotation.length, 1);
  assert.equal(second.keyframes.rotation[0].id, first.keyframes.rotation[0].id);
  assert.equal(first.keyframes.rotation[0].value, 20);
  assert.equal(second.keyframes.rotation[0].value, 80);
  assert.deepEqual(removeKeyframe(second, 'rotation', second.keyframes.rotation[0].id).keyframes, {});
  assert.equal(second.keyframes.rotation.length, 1);
});

test('ease and hold curves produce distinct motion at intermediate times', () => {
  assert.equal(ease(0.25, 'linear'), 0.25);
  assert.equal(ease(0.25, 'ease-in'), 0.015625);
  assert.equal(ease(0.25, 'ease-out'), 0.578125);
  assert.equal(ease(0.25, 'ease-in-out'), 0.0625);
  assert.equal(ease(0.75, 'ease-in-out'), 0.9375);
  let layer = setKeyframe(createLayer('text'), 'opacity', 0, 0, 'hold');
  layer = setKeyframe(layer, 'opacity', 1, 1);
  assert.equal(evaluateLayer(layer, 0.99).opacity, 0);
  assert.equal(evaluateLayer(layer, 1).opacity, 1);
});

test('animated hex colors interpolate channel values', () => {
  let layer = setKeyframe(createLayer('solid'), 'fill', 0, '#000000', 'linear');
  layer = setKeyframe(layer, 'fill', 1, '#ffffff');
  assert.equal(evaluateLayer(layer, 0.5).fill, '#808080');
});

test('AE bridge projects normalize to native project files', () => {
  const data = createBlankProject({name: 'From AE', fps: 23.976});
  data.format = 'fluxiffects-ae';
  data.warnings = ['Expressions were baked.'];
  getComp(data).layers.push(createLayer('text', {text: 'An imported title'}));
  const result = parseProject(JSON.stringify(data));
  assert.equal(result.project.format, 'fluxiffects');
  assert.equal(getComp(result.project).fps, 23.976);
  assert.equal(getComp(result.project).layers[0].text, 'An imported title');
  assert.deepEqual(result.warnings, ['Expressions were baked.']);
});

test('invalid duration, fps, dimensions, opacity and layer ranges are rejected', () => {
  for (const [property, value] of [['duration', 0], ['duration', -1], ['fps', 0], ['fps', '30'], ['fps', 1000], ['width', 0], ['height', 100000]]) {
    const data = createBlankProject(); getComp(data)[property] = value;
    assert.throws(() => parseProject(JSON.stringify(data)), /Invalid project/);
  }
  for (const overrides of [{opacity: 2}, {start: 6, end: 4}]) {
    const data = createBlankProject(); getComp(data).layers.push(createLayer('rectangle', overrides));
    assert.throws(() => parseProject(JSON.stringify(data)), /Invalid project/);
  }
});

test('untrusted project types, unsafe assets and duplicate ids are rejected', () => {
  assert.throws(() => parseProject('not a file'), /not valid JSON/);
  assert.throws(() => parseProject('{"format":"something-else"}'), /Unrecognized/);
  assert.throws(() => parseProject('{"format":"fluxiffects","compositions":[]}'), /at least one composition/);
  const data = createBlankProject();
  data.assets = [{id: 'bad', type: 'image', src: 'javascript:alert(1)'}];
  assert.throws(() => parseProject(JSON.stringify(data)), /unsafe/);
  data.assets = [{id: 'bad', type: 'image', src: 'data:text/html,<script>alert(1)</script>'}];
  assert.throws(() => parseProject(JSON.stringify(data)), /unsafe/);
  data.assets = [];
  getComp(data).layers = [createLayer('text', {id: 'same'}), createLayer('text', {id: 'same'})];
  assert.throws(() => parseProject(JSON.stringify(data)), /duplicate layer ids/);
});

test('oversized arrays reject before expensive normalization', () => {
  const data = createBlankProject(); getComp(data).layers = Array(2001).fill({});
  assert.throws(() => parseProject(JSON.stringify(data)), /at most 2000/);
});

test('cyclic parenting rejects; missing parent links are removed with a warning', () => {
  const data = createBlankProject();
  getComp(data).layers = [createLayer('null', {id: 'a', parentId: 'b'}), createLayer('null', {id: 'b', parentId: 'a'})];
  assert.throws(() => parseProject(JSON.stringify(data)), /parent cycle/);
  getComp(data).layers = [createLayer('null', {id: 'a', parentId: 'missing'})];
  const result = parseProject(JSON.stringify(data));
  assert.equal(getComp(result.project).layers[0].parentId, null);
  assert.match(result.warnings[0], /missing parent/);
});

test('unknown imported fields cannot enter the executable editor model', () => {
  const data = createBlankProject();
  getComp(data).layers = [createLayer('text', {expression: 'alert(1)', html: '<script>bad</script>', effects: [{type: 'unknown plugin', amount: 1}]})];
  const result = parseProject(JSON.stringify(data));
  const layer = getComp(result.project).layers[0];
  assert.equal(layer.expression, undefined);
  assert.equal(layer.html, undefined);
  assert.equal(layer.effects.length, 0);
  assert.match(result.warnings[0], /unsupported effect/);
});

test('imported keyframes are sorted, deduplicated and validated', () => {
  const data = createBlankProject();
  getComp(data).layers = [createLayer('rectangle', {keyframes: {x: [{time: 2, value: 200}, {time: 0, value: 0}, {time: 2, value: 250}]}})];
  const layer = getComp(parseProject(JSON.stringify(data)).project).layers[0];
  assert.deepEqual(layer.keyframes.x.map(key => [key.time, key.value]), [[0, 0], [2, 250]]);
  assert.equal(evaluateLayer(layer, 1).x, 125);
  getComp(data).layers[0].keyframes.x = [{time: 1, value: 'not a number'}];
  assert.throws(() => parseProject(JSON.stringify(data)), /keyframe value/);
  getComp(data).layers[0].keyframes = {opacity: [{time: 1, value: 2}]};
  assert.throws(() => parseProject(JSON.stringify(data)), /opacity keyframe value/);
});

test('media trimming and audio settings survive save and reopen', () => {
  const data = createBlankProject();
  getComp(data).layers = [createLayer('video', {sourceIn: 2.5, playbackRate: 1.5, volume: 0.6, muted: true})];
  assert.deepEqual(parseProject(JSON.stringify(data)).project, data);
});

test('AE sample preserves nested metadata and warnings across native roundtrip', () => {
  const text = readFileSync(new URL('../public/examples/after-effects-sample.json', import.meta.url), 'utf8');
  const imported = parseProject(text);
  assert.equal(getComp(imported.project).layers.length, 3);
  assert.equal(imported.project.aeMetadata.application, 'Fluxiffects schema fixture');
  assert.equal(getComp(imported.project).aeMetadata.pixelAspect, 1);
  assert.equal(getComp(imported.project).layers[0].aeMetadata.index, 1);
  assert.deepEqual(parseProject(JSON.stringify(imported.project)).project, imported.project);
  assert.ok(imported.warnings.length > 0);
});

test('AE negative keyframes interpolate across composition start; missing media stays relinkable', () => {
  const data = createBlankProject(); data.format = 'fluxiffects-ae';
  let layer = setKeyframe(createLayer('video', {assetId: 'footage', start: -1, anchorX: -30}), 'x', -1, 0, 'linear');
  layer = setKeyframe(layer, 'x', 1, 200, 'linear');
  getComp(data).layers = [layer];
  data.assets = [{id: 'footage', name: 'clip.mp4', type: 'video', path: 'C:/media/clip.mp4', aeMetadata: {originalPath: 'C:/media/clip.mp4'}}];
  const result = parseProject(JSON.stringify(data));
  assert.equal(evaluateLayer(getComp(result.project).layers[0], 0).x, 100);
  assert.equal(result.project.assets[0].missing, true);
  assert.equal(result.project.assets[0].src, '');
  assert.equal(result.project.assets[0].aeMetadata.originalPath, 'C:/media/clip.mp4');
});

test('metadata cannot introduce prototype keys or excessive nesting', () => {
  const data = createBlankProject();
  data.aeMetadata = JSON.parse('{"__proto__":{"polluted":true},"expression":"time * 20"}');
  const result = parseProject(JSON.stringify(data));
  assert.equal(Object.hasOwn(result.project.aeMetadata, '__proto__'), false);
  assert.equal(result.project.aeMetadata.expression, 'time * 20');
  let nested = {};
  for (let i = 0; i < 22; i++) nested = {child: nested};
  data.aeMetadata = nested;
  assert.throws(() => parseProject(JSON.stringify(data)), /nesting depth/);
});

test('SVG image sources and common audio MIME variants survive save and reopen', () => {
  const data = createBlankProject();
  data.assets = [
    {id: 'svg', name: 'art.svg', type: 'image', src: 'data:image/svg+xml;base64,PHN2Zy8+'},
    {id: 'wav', name: 'audio.wav', type: 'audio', src: 'data:audio/x-wav;base64,UklGRg=='},
    {id: 'm4a', name: 'audio.m4a', type: 'audio', src: 'data:audio/x-m4a;base64,AAAA'},
  ];
  assert.deepEqual(parseProject(JSON.stringify(data)).project, data);
});
