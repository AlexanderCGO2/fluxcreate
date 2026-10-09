import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject, createLayer, getComp} from '../src/core.mjs';
import {applyProposal, fingerprintProject, projectForAI, validateCommands} from '../src/ai-commands.mjs';

function fixture() {
  const p = createBlankProject({name: 'AI fixture'});
  getComp(p).layers = [createLayer('text', {id: 'title', name: 'Title', text: 'Before'}), createLayer('rectangle', {id: 'shape', name: 'Shape'})];
  p.aeMetadata = {source: 'AE', expressions: ['time * 20']};
  p.exchange = {format: 'flux-exchange', version: 1, sourceApp: 'fluxiffects', name: p.name, brief: 'Original brief', notes: 'Original notes', canvas: {width: 1920, height: 1080, pixelsPerUnit: 100}, snapshots: {fluxiffects: structuredClone(p)}};
  return p;
}
const proposal = (project, commands, extra = {}) => ({summary: 'Proposed edit', commands, baseFingerprint: fingerprintProject(project), mode: 'edit', scope: 'composition', selection: [], ...extra});

test('AI edits apply atomically and preserve unrelated layers, comps and interchange metadata', () => {
  const p = fixture(), copy = structuredClone(p), extra = getComp(createBlankProject({name: 'Unrelated'})); p.compositions.push(extra); copy.compositions.push(structuredClone(extra));
  const result = applyProposal(p, proposal(p, [{type: 'updateLayer', layerId: 'title', properties: {text: 'After', fontSize: 130}}]));
  assert.equal(getComp(result.project).layers[0].text, 'After'); assert.equal(result.changes.length, 1);
  assert.deepEqual(p, copy); assert.deepEqual(result.project.exchange, copy.exchange); assert.deepEqual(result.project.aeMetadata, copy.aeMetadata);
  assert.deepEqual(result.project.compositions[1], copy.compositions[1]); assert.deepEqual(getComp(result.project).layers[1], copy.compositions[0].layers[1]);
});

test('one invalid command rejects the entire batch without mutation', () => {
  const p = fixture(), before = structuredClone(p);
  assert.throws(() => applyProposal(p, proposal(p, [{type: 'updateLayer', layerId: 'title', properties: {text: 'Partial edit'}}, {type: 'deleteLayer', layerId: 'does-not-exist'}])), /does not exist/);
  assert.deepEqual(p, before);
});

test('locked layers cannot be updated, deleted, duplicated or have tracks replaced', () => {
  const p = fixture(); getComp(p).layers[0].locked = true;
  for (const command of [
    {type: 'updateLayer', layerId: 'title', properties: {text: 'No'}}, {type: 'deleteLayer', layerId: 'title'}, {type: 'duplicateLayer', layerId: 'title', newId: 'copy'},
    {type: 'setAnimation', layerId: 'title', property: 'x', keys: [{time: 0, value: 0, easing: 'linear'}]},
  ]) assert.throws(() => applyProposal(p, proposal(p, [command])), /locked/);
  assert.throws(() => applyProposal(p, proposal(p, [{type: 'updateLayer', layerId: 'title', properties: {locked: false}}])), /unsupported field/);
});

test('selection scope blocks unselected edits and composition-wide additions', () => {
  const p = fixture(), scoped = {scope: 'selection', selection: ['title']};
  for (const command of [
    {type: 'updateLayer', layerId: 'shape', properties: {fill: '#112233'}},
    {type: 'addLayer', layer: {id: 'extra', type: 'text'}},
    {type: 'updateComposition', properties: {background: '#000000'}},
  ]) assert.throws(() => applyProposal(p, proposal(p, [command], scoped)), /scope/);
  const result = applyProposal(p, proposal(p, [{type: 'updateLayer', layerId: 'title', properties: {text: 'Selected only'}}], scoped));
  assert.equal(getComp(result.project).layers[0].text, 'Selected only');
});

test('transform edits and animations cannot indirectly move locked or unselected children', () => {
  const p = fixture(); getComp(p).layers[1].parentId = 'title';
  const scoped = {scope: 'selection', selection: ['title']};
  for (const command of [{type: 'updateLayer', layerId: 'title', properties: {x: 1}}, {type: 'setAnimation', layerId: 'title', property: 'x', keys: [{time: 0, value: 5, easing: 'linear'}]}]) {
    assert.throws(() => applyProposal(p, proposal(p, [command], scoped)), /descendant/);
    getComp(p).layers[1].locked = true;
    assert.throws(() => applyProposal(p, proposal(p, [command])), /descendant/);
  }
});

test('stale project, asset source, selection and scope changes are rejected', () => {
  const p = fixture(), edit = proposal(p, [{type: 'deleteLayer', layerId: 'shape'}]);
  p.name = 'Renamed'; assert.throws(() => applyProposal(p, edit), /project changed/);
  const scoped = proposal(p, [], {scope: 'selection', selection: ['title']});
  assert.throws(() => applyProposal(p, scoped, {selection: ['shape']}), /selection changed/);
  assert.throws(() => applyProposal(p, scoped, {scope: 'composition'}), /scope changed/);
  p.assets = [{id: 'media', name: 'a.png', type: 'image', src: 'data:image/png;base64,AAAA'}];
  const fingerprint = fingerprintProject(p); p.assets[0].src = 'data:image/png;base64,AABA'; assert.notEqual(fingerprintProject(p), fingerprint);
});

