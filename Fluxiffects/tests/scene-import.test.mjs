import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {isNativeScene, prepareSceneAsset} from '../src/scene-import.mjs';
import {createDemoProject as createScene} from '../../Flux3D/src/model.mjs';
import {createBlankProject, createLayer, getComp, parseProject} from '../src/core.mjs';

// Fluxiffects uses Flux3D's loader and installed Three dependency.
const sceneRequire = createRequire(new URL('../../Flux3D/package.json', import.meta.url));
const THREE = sceneRequire('three');
const {GLTFExporter} = await import(pathToFileURL(sceneRequire.resolve('three/addons/exporters/GLTFExporter.js')).href);

globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {blob.arrayBuffer().then(result => {this.result = result; this.onloadend?.();}).catch(error => this.onerror?.(error));}
  readAsDataURL(blob) {blob.arrayBuffer().then(result => {this.result = 'data:application/octet-stream;base64,' + Buffer.from(result).toString('base64'); this.onloadend?.();}).catch(error => this.onerror?.(error));}
};

async function animatedScene(binary = true) {
  const scene = new THREE.Scene(), pivot = new THREE.Group(); pivot.name = 'Pivot'; scene.add(pivot);
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshStandardMaterial({color: '#aa88cc'});
  const cube = new THREE.Mesh(geometry, material); cube.name = 'Cube'; cube.position.y = 2; pivot.add(cube);
  const clip = new THREE.AnimationClip('A little orbit', 2, [new THREE.VectorKeyframeTrack('Pivot.position', [0, 2], [1, 0, 0, 5, 0, 0]), new THREE.VectorKeyframeTrack('Cube.scale', [0, 1, 2], [1, 1, 1, 2, 1, 1, 2, 1, 1], THREE.InterpolateDiscrete)]);
  try {return await new GLTFExporter().parseAsync(scene, {binary, animations: [clip]});} finally {geometry.dispose(); material.dispose();}
}
const sourceBytes = asset => Buffer.from(asset.src.slice(asset.src.indexOf(',') + 1), 'base64');

test('scene import retains original animated GLB bytes, hierarchy and clip metadata in a native FFX roundtrip', async () => {
  const bytes = await animatedScene(), {asset, warnings} = await prepareSceneAsset(new File([bytes], 'animated-hierarchy.glb'));
  assert.equal(asset.type, 'model3d'); assert.equal(asset.modelFormat, 'glb'); assert.equal(asset.duration, 2);
  assert.deepEqual(asset.clips, [{name: 'A little orbit', duration: 2}]); assert.deepEqual(warnings, []);
  assert.deepEqual(sourceBytes(asset), Buffer.from(bytes));
  const project = createBlankProject(); project.assets.push(asset); getComp(project).layers.push(createLayer('scene3d', {assetId: asset.id}));
  assert.deepEqual(sourceBytes(parseProject(JSON.stringify(project)).project.assets[0]), Buffer.from(bytes));
});

test('native scene detection and import accept BOM JSON and keep its exact source bytes', async () => {
  const project = createScene();
  for (const input of [project, {format: 'fluxcreate-project', version: 1, app: 'flux3d', project, motion: null}]) {
    const text = '\uFEFF' + JSON.stringify(input, null, 2); assert.equal(isNativeScene(text), true);
    const {asset} = await prepareSceneAsset(new File([text], 'saved-scene.json'));
    assert.equal(asset.modelFormat, 'flux3d'); assert.deepEqual(asset.clips, []); assert.equal(asset.duration, 0);
    assert.deepEqual(sourceBytes(asset), Buffer.from(text));
  }
  for (const text of ['null', '{}', '{', JSON.stringify({format: 'fluxcreate-project', app: 'fluxoto'})]) assert.equal(isNativeScene(text), false);
});

test('self-contained glTF import preserves original formatting and source animation metadata', async () => {
  const document = await animatedScene(false), text = JSON.stringify(document, null, 2);
  const {asset} = await prepareSceneAsset(new File([text], 'scene.gltf'));
  assert.equal(asset.modelFormat, 'gltf'); assert.equal(asset.clips[0].duration, 2); assert.deepEqual(sourceBytes(asset), Buffer.from(text));
});

test('scene import rejects malformed, externally linked, invalid native, and oversized sources before producing assets', async () => {
  const glb = await animatedScene(); await assert.rejects(() => prepareSceneAsset(new File([glb.slice(0, 24)], 'broken.glb')), /length|truncated/i);
  const gltf = await animatedScene(false); gltf.buffers[0].uri = 'https://example.test/mesh.bin';
  await assert.rejects(() => prepareSceneAsset(new File([JSON.stringify(gltf)], 'external.gltf')), /self-contained|external/);
  const native = createScene(); native.camera.fov = 0;
  await assert.rejects(() => prepareSceneAsset(new File([JSON.stringify(native)], 'invalid.flux3d')), /invalid number/i);
  let read = false;
  await assert.rejects(() => prepareSceneAsset({size: 64 * 1024 * 1024 + 1, arrayBuffer() {read = true;}}), /64 MB/);
  assert.equal(read, false);
});
