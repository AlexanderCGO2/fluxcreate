import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePreferences, loadPreferences, savePreferences, selectedPreferenceTexts } from '../src/creative-preferences.mjs';

const rules = [
  { id: 'quiet', label: 'Quiet motion', text: 'Use gentle movement and generous pauses.' },
  { id: 'color', label: 'Violet palette', text: 'Use violet and warm white.' },
];
const storage = initial => {
  let value = initial ?? null;
  return {
    getItem(key) { assert.equal(key, 'fluxiffects.creative-preferences.v1'); return value; },
    setItem(key, next) { assert.equal(key, 'fluxiffects.creative-preferences.v1'); value = next; },
    value: () => value,
  };
};

test('validates and normalizes rule text without retaining extra metadata', () => {
  const input = [{ id: 'quiet', label: '  Quiet motion  ', text: '  Leave room to breathe.  ', selected: true, secret: 'never forward' }];
  assert.deepEqual(validatePreferences(input), [{ id: 'quiet', label: 'Quiet motion', text: 'Leave room to breathe.' }]);
  assert.equal(input[0].label, '  Quiet motion  ');
});

test('rejects malformed, duplicate, oversized, or empty preferences', () => {
  for (const value of [null, {}, [null], [{ id: 'ok', label: '', text: 'a' }], [{ id: 'ok', label: 'a', text: ' ' }],
    [{ id: 'ok', label: 'x'.repeat(61), text: 'a' }], [{ id: 'ok', label: 'a', text: 'x'.repeat(301) }],
    [{ id: 'bad id', label: 'a', text: 'a' }], [rules[0], rules[0]],
    Array.from({ length: 31 }, (_, i) => ({ id: `rule-${i}`, label: 'Rule', text: 'Test' }))]) {
    assert.throws(() => validatePreferences(value));
  }
});

test('an empty device library is usable without saving or selecting anything', () => {
  const store = storage();
  assert.deepEqual(loadPreferences(store), { library: [], error: '' });
  assert.equal(store.value(), null);
  assert.deepEqual(selectedPreferenceTexts(rules, []), []);
});

test('explicit save round trips a versioned library without persisting request selection', () => {
  const store = storage();
  const result = savePreferences(rules, store);
  assert.equal(result.ok, true);
  assert.deepEqual(loadPreferences(store), { library: rules, error: '' });
  assert.deepEqual(JSON.parse(store.value()), { version: 1, preferences: rules });
});

test('corrupt or unsupported storage reports a recovery error and preserves the stored value', () => {
  for (const bad of ['not json', '{"version":2,"preferences":[]}', '{"version":1,"preferences":[{"id":"incomplete"}]}', 'x'.repeat(50001)]) {
    const store = storage(bad), result = loadPreferences(store);
    assert.deepEqual(result.library, []);
    assert.ok(result.error);
    assert.equal(store.value(), bad);
  }
});

test('unavailable storage and failed writes report errors without claiming a save', () => {
  const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  assert.ok(loadPreferences(blocked).error);
  const saved = savePreferences(rules, blocked);
  assert.equal(saved.ok, false);
  assert.ok(saved.error);
  assert.equal(saved.library, null);
});

test('failed validation never overwrites an existing stored library', () => {
  const store = storage('{"version":1,"preferences":[]}');
  assert.equal(savePreferences([{ id: 'bad' }], store).ok, false);
  assert.equal(store.value(), '{"version":1,"preferences":[]}');
});

test('request payload contains only explicitly selected current rule text', () => {
  assert.deepEqual(selectedPreferenceTexts(rules, ['color']), ['Use violet and warm white.']);
  assert.deepEqual(selectedPreferenceTexts(rules, ['missing', 'quiet', 'quiet']), ['Use gentle movement and generous pauses.']);
  assert.deepEqual(selectedPreferenceTexts(rules, ['color', 'quiet']), ['Use violet and warm white.', 'Use gentle movement and generous pauses.']);
  assert.deepEqual(selectedPreferenceTexts([], ['removed']), []);
});

test('more than ten selections or malformed selections cannot be submitted', () => {
  const many = Array.from({ length: 11 }, (_, i) => ({ id: `rule-${i}`, label: 'Rule', text: `Text ${i}` }));
  assert.throws(() => selectedPreferenceTexts(many, many.map(rule => rule.id)));
  assert.throws(() => selectedPreferenceTexts(rules, 'quiet'));
  assert.throws(() => selectedPreferenceTexts(rules, [null]));
  assert.equal(selectedPreferenceTexts(many, many.slice(0, 10).map(rule => rule.id)).length, 10);
});

test('differently named selected rules with identical text send one valid preference', () => {
  const library = [...rules, {id:'brand-motion',label:'Brand motion',text:`  ${rules[0].text}  `}];
  assert.deepEqual(selectedPreferenceTexts(library, ['quiet','brand-motion','color']), [rules[0].text,rules[1].text]);
  assert.equal(validatePreferences(library).length,3);
});
