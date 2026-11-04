import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeExchange, decodeExchange, validateExchange, inspectExchange, toFluxini, toFluxiffects, MAX_EXCHANGE_BYTES } from '../index.mjs';
import { createBlankProject, createLayer, getComp, parseProject as parseFfx, setKeyframe } from '../../Fluxiffects/src/core.mjs';
import { createProject, makeNode, edge, parseProject as parseFi } from '../../Haidini/src/engine/project.ts';

const uuid = '6a59c5e4-158c-46fa-a29d-1fba3d994ad5';
function ffx() {
  const project = createBlankProject({ name: 'Orbit title' });
  getComp(project).layers.push(setKeyframe(setKeyframe(createLayer('text', { text: 'Hello Flux', name: 'Title', width: 800, height: 120, anchorX: 400, anchorY: 60, x: 1000, y: 400, fontSize: 100, letterSpacing: 0 }), 'x', 0, 960, 'ease-in-out'), 'x', 2, 1160, 'linear'));
  getComp(project).layers.push(createLayer('rectangle', { name: 'Card', width: 600, height: 300, anchorX: 300, anchorY: 150, cornerRadius: 0, x: 960, y: 640, rotation: 20 }));
  return project;
}
function fi() {
  const project = createProject(uuid, 'blank');
  project.graph.nodes.unshift(makeNode('title', 'text', 0, 0, { text: 'Hello Flux', x: 2, y: 1 }), makeNode('ball', 'shape', 0, 200));
  project.graph.edges.push(edge('title', 'output', 'scene'), edge('ball', 'output', 'scene'));
  project.animations = [{ nodeId: 'title', param: 'x', keys: [{ time: 0, value: 0, easing: 'ease in out' }, { time: 2, value: 2, easing: 'linear' }] }];
  return project;
}
function encoded(app, project, extra = {}) { return decodeExchange(encodeExchange({ app, project, ...extra })); }

