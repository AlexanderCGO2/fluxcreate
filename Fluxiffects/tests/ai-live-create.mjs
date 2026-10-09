// Manual, explicitly authorized synthetic create-mode check; excluded from npm test.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createAIService} from '../server/ai-service.mjs';
import {createBlankProject, createLayer, getComp} from '../src/core.mjs';
import {applyProposal, projectForAI} from '../src/ai-commands.mjs';
if (!process.argv.includes('--run-live')) throw new Error('Explicit --run-live authorization is required.');
const service = createAIService(), status = await service.status();
const report = {provider: status.provider, model: status.model, available: status.available, synthetic: true, scenario: 'create', timestamp: new Date().toISOString()};
try {
  if (!status.available) throw new Error(status.reason);
  const project = createBlankProject({name: 'Public original preservation fixture', width: 640, height: 360, duration: 3});
  getComp(project).layers = [createLayer('text', {id: 'original-title', name: 'Original public title', text: 'Keep this original', x: 40, y: 100, end: 3})];
  const originalComp = structuredClone(getComp(project));
  const response = await service.plan({project: projectForAI(project), selection: [], scope: 'composition', mode: 'create', time: 0, brief: '', intent: 'Create a new minimal 640 by 360 composition lasting exactly 3 seconds at 30 fps. Use exactly two editable layers: a text title Tomorrow on the left and a blue ellipse on the right. Give the title editable opacity keyframes fading from 0 at time 0 to 1 at time 1. Keep the existing composition completely unchanged. Use at most 6 commands.'});
  const applied = applyProposal(project, response.proposal, {scope: 'composition', selection: []}).project;
  assert.equal(applied.compositions.length, 2);
  assert.deepEqual(applied.compositions.find(comp => comp.id === originalComp.id), originalComp);
  const created = getComp(applied); assert.notEqual(created.id, originalComp.id);
  assert.equal(created.width, 640); assert.equal(created.height, 360); assert.equal(created.duration, 3);
  assert.ok(created.layers.some(layer => layer.type === 'text' && layer.text.includes('Tomorrow')));
  assert.ok(created.layers.some(layer => ['rectangle', 'ellipse', 'solid'].includes(layer.type)));
  const title = created.layers.find(layer => layer.type === 'text');
  assert.equal(title.keyframes.opacity?.length, 2); assert.equal(title.keyframes.opacity[0].value, 0); assert.equal(title.keyframes.opacity[1].value, 1);
  assert.deepEqual(getComp(project), originalComp);
  Object.assign(report, {ok: true, commandCount: response.proposal.commands.length, originalPreserved: true, newComposition: true, editableText: true, editableShapes: true, editableOpacityKeys: title.keyframes.opacity.length, layerCount: created.layers.length});
} catch (error) {
  Object.assign(report, {ok: false, status: error.status || error.statusCode || null, reason: error.name === 'AIEditError' ? error.message : error.name === 'AssertionError' ? 'The generated composition failed an editable-creation or preservation assertion.' : 'Live create request failed; raw diagnostics omitted.'}); process.exitCode = 1;
}
await writeFile(new URL('../server/ai-live-create-report.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
