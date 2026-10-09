import {mkdir, writeFile} from 'node:fs/promises';
import {createDemoProject as createScene, validateProject as validateScene} from '../../Flux3D/src/model.mjs';
import {createBlankProject, createLayer, getComp, parseProject, setKeyframe} from '../src/core.mjs';

// A self-contained source scene, with the starter geometry kept editable in Flux3D.
const original = createScene();
const source = validateScene({...original, id: 'soft-perspective-source', name: 'A softer perspective / source', background: '#f7f6f2', camera: {position: [7, 4.8, 8], target: [0, 1.35, 0], fov: 36}, objects: original.objects.filter(object => object.id !== 'floor').map(object => ({...object, color: {orbit: '#c89f91', pearl: '#e8e4da', column: '#a9a6c0', sun: '#dec3a2', plinth: '#e5e0d7'}[object.id], metalness: .08, roughness: object.id === 'pearl' ? .24 : .44}))});
const project = createBlankProject({name: 'A softer perspective', projectName: 'Motion study / 01', width: 1280, height: 720, duration: 6, fps: 30, background: '#f7f6f2'});
project.id = 'fluxiffects-3d-motion-study'; getComp(project).id = 'soft-perspective-composition'; project.activeCompId = getComp(project).id;
project.brief = 'A quiet editorial study of simple three-dimensional forms. Warm ivory, muted clay and soft lavender. Keep the title legible, preserve generous space, and use slow camera and scene movement. The original editable Flux3D objects are embedded in the scene asset.';
project.assets = [{id: 'soft-perspective-scene', name: 'Soft forms · Flux3D source', type: 'model3d', modelFormat: 'flux3d', src: 'data:application/vnd.flux3d+json;base64,' + Buffer.from(JSON.stringify(source)).toString('base64'), width: 850, height: 680, duration: 0, clips: []}];
const layer = (type, id, properties = {}) => createLayer(type, {id, start: 0, end: 6, ...properties});
const text = (id, value, properties = {}) => layer('text', id, {name: value.replaceAll('\n', ' '), text: value, x: 76, y: 60, width: 520, height: 50, anchorX: 0, anchorY: 0, fontSize: 22, fontWeight: 400, letterSpacing: 0, fill: '#292823', ...properties});
const animate = (entry, tracks) => {
  let index = 0;
  for (const [property, keys] of Object.entries(tracks)) for (const [time, value, easing = 'ease-in-out'] of keys) {entry = setKeyframe(entry, property, time, value, easing); const key = entry.keyframes[property].find(key => key.time === time); key.id = `${entry.id}-${property}-${index++}`;}
  return entry;
};
getComp(project).layers = [
  text('wordmark', 'FluxCreate', {name: 'FluxCreate / wordmark', y: 62, fontSize: 21, fontWeight: 600, letterSpacing: -.6, height: 35}),
  text('studio-label', 'FLUXIFFECTS', {name: 'Studio label', x: 972, y: 67, width: 232, height: 24, fontSize: 10, fontWeight: 600, letterSpacing: 3, textAlign: 'right', fill: '#89857d'}),
  animate(text('eyebrow', 'MOTION STUDY / 01', {name: 'Study number', y: 191, width: 470, height: 26, fontSize: 11, fontWeight: 600, letterSpacing: 2.4, fill: '#958576'}), {opacity: [[0, 0], [.6, 1], [5.6, 1], [6, 0]]}),
  animate(text('headline', 'A softer\nperspective.', {name: 'Title / edit this', y: 239, width: 530, height: 180, fontSize: 74, fontWeight: 600, letterSpacing: -3.8}), {y: [[0, 263], [1.15, 239], [5.6, 239], [6, 229]], opacity: [[0, 0], [.95, 1], [5.6, 1], [6, 0]]}),
  animate(text('description', 'Simple forms. Quiet motion.\nA scene with room to breathe.', {name: 'Description / editable type', y: 438, width: 460, height: 74, fontSize: 20, fontWeight: 400, letterSpacing: -.2, fill: '#858077'}), {opacity: [[0, 0], [.35, 0], [1.4, 1], [5.45, 1], [6, 0]], y: [[0, 450], [1.4, 438]]}),
  text('footer-left', '06 SECONDS / 30 FPS', {name: 'Study details', y: 640, width: 450, height: 25, fontSize: 10, fontWeight: 600, letterSpacing: 1.8, fill: '#928b80'}),
  text('footer-right', 'FORM, LIGHT & A LITTLE MOVEMENT', {name: 'Closing note', x: 742, y: 640, width: 462, height: 25, fontSize: 10, fontWeight: 500, letterSpacing: 1.2, textAlign: 'right', fill: '#928b80'}),
  layer('rectangle', 'footer-rule', {name: 'Quiet divider', x: 76, y: 612, width: 1128, height: 1, anchorX: 0, anchorY: 0, fill: '#ded9d0', cornerRadius: 0}),
  animate(layer('scene3d', 'soft-forms', {name: 'Soft forms / animate in 3D', assetId: 'soft-perspective-scene', x: 932, y: 300, width: 850, height: 680, anchorX: 425, anchorY: 340, scaleX: .88, scaleY: .88, modelRotationY: -8, cameraYaw: -10, cameraZoom: .88}), {modelRotationY: [[0, -8], [3, 18], [6, -8]], cameraYaw: [[0, -10], [3, 8], [6, -10]], cameraPitch: [[0, 0], [3, 3], [6, 0]], cameraZoom: [[0, .88], [3, .94], [6, .88]]}),
  layer('ellipse', 'ground-glow', {name: 'Soft ground reflection', x: 946, y: 532, width: 470, height: 42, fill: '#cbc1b2', opacity: .14, effects: [{id: 'ground-blur', type: 'blur', enabled: true, amount: 25}]}),
];
const {project: validated, warnings} = parseProject(JSON.stringify(project));
if (warnings.length) throw new Error(warnings.join('\n'));
const directory = new URL('../public/examples/', import.meta.url);
await mkdir(directory, {recursive: true});
await writeFile(new URL('3d-motion-study.fluxiffects.json', directory), JSON.stringify(validated, null, 2) + '\n');
console.log(`Created ${validated.name}: ${getComp(validated).layers.length} editable layers, ${getComp(validated).duration}s, embedded ${source.objects.length}-object Flux3D scene.`);
