import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeExchange, decodeExchange, validateExchange, toFluxini, toFluxiffects } from '@flux-studio/exchange';
import { createBlankProject, createLayer, getComp, parseProject } from '../src/core.mjs';
import { parseProject as parseFluxini } from '../../Haidini/src/engine/project.ts';

function sourceProject() {
  const project = createBlankProject({ name: 'Shared title' });
  project.brief = 'A quiet opening title.';
  project.aeMetadata = { source: 'After Effects bridge', unsupported: ['mask'] };
  getComp(project).layers.push(createLayer('text', { name: 'Title', text: 'Original title', fontSize: 100, width: 800, height: 150, anchorX: 400, anchorY: 75, letterSpacing: 0 }));
  return project;
}
const native = project => parseProject(JSON.stringify(project)).project;
const exported = (app, project, options = {}) => decodeExchange(encodeExchange({ app, project, ...options }));
function storedConversion(envelope, options = {}) {
  const converted = toFluxiffects(envelope, options);
  return native({ ...converted.project, exchange: converted.exchange, brief: envelope.brief ?? converted.project.brief ?? '' });
}

test('installed shared codec matches the sibling source used by the two apps', () => {
  assert.equal(readFileSync(new URL(import.meta.resolve('@flux-studio/exchange')), 'utf8'), readFileSync(new URL('../../FluxExchange/index.mjs', import.meta.url), 'utf8'), 'Reinstall the file dependency after changing FluxExchange.');
});

test('native save, autosave normalization and reopen preserve the shared brief and original snapshots', () => {
  const project = sourceProject();
  const envelope = exported('fluxiffects', project, { brief: 'New shared direction.', notes: 'Make this title emit particles.' });
  const reopened = native({ ...project, brief: envelope.brief, exchange: envelope });
  assert.equal(reopened.brief, 'New shared direction.');
  assert.equal(reopened.exchange.notes, 'Make this title emit particles.');
  assert.deepEqual(reopened.exchange.snapshots.fluxiffects, project);
  assert.deepEqual(reopened.aeMetadata, project.aeMetadata);
  assert.deepEqual(native(reopened), reopened);
});

test('latest FluxEffects edits survive handoff and native FluxMotion reopen while source remains recoverable', () => {
  const source = sourceProject(), initial = exported('fluxiffects', source, { brief: source.brief });
  const converted = toFluxini(initial); parseFluxini(converted.package.project);
  const title = converted.package.project.graph.nodes.find(node => node.type === 'text');
  title.params.text = 'Edited in FluxEffects'; title.params.x = 2;
  const returning = exported('fluxini', converted.package, { previous: initial, brief: 'Continue the current motion.' });
  const current = storedConversion(returning), reopened = native(current);
  assert.equal(getComp(reopened).layers[0].text, 'Edited in FluxEffects');
  assert.equal(getComp(reopened).layers[0].x, 1160);
  assert.equal(reopened.brief, 'Continue the current motion.');
  assert.equal(reopened.exchange.snapshots.fluxiffects.compositions[0].layers[0].text, 'Original title');
  const recovered = toFluxiffects(reopened.exchange, { restoreOriginal: true });
  assert.deepEqual(native(recovered.project), source);
  assert.ok(recovered.warnings.some(message => message.includes('not included')));
});

test('font packages and arbitrary inert native data stay in preserved opposite-app snapshots', () => {
  const initial = exported('fluxiffects', sourceProject()), converted = toFluxini(initial);
  converted.package.fonts = [{ id: 'custom_outline', name: 'Custom', font: { glyphs: { A: { ha: 500 } } } }];
  const envelope = exported('fluxini', converted.package, { previous: initial, notes: '<script>not executable</script>' });
  const reopened = native(storedConversion(envelope));
  assert.deepEqual(reopened.exchange.snapshots.fluxini.fonts, converted.package.fonts);
  assert.equal(reopened.exchange.notes, '<script>not executable</script>');
  const roundtrip = exported('fluxiffects', reopened, { previous: reopened.exchange });
  assert.deepEqual(roundtrip.snapshots.fluxini.fonts, converted.package.fonts);
});

test('repeated application save/import cycles do not nest exchange envelopes or grow exponentially', () => {
  let project = sourceProject();
  for (let index = 0; index < 10; index++) {
    const outgoing = exported('fluxiffects', project, { previous: project.exchange, brief: project.brief });
    const converted = toFluxini(outgoing); parseFluxini(converted.package.project);
    project = storedConversion(exported('fluxini', converted.package, { previous: outgoing }));
    project = native(project);
  }
  assert.equal(project.exchange.snapshots.fluxiffects.exchange, undefined);
  assert.equal(project.exchange.snapshots.fluxini.project.exchange, undefined);
  assert.deepEqual(Object.keys(project.exchange.snapshots).sort(), ['fluxiffects', 'fluxini']);
  assert.ok(JSON.stringify(project).length < 30000);
});

test('native import rejects malformed exchange metadata rather than storing unchecked provenance', () => {
  const project = sourceProject(), envelope = exported('fluxiffects', project);
  for (const exchange of [{ ...envelope, version: 2 }, { ...envelope, sourceApp: 'unknown' }, { ...envelope, snapshots: {} }, { ...envelope, canvas: { width: 0, height: 1080, pixelsPerUnit: 100 } }]) {
    assert.throws(() => native({ ...project, exchange }), /Flux exchange/);
  }
  const polluted = JSON.parse(JSON.stringify(envelope));
  polluted.snapshots.fluxiffects.aeMetadata = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => native({ ...project, exchange: polluted }), /unsafe property/);
  assert.equal({}.polluted, undefined);
});

test('an explicitly empty current brief survives native serialization', () => {
  const project = sourceProject(); project.brief = '';
  project.exchange = exported('fluxiffects', sourceProject(), { brief: 'Old creative direction.' });
  assert.equal(native(project).brief, '');
  const envelope = exported('fluxiffects', project, { previous: project.exchange, brief: project.brief });
  assert.equal(envelope.brief, '');
  assert.equal(storedConversion(envelope).brief, '');
});

test('oversized creative briefs are rejected before an exchange can replace or autosave a project', () => {
  const project = sourceProject(), envelope = exported('fluxiffects', project, { brief: 'x'.repeat(6000) });
  assert.equal(storedConversion(envelope).brief.length, 6000);
  assert.equal(native({ ...project, brief: 'x'.repeat(6000) }).brief.length, 6000);
  assert.throws(() => exported('fluxiffects', project, { brief: 'x'.repeat(6001) }), /creative brief.*6000/);
  envelope.brief += 'x';
  assert.throws(() => validateExchange(envelope), /creative brief.*6000/);
  assert.throws(() => decodeExchange('```flux-exchange\n' + JSON.stringify(envelope) + '\n```'), /creative brief.*6000/);
  assert.throws(() => storedConversion(envelope), /creative brief.*6000/);
});
