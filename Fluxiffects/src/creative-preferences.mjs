export const PREFERENCES_STORAGE_KEY = 'fluxiffects.creative-preferences.v1';
export const MAX_PREFERENCES = 30;
export const MAX_SELECTED_PREFERENCES = 10;

export function validatePreferences(value) {
  if (!Array.isArray(value) || value.length > MAX_PREFERENCES) throw new Error('Save up to 30 creative preferences.');
  const ids = new Set();
  return value.map(rule => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) throw new Error('Each preference needs a name and a style rule.');
    if (typeof rule.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(rule.id) || ids.has(rule.id)) throw new Error('Each preference needs a unique valid ID.');
    ids.add(rule.id);
    if (typeof rule.label !== 'string' || !rule.label.trim() || rule.label.length > 60) throw new Error('Give the rule a name of up to 60 characters.');
    if (typeof rule.text !== 'string' || !rule.text.trim() || rule.text.length > 300) throw new Error('Write a style rule of up to 300 characters.');
    return { id: rule.id, label: rule.label.trim(), text: rule.text.trim() };
  });
}

export function loadPreferences(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) throw new Error('Storage is unavailable');
    const raw = target.getItem(PREFERENCES_STORAGE_KEY);
    if (raw === null) return { library: [], error: '' };
    if (typeof raw !== 'string' || raw.length > 50000) throw new Error('Invalid saved library');
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) throw new Error('Unsupported library version');
    return { library: validatePreferences(data.preferences), error: '' };
  } catch {
    return { library: [], error: 'Your saved preferences could not be read. Stored data has been left untouched. Saving a rule will start a new library.' };
  }
}

export function savePreferences(value, storage) {
  let library;
  try { library = validatePreferences(value); }
  catch (error) { return { ok: false, library: null, error: error.message }; }
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) throw new Error('Storage is unavailable');
    target.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ version: 1, preferences: library }));
    return { ok: true, library, error: '' };
  } catch {
    return { ok: false, library: null, error: 'Your device could not save these preferences. Check available storage and browser permissions, then try again. Your previous library is unchanged.' };
  }
}

export function selectedPreferenceTexts(value, selectedIds) {
  const library = validatePreferences(value);
  if (!Array.isArray(selectedIds) || selectedIds.some(id => typeof id !== 'string')) throw new Error('Choose the preferences to include with this request.');
  const ids = [...new Set(selectedIds)];
  if (ids.length > MAX_SELECTED_PREFERENCES) throw new Error('Include up to 10 preferences with each request.');
  const byId = new Map(library.map(rule => [rule.id, rule.text]));
  return [...new Set(ids.filter(id => byId.has(id)).map(id => byId.get(id)))];
}
