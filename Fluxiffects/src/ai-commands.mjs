import {createLayer, createBlankProject, getComp, parseProject, ANIMATABLE_PROPERTIES, EASINGS, SCENE3D_DEFAULTS, SCENE3D_RANGES, SCENE3D_ANIMATABLE} from './core.mjs';

export class AIEditError extends Error {
  constructor(message, status = 400) {super(message); this.name = 'AIEditError'; this.status = status; this.statusCode = status;}
}
const reject = (message, status) => {throw new AIEditError(message, status);};
export const LAYER_TYPES = ['text', 'rectangle', 'ellipse', 'image', 'video', 'audio', 'solid', 'null', 'scene3d'];
export const EFFECT_TYPES = ['blur', 'shadow', 'brightness', 'contrast', 'saturate', 'hue', 'grayscale', 'sepia', 'glow'];
export const PROPERTY_RULES = {
  name: ['text', 200], text: ['text', 20000], fontFamily: ['text', 300],
  x: ['number', -100000, 100000], y: ['number', -100000, 100000],
  width: ['number', 0, 32768], height: ['number', 0, 32768], anchorX: ['number', -100000, 100000], anchorY: ['number', -100000, 100000],
  scaleX: ['number', -1000, 1000], scaleY: ['number', -1000, 1000], rotation: ['number', -360000, 360000], opacity: ['number', 0, 1],
  start: ['number', -86400, 86400], end: ['number', -86400, 172800],
  fontSize: ['number', 1, 10000], fontWeight: ['number', 1, 1000], letterSpacing: ['number', -10000, 10000],
  fill: ['color'], stroke: ['color'], strokeWidth: ['number', 0, 10000], cornerRadius: ['number', 0, 32768], gradient: ['gradient'],
  visible: ['boolean'], muted: ['boolean'], sourceIn: ['number', 0, 86400], playbackRate: ['number', .1, 16], volume: ['number', 0, 1],
  textAlign: ['enum', 'left', 'center', 'right'],
  blendMode: ['enum', 'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'exclusion'],
  parentId: ['reference'], assetId: ['reference'],
  ...Object.fromEntries(Object.entries(SCENE3D_RANGES).map(([key, range]) => [key, ['number', ...range]])),
  modelClip: ['integer', 0, 199], modelLoop: ['boolean'],
};
export const COMPOSITION_RULES = {name: ['text', 200], width: ['number', 16, 8192], height: ['number', 16, 8192], fps: ['number', 1, 120], duration: ['number', .1, 600], background: ['color']};
export const COLOR_PATTERN = /^(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\)|transparent|black|white)$/i;
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const object = (value, label) => {if (!value || typeof value !== 'object' || Array.isArray(value)) reject(`${label} must be an object.`);};
const fields = (value, allowed, label) => {object(value, label); for (const key of Object.keys(value)) if (!allowed.includes(key)) reject(`${label} contains unsupported field "${key.slice(0, 80)}".`);};
const text = (value, label, max = 200) => {if (typeof value !== 'string' || !value.trim() || value.length > max) reject(`${label} must contain 1–${max} characters.`);};
const id = (value, label = 'Identifier', fresh = false) => {text(value, label); if (['__proto__', 'constructor', 'prototype'].includes(value) || /[\x00-\x1f]/.test(value) || (fresh && !/^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(value))) reject(`${label} is invalid.`);};
const numeric = (value, min, max, label) => {if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) reject(`${label} must be between ${min} and ${max}.`);};

export function validateProperties(properties, rules = PROPERTY_RULES) {
  fields(properties, Object.keys(rules), 'Properties');
  for (const [key, value] of Object.entries(properties)) {
    const [kind, ...args] = rules[key];
    if (kind === 'number' || kind === 'integer') {numeric(value, args[0], args[1], key); if (kind === 'integer' && !Number.isInteger(value)) reject(`${key} must be a whole number.`);}
    else if (kind === 'text') {if (typeof value !== 'string' || value.length > args[0]) reject(`${key} must be text of at most ${args[0]} characters.`);}
    else if (kind === 'boolean' && typeof value !== 'boolean') reject(`${key} must be true or false.`);
    else if (kind === 'enum' && !args.includes(value)) reject(`Unsupported ${key}.`);
    else if (kind === 'reference' && value !== null) id(value, key);
    else if (kind === 'color' && (typeof value !== 'string' || value.length > 100 || !COLOR_PATTERN.test(value))) reject(`Invalid ${key} color.`);
    else if (kind === 'gradient' && value !== null) {
      fields(value, ['from', 'to', 'angle'], 'Gradient');
      validateProperties({fill: value.from, stroke: value.to}); numeric(value.angle, -36000, 36000, 'Gradient angle');
    }
  }
  return properties;
}