test('Markdown notes are readable inert copies; canonical notes round-trip exactly', () => {
  const brief = 'Warm <script>alert(1)</script> type', notes = 'Use ```flux-exchange\n{fake:true}\n``` as text';
  const markdown = encodeExchange({ app: 'fluxiffects', project: ffx(), brief, notes });
  assert.equal([...markdown.matchAll(/^```flux-exchange$/gm)].length, 1);
  assert.match(markdown, /&lt;script&gt;/);
  const result = decodeExchange(markdown.replaceAll('\n', '\r\n'));
  assert.equal(result.brief, brief); assert.equal(result.notes, notes);
  assert.equal(inspectExchange(result).layers, 2);
});

test('native project handoffs preserve app data exactly and strip only exchange envelope', () => {
  const project = ffx(); project.aeMetadata = { origin: 'AE' }; project.brief = 'Keep me';
  const first = encoded('fluxiffects', project); project.exchange = first;
  const expected = { ...project }; delete expected.exchange;
  assert.deepEqual(toFluxiffects(encoded('fluxiffects', project)).project, expected);
});

test('editable 2D handoff produces a valid FluxEffects package with compatible animation', () => {
  const result = toFluxini(encoded('fluxiffects', ffx()));
  parseFi(result.package.project);
  const title = result.package.project.graph.nodes.find(node => node.type === 'text');
  assert.equal(title.params.x, .4); assert.equal(title.params.y, 1.4);
  assert.equal(result.package.project.animations[0].keys[0].easing, 'ease in out');
  assert.ok(result.warnings.some(message => message.includes('3D scene')));
});

test('simple procedural handoff produces a valid editable FluxMotion project', () => {
  const result = toFluxiffects(encoded('fluxini', fi()));
  parseFfx(JSON.stringify(result.project));
  const title = getComp(result.project).layers.find(layer => layer.type === 'text');
  assert.equal(title.x, 1160); assert.equal(title.y, 440);
  assert.equal(title.keyframes.x[0].easing, 'ease-in-out');
  assert.ok(result.warnings.some(message => message.includes('flat editable projection')));
});

test('preserved originals require explicit restoration; latest destination edits drive conversion', () => {
  const initial = encoded('fluxiffects', ffx());
  const converted = toFluxini(initial);
  converted.package.project.graph.nodes.find(node => node.type === 'text').params.text = 'Edited in FluxEffects';
  const handoff = encoded('fluxini', converted.package, { previous: initial });
  assert.equal(getComp(toFluxiffects(handoff).project).layers.find(layer => layer.type === 'text').text, 'Edited in FluxEffects');
  const restored = toFluxiffects(handoff, { restoreOriginal: true });
  assert.equal(getComp(restored.project).layers[0].text, 'Hello Flux');
  assert.ok(restored.warnings.some(message => message.includes('not included')));
});

test('repeated round-trips retain one snapshot per app without recursive metadata', () => {
  let current = encoded('fluxiffects', ffx());
  for (let i = 0; i < 8; i++) {
    const native = toFluxini(current).package; native.project.exchange = current;
    current = encoded('fluxini', native, { previous: current });
    const project = toFluxiffects(current).project; project.exchange = current;
    current = encoded('fluxiffects', project, { previous: current });
  }
  assert.equal(Object.keys(current.snapshots).length, 2);
  assert.equal(current.snapshots.fluxiffects.exchange, undefined);
  assert.equal(current.snapshots.fluxini.project.exchange, undefined);
  assert.ok(JSON.stringify(current).length < 30000);
});

test('fonts remain part of a native FluxEffects snapshot', () => {
  const fonts = [{ id: 'custom_font', name: 'Custom', data: { glyphs: {} } }];
  assert.deepEqual(toFluxini(encoded('fluxini', fi(), { fonts })).package.fonts, fonts);
});

test('unsupported simulations remain preserved without fake rendered layers', () => {
  const source = createProject(uuid, 'water'), result = toFluxiffects(encoded('fluxini', source));
  assert.equal(getComp(result.project).layers.length, 0);
  assert.ok(result.warnings.some(message => message.includes('PNG/WebM')));
  assert.deepEqual(result.exchange.snapshots.fluxini.project, source);
});

test('a simulation emitter source is not imported as standalone text', () => {
  const source = createProject(uuid, 'blank');
  source.graph.nodes.unshift(makeNode('title', 'text'), makeNode('sim', 'particleSim'));
  source.graph.edges = [edge('title', 'sim', 'source'), edge('sim', 'output', 'scene')];
  parseFi(source);
  assert.equal(getComp(toFluxiffects(encoded('fluxini', source)).project).layers.length, 0);
});

test('media and fidelity limitations are reported, and session blob URLs become missing links', () => {
  const project = ffx(), comp = getComp(project);
  project.assets.push({ id: 'footage', name: 'clip', type: 'video', src: 'blob:http://localhost/fake' });
  comp.layers.push(createLayer('video', { name: 'Movie', assetId: 'footage' }));
  comp.layers[0].gradient = { from: '#ffffff', to: '#000000', angle: 0 };
  const envelope = encoded('fluxiffects', project), result = toFluxini(envelope);
  assert.equal(envelope.snapshots.fluxiffects.assets[0].src, '');
  assert.equal(envelope.snapshots.fluxiffects.assets[0].missing, true);
  assert.ok(result.warnings.some(message => message.includes('video layers')));
  assert.ok(result.warnings.some(message => message.includes('gradients')));
});

test('timeline, text and range approximations produce visible warnings', () => {
  const project = ffx(), comp = getComp(project); comp.fps = 120; comp.duration = .5;
  Object.assign(comp.layers[0], { text: 'A'.repeat(70) + '\nSecond line', x: 100000, letterSpacing: -4 });
  const result = toFluxini(encoded('fluxiffects', project));
  parseFi(result.package.project);
  assert.equal(result.package.project.timeline.fps, 60);
  assert.equal(result.package.project.timeline.duration, 1);
  assert.ok(result.warnings.some(message => message.includes('48 characters')));
  assert.ok(result.warnings.some(message => message.includes('limited')));
});

test('animation and graph capacity overflow is rejected instead of silently truncated', () => {
  const project = ffx(); getComp(project).layers[0].keyframes.x = Array.from({ length: 25 }, (_, i) => ({ time: i / 10, value: 960, easing: 'linear' }));
  assert.throws(() => toFluxini(encoded('fluxiffects', project)), /more than 24 keys/);
  getComp(project).layers = Array.from({ length: 64 }, () => createLayer('rectangle', { cornerRadius: 0 }));
  assert.throws(() => toFluxini(encoded('fluxiffects', project)), /exceed 64 nodes/);
});

test('fence ambiguity, malformed JSON, unsupported versions and prototype keys fail closed', () => {
  const markdown = encodeExchange({ app: 'fluxiffects', project: ffx() });
  assert.throws(() => decodeExchange(markdown + '\n```flux-exchange\n{}\n```'), /exactly one/);
  assert.throws(() => decodeExchange(markdown.replace(/```\n$/, '')), /closing fence/);
  assert.throws(() => decodeExchange('```flux-exchange\ninvalid\n```'), /not valid JSON/);
  assert.throws(() => decodeExchange('```json\n{}\n```'), /exactly one/);
  assert.throws(() => validateExchange({ ...decodeExchange(markdown), version: 99 }), /unknown format/);
  assert.throws(() => decodeExchange('```flux-exchange\n{"__proto__": {"polluted":true}}\n```'), /unsafe property/);
  assert.equal({}.polluted, undefined);
});

