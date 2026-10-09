import test from 'node:test';
import assert from 'node:assert/strict';
import {createBlankProject, createLayer, getComp} from '../src/core.mjs';
import {applyProposal, projectForAI} from '../src/ai-commands.mjs';
import {createAIService, buildAIContext} from '../server/ai-service.mjs';
import {AnswerSchema, ProviderAnswerSchema, decodeProviderAnswer} from '../server/ai-provider.mjs';
import * as provider from '../server/ai-provider.mjs';
import {zodSchema} from 'ai';

function fixture() {
  const p = createBlankProject({name: 'Public synthetic test'});
  getComp(p).layers = [createLayer('text', {id: 'title', text: 'Hello', name: 'Editable title'}), createLayer('image', {id: 'image', name: 'Image', assetId: 'photo'})];
  p.assets = [{id: 'photo', name: 'private-photo.png', type: 'image', src: 'data:image/png;base64,LOCAL-MEDIA-SECRET', path: 'C:/private-photo.png'}];
  const other = getComp(createBlankProject({name: 'OTHER-SCENE-SECRET'})); other.layers = [createLayer('text', {text: 'OTHER-LAYER-SECRET'})]; p.compositions.push(other);
  p.aeMetadata = {private: 'AE-SECRET'}; p.exchange = {notes: 'HANDOFF-SECRET', snapshots: {raw: 'SNAPSHOT-SECRET'}};
  return p;
}
const request = (project, extra = {}) => ({project: projectForAI(project), intent: 'Change the title to Tomorrow.', mode: 'edit', scope: 'selection', selection: ['title'], time: 1, brief: 'A calm motion study.', ...extra});
const answer = {summary: 'Update the selected title.', commands: [{type: 'updateLayer', layerId: 'title', properties: {text: 'Tomorrow.'}}]};

test('provider sees only explicit chosen scene, request and brief; no unrelated or raw data', async () => {
  const p = fixture(); let received;
  const service = createAIService({planner: async payload => {received = payload; return answer;}});
  const result = await service.plan(request(p));
  assert.equal(received.intent, 'Change the title to Tomorrow.'); assert.equal(received.context.untrustedCreativeBrief, 'A calm motion study.');
  assert.equal(received.context.composition.layers.length, 1); assert.equal(received.context.composition.layers[0].id, 'title');
  assert.deepEqual(received.context.assets, []);
  const encoded = JSON.stringify(received);
  for (const secret of ['LOCAL-MEDIA-SECRET', 'private-photo.png', 'OTHER-SCENE-SECRET', 'OTHER-LAYER-SECRET', 'AE-SECRET', 'HANDOFF-SECRET', 'SNAPSHOT-SECRET']) assert.equal(encoded.includes(secret), false);
  assert.equal(result.proposal.mode, 'edit'); assert.equal(getComp(result.previewProject).layers[0].text, 'Tomorrow.');
  const originalWithoutInvalidExchange = {...p}; delete originalWithoutInvalidExchange.exchange;
  const applied = applyProposal(originalWithoutInvalidExchange, result.proposal).project;
  assert.equal(applied.assets[0].src, p.assets[0].src); assert.equal(getComp(p).layers[0].text, 'Hello');
});

test('canonical context strips hidden arbitrary fields nested inside animation/effects', () => {
  const p = fixture(); const layer = getComp(p).layers[0];
  layer.keyframes = {x: [{id: 'key', time: 0, value: 10, easing: 'linear', rawFile: 'HIDDEN-SECRET'}]};
  layer.effects = [{id: 'fx', type: 'blur', enabled: true, amount: 2, sourcePath: 'HIDDEN-SECRET'}];
  const result = buildAIContext(request(p)); assert.equal(JSON.stringify(result.context).includes('HIDDEN-SECRET'), false);
});

test('status is read-only and never invokes the injected model', async () => {
  let calls = 0; const service = createAIService({planner: async () => {calls++; return answer;}});
  const status = await service.status(); assert.equal(status.available, true); assert.equal(status.testOnly, true); assert.equal(calls, 0);
});

test('malformed and excessive requests fail before any provider call', async () => {
  let calls = 0; const service = createAIService({planner: async () => {calls++; return answer;}}), p = fixture();
  for (const extra of [{intent: 'x'.repeat(2001)}, {selection: []}, {time: -1}, {scope: 'all'}, {history: ['Not allowed']}, {notes: 'Not allowed'}, {brief: 'x'.repeat(6001)}]) await assert.rejects(() => service.plan(request(p, extra)));
  for (let i = 0; i < 5; i++) getComp(p).layers.push(createLayer('text', {text: 'A'.repeat(20000)}));
  await assert.rejects(() => service.plan(request(p, {scope: 'composition'})), /context budget/); assert.equal(calls, 0);
});

