import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAIService, prepareRequest} from '../server/ai.mjs';
import {serveApp} from '../server/index.mjs';
import {transportProject, fingerprint, encodeProject, decodeProject, readMotion, exportExchange} from '../shared/browser.mjs';
import {createDemoProject as publication, toMotion, applyAICommands} from '../../Fluxidesign/src/model.mjs';
import {createDemoProject as canvas} from '../../Fluxoto/src/model.mjs';
import {createProject as sequence} from '../../Fluximiere/src/model.mjs';

const body = project => ({project: transportProject(project), intent: 'Refine this composition', brief: 'Quiet, considered, editable.', mode: 'edit', scope: 'composition', selection: [], baseFingerprint: fingerprint(project)});
const answer = {summary: 'A considered idea', explanation: 'Keep the editable layers.', commands: []};
test('transport strips media, paths, source snapshots and mesh buffers recursively without mutating the project', () => {
  const input = {name: 'Keep me', assets: [{src: 'data:image/png;base64,SECRET', path: 'C:/private/file.png', url: 'https://private.example', geometry: {positions: [1, 2, 3]}}], aeMetadata: {secret: true}, exchange: {secret: true}, nested: {dataURL: 'SECRET', bytes: [1, 2], text: 'Editable text'}};
  const output = transportProject(input);
  assert.deepEqual(output, {name: 'Keep me', assets: [{src: '', path: '', url: '', geometry: null}], nested: {dataURL: '', bytes: '', text: 'Editable text'}});
  assert.ok(input.assets[0].src.includes('SECRET'));
});
test('AI provider context contains only chosen publication page and selected frames', async () => {
  const project = publication(); project.pages[1].objects[0].text = 'PRIVATE_OTHER_PAGE'; const target = project.pages[0].objects.find(o => o.type === 'text');
  const request = await prepareRequest('fluxidesign', {...body(project), scope: 'selection', selection: [target.id]});
  assert.equal(request.context.scene.page.objects.length, 1); assert.equal(request.context.scene.page.objects[0].id, target.id);
  assert.ok(!JSON.stringify(request.context).includes('PRIVATE_OTHER_PAGE')); assert.ok(!JSON.stringify(request.context).includes('data:image'));
});
test('every 2D editor strips media and excludes unselected object contents', async () => {
  const image = canvas(); image.layers[0].text = 'SELECTED_TEXT'; image.layers[1].text = 'PRIVATE_OTHER_TEXT'; image.layers[0].src = 'data:image/png;base64,AAAA';
  const photo = await prepareRequest('fluxoto', {...body(image), scope: 'selection', selection: [image.layers[0].id]});
  assert.equal(photo.context.scene.layers.length, 1); assert.ok(!JSON.stringify(photo.context).includes('PRIVATE_OTHER_TEXT')); assert.ok(!JSON.stringify(photo.context).includes('data:image'));
  const video = sequence(); video.assets.push({id: 'asset', type: 'video', name: 'C:/private/customer.mov', src: 'data:video/mp4;base64,AAAA', width: 1920, height: 1080, duration: 20}); video.clips[0].assetId = 'asset'; video.clips[1].text = 'PRIVATE_OTHER_CLIP';
  const edit = await prepareRequest('fluximiere', {...body(video), scope: 'selection', selection: [video.clips[0].id]}); assert.equal(edit.context.scene.clips.length, 1); const text = JSON.stringify(edit.context); assert.ok(!text.includes('PRIVATE_OTHER_CLIP')); assert.ok(!text.includes('customer.mov')); assert.ok(!text.includes('data:video'));
});
test('request validation rejects unsafe trees, empty selection, excessive intent and unexpected fields', async () => {
  const p = publication();
  for (const patch of [{scope: 'selection'}, {intent: 'x'.repeat(2001)}, {brief: 'x'.repeat(6001)}, {history: 'should never transmit'}, {mode: 'execute-code'}, {scope: 'all'}, {baseFingerprint: null}]) await assert.rejects(() => prepareRequest('fluxidesign', {...body(p), ...patch}));
  const unsafe = JSON.parse('{"__proto__":{"polluted":true}}'); await assert.rejects(() => prepareRequest('fluxidesign', {...body(p), ...unsafe}), /unsafe/);
});
test('service validates proposals, preserves base revision, and never calls the planner for invalid input', async () => {
  const project = publication(); let calls = 0;
  const service = createAIService('fluxidesign', {planner: async () => {calls++; return answer;}});
  await assert.rejects(() => service.plan({...body(project), intent: ''})); assert.equal(calls, 0);
  const result = await service.plan(body(project)); assert.equal(result.baseFingerprint, fingerprint(project)); assert.deepEqual(result.commands, []); assert.equal(calls, 1);
  const invalid = createAIService('fluxidesign', {planner: async () => ({...answer, commands: [{type: 'runCode', code: 'throw secret'}]})});
  await assert.rejects(() => invalid.plan(body(project)), /unsupported edit/);
  const explain = createAIService('fluxidesign', {planner: async () => ({...answer, commands: [{type: 'addPage', name: 'Should not exist'}]})});
  await assert.rejects(() => explain.plan({...body(project), mode: 'explain'}), /invalid proposal/);
});
test('same-app concurrency, cancellation and timeout release the service without accepting late output', async () => {
  const request = body(publication()); let entered, release; const started = new Promise(r => {entered = r;});
  const service = createAIService('fluxidesign', {planner: () => {entered(); return new Promise(r => {release = r;});}}); const abort = new AbortController(); const first = service.plan(request, {signal: abort.signal}); await started;
  await assert.rejects(() => service.plan(request), e => e.status === 409); assert.equal((await service.status()).busy, true);
  abort.abort(); await assert.rejects(first, e => e.status === 499); assert.equal((await service.status()).busy, false); release(answer);
  const timeout = createAIService('fluxidesign', {timeoutMs: 25, planner: () => new Promise(() => {})}); await assert.rejects(() => timeout.plan(request), e => e.status === 504); assert.equal((await timeout.status()).busy, false);
});
test('gateway errors expose actionable billing status without revealing provider payloads', async () => {
  const request = body(publication());
  const billing = createAIService('fluxidesign', {planner: async () => {throw Object.assign(new Error('PRIVATE_PROVIDER_PAYLOAD API_KEY=secret'), {statusCode: 402});}});
  await assert.rejects(() => billing.plan(request), e => e.status === 502 && e.message.includes('HTTP 402') && !e.message.includes('PRIVATE_PROVIDER'));
  const other = createAIService('fluxidesign', {planner: async () => {throw new Error('SECRET_DATA');}}); await assert.rejects(() => other.plan(request), e => !e.message.includes('SECRET_DATA'));
});
test('native envelope and Markdown preserve compatible editable pages and reject prototype fields', () => {
  const project = publication(), motion = toMotion(project); const native = encodeProject('fluxidesign', project, motion), reopened = decodeProject(native);
  assert.deepEqual(reopened.project, project); assert.equal(readMotion(native).project.compositions.length, project.pages.length);
  const markdown = exportExchange(motion, 'A shared brief', 'Keep editable typography.'); assert.equal(readMotion(markdown).project.compositions.length, project.pages.length);
  assert.throws(() => decodeProject('{"format":"fluxcreate-project","version":1,"app":"fluxidesign","project":{"constructor":{"x":1}}}'), /unsafe/);
  assert.throws(() => decodeProject(native.replace('"version": 1', '"version": 99')), /unsupported/);
});
test('typed publication commands reject extra fields and unknown scopes atomically', () => {
  const p = publication(); const before = JSON.stringify(p);
  assert.throws(() => applyAICommands(p, [{type: 'addPage', name: 'Draft', code: 'ignored()'}]), /Unsupported command property/);
  assert.throws(() => applyAICommands(p, [{type: 'addPage', name: 'Draft'}], {scope: 'unrestricted'}), /Unknown edit scope/); assert.equal(JSON.stringify(p), before);
});
test('HTTP service enforces loopback host, same origin, JSON, size limits and isolated recent writes', async () => {
  const location = fileURLToPath(new URL('../artifacts/shared-tests/', import.meta.url)); await mkdir(location, {recursive: true});
  const server = await serveApp({appId: 'fluxidesign', root: new URL('../../Fluxidesign/', import.meta.url), port: 0, dataDir: location, planner: async () => answer}); const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(url + '/api/health'); assert.equal(health.status, 200); assert.equal((await health.json()).app, 'fluxidesign');
    const headers = {'Content-Type': 'application/json'};
    assert.equal((await fetch(url + '/api/ai/plan', {method: 'POST', headers: {...headers, Origin: 'https://unrelated.example'}, body: JSON.stringify(body(publication()))})).status, 403);
    assert.equal((await fetch(url + '/api/health', {headers: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
    assert.equal((await fetch(url + '/api/ai/plan', {method: 'POST', headers: {'Content-Type': 'text/plain'}, body: '{}'})).status, 415);
    assert.equal((await fetch(url + '/api/ai/plan', {method: 'POST', headers, body: '{bad'})).status, 400);
    const large = await fetch(url + '/api/ai/plan', {method: 'POST', headers, body: JSON.stringify({padding: 'x'.repeat(4 * 1024 * 1024)})});
    assert.equal(large.status, 413); assert.match((await large.json()).error, /too large/);
    const streamedBody = new ReadableStream({start(controller) {for(let i=0;i<9;i++)controller.enqueue(new Uint8Array(512*1024).fill(120));controller.close();}});
    const streamed = await fetch(url + '/api/ai/plan', {method: 'POST', headers, body: streamedBody, duplex: 'half'});
    assert.equal(streamed.status, 413); assert.match((await streamed.json()).error, /too large/);
    const result = await fetch(url + '/api/ai/plan', {method: 'POST', headers: {...headers, Origin: url}, body: JSON.stringify(body(publication()))}); assert.equal(result.status, 200); assert.equal((await result.json()).summary, answer.summary);
    const saved = await fetch(url + '/api/recent', {method: 'POST', headers, body: JSON.stringify({name: 'Isolated test publication'})}); assert.equal(saved.status, 200); assert.equal(JSON.parse(await readFile(path.join(location, 'recent-fluxidesign.json'), 'utf8')).name, 'Isolated test publication');
    assert.equal((await fetch(url + '/api/does-not-exist')).status, 404); assert.equal((await fetch(url + '/main.js', {method: 'POST'})).status, 405);
  } finally {await new Promise(resolve => server.close(resolve));}
});
