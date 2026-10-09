import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { serve } from '../scripts/serve.mjs';
import { AIEditError } from '../src/ai-commands.mjs';

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
async function fixture(t, overrides = {}) {
  const calls = { status: 0, plan: 0, bodies: [], signals: [] };
  const service = {
    async status() { calls.status++; return { available: true, provider: 'Injected', model: 'test-only' }; },
    async plan(body, { signal }) { calls.plan++; calls.bodies.push(body); calls.signals.push(signal); return { proposal: { summary: 'Synthetic response', commands: [] } }; },
    ...overrides,
  };
  const server = serve(0, { aiService: service });
  await once(server, 'listening');
  const port = server.address().port;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  return { port, calls, server, service };
}
function request(port, { path = '/api/health', method = 'GET', headers = {}, body, chunks } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method, headers: { Host: `localhost:${port}`, ...headers } }, res => {
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.once('error', reject);
      res.once('end', () => {
        const text = Buffer.concat(data).toString('utf8');
        resolve({ status: res.statusCode, headers: res.headers, text, body: res.headers['content-type']?.includes('json') ? JSON.parse(text) : text });
      });
    });
    req.once('error', reject);
    if (chunks) { for (const chunk of chunks) req.write(chunk); req.end(); }
    else req.end(body);
  });
}
const planRequest = (port, options = {}) => request(port, { path: '/api/ai/plan', method: 'POST', headers: { 'Content-Type': 'application/json', ...options.headers }, ...options });
const timeout = (promise, ms = 2000) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timed out waiting for local request event.')), ms); })]).finally(() => clearTimeout(timer));
};

test('health, status and planning succeed locally and status never invokes the planner', async t => {
  const { port, calls } = await fixture(t);
  const health = await request(port); assert.equal(health.status, 200); assert.equal(health.body.app, 'fluxiffects');
  const status = await request(port, { path: '/api/ai/status', headers: { Origin: `http://127.0.0.1:${port}` } });
  assert.equal(status.status, 200); assert.equal(status.body.model, 'test-only'); assert.equal(calls.plan, 0);
  const planned = await planRequest(port, { headers: { 'Content-Type': 'application/json; charset=utf-8', Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' }, body: JSON.stringify({ intent: 'Synthetic edit' }) });
  assert.equal(planned.status, 200); assert.equal(planned.body.proposal.summary, 'Synthetic response');
  assert.equal(calls.plan, 1); assert.deepEqual(calls.bodies, [{ intent: 'Synthetic edit' }]);
  assert.ok(calls.signals[0] instanceof AbortSignal);
  assert.equal(calls.signals[0].aborted, false);
  assert.equal(planned.headers['cache-control'], 'no-store'); assert.equal(planned.headers['x-content-type-options'], 'nosniff');
  assert.equal(planned.headers['access-control-allow-origin'], undefined);
});

test('untrusted Host, Origin and cross-site requests never reach status or planning', async t => {
  const { port, calls } = await fixture(t);
  const blocked = [
    { Host: 'attacker.example' }, { Host: `localhost:${port + 1}` },
    { Origin: 'https://attacker.example' }, { Origin: 'null' }, { Origin: `http://localhost:${port + 1}` },
    { 'Sec-Fetch-Site': 'cross-site' },
    { Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'cross-site' },
  ];
  for (const headers of blocked) {
    const response = await planRequest(port, { headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' });
    assert.equal(response.status, 403);
  }
  assert.equal((await request(port, { path: '/api/ai/status', headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal(calls.plan, 0); assert.equal(calls.status, 0);
});

test('MIME type, malformed JSON and non-object JSON fail before the injected planner', async t => {
  const { port, calls } = await fixture(t);
  for (const headers of [{}, { 'Content-Type': 'text/plain' }, { 'Content-Type': 'application/jsonp' }]) {
    const response = await request(port, { path: '/api/ai/plan', method: 'POST', headers, body: '{}' });
    assert.equal(response.status, 415);
  }
  for (const body of ['{', '', 'null', '[]', '123', '"string"']) {
    const response = await planRequest(port, { body });
    assert.equal(response.status, 400); assert.match(response.body.error, /valid JSON|must be an object/);
  }
  assert.equal(calls.plan, 0);
});

test('both declared and streamed oversized bodies receive JSON 413 without invoking the planner', async t => {
  const { port, calls } = await fixture(t);
  const large = JSON.stringify({ data: 'x'.repeat(MAX_REQUEST_BYTES) });
  const declared = await planRequest(port, { headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(large) }, body: large });
  assert.equal(declared.status, 413); assert.match(declared.body.error, /too large/);
  const chunk = 'x'.repeat(128 * 1024);
  const streamed = await planRequest(port, { chunks: ['{"data":"', ...Array(33).fill(chunk), '"}'] });
  assert.equal(streamed.status, 413); assert.match(streamed.body.error, /too large/);
  assert.equal(calls.plan, 0);
});

test('unknown endpoints, disallowed methods and malformed URL encodings cannot trigger planning', async t => {
  const { port, calls } = await fixture(t);
  assert.equal((await request(port, { path: '/api/unknown' })).status, 404);
  assert.equal((await request(port, { path: '/api/ai/plan', method: 'GET' })).status, 404);
  assert.equal((await request(port, { path: '/api/ai/plan', method: 'OPTIONS' })).status, 404);
  assert.equal((await request(port, { path: '/', method: 'POST', body: '{}' })).status, 405);
  const malformed = await request(port, { path: '/api/%zz' });
  assert.equal(malformed.status, 400); assert.match(malformed.body.error, /address/);
  assert.equal(calls.plan, 0);
});

test('unexpected service diagnostics are sanitized while known validation messages remain useful', async t => {
  const { port } = await fixture(t, {
    async status() { throw Object.assign(new Error('Authorization: Bearer SECRET C:/private/connection'), { status: 9999 }); },
    async plan() { throw new AIEditError('Select a layer before requesting an edit.', 400); },
  });
  const failure = await request(port, { path: '/api/ai/status' });
  assert.equal(failure.status, 500); assert.doesNotMatch(failure.text, /SECRET|private|connection|9999/);
  const validation = await planRequest(port, { body: '{}' });
  assert.equal(validation.status, 400); assert.equal(validation.body.error, 'Select a layer before requesting an edit.');
});

test('client disconnection aborts an in-flight planner request', async t => {
  let entered, aborted;
  const started = new Promise(resolve => { entered = resolve; }), cancelled = new Promise(resolve => { aborted = resolve; });
  const { port } = await fixture(t, { async plan(body, { signal }) {
    entered();
    return await new Promise((resolve, reject) => signal.addEventListener('abort', () => { aborted(); reject(new AIEditError('AI request cancelled.', 499)); }, { once: true }));
  } });
  const req = http.request({ hostname: '127.0.0.1', port, path: '/api/ai/plan', method: 'POST', headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json' } });
  req.on('error', () => {}); req.end('{}');
  await timeout(started); req.destroy(); await timeout(cancelled);
});

test('disconnecting during body upload never invokes planning or destabilizes subsequent requests', async t => {
  const { port, calls, server } = await fixture(t);
  const received = once(server, 'request');
  const req = http.request({ hostname: '127.0.0.1', port, path: '/api/ai/plan', method: 'POST', headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json', 'Content-Length': 1000 } });
  req.on('error', () => {});
  req.write('{"intent":');
  const [incoming] = await timeout(received), aborted = once(incoming, 'aborted');
  req.destroy(); await timeout(aborted);
  assert.equal((await request(port)).status, 200); assert.equal(calls.plan, 0);
});