function hashText(value) {
  let a = 2166136261, b = 0x9e3779b9;
  for (let i = 0; i < value.length; i++) {const code = value.charCodeAt(i); a = Math.imul(a ^ code, 16777619); b = Math.imul(b ^ code, 2246822519);}
  return `${value.length.toString(36)}-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
}
const omitted = new Set(['aeMetadata', 'exchange', 'warnings']);
function structural(value, depth = 0) {
  if (depth > 24) reject('Project metadata is too deeply nested.');
  if (Array.isArray(value)) return value.map(item => structural(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().filter(key => !omitted.has(key) && !['__proto__', 'constructor', 'prototype'].includes(key)).map(key => [key, structural(value[key], depth + 1)]));
  return value;
}
function assetIdentity(asset) {
  const {src, url, path, aiSourceFingerprint, ...rest} = asset;
  return {...rest, sourceFingerprint: aiSourceFingerprint || hashText(String(src || url || ''))};
}
export function fingerprintProject(project) {
  return `fx1-${hashText(JSON.stringify(structural({...project, assets: (project.assets || []).map(assetIdentity)})))}`;
}
/** Send editor structure only. The opaque source token lets browser stale checks retain media identity. */
export function projectForAI(project) {
  const result = structural({...project, assets: (project.assets || []).map(asset => {
    const {src, url, path, ...rest} = asset;
    return {...rest, src: '', aiSourceFingerprint: asset.aiSourceFingerprint || hashText(String(src || url || ''))};
  })});
  return result;
}

function animationProperty(property) {if (!ANIMATABLE_PROPERTIES.includes(property)) reject('Unsupported animation property.');}
function validateEffects(effects) {
  if (!Array.isArray(effects) || effects.length > 20) reject('Use at most 20 effects per layer.');
  const ids = new Set();
  for (const effect of effects) {
    fields(effect, ['id', 'type', 'enabled', 'amount'], 'Effect'); id(effect.id, 'Effect id');
    if (ids.has(effect.id)) reject('Duplicate effect identifiers.'); ids.add(effect.id);
    if (!EFFECT_TYPES.includes(effect.type)) reject('Unsupported effect type.');
    if (typeof effect.enabled !== 'boolean') reject('Effect enabled must be true or false.');
    numeric(effect.amount, effect.type === 'hue' ? -360 : 0, 1000, 'Effect amount');
  }
}
export function validateCommands(commands) {
  if (!Array.isArray(commands) || commands.length > 32) reject('A proposal can contain at most 32 commands.');
  for (const command of commands) {
    object(command, 'Command');
    const allowed = {
      addLayer: ['type', 'layer', 'index'], updateLayer: ['type', 'layerId', 'properties'], deleteLayer: ['type', 'layerId'],
      duplicateLayer: ['type', 'layerId', 'newId', 'name'], setAnimation: ['type', 'layerId', 'property', 'keys'],
      removeKeyframe: ['type', 'layerId', 'property', 'keyId'], removeTrack: ['type', 'layerId', 'property'],
      setEffects: ['type', 'layerId', 'effects'], updateComposition: ['type', 'properties'], createComposition: ['type', 'composition'],
    }[command.type];
    if (!Array.isArray(allowed)) reject('Unsupported AI command.'); fields(command, allowed, 'Command');
    if (allowed.includes('layerId')) id(command.layerId, 'Layer id');
    if (command.type === 'addLayer') {
      fields(command.layer, ['id', 'type', ...Object.keys(PROPERTY_RULES)], 'New layer');
      id(command.layer.id, 'New layer id', true);
      if (!LAYER_TYPES.includes(command.layer.type)) reject('Unsupported layer type.');
      const {id: ignored, type, ...properties} = command.layer; validateProperties(properties);
      if (type !== 'scene3d' && Object.keys(SCENE3D_DEFAULTS).some(key => key in properties)) reject('3D controls require a 3D scene layer.');
      if (command.index !== undefined) {numeric(command.index, 0, 2000, 'Layer index'); if (!Number.isInteger(command.index)) reject('Layer index must be an integer.');}
    }
    if (command.type === 'updateLayer') validateProperties(command.properties);
    if (command.type === 'duplicateLayer') {id(command.newId, 'New layer id', true); if (command.name !== undefined) text(command.name, 'Layer name');}
    if (['setAnimation', 'removeKeyframe', 'removeTrack'].includes(command.type)) animationProperty(command.property);
    if (command.type === 'removeKeyframe') id(command.keyId, 'Keyframe id');
    if (command.type === 'setAnimation') {
      if (!Array.isArray(command.keys) || command.keys.length < 1 || command.keys.length > 120) reject('An animation must have 1–120 keyframes.');
      const times = new Set(), ids = new Set();
      for (const key of command.keys) {
        fields(key, ['id', 'time', 'value', 'easing'], 'Keyframe'); numeric(key.time, -86400, 172800, 'Keyframe time');
        validateProperties({[command.property]: key.value});
        if (!own(EASINGS, key.easing)) reject('Unsupported keyframe easing.');
        if (times.has(key.time)) reject('Duplicate keyframe times.'); times.add(key.time);
        if (key.id !== undefined) {id(key.id, 'Keyframe id'); if (ids.has(key.id)) reject('Duplicate keyframe ids.'); ids.add(key.id);}
      }
    }
    if (command.type === 'setEffects') validateEffects(command.effects);
    if (command.type === 'updateComposition') validateProperties(command.properties, COMPOSITION_RULES);
    if (command.type === 'createComposition') {
      fields(command.composition, ['id', ...Object.keys(COMPOSITION_RULES)], 'New composition'); id(command.composition.id, 'New composition id', true);
      const {id: ignored, ...properties} = command.composition; validateProperties(properties, COMPOSITION_RULES);
    }
  }
  return commands;
}

/** Independently revalidate and apply atomically. Commands never mutate the caller's project. */
export function applyProposal(project, proposal, options = {}) {
  fields(proposal, ['summary', 'commands', 'baseFingerprint', 'mode', 'scope', 'selection'], 'Proposal');
  text(proposal.summary, 'Proposal summary', 1200); text(proposal.baseFingerprint, 'Base fingerprint');
  if (fingerprintProject(project) !== proposal.baseFingerprint) reject('The project changed after this proposal was prepared. Generate a fresh proposal.', 409);
  const mode = proposal.mode || 'edit', scope = options.scope || proposal.scope || 'composition';
  if (!['edit', 'create', 'explain'].includes(mode) || !['selection', 'composition'].includes(scope)) reject('Invalid proposal mode or scope.');
  if (options.scope && proposal.scope && options.scope !== proposal.scope) reject('The editing scope changed. Generate a fresh proposal.', 409);
  const chosen = options.selection || proposal.selection || [];
  if (!Array.isArray(chosen) || chosen.length > 200) reject('Invalid layer selection.'); chosen.forEach(value => id(value, 'Selected layer'));
  if (options.selection && proposal.selection && JSON.stringify([...options.selection].sort()) !== JSON.stringify([...proposal.selection].sort())) reject('The selection changed. Generate a fresh proposal.', 409);
  validateCommands(proposal.commands);
  if (mode === 'explain' && proposal.commands.length) reject('Explanation requests cannot change a project.');
  const next = structuredClone(project), originalComp = getComp(project), selected = new Set(chosen), created = new Set(), changes = [], warnings = [];
  if (!originalComp) reject('The project has no active composition.');
  if (mode === 'edit' && scope === 'selection' && !selected.size) reject('Select at least one layer to edit.');
  for (const selectedId of selected) if (!originalComp.layers.some(layer => layer.id === selectedId)) reject('The selected layer is no longer in this composition.', 409);
  let target = getComp(next), createdComp = false;
  if (mode === 'create' && proposal.commands.length && proposal.commands[0]?.type !== 'createComposition') reject('Create mode must start by creating a new composition.');
  const targetLayer = layerId => {
    const layer = target.layers.find(item => item.id === layerId);
    if (!layer) reject(`Layer "${layerId}" does not exist in the target composition.`);
    if (layer.locked) reject(`"${layer.name}" is locked. Unlock it yourself before requesting edits.`);
    if (mode === 'edit' && scope === 'selection' && !selected.has(layerId) && !created.has(layerId)) reject(`"${layer.name}" is outside the selected scope.`);
    return layer;
  };
  for (const command of proposal.commands) {
    if (command.type === 'createComposition') {
      if (mode !== 'create' || createdComp) reject('Only create mode can create one new composition.');
      if (next.compositions.some(comp => comp.id === command.composition.id)) reject('That composition id already exists.');
      target = {...getComp(createBlankProject(command.composition)), ...command.composition, layers: []};
      next.compositions.push(target); next.activeCompId = target.id; createdComp = true;
      changes.push(`Create composition “${target.name}”`); continue;
    }
    if (command.type === 'updateComposition') {
      if (mode === 'edit' && (scope !== 'composition' || target.layers.some(layer => layer.locked))) reject('Composition settings require composition scope and no locked layers.');
      Object.assign(target, command.properties); changes.push(`Update composition ${Object.keys(command.properties).join(', ')}`); continue;
    }
    if (command.type === 'addLayer') {
      if (mode === 'edit' && scope === 'selection') reject('Adding layers requires composition scope.');
      if (target.layers.some(layer => layer.id === command.layer.id)) reject('That layer id already exists.');
      const layer = createLayer(command.layer.type, {x: target.width / 2, y: target.height / 2, end: target.duration, ...command.layer});
      target.layers.splice(Math.min(command.index ?? 0, target.layers.length), 0, layer); created.add(layer.id);
      changes.push(`Add ${layer.type} “${layer.name}”`); continue;
    }
    const layer = targetLayer(command.layerId);
    if (layer.type !== 'scene3d' && (command.type === 'updateLayer' && Object.keys(SCENE3D_DEFAULTS).some(key => key in command.properties) || ['setAnimation', 'removeTrack', 'removeKeyframe'].includes(command.type) && SCENE3D_ANIMATABLE.includes(command.property))) reject('3D controls require a 3D scene layer.');
    const transforms = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'anchorX', 'anchorY', 'parentId'];
    const affectsTransform = command.type === 'updateLayer' ? Object.keys(command.properties).some(key => transforms.includes(key)) : ['setAnimation', 'removeTrack', 'removeKeyframe'].includes(command.type) && transforms.includes(command.property);
    if (affectsTransform) {
        const descendants = new Set([layer.id]); let changed = true;
        while (changed) {changed = false; for (const item of target.layers) if (descendants.has(item.parentId) && !descendants.has(item.id)) {descendants.add(item.id); changed = true;}}
        for (const item of target.layers) if (item.id !== layer.id && descendants.has(item.id) && (item.locked || (mode === 'edit' && scope === 'selection' && !selected.has(item.id)))) reject('That transform would also move a locked or unselected descendant.');
    }
    if (command.type === 'updateLayer') {
      Object.assign(layer, structuredClone(command.properties)); changes.push(`Update “${layer.name}”: ${Object.keys(command.properties).join(', ')}`);
    } else if (command.type === 'deleteLayer') {
      if (target.layers.some(item => item.parentId === layer.id)) reject('Remove or explicitly reparent child layers before deleting their parent.');
      target.layers = target.layers.filter(item => item.id !== layer.id); changes.push(`Delete “${layer.name}”`);
    } else if (command.type === 'duplicateLayer') {
      if (target.layers.some(item => item.id === command.newId)) reject('That duplicate layer id already exists.');
      const copy = structuredClone(layer); copy.id = command.newId; copy.name = command.name || `${layer.name} copy`;
      for (const [property, keys] of Object.entries(copy.keyframes)) keys.forEach((key, index) => {key.id = `${copy.id}-${property}-${index}`;});
      copy.effects.forEach((effect, index) => {effect.id = `${copy.id}-effect-${index}`;});
      target.layers.splice(target.layers.indexOf(layer), 0, copy); created.add(copy.id); changes.push(`Duplicate “${layer.name}”`);
    } else if (command.type === 'setAnimation') {
      layer.keyframes[command.property] = command.keys.map((key, index) => ({...key, id: key.id || `${layer.id}-${command.property}-${index}`})).sort((a, b) => a.time - b.time);
      changes.push(`Animate “${layer.name}” ${command.property} with ${command.keys.length} keys`);
    } else if (command.type === 'removeTrack') {delete layer.keyframes[command.property]; changes.push(`Remove “${layer.name}” ${command.property} animation`);
    } else if (command.type === 'removeKeyframe') {
      if (!layer.keyframes[command.property]?.some(key => key.id === command.keyId)) reject('That keyframe no longer exists.');
      layer.keyframes[command.property] = layer.keyframes[command.property].filter(key => key.id !== command.keyId); changes.push(`Remove “${layer.name}” ${command.property} keyframe`);
    } else if (command.type === 'setEffects') {layer.effects = structuredClone(command.effects); changes.push(`Replace effects on “${layer.name}”`);}
  }
  const assetIds = new Set(next.assets.map(asset => asset.id));
  for (const layer of target.layers) {
    if (layer.parentId && !target.layers.some(parent => parent.id === layer.parentId)) reject('A layer references a missing parent.');
    if (layer.assetId && !assetIds.has(layer.assetId)) reject('A layer references media that is not in the project.');
    const asset = layer.assetId && next.assets.find(asset => asset.id === layer.assetId);
    if (asset && ((layer.type === 'scene3d') !== (asset.type === 'model3d'))) reject('A 3D scene layer must use a model3d asset; other layers cannot use model sources.');
    if (layer.type === 'scene3d' && asset?.clips && layer.modelClip >= Math.max(1, asset.clips.length)) reject('That 3D animation clip is not available in this asset.');
    if (layer.end < layer.start) reject('A layer cannot end before it begins.');
  }
  try {parseProject(JSON.stringify(next));} catch {reject('The proposed edits would create an invalid project. No changes were applied.');}
  return {project: next, changes, warnings};
}