test('single-flight requests reject concurrent planning and support cancellation', async () => {
  let entered;
  const started = new Promise(resolve => {entered = resolve;});
  const service = createAIService({planner: async ({signal}) => {entered(); return await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('private gateway diagnostics')), {once: true}));}});
  const controller = new AbortController(), pending = service.plan(request(fixture()), {signal: controller.signal});
  await started; assert.equal((await service.status()).busy, true);
  await assert.rejects(() => service.plan(request(fixture())), error => error.status === 409);
  controller.abort(); await assert.rejects(() => pending, error => error.status === 499 && !error.message.includes('private gateway'));
  assert.equal((await service.status()).busy, false);
});

test('gateway failures are sanitized and cannot expose credentials or provider diagnostics', async () => {
  const service = createAIService({planner: async () => {throw new Error('Authorization: Bearer SECRET and C:/private/.env');}});
  await assert.rejects(() => service.plan(request(fixture())), error => error.status === 502 && !/SECRET|private/.test(error.message));
  assert.equal((await service.status()).busy, false);
});

test('gateway payment rejection gives an actionable account message without provider diagnostics', async () => {
  const service = createAIService({planner: async () => {throw Object.assign(new Error('SECRET account diagnostic'), {statusCode: 402});}});
  await assert.rejects(() => service.plan(request(fixture())), error => error.status === 502 && error.message.includes('HTTP 402') && /credits|billing/i.test(error.message) && !error.message.includes('SECRET'));
  assert.equal((await service.status()).busy, false);
});

test('malicious model commands fail independent engine validation', async () => {
  const p = fixture(); const service = createAIService({planner: async () => ({summary: 'Bad edit', commands: [{type: 'updateLayer', layerId: 'title', properties: {locked: false, src: 'https://example.com'}}]})});
  await assert.rejects(() => service.plan(request(p)), /unsupported/); assert.equal(getComp(p).layers[0].text, 'Hello');
});

test('explain returns useful text and zero project changes', async () => {
  const service = createAIService({planner: async () => ({summary: 'The title is static.', commands: [], explanation: 'Add two opacity keyframes for a fade.'})});
  const result = await service.plan(request(fixture(), {mode: 'explain'}));
  assert.deepEqual(result.changes, []); assert.equal(result.explanation, 'Add two opacity keyframes for a fade.');
});

test('create mode produces a fresh editable composition while old scenes remain unchanged', async () => {
  const p = fixture(), service = createAIService({planner: async () => ({summary: 'Create a title composition.', commands: [
    {type: 'createComposition', composition: {id: 'fresh-comp', name: 'New scene', width: 1080, height: 1080, duration: 5, fps: 30, background: '#ffffff'}},
    {type: 'addLayer', layer: {id: 'fresh-title', type: 'text', name: 'Title', text: 'Hello tomorrow', x: 80, y: 250}},
  ]})});
  const result = await service.plan(request(p, {mode: 'create', scope: 'composition'}));
  assert.equal(result.previewProject.compositions.length, 3); assert.equal(result.previewProject.activeCompId, 'fresh-comp');
  assert.equal(getComp(result.previewProject).layers[0].type, 'text'); assert.deepEqual(result.previewProject.compositions[0], projectForAI(p).compositions[0]);
});

test('Zod 4 provider schema accepts complete commands and rejects undeclared model fields', () => {
  assert.deepEqual(AnswerSchema.parse(answer), answer);
  assert.throws(() => AnswerSchema.parse({...answer, secret: 'no'}));
  assert.throws(() => AnswerSchema.parse({summary: 'no', commands: [{type: 'updateLayer', layerId: 'title', properties: {onclick: 'bad'}}]}));
  const json = zodSchema(AnswerSchema).jsonSchema;
  assert.equal(json.type, 'object'); assert.ok(JSON.stringify(json).includes('createComposition'));
});

test('unsupported create requests return an explanation without changing existing scenes', async () => {
  const service = createAIService({planner: async () => ({summary: 'This editor cannot generate footage.', commands: [], explanation: 'Import an existing video instead.'})});
  const body = request(fixture(), {mode: 'create', scope: 'composition'}), result = await service.plan(body);
  assert.deepEqual(result.previewProject, body.project); assert.deepEqual(result.changes, []); assert.equal(result.proposal.commands.length, 0);
});

