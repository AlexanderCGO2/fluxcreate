import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject, createLayer, getComp, parseProject, evaluateLayer, setKeyframe} from '../src/core.mjs';
import {applyProposal, fingerprintProject, projectForAI, validateCommands} from '../src/ai-commands.mjs';
import {buildAIContext} from '../server/ai-service.mjs';
import {CommandSchema} from '../server/ai-provider.mjs';
import {fromMotion as toPhoto} from '../../Fluxoto/src/model.mjs';
import {fromMotion as toPublication} from '../../Fluxidesign/src/model.mjs';
import {fromMotion as toTimeline} from '../../Fluximiere/src/model.mjs';
import {encodeExchange, decodeExchange, toFluxini, toFluxiffects} from '@flux-studio/exchange';

function fixture() {
  const p = createBlankProject({name: '3D motion', width: 1280, height: 720});
  p.assets.push({id: 'model-asset', type: 'model3d', name: 'Walking character', modelFormat: 'glb', src: 'data:model/gltf-binary;base64,Z2xURg==', clips: [{name: 'Walk', duration: 2}, {name: 'Idle', duration: 3}], width: 1280, height: 720, duration: 3});
  getComp(p).layers.push(createLayer('scene3d', {id: 'model-layer', name: '3D character', assetId: 'model-asset', width: 1280, height: 720}));
  return p;
}
const proposal = (p, commands, options = {}) => ({summary: 'Editable 3D motion', baseFingerprint: fingerprintProject(p), commands, mode: 'edit', scope: 'composition', selection: [], ...options});
test('3D source bytes and clip metadata survive native project roundtrip', () => {
  const p = fixture(), saved = parseProject(JSON.stringify(p)).project;
  assert.deepEqual(saved, p); assert.equal(getComp(saved).layers[0].modelScale, 1); assert.equal(getComp(saved).layers[0].modelLoop, true);
  for (const [modelFormat, mime] of [['glb', 'model/gltf-binary'], ['gltf', 'model/gltf+json'], ['flux3d', 'application/vnd.flux3d+json']]) {
    const sample = fixture(); Object.assign(sample.assets[0], {modelFormat, src: `data:${mime};base64,e30=`}); assert.equal(parseProject(JSON.stringify(sample)).project.assets[0].src, sample.assets[0].src);
  }
});
test('3D sources reject external URIs, MIME mismatch, invalid base64 and malformed clip metadata', () => {
  for (const patch of [{src: 'https://example.test/asset.glb'}, {src: 'data:image/png;base64,AAAA'}, {modelFormat: 'obj'}, {src: 'data:model/gltf-binary;base64,***='}, {src: 'data:model/gltf-binary;base64,abc'}, {clips: [{name: 'Clip', duration: NaN}]}, {clips: Array.from({length: 201}, () => ({name: 'x', duration: 1}))}]) {
    const p = fixture(); Object.assign(p.assets[0], patch); assert.throws(() => parseProject(JSON.stringify(p)));
  }
});
test('3D keyframe tracks interpolate and scalar/clip bounds are enforced', () => {
  const p = fixture(); let layer = getComp(p).layers[0]; layer = setKeyframe(layer, 'modelRotationY', 0, 0, 'linear'); layer = setKeyframe(layer, 'modelRotationY', 2, 180, 'linear');
  layer = setKeyframe(layer, 'cameraZoom', 0, 1, 'linear'); layer = setKeyframe(layer, 'cameraZoom', 2, 2, 'linear'); assert.equal(evaluateLayer(layer, 1).modelRotationY, 90); assert.equal(evaluateLayer(layer, 1).cameraZoom, 1.5);
  getComp(p).layers[0] = layer; assert.equal(parseProject(JSON.stringify(p)).project.compositions[0].layers[0].keyframes.cameraZoom.length, 2);
  for (const patch of [{modelScale: 0}, {cameraZoom: -1}, {modelClip: 0.5}, {modelClip: 200}, {modelLoop: 'yes'}, {modelX: Infinity}]) {const bad = fixture(); Object.assign(getComp(bad).layers[0], patch); assert.throws(() => parseProject(JSON.stringify(bad)));}
  assert.throws(() => setKeyframe(createLayer('rectangle'), 'modelX', 0, 2));
});
test('3D-specific controls and keyframes cannot be attached to 2D layers', () => {
  const p = fixture(); getComp(p).layers[0].type = 'rectangle'; assert.throws(() => parseProject(JSON.stringify(p)));
  const twoD = createBlankProject(); getComp(twoD).layers.push(createLayer('rectangle', {id: 'flat'}));
  assert.throws(() => applyProposal(twoD, proposal(twoD, [{type: 'updateLayer', layerId: 'flat', properties: {modelX: 2}}])));
  assert.throws(() => applyProposal(twoD, proposal(twoD, [{type: 'setAnimation', layerId: 'flat', property: 'cameraZoom', keys: [{time: 0, value: 1, easing: 'linear'}]}])));
});
test('AI can animate and choose a clip on an existing 3D layer with atomic lock/scope enforcement', () => {
  const p = fixture(), commands = [{type: 'updateLayer', layerId: 'model-layer', properties: {modelClip: 1, modelLoop: false, cameraYaw: 25}}, {type: 'setAnimation', layerId: 'model-layer', property: 'modelRotationY', keys: [{time: 0, value: 0, easing: 'linear'}, {time: 3, value: 360, easing: 'ease-in-out'}]}];
  commands.forEach(command => CommandSchema.parse(command)); validateCommands(commands); const result = applyProposal(p, proposal(p, commands)); assert.equal(getComp(result.project).layers[0].modelClip, 1); assert.equal(getComp(p).layers[0].modelClip, 0);
  getComp(p).layers[0].locked = true; assert.throws(() => applyProposal(p, proposal(p, commands)), /locked/);
  getComp(p).layers[0].locked = false; assert.throws(() => applyProposal(p, proposal(p, commands, {scope: 'selection', selection: []})), /Select/);
  assert.throws(() => applyProposal(p, proposal(p, [{type: 'updateLayer', layerId: 'model-layer', properties: {modelClip: 5}}])), /clip/i);
});
test('3D source bytes stay out of AI context, while clip controls and stale source identity remain available', () => {
  const p = fixture(), safe = projectForAI(p); assert.equal(safe.assets[0].src, ''); assert.equal(fingerprintProject(safe), fingerprintProject(p));
  const {context} = buildAIContext({project: safe, intent: 'Animate a turntable', mode: 'edit', scope: 'composition', time: 0});
  assert.equal(context.assets[0].modelFormat, 'glb'); assert.equal(context.assets[0].clips[0].name, 'Walk'); assert.equal(context.composition.layers[0].modelScale, 1); assert.ok(!JSON.stringify(context).includes('Z2xURg=='));
  p.assets[0].src = 'data:model/gltf-binary;base64,Z2xURgAA'; assert.notEqual(fingerprintProject(p), fingerprintProject(safe));
});
test('2D studio imports skip live 3D honestly while native exchange retains geometry and motion', () => {
  const p = fixture(); getComp(p).layers.push(createLayer('text', {id: 'kept-title', text: 'Editable title'}));
  const photo = toPhoto(p), publication = toPublication(p), video = toTimeline(p);
  assert.equal(photo.project.layers.length, 1); assert.equal(publication.project.pages[0].objects.length, 1); assert.equal(video.project.clips.length, 1);
  for (const result of [photo, publication, video]) {assert.ok(result.warnings.some(w => /live 3D/.test(w))); assert.ok(!JSON.stringify(result.project).includes('Z2xURg=='));}
  const envelope = decodeExchange(encodeExchange({app: 'fluxiffects', project: p})); const native = toFluxiffects(envelope).project; assert.equal(native.assets[0].src, p.assets[0].src); assert.equal(native.compositions[0].layers[0].type, 'scene3d');
  assert.ok(toFluxini(envelope).warnings.some(w => /scene3d/.test(w)));
});
