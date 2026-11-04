import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {createBlankProject, getComp} from '../src/core.mjs';
import {AIEditError, applyProposal, projectForAI} from '../src/ai-commands.mjs';
import {createAIService} from '../server/ai-service.mjs';

// Explicitly invoked smoke test: exactly one live request, using only synthetic scene data.
let safeStatus, liveRequests = 0;
async function main() {
const project = createBlankProject({name: 'Neutral directions fixture'});
const original = structuredClone(project), service = createAIService();
const status = await service.status();
safeStatus = {provider: status.provider, model: status.model};
assert.equal(status.available, true, 'The existing FluxEffects connection must be configured.');
const started = Date.now();
liveRequests++;
const result = await service.plan({
  project: projectForAI(project), mode: 'create', scope: 'composition', selection: [], time: 0,
  variations: 3, preferences: ['Use restrained typography and gentle motion.'],
  brief: 'A synthetic title-card test with no real project, media, or personal data.',
  intent: 'Create three distinct editable 3-second title-card directions. Each is 800 by 600 pixels at 30fps, says HELLO TOMORROW, and has a different visual treatment. Each direction must include editable text and a short opacity animation using setAnimation with at least two keys. Keep each design simple with 2 or 3 layers and at most 8 commands. Preserve the existing composition.',
});
assert.equal(result.alternatives.length, 3);
assert.equal(new Set(result.alternatives.map(item => item.label.toLowerCase())).size, 3);
const checks = result.alternatives.map(item => {
  assert.equal(item.proposal.baseFingerprint, result.proposal.baseFingerprint);
  const applied = applyProposal(project, item.proposal).project, comp = getComp(applied);
  assert.equal(applied.compositions.length, original.compositions.length + 1);
  assert.deepEqual(applied.compositions.slice(0, original.compositions.length), original.compositions);
  assert.equal(comp.duration, 3); assert.equal(comp.width, 800); assert.equal(comp.height, 600);
  const textLayers = comp.layers.filter(layer => layer.type === 'text').length;
  const tracks = comp.layers.flatMap(layer => Object.values(layer.keyframes || {})).filter(keys => keys.length >= 2).length;
  assert.ok(textLayers > 0, 'Each direction must contain editable text.');
  assert.ok(tracks > 0, 'Each direction must contain editable animation.');
  return {label: item.label, commands: item.proposal.commands.length, layers: comp.layers.length, editableTextLayers: textLayers, animatedTracks: tracks};
});
assert.deepEqual(project, original);
const report = {ok: true, timestamp: new Date().toISOString(), ...safeStatus, liveRequests, milliseconds: Date.now() - started, syntheticOnly: true, alternatives: checks};
await saveReport(report);
}

async function saveReport(report) {
await mkdir(new URL('../artifacts/ai-variations/', import.meta.url), {recursive: true});
await writeFile(new URL('../artifacts/ai-variations/live.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
}

await main().catch(async error => {
  const status = error instanceof AIEditError && error.message.match(/HTTP (\d{3})/);
  await saveReport({ok: false, timestamp: new Date().toISOString(), ...safeStatus, liveRequests, syntheticOnly: true,
    ...(status ? {upstreamStatus: Number(status[1])} : {}),
    reason: error instanceof AIEditError ? error.message : 'The live fixture did not complete all validation checks.',
    outcome: 'Live variations remain unverified. No user project, media, or saved creative preferences were included; no provider switch or retry was attempted.'});
  process.exitCode = 1;
});
