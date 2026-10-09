import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {serve} from '../../Fluxidesign/scripts/serve.mjs';

const artifacts = fileURLToPath(new URL('../artifacts/ai-review/', import.meta.url)); await mkdir(artifacts, {recursive: true});
const pending = new Map(), received = [];
const server = await serve(0, {dataDir: path.join(artifacts, 'isolated-data'), planner: request => {
  received.push(request);
  const target = request.context.scene.page.objects.find(o => o.type === 'text');
  const result = {summary: request.intent, explanation: 'An isolated editable test.', commands: request.mode === 'explain' ? [] : [{type: 'updateObject', objectId: target.id, properties: {text: request.intent}}]};
  if (request.intent.startsWith('Slow')) return new Promise(resolve => pending.set(request.intent, () => resolve(result)));
  return result;
}});
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const context = await browser.newContext({viewport: {width: 1600, height: 1000}}), page = await context.newPage(), checks = [], errors = [];
page.setDefaultTimeout(10000);
page.on('pageerror', e => errors.push(e.message));
const ok = name => {checks.push(name); console.log('PASS', name);};
const waitUntil = async condition => {for (let i = 0; i < 150; i++) {if (await condition()) return; await new Promise(r => setTimeout(r, 10));} throw Error('Timed out waiting for isolated AI request.');};
const request = async text => {await page.getByLabel('AI request', {exact: true}).fill(text); await page.getByRole('button', {name: 'Prepare editable idea', exact: true}).click();};
try {
  await page.goto(origin); await page.locator('.studio[aria-busy="false"]').waitFor(); await page.getByRole('button', {name: 'Ask Flux', exact: true}).click();
  assert.equal(await page.locator('.fc-ai-panel select').nth(0).locator('option:checked').textContent(), 'Current page'); ok('Scope wording matches the actual provider context');
  await request('Slow stale request'); await waitUntil(() => pending.has('Slow stale request')); await page.getByLabel('Project name', {exact: true}).fill('Changed during generation'); pending.get('Slow stale request')();
  await page.getByRole('alert').filter({hasText: 'Your project changed while AI was working'}).waitFor(); assert.equal(await page.getByRole('button', {name: 'Apply idea', exact: true}).count(), 0); ok('Edits during generation reject the stale response');
  await request('Prepared current result'); await page.getByRole('button', {name: 'Apply idea', exact: true}).waitFor(); await page.getByLabel('Project name', {exact: true}).fill('Changed after review'); await page.getByText('This project has changed. Prepare a fresh idea before applying.', {exact: true}).waitFor(); assert.equal(await page.getByRole('button', {name: 'Apply idea', exact: true}).count(), 0); ok('Edits after preview disable stale proposal application');
  await request('Slow cancelled response'); await waitUntil(() => pending.has('Slow cancelled response')); await page.getByRole('button', {name: 'Cancel request', exact: true}).click();
  await waitUntil(async () => !(await (await fetch(origin + '/api/ai/status')).json()).busy); await request('The fresh editable result'); await page.getByRole('button', {name: 'Apply idea', exact: true}).waitFor(); pending.get('Slow cancelled response')(); await page.waitForTimeout(80);
  assert.equal(await page.locator('.fc-ai-proposal h3').textContent(), 'The fresh editable result'); await page.getByRole('button', {name: 'Apply idea', exact: true}).click(); assert.ok((await page.locator('.paper').textContent()).includes('The fresh editable result')); await page.getByRole('button', {name: 'Undo', exact: true}).click(); assert.ok(!(await page.locator('.paper').textContent()).includes('The fresh editable result')); ok('Cancel then regenerate keeps only the new result and applies as one undo');
  await request('Slow context change'); await waitUntil(() => pending.has('Slow context change')); await page.locator('.fc-ai-panel select').nth(1).selectOption('explain'); pending.get('Slow context change')(); await page.waitForTimeout(80); assert.equal(await page.getByRole('button', {name: 'Apply idea', exact: true}).count(), 0); await page.getByRole('button', {name: 'Ask AI', exact: true}).waitFor(); ok('Changing AI mode cancels the pending edit');
  await page.getByLabel('AI request', {exact: true}).fill('Explain this page'); await page.getByRole('button', {name: 'Ask AI', exact: true}).click(); await page.getByRole('heading', {name: 'Explain this page', exact: true}).waitFor(); assert.equal(await page.getByRole('button', {name: 'Apply idea', exact: true}).count(), 0); ok('Explain mode returns information without applying edits');
  assert.ok(received.every(r => !JSON.stringify(r.context).includes('data:image'))); assert.deepEqual(errors, []); ok('Provider inputs omit local pixels; no browser errors');
  await writeFile(path.join(artifacts, 'smoke.json'), JSON.stringify({passed: checks.length, checks, errors}, null, 2));
} finally {for (const release of pending.values()) release(); await browser.close(); await new Promise(resolve => server.close(resolve));}