test('Claude wire schema stays within grammar limits while decoded commands keep strict validation', () => {
  const schema = zodSchema(ProviderAnswerSchema).jsonSchema;
  assert.deepEqual(schema.required, ['summary', 'commandsJson', 'explanation']);
  const forbidden = ['minimum', 'maximum', 'maxLength', 'minLength', 'maxItems', 'anyOf'];
  for (const keyword of forbidden) assert.equal(JSON.stringify(schema).includes(`"${keyword}"`), false);
  const decoded = decodeProviderAnswer({summary: answer.summary, commandsJson: JSON.stringify(answer.commands), explanation: ''});
  assert.deepEqual(decoded.commands, answer.commands);
  assert.throws(() => decodeProviderAnswer({summary: 'Unsafe', commandsJson: '[{"type":"eval","code":"alert(1)"}]', explanation: ''}));
  assert.throws(() => decodeProviderAnswer({summary: 'Bad JSON', commandsJson: '```json [] ```', explanation: ''}));
});

const directions = () => ({alternatives: [
  {label: 'Quiet', summary: 'Make the title quiet.', commands: [{type: 'updateLayer', layerId: 'title', properties: {text: 'Quiet', x: 100}}]},
  {label: 'Bold', summary: 'Make the title bold.', commands: [{type: 'updateLayer', layerId: 'title', properties: {text: 'Bold', y: 200}}]},
  {label: 'Playful', summary: 'Make the title playful.', commands: [{type: 'updateLayer', layerId: 'title', properties: {text: 'Playful', rotation: 12}}], explanation: 'A little rotation adds energy.'},
]});

test('only explicitly supplied creative preferences enter the selected context', async () => {
  const p = fixture(); p.preferences = ['HIDDEN-PREFERENCE']; p.history = ['HIDDEN-HISTORY'];
  let received;
  const service = createAIService({planner: async payload => {received = payload; return answer;}});
  await service.plan(request(p, {preferences: ['  Use soft violet  ', 'Keep text editable']}));
  assert.deepEqual(received.context.untrustedCreativePreferences, ['Use soft violet', 'Keep text editable']);
  assert.equal(received.variations, 1);
  assert.equal(received.context.composition.layers.length, 1);
  const encoded = JSON.stringify(received);
  for (const secret of ['HIDDEN-PREFERENCE', 'HIDDEN-HISTORY', 'SNAPSHOT-SECRET', 'LOCAL-MEDIA-SECRET', 'OTHER-LAYER-SECRET']) assert.equal(encoded.includes(secret), false);
  assert.deepEqual(buildAIContext(request(p)).context.untrustedCreativePreferences, []);
});

test('invalid preferences and variation counts are rejected before provider invocation', async () => {
  let calls = 0;
  const service = createAIService({planner: async () => {calls++; return directions();}});
  const invalid = [
    {preferences: null}, {preferences: 'soft'}, {preferences: [{}]}, {preferences: ['']}, {preferences: ['   ']},
    {preferences: ['x'.repeat(301)]}, {preferences: Array.from({length: 11}, (_, index) => `Preference ${index}`)},
    {preferences: ['Soft', ' Soft ']}, {preferenceIds: ['private-id']},
    {variations: 0}, {variations: 2}, {variations: 4}, {variations: '3'}, {variations: null},
    {variations: 3, mode: 'explain'},
  ];
  for (const extra of invalid) await assert.rejects(() => service.plan(request(fixture(), extra)), error => error.status === 400);
  assert.equal(calls, 0);
  const accepted = buildAIContext(request(fixture(), {preferences: ['x'.repeat(300)], variations: 1, mode: 'explain'}));
  assert.equal(accepted.variations, 1);
});

test('three directions use one planner call and independent proposals against the unchanged baseline', async () => {
  const body = request(fixture(), {variations: 3, preferences: ['Use restrained motion']});
  const before = structuredClone(body.project); let calls = 0, received;
  const service = createAIService({planner: async payload => {calls++; received = payload; return directions();}});
  const result = await service.plan(body);
  assert.equal(calls, 1); assert.equal(received.variations, 3);
  assert.equal(result.alternatives.length, 3);
  assert.deepEqual(result.alternatives.map(item => item.label), ['Quiet', 'Bold', 'Playful']);
  assert.deepEqual(result.proposal, result.alternatives[0].proposal);
  assert.deepEqual(result.previewProject, result.alternatives[0].previewProject);
  assert.deepEqual(result.changes, result.alternatives[0].changes);
  assert.deepEqual(result.warnings, result.alternatives[0].warnings);
  const [quiet, bold, playful] = result.alternatives.map(item => getComp(item.previewProject).layers[0]);
  assert.equal(quiet.x, 100); assert.equal(quiet.text, 'Quiet');
  assert.equal(bold.y, 200); assert.equal(bold.text, 'Bold'); assert.equal(bold.x, before.compositions[0].layers[0].x);
  assert.equal(playful.rotation, 12); assert.equal(playful.text, 'Playful'); assert.equal(playful.y, before.compositions[0].layers[0].y);
  for (const item of result.alternatives) {
    assert.equal(item.proposal.baseFingerprint, result.proposal.baseFingerprint);
    assert.equal(item.proposal.mode, 'edit'); assert.equal(item.proposal.scope, 'selection'); assert.deepEqual(item.proposal.selection, ['title']);
    assert.deepEqual(item.previewProject.compositions[1], before.compositions[1]);
  }
  assert.deepEqual(body.project, before);
  assert.equal(result.alternatives[2].explanation, 'A little rotation adds energy.');
});