test('AI transport excludes all media bytes, paths, AE metadata and exchange snapshots but has same fingerprint', () => {
  const p = fixture(); p.assets = [{id: 'media', type: 'image', name: 'image.png', src: 'data:image/png;base64,secret-image-bytes', path: 'C:/private/hidden.png', aeMetadata: {path: 'secret'}}];
  const transport = projectForAI(p), text = JSON.stringify(transport);
  assert.equal(fingerprintProject(transport), fingerprintProject(p));
  assert.equal(text.includes('secret-image-bytes'), false); assert.equal(text.includes('C:/private'), false); assert.equal(text.includes('aeMetadata'), false); assert.equal(text.includes('snapshots'), false);
  assert.equal(transport.assets[0].src, ''); assert.ok(transport.assets[0].aiSourceFingerprint);
  assert.equal(p.assets[0].src.includes('secret-image-bytes'), true);
});

test('create mode preserves original scenes and deterministically creates editable layers', () => {
  const p = fixture(); const commands = [
    {type: 'createComposition', composition: {id: 'new-scene', name: 'New idea', width: 1080, height: 1080, duration: 6, fps: 30, background: '#ffffff'}},
    {type: 'addLayer', layer: {id: 'headline', type: 'text', text: 'A fresh idea', x: 100, y: 300}},
    {type: 'setAnimation', layerId: 'headline', property: 'opacity', keys: [{time: 0, value: 0, easing: 'ease-out'}, {time: 1, value: 1, easing: 'linear'}]},
  ];
  const edit = proposal(p, commands, {mode: 'create'}), result = applyProposal(p, edit).project;
  assert.equal(result.activeCompId, 'new-scene'); assert.deepEqual(result.compositions[0], p.compositions[0]);
  assert.equal(getComp(result).layers[0].text, 'A fresh idea'); assert.deepEqual(applyProposal(p, edit).project, result);
  assert.throws(() => applyProposal(p, proposal(p, commands)), /Only create mode/);
  assert.throws(() => applyProposal(p, proposal(p, commands.slice(1), {mode: 'create'})), /must start/);
});

test('strict typed commands reject code, prototype payloads, invalid bounds and arbitrary source changes', () => {
  for (const commands of [
    [{type: 'eval', code: 'alert(1)'}], [{type: 'constructor'}], [{type: '__proto__'}], [{type: 'updateLayer', layerId: 'title', properties: {expression: 'time*10'}}],
    [{type: 'updateLayer', layerId: 'title', properties: {opacity: 100}}], [{type: 'updateLayer', layerId: 'title', properties: {x: '100'}}],
    [{type: 'addLayer', layer: {id: 'bad', type: 'image', src: 'https://example.com'}}],
    [JSON.parse('{"type":"updateLayer","layerId":"title","properties":{"__proto__":{"polluted":true}}}')],
  ]) assert.throws(() => validateCommands(commands));
  assert.throws(() => validateCommands(Array(33).fill({type: 'deleteLayer', layerId: 'title'})), /32/);
  assert.equal({}.polluted, undefined);
});

test('animation, key removal and effect replacement remain editable and round trip', () => {
  const p = fixture(); const edit = proposal(p, [
    {type: 'setAnimation', layerId: 'title', property: 'x', keys: [{id: 'later', time: 2, value: 200, easing: 'linear'}, {id: 'early', time: 0, value: 0, easing: 'ease-out'}]},
    {type: 'removeKeyframe', layerId: 'title', property: 'x', keyId: 'later'},
    {type: 'setEffects', layerId: 'title', effects: [{id: 'blur-effect', type: 'blur', enabled: true, amount: 4}]},
  ]);
  const result = applyProposal(p, edit).project, layer = getComp(result).layers[0];
  assert.equal(layer.keyframes.x.length, 1); assert.equal(layer.effects[0].amount, 4);
  const without = applyProposal(result, proposal(result, [{type: 'removeTrack', layerId: 'title', property: 'x'}])).project;
  assert.equal(getComp(without).layers[0].keyframes.x, undefined);
});

test('parent cycles and missing asset references reject without partial state', () => {
  const p = fixture();
  assert.throws(() => applyProposal(p, proposal(p, [{type: 'updateLayer', layerId: 'title', properties: {parentId: 'shape'}}, {type: 'updateLayer', layerId: 'shape', properties: {parentId: 'title'}}])), /invalid project/);
  assert.throws(() => applyProposal(p, proposal(p, [{type: 'addLayer', layer: {id: 'image', type: 'image', assetId: 'missing'}}])), /media/);
  assert.equal(getComp(p).layers.length, 2);
});

test('explanation mode cannot mutate projects', () => {
  const p = fixture(); assert.deepEqual(applyProposal(p, proposal(p, [], {mode: 'explain'})).project, p);
  assert.throws(() => applyProposal(p, proposal(p, [{type: 'deleteLayer', layerId: 'title'}], {mode: 'explain'})), /cannot change/);
});
