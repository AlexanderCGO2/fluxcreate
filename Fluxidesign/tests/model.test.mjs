import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoProject, createObject, validateProject, toMotion, fromMotion, applyAICommands, getAIContext} from '../src/model.mjs';
import {parseProject} from '../../Fluxiffects/src/core.mjs';

test('editorial demo validates and every page exchanges as an editable composition', () => {
  const project = validateProject(createDemoProject());
  assert.equal(project.pages.length, 3);
  const motion = parseProject(JSON.stringify(toMotion(project))).project;
  assert.equal(motion.compositions.length, 3);
  assert.ok(motion.compositions[0].layers.some(layer => layer.type === 'text'));
  const recovered = fromMotion(motion);
  assert.equal(recovered.project.pages.length, 3);
  assert.equal(recovered.project.pages[0].objects.length, project.pages[0].objects.length);
});
test('model rejects executable media, invalid geometry, duplicate IDs and unsupported versions', () => {
  const original = createDemoProject();
  for (const mutate of [
    p => {p.assets[0].src = 'javascript:alert(1)';},
    p => {p.pages[0].width = NaN;},
    p => {p.pages[0].objects.push({...p.pages[0].objects[0]});},
    p => {p.version = 9;},
  ]) {const p = structuredClone(original); mutate(p); assert.throws(() => validateProject(p));}
});
test('AI commands are atomic and respect selected objects and locked frames', () => {
  const original = createDemoProject(), page = original.pages[0], object = page.objects.find(item => item.type === 'text');
  const result = applyAICommands(original, [{type: 'updateObject', objectId: object.id, properties: {text: 'THE NEW ISSUE', fontSize: 48}}], {selection: [object.id], scope: 'selection'});
  assert.equal(result.pages[0].objects.find(item => item.id === object.id).text, 'THE NEW ISSUE');
  assert.notEqual(original.pages[0].objects.find(item => item.id === object.id).text, 'THE NEW ISSUE');
  assert.throws(() => applyAICommands(original, [{type: 'updateObject', objectId: page.objects[1].id, properties: {fill: '#ff0000'}}], {selection: [object.id], scope: 'selection'}), /selected|locked/);
  object.locked = true;
  assert.throws(() => applyAICommands(original, [{type: 'updateObject', objectId: object.id, properties: {text: 'X'}}]), /locked/);
  const before = JSON.stringify(original);
  assert.throws(() => applyAICommands(original, [{type: 'addPage', name: 'Draft'}, {type: 'runCode', code: 'danger()'}]));
  assert.equal(JSON.stringify(original), before);
});
test('AI cannot assign media sources, unlock objects, alter another page or delete the last page', () => {
  const p = createDemoProject(), target = p.pages[0].objects.find(o => !o.locked);
  for (const properties of [{src: 'https://example.com/x.png'}, {locked: false}, {fontSize: Infinity}, {unknown: true}]) {
    assert.throws(() => applyAICommands(p, [{type: 'updateObject', objectId: target.id, properties}]));
  }
  assert.throws(() => applyAICommands(p, [{type: 'updateObject', objectId: p.pages[1].objects[0].id, properties: {text: 'X'}}]));
});
test('AI context contains only the chosen page and selection, without embedded media', () => {
  const p = createDemoProject(), target = p.pages[0].objects.find(o => o.type === 'text');
  const context = getAIContext(p, {selection: [target.id], scope: 'selection'});
  const encoded = JSON.stringify(context);
  assert.equal(context.page.objects.length, 1);
  assert.equal(context.page.objects[0].id, target.id);
  assert.ok(!encoded.includes('data:image'));
  assert.ok(!encoded.includes(p.pages[1].id));
});
test('missing transport media remains valid and additions get fresh editable IDs', () => {
  const p = createDemoProject(); p.assets.forEach(a => {a.src = '';});
  assert.ok(validateProject(p).assets.every(a => a.missing));
  const result = applyAICommands(p, [{type: 'addObject', object: {type: 'text', text: 'An editable idea', x: 40, y: 90, width: 300, height: 80}}]);
  assert.equal(result.pages[0].objects.at(-1).text, 'An editable idea');
  assert.ok(createObject('text').id);
});
test('AI can create an editable page and is constrained by page and command limits', () => {
  const p = createDemoProject();
  const next = applyAICommands(p, [{type: 'addPage', name: 'Ideas'}, {type: 'addObject', object: {type: 'text', text: 'A quiet beginning', x: 42, y: 80, width: 400, height: 100, fontSize: 42}}]);
  assert.equal(next.pages.length, 4); assert.equal(next.pages.at(-1).objects[0].text, 'A quiet beginning'); assert.equal(next.activePageId, next.pages.at(-1).id);
  assert.throws(() => applyAICommands(p, [{type: 'addPage', name: 'X'}], {selection: [p.pages[0].objects[0].id], scope: 'selection'}));
  assert.throws(() => applyAICommands(p, [{type: 'updatePage', properties: {width: 99999}}]));
  assert.throws(() => applyAICommands(p, [{type: 'addObject', object: {type: 'image', src: 'https://example.com'}}]));
  assert.throws(() => applyAICommands(p, Array.from({length: 41}, () => ({type: 'addPage'}))));
});
test('portable scenes preserve center rotation and import noncentral anchors correctly', () => {
  const p = createDemoProject(), o = createObject('rectangle', {x: 100, y: 150, width: 200, height: 80, rotation: 30}); p.pages[0].objects = [o];
  const motion = toMotion(p), layer = motion.compositions[0].layers[0];
  assert.equal(layer.x, 200); assert.equal(layer.y, 190); assert.equal(layer.anchorX, 100); assert.equal(layer.anchorY, 40);
  const own = fromMotion(motion).project.pages[0].objects[0]; assert.equal(own.x, o.x); assert.equal(own.y, o.y); assert.equal(own.rotation, 30);
  Object.assign(layer, {x: 100, y: 150, anchorX: 0, anchorY: 0, rotation: 90});
  const imported = fromMotion(motion).project.pages[0].objects[0];
  assert.ok(Math.abs(imported.x + imported.width / 2 - 60) < 1e-9); assert.ok(Math.abs(imported.y + imported.height / 2 - 250) < 1e-9);
});