test('bad alternative rejects the entire response without mutating the original project', async () => {
  const bad = directions(); bad.alternatives[1].commands = [{type: 'updateLayer', layerId: 'missing-layer', properties: {text: 'No'}}];
  const body = request(fixture(), {variations: 3}), before = structuredClone(body.project);
  const service = createAIService({planner: async () => bad});
  await assert.rejects(() => service.plan(body), /layer/i);
  assert.deepEqual(body.project, before); assert.equal((await service.status()).busy, false);
});

test('variation responses reject wrong counts, blank or duplicate labels, empty edits, and extra fields', async () => {
  const malformed = [];
  const change = fn => {const value = directions(); fn(value); malformed.push(value);};
  change(value => value.alternatives.pop());
  change(value => value.alternatives.push(value.alternatives[0]));
  change(value => {value.alternatives[1].label = ' quiet ';});
  change(value => {value.alternatives[1].label = ' ';});
  change(value => {value.alternatives[1].label = 'x'.repeat(81);});
  change(value => {value.alternatives[1].commands = [];});
  change(value => {value.alternatives[1].commands = Array.from({length: 17}, () => structuredClone(answer.commands[0]));});
  change(value => {value.alternatives[1].secret = 'unsupported';});
  change(value => {value.summary = 'unsupported';});
  for (const value of malformed) {
    const service = createAIService({planner: async () => value});
    await assert.rejects(() => service.plan(request(fixture(), {variations: 3})));
  }
});

test('three new compositions are separate options, each preserving all original compositions', async () => {
  const alternatives = ['A', 'B', 'C'].map(label => ({label, summary: `Create ${label}`, commands: [
    {type: 'createComposition', composition: {id: `comp-${label}`, name: `Direction ${label}`, width: 800, height: 600, fps: 30, duration: 5, background: '#ffffff'}},
    {type: 'addLayer', layer: {id: `title-${label}`, type: 'text', text: label}},
  ]}));
  const body = request(fixture(), {mode: 'create', scope: 'composition', variations: 3});
  const service = createAIService({planner: async () => ({alternatives})});
  const result = await service.plan(body);
  for (const [index, item] of result.alternatives.entries()) {
    assert.equal(item.previewProject.compositions.length, 3);
    assert.deepEqual(item.previewProject.compositions.slice(0, 2), body.project.compositions);
    assert.equal(item.previewProject.activeCompId, `comp-${['A', 'B', 'C'][index]}`);
  }
});

test('variation provider schema uses one required string and strictly decodes all three alternatives', () => {
  assert.equal(typeof provider.decodeProviderVariations, 'function');
  const schema = zodSchema(provider.ProviderVariationsSchema).jsonSchema;
  assert.deepEqual(schema.required, ['alternativesJson']);
  for (const keyword of ['minimum', 'maximum', 'maxLength', 'minLength', 'maxItems', 'anyOf']) assert.equal(JSON.stringify(schema).includes(`"${keyword}"`), false);
  assert.deepEqual(provider.decodeProviderVariations({alternativesJson: JSON.stringify(directions().alternatives)}), directions());
  assert.throws(() => provider.decodeProviderVariations({alternativesJson: '```json [] ```'}));
  assert.throws(() => provider.decodeProviderVariations({alternativesJson: JSON.stringify([{label: 'Bad', ...answer}])}));
  const bad = directions(); bad.alternatives[1].commands = [{type: 'eval', code: 'danger'}];
  assert.throws(() => provider.decodeProviderVariations({alternativesJson: JSON.stringify(bad.alternatives)}));
  assert.throws(() => provider.decodeProviderVariations({alternativesJson: ' '.repeat(256001)}));
});