test('nonfinite, deeply nested and oversized payloads are rejected', () => {
  const envelope = encoded('fluxiffects', ffx()); envelope.canvas.width = Infinity;
  assert.throws(() => validateExchange(envelope), /finite/);
  let nested = {}; for (let i = 0; i < 40; i++) nested = { child: nested };
  const project = ffx(); project.aeMetadata = nested;
  assert.throws(() => encodeExchange({ app: 'fluxiffects', project }), /deeply nested/);
  assert.throws(() => decodeExchange('x'.repeat(MAX_EXCHANGE_BYTES + 1)), /16 MB/);
});

test('creative brief limits match the native editor while longer handoff notes remain valid', () => {
  const project = ffx();
  assert.throws(() => encodeExchange({ app: 'fluxiffects', project, brief: 'x'.repeat(6001) }), /creative brief.*6000/);
  const envelope = encoded('fluxiffects', project, { brief: 'x'.repeat(6000), notes: 'n'.repeat(12000) });
  assert.equal(envelope.brief.length, 6000); assert.equal(envelope.notes.length, 12000);
  envelope.brief += 'x';
  assert.throws(() => decodeExchange('```flux-exchange\n' + JSON.stringify(envelope) + '\n```'), /creative brief.*6000/);
  assert.throws(() => validateExchange(envelope), /creative brief.*6000/);
});

test('cycle traversal is rejected and graph source is preserved without mutation', () => {
  const source = fi(); source.graph.nodes.unshift(makeNode('wrap', 'transform'));
  source.graph.edges = [edge('wrap', 'wrap', 'scene'), edge('wrap', 'output', 'scene')];
  assert.throws(() => toFluxiffects(encoded('fluxini', source)), /cycle/);
});

test('malformed exponentially shared graph branches hit a bounded work limit', () => {
  const source = createProject(uuid, 'blank');
  source.graph.nodes.unshift(makeNode('water', 'water'));
  let previous = 'water';
  for (let i = 0; i < 14; i++) {
    const nodeId = `wrap${i}`; source.graph.nodes.push(makeNode(nodeId, 'transform'));
    source.graph.edges.push({ id: `branch${i}a`, source: previous, target: nodeId, input: 'scene' }, { id: `branch${i}b`, source: previous, target: nodeId, input: 'scene' });
    previous = nodeId;
  }
  source.graph.edges.push(edge(previous, 'output', 'scene'));
  assert.throws(() => toFluxiffects(encoded('fluxini', source)), /too many connected branches/);
});

test('custom easing stays exact in native snapshots and warns when converted to FluxEffects',()=>{
 const source=ffx(),controls=[.2,.1,.8,.9];getComp(source).layers[0]=setKeyframe(getComp(source).layers[0],'x',0,960,'cubic-bezier',controls);
 const envelope=encoded('fluxiffects',source),converted=toFluxini(envelope);parseFi(converted.package.project);
 assert.equal(converted.package.project.animations[0].keys[0].easing,'linear');
 assert.ok(converted.warnings.some(message=>/cubic-bezier.*linear.*source snapshot/i.test(message)));
 const returning=encoded('fluxini',converted.package,{previous:envelope}),restored=toFluxiffects(returning,{restoreOriginal:true});
 assert.deepEqual(getComp(restored.project).layers[0].keyframes.x[0].bezier,controls);
 assert.deepEqual(parseFfx(JSON.stringify(restored.project)).project.compositions[0].layers[0].keyframes.x[0].bezier,controls);
});
