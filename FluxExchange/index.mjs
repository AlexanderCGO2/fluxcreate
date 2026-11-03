/** Flux Exchange: inert, portable Markdown handoffs between the two Flux editors. */
export const MAX_EXCHANGE_BYTES = 16 * 1024 * 1024;
export const EXCHANGE_VERSION = 1;
const APPS = new Set(['fluxiffects', 'fluxini']);
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const EASINGS = new Set(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'hold']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const assert = (condition, message) => { if (!condition) throw new Error(`Flux exchange: ${message}`); };
const id = () => globalThis.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const n = Math.floor(Math.random() * 16); return (c === 'x' ? n : (n & 3) | 8).toString(16); });
const num = (value, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
function bytes(value) { return new TextEncoder().encode(value).byteLength; }
function fileLimit(value) { assert(bytes(value) <= MAX_EXCHANGE_BYTES, 'file exceeds the 16 MB handoff limit. Remove large embedded media or relink it separately.'); }
function safeClone(value, depth = 0, state = { count: 0 }) {
  assert(++state.count <= 250000 && depth <= 32, 'data is too large or too deeply nested.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') { assert(Number.isFinite(value), 'numbers must be finite.'); return value; }
  if (typeof value === 'string') { assert(value.length <= MAX_EXCHANGE_BYTES, 'text exceeds the handoff limit.'); return value; }
  if (Array.isArray(value)) { assert(value.length <= 100000, 'an array has too many entries.'); return value.map(entry => safeClone(entry, depth + 1, state)); }
  assert(isObject(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)), 'only plain JSON objects are supported.');
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    assert(!BAD_KEYS.has(key), `unsafe property name “${key}”.`);
    if (entry !== undefined) result[key] = safeClone(entry, depth + 1, state);
  }
  return result;
}
function plain(value, label, max = 12000) {
  assert(typeof value === 'string' && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), `${label} must be plain text of at most ${max} characters.`);
  return value.replace(/\r\n?/g, '\n');
}
function snapshot(app, input, fonts) {
  let result;
  if (app === 'fluxini') {
    const pack = input?.format === 'fluxini-project-v1' ? input : { format: 'fluxini-project-v1', project: input, fonts: fonts ?? [] };
    assert(isObject(pack.project), 'FluxEffects project is missing.');
    const native = { ...pack.project }; delete native.exchange;
    result = safeClone({ format: 'fluxini-project-v1', project: native, fonts: pack.fonts ?? [] });
    assert(result.project.schemaVersion === 2 && isObject(result.project.graph) && Array.isArray(result.project.graph.nodes) && Array.isArray(result.project.graph.edges) && isObject(result.project.timeline), 'invalid FluxEffects project structure.');
    assert(result.project.graph.nodes.length <= 64 && result.project.graph.edges.length <= 128 && Array.isArray(result.fonts) && result.fonts.length <= 100, 'FluxEffects project or font budget exceeded.');
  } else {
    assert(isObject(input), 'FluxMotion project is missing.');
    const native = { ...input }; delete native.exchange;
    result = safeClone(native);
    assert(['fluxiffects', 'fluxiffects-ae'].includes(result.format) && result.version === 1 && Array.isArray(result.compositions) && Array.isArray(result.assets), 'invalid FluxMotion project structure.');
    assert(result.compositions.length > 0 && result.compositions.length <= 100 && result.assets.length <= 2000, 'FluxMotion composition or asset budget exceeded.');
    for (const comp of result.compositions) assert(isObject(comp) && Array.isArray(comp.layers) && comp.layers.length <= 2000, 'invalid FluxMotion composition layers.');
    // Blob URLs are tied to one browser session and cannot be a portable file reference.
    for (const asset of result.assets) if (typeof asset.src === 'string' && /^blob:/i.test(asset.src)) { asset.src = ''; asset.missing = true; }
  }
  return result;
}
function canvasSettings(input = {}) {
  assert(isObject(input), 'canvas settings must be an object.');
  const width = input.width ?? 1920, height = input.height ?? 1080, pixelsPerUnit = input.pixelsPerUnit ?? 100;
  assert(Number.isFinite(width) && width >= 1 && width <= 16384 && Number.isFinite(height) && height >= 1 && height <= 16384, 'canvas dimensions must be between 1 and 16384.');
  assert(Number.isFinite(pixelsPerUnit) && pixelsPerUnit >= 1 && pixelsPerUnit <= 10000, 'pixelsPerUnit must be between 1 and 10000.');
  return { width, height, pixelsPerUnit };
}
function validateEnvelope(input) {
  assert(isObject(input), 'expected an exchange object.');
  const value = safeClone(input);
  assert(value.format === 'flux-exchange' && value.version === EXCHANGE_VERSION, 'unknown format or version.');
  assert(APPS.has(value.sourceApp), 'sourceApp must be fluxiffects or fluxini.');
  assert(isObject(value.snapshots) && own(value.snapshots, value.sourceApp), 'the current source snapshot is missing.');
  assert(Object.keys(value.snapshots).every(app => APPS.has(app)), 'unknown snapshot application.');
  const snapshots = {};
  for (const app of Object.keys(value.snapshots)) snapshots[app] = snapshot(app, value.snapshots[app]);
  return { format: 'flux-exchange', version: 1, sourceApp: value.sourceApp, name: plain(value.name, 'name', 200), brief: plain(value.brief ?? '', 'creative brief', 6000), notes: plain(value.notes ?? '', 'handoff notes'), canvas: canvasSettings(value.canvas), snapshots };
}
function prose(value) {
  // All prose remains inert text. Escape Markdown syntax so notes cannot introduce a second fence.
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([\\`*_{}\[\]()#+.!|~\-])/g, '\\$1');
}
/** Export one canonical snapshot per app; previous must be an envelope, never an app project. */
export function encodeExchange({ app, project, fonts, previous, brief, notes, canvas } = {}) {
  assert(APPS.has(app), 'app must be fluxiffects or fluxini.');
  const prior = previous ? validateEnvelope(previous) : null;
  const source = snapshot(app, project, fonts);
  const comp = app === 'fluxiffects' ? source.compositions.find(c => c.id === source.activeCompId) ?? source.compositions[0] : null;
  const envelope = validateEnvelope({ format: 'flux-exchange', version: 1, sourceApp: app, name: text(app === 'fluxini' ? source.project.name : source.name, 'Untitled handoff').slice(0, 200), brief: brief ?? prior?.brief ?? '', notes: notes ?? prior?.notes ?? '', canvas: canvas ?? (comp ? { ...prior?.canvas, width: comp.width, height: comp.height } : prior?.canvas ?? {}), snapshots: { ...prior?.snapshots, [app]: source } });
  const serialized = JSON.stringify(envelope, null, 2);
  const output = `# ${prose(envelope.name)}\n\nFlux Exchange v1 · ${app === 'fluxini' ? 'FluxEffects' : 'FluxMotion'}\n\n## Creative brief\n\n${prose(envelope.brief) || 'No creative brief added.'}\n\n## Handoff notes\n\n${prose(envelope.notes) || 'No handoff notes added.'}\n\n## Project data\n\nThe JSON block is authoritative. Notes above are a readable copy; edit brief and notes inside the block to change the imported handoff. Native snapshots preserve their own app’s editable data. Conversion reports describe differences. Large footage should travel separately and be relinked.\n\n\`\`\`flux-exchange\n${serialized}\n\`\`\`\n`;
  fileLimit(output); return output;
}
/** Parse only the explicitly typed fence. Markdown is never evaluated or converted to HTML. */
export function decodeExchange(input) {
  assert(typeof input === 'string', 'choose a .flux.md file.'); fileLimit(input);
  const source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const openers = [...source.matchAll(/^```flux-exchange[ \t]*$/gm)];
  assert(openers.length === 1, 'the file must contain exactly one flux-exchange JSON block.');
  const start = openers[0].index + openers[0][0].length;
  const ending = /^```[ \t]*$/gm; ending.lastIndex = start;
  const close = ending.exec(source); assert(close, 'the exchange JSON block has no closing fence.');
  let parsed;
  try { parsed = JSON.parse(source.slice(start, close.index).trim()); } catch { throw new Error('Flux exchange: the canonical JSON block is not valid JSON.'); }
  return validateEnvelope(parsed);
}
function envelopeOf(value) { const result = typeof value === 'string' ? decodeExchange(value) : validateEnvelope(value); fileLimit(JSON.stringify(result)); return result; }
/** Validate an envelope stored as app metadata, applying the same limits as file import. */
export function validateExchange(value) { return envelopeOf(value); }
function uniqueWarnings() { const warnings = [], seen = new Set(); return { warnings, warn(message) { if (!seen.has(message)) { seen.add(message); warnings.push(message); } } }; }
function nativeResult(envelope, app, restoreOriginal, report) {
  if (envelope.sourceApp === app || (restoreOriginal && envelope.snapshots[app])) {
    if (envelope.sourceApp !== app) report.warn(`Restored the preserved ${app === 'fluxini' ? 'FluxEffects' : 'FluxMotion'} original. Edits made in the other app are not included in this restore.`);
    return snapshot(app, envelope.snapshots[app]);
  }
  if (restoreOriginal) report.warn('No original snapshot exists for this app; converted the current source instead.');
  return null;
}
function bounded(value, fallback, min, max, label, warn) { const raw = num(value, fallback), adjusted = clamp(raw, min, max); if (raw !== adjusted) warn(`${label} was limited to ${min}–${max}.`); return adjusted; }
function hex(value, fallback, label, warn) {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  if (/^#[\da-f]{3}$/i.test(value)) return '#' + value.slice(1).split('').map(c => c + c).join('');
  if (value === 'white') return '#ffffff'; if (value === 'black') return '#000000';
  if (value != null && value !== fallback) warn(`${label}: unsupported color replaced with ${fallback}.`);
  return fallback;
}
const fluxiniDefaults = {
  text: { text: 'FluxEffects', font: 'helvetiker_bold', size: 2.1, depth: .3, tracking: .12, color: '#dae9bc', opacity: 1, scale: 1, x: 0, y: 0, z: 0 },
  shape: { shape: 'sphere', radius: 1, width: 6, height: .5, depth: 6, scale: 1, color: '#7b94a0', opacity: 1, x: 0, y: 0, z: 0 },
  transform: { x: 0, y: 0, z: 0, rotateX: 0, rotateZ: 0, rotateY: 0, scale: 1 },
  output: {},
};
function fiNode(nodeId, type, label, params, index) { return { id: nodeId, type, label: (label.trim() || type).slice(0, 48), position: { x: type === 'output' ? 600 : type === 'transform' ? 300 : 0, y: (index % 64) * 110 }, params: { ...fluxiniDefaults[type], ...params } }; }
function fiEdge(source, target, index) { return { id: `exchange_edge_${index}`, source, target, input: 'scene' }; }
function makeLayer(type, overrides) {
  return { id: id(), name: type, type, visible: true, locked: false, start: 0, end: 8, x: 960, y: 540, width: 360, height: 360, anchorX: 180, anchorY: 180, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1, fill: '#b9b0ed', stroke: '#ffffff', strokeWidth: 0, cornerRadius: 0, text: '', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 100, fontWeight: 600, textAlign: 'center', letterSpacing: 0, assetId: null, blendMode: 'normal', effects: [], keyframes: {}, parentId: null, ...overrides };
}
/** Convert a composition to a bounded, editable procedural scene. Native source stays in exchange. */
export function toFluxini(input, { restoreOriginal = false } = {}) {
  const exchange = envelopeOf(input), report = uniqueWarnings(), { warn, warnings } = report;
  const native = nativeResult(exchange, 'fluxini', restoreOriginal, report);
  if (native) return { package: native, warnings, exchange };
  const source = exchange.snapshots.fluxiffects, comp = source.compositions.find(c => c.id === source.activeCompId) ?? source.compositions[0], unit = exchange.canvas.pixelsPerUnit;
  const duration = bounded(comp.duration, 8, 1, 999999, 'Duration', warn), fps = Math.round(bounded(comp.fps, 30, 12, 60, 'Frame rate', warn));
  if (fps !== comp.fps) warn(`Frame rate changed to ${fps} fps for FluxEffects.`);
  const project = { schemaVersion: 2, id: id(), workspaceId: 'local', branchId: 'main', name: text(source.name, 'Flux handoff').trim().slice(0, 100) || 'Flux handoff', revision: 0, graph: { nodes: [], edges: [] }, timeline: { duration, fps }, locks: [], animations: [] };
  const addTrack = (nodeId, param, keys, convert, label) => {
    if (!Array.isArray(keys) || !keys.length) return;
    assert(keys.length <= 24, `${label} has more than 24 keys. Simplify its animation before importing into FluxEffects.`);
    assert(project.animations.length < 128, 'the converted scene would exceed 128 animation tracks.');
    const normalized = new Map();
    for (const key of keys) {
      if (!Number.isFinite(key.time) || key.time < 0 || key.time > duration) { warn(`${label}: keys outside the scene duration were omitted.`); continue; }
      if(key.easing&&!EASINGS.has(key.easing))warn(`${label}: ${text(key.easing).slice(0,80)} easing was approximated as linear in FluxEffects; exact controls remain in the source snapshot.`);
      normalized.set(key.time, { time: key.time, value: convert(key.value), easing: EASINGS.has(key.easing) ? key.easing.replaceAll('-', ' ') : 'linear' });
    }
    if (normalized.size) project.animations.push({ nodeId, param, keys: [...normalized.values()].sort((a, b) => a.time - b.time) });
  };
  const layers = comp.layers;
  if (source.compositions.length > 1) warn('Only the active composition became a FluxEffects scene. Other compositions remain in the preserved source.');
  warn('2D artwork becomes a 3D scene: shading, camera framing, fonts, and depth can change its appearance.');
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index], label = text(layer.name, `Layer ${index + 1}`), type = layer.type;
    if (!['text', 'rectangle', 'ellipse', 'solid'].includes(type)) { warn(`${label}: ${type} layers remain in the source snapshot; FluxEffects cannot render this layer type.`); continue; }
    const keys = isObject(layer.keyframes) ? layer.keyframes : {}, sx = num(layer.scaleX, 1), sy = num(layer.scaleY, 1), rotation = num(layer.rotation);
    const needsTransform = rotation !== 0 || keys.rotation?.length;
    assert(project.graph.nodes.length + 1 + (needsTransform ? 1 : 0) <= 63, 'the converted scene would exceed 64 nodes. Reduce the number of layers.');
    const nodeId = `exchange_${index}`, position = { x: bounded((num(layer.x, comp.width / 2) - comp.width / 2) / unit, 0, -50, 50, `${label} X`, warn), y: bounded((comp.height / 2 - num(layer.y, comp.height / 2)) / unit, 0, -50, 50, `${label} Y`, warn), z: (layers.length - index) * .005 };
    const color = hex(layer.fill, '#b9b0ed', label, warn), opacity = bounded(layer.opacity, 1, 0, 1, `${label} opacity`, warn);
    let node;
    if (type === 'text') {
      const original = text(layer.text), content = original.replace(/[\r\n]+/g, ' ').slice(0, 48);
      if (content !== original) warn(`${label}: text was made single-line and limited to 48 characters; the original remains in the source.`);
      const size = bounded(num(layer.fontSize, 100) * Math.abs(sy) / unit, 1, .3, 5, `${label} font size`, warn);
      node = fiNode(nodeId, 'text', label, { ...position, text: content, font: num(layer.fontWeight, 600) >= 600 ? 'helvetiker_bold' : 'helvetiker_regular', size, depth: .02, tracking: bounded(num(layer.letterSpacing) / unit, 0, 0, 1, `${label} tracking`, warn), color, opacity }, index);
      warn(`${label}: typography uses a built-in outline font and centered 3D text. Font metrics and alignment may differ.`);
      if (sx !== sy) warn(`${label}: nonuniform text scale was approximated using its vertical scale.`);
    } else {
      const width = Math.abs(num(layer.width, 360) * sx / unit), height = Math.abs(num(layer.height, 360) * sy / unit);
      node = fiNode(nodeId, 'shape', label, { ...position, shape: type === 'ellipse' ? 'sphere' : 'box', radius: bounded(width / 2, 1, .1, 6, `${label} radius`, warn), width: bounded(width, 3.6, .2, 20, `${label} width`, warn), height: bounded(height, 3.6, .2, 20, `${label} height`, warn), depth: .2, color, opacity }, index);
      if (type === 'ellipse') warn(`${label}: ellipse became a sphere using its horizontal diameter.`);
      if (num(layer.cornerRadius)) warn(`${label}: rounded corners were not transferred.`);
    }
    node.visible = layer.visible !== false;
    if (sx < 0 || sy < 0) warn(`${label}: mirrored scale was converted to positive geometry size.`);
    if (num(layer.anchorX, num(layer.width) / 2) !== num(layer.width) / 2 || num(layer.anchorY, num(layer.height) / 2) !== num(layer.height) / 2) warn(`${label}: custom anchor points were centered for 3D placement.`);
    if (layer.parentId) warn(`${label}: parenting was not transferred; local placement was used.`);
    if (layer.gradient || layer.effects?.length || num(layer.strokeWidth) || (layer.blendMode && layer.blendMode !== 'normal')) warn(`${label}: gradients, effects, strokes, and blend modes remain in the source snapshot.`);
    if (num(layer.start) !== 0 || num(layer.end, duration) !== duration) warn(`${label}: layer in/out timing was not transferred; the 3D object spans the scene.`);
    project.graph.nodes.push(node);
    let outputId = nodeId;
    if (needsTransform) {
      const transformId = `${nodeId}_rotation`;
      // Rotating at the layer origin requires placement on the transform rather than on its child.
      node.params.x = 0; node.params.y = 0; node.params.z = 0;
      project.graph.nodes.push(fiNode(transformId, 'transform', `${label} rotation`, { ...position, rotateZ: bounded(-rotation, 0, -180, 180, `${label} rotation`, warn) }, index));
      project.graph.edges.push(fiEdge(nodeId, transformId, project.graph.edges.length)); outputId = transformId;
      addTrack(transformId, 'rotateZ', keys.rotation, value => bounded(-num(value), 0, -180, 180, `${label} rotation animation`, warn), `${label} rotation`);
    }
    project.graph.edges.push(fiEdge(outputId, 'exchange_output', project.graph.edges.length));
    const positionId = needsTransform ? outputId : nodeId;
    addTrack(positionId, 'x', keys.x, value => bounded((num(value) - comp.width / 2) / unit, 0, -50, 50, `${label} X animation`, warn), `${label} X`);
    addTrack(positionId, 'y', keys.y, value => bounded((comp.height / 2 - num(value)) / unit, 0, -50, 50, `${label} Y animation`, warn), `${label} Y`);
    addTrack(nodeId, 'opacity', keys.opacity, value => bounded(value, 1, 0, 1, `${label} opacity animation`, warn), `${label} opacity`);
    addTrack(nodeId, 'color', keys.fill, value => hex(value, color, label, warn), `${label} color`);
    if (keys.fill?.length) warn('Color animation uses linear-light interpolation in FluxEffects; intermediate colors may differ.');
    for (const property of Object.keys(keys)) if (!['x', 'y', 'opacity', 'fill', 'rotation'].includes(property) && keys[property]?.length) warn(`${label}: ${property} animation remains in the source snapshot.`);
  }
  project.graph.nodes.push(fiNode('exchange_output', 'output', 'Scene output', {}, 0));
  if (project.graph.nodes.length === 1) warn('No editable layers could be converted. The original project is retained in the handoff.');
  return { package: { format: 'fluxini-project-v1', project, fonts: [] }, warnings, exchange };
}
/** Project simple connected 3D branches onto the shared 2D canvas. */
export function toFluxiffects(input, { restoreOriginal = false } = {}) {
  const exchange = envelopeOf(input), report = uniqueWarnings(), { warn, warnings } = report;
  const native = nativeResult(exchange, 'fluxiffects', restoreOriginal, report);
  if (native) return { project: native, warnings, exchange };
  const source = exchange.snapshots.fluxini.project, { width, height, pixelsPerUnit: unit } = exchange.canvas;
  const duration = bounded(source.timeline.duration, 8, .01, 86400, 'Composition duration', warn), fps = bounded(source.timeline.fps, 30, 1, 240, 'Frame rate', warn);
  const comp = { id: id(), name: text(source.name, 'FluxEffects handoff'), width, height, fps, duration, background: '#f6f5fa', layers: [] };
  const project = { format: 'fluxiffects', version: 1, id: id(), name: text(source.name, 'FluxEffects handoff'), activeCompId: comp.id, compositions: [comp], assets: [] };
  const nodes = new Map(source.graph.nodes.map(node => [node.id, node])), edges = source.graph.edges, tracks = source.animations ?? [];
  const output = source.graph.nodes.find(node => node.type === 'output'); assert(output, 'FluxEffects scene has no output node.');
  assert(new Set(source.graph.nodes.map(node => node.id)).size === source.graph.nodes.length, 'FluxEffects node IDs must be unique.');
  let visitedBranches = 0;
  warn('This is a flat editable projection, not a camera render. For the full 3D appearance, render PNG or WebM in FluxEffects and import that footage.');
  const addTrack = (layer, property, nodeId, param, convert) => {
    const track = tracks.find(entry => entry.nodeId === nodeId && entry.param === param);
    if (!track) return;
    const keys = new Map();
    for (const key of track.keys ?? []) {
      if (!Number.isFinite(key.time) || key.time < 0 || key.time > duration) { warn(`${layer.name}: animation outside the composition duration was omitted.`); continue; }
      const easing = text(key.easing, 'linear').replaceAll(' ', '-');
      if(!EASINGS.has(easing))warn(`${layer.name}: ${easing.slice(0,80)} easing was approximated as linear in FluxMotion; exact controls remain in the source snapshot.`);
      keys.set(key.time, { id: id(), time: key.time, value: convert(key.value), easing: EASINGS.has(easing) ? easing : 'linear' });
    }
    if (keys.size) layer.keyframes[property] = [...keys.values()].sort((a, b) => a.time - b.time);
  };
  const visit = (nodeId, context = { x: 0, y: 0, scale: 1, rotation: 0, visible: true, color: null, opacity: 1, wrapped: false }, path = new Set()) => {
    assert(++visitedBranches <= 4096, 'graph has too many connected branches to project.');
    assert(!path.has(nodeId), 'FluxEffects graph contains a cycle.');
    assert(path.size <= 64, 'FluxEffects graph is too deep.');
    const node = nodes.get(nodeId); assert(node, 'a connection references a missing node.');
    const nextPath = new Set(path).add(nodeId), p = node.params ?? {}, label = text(node.label, node.type), visible = context.visible && node.visible !== false;
    if (['transform', 'material', 'textAnimate'].includes(node.type)) {
      const next = { ...context, visible, wrapped: true };
      if (node.type === 'transform') {
        const rad = context.rotation * Math.PI / 180, x = num(p.x) * context.scale, y = num(p.y) * context.scale;
        next.x += Math.cos(rad) * x - Math.sin(rad) * y; next.y += Math.sin(rad) * x + Math.cos(rad) * y;
        next.scale *= num(p.scale, 1); next.rotation += num(p.rotateZ);
        if (num(p.rotateX) || num(p.rotateY) || num(p.z)) warn(`${label}: 3D depth and out-of-plane rotations were flattened.`);
      } else if (node.type === 'material') { next.color = p.color ?? next.color; next.opacity *= num(p.opacity, 1); warn(`${label}: physical shading was reduced to fill color and opacity.`); }
      else warn(`${label}: procedural character animation was not transferred; the text remains editable.`);
      if (tracks.some(track => track.nodeId === node.id)) warn(`${label}: wrapper animation remains in the native FluxEffects snapshot.`);
      const parents = edges.filter(edge => edge.target === node.id && ['scene', 'text'].includes(edge.input));
      for (const parent of parents) visit(parent.source, next, nextPath);
      return;
    }
    if (!['text', 'shape', 'primitive'].includes(node.type)) { if (!['camera', 'light'].includes(node.type)) warn(`${label}: procedural ${node.type} requires a PNG/WebM render for compositing; its native graph is preserved.`); else warn(`${label}: camera and lighting are not part of the flat projection.`); return; }
    assert(comp.layers.length < 2000, 'projection has too many visible branches.');
    const scale = num(p.scale, 1) * context.scale, radians = context.rotation * Math.PI / 180;
    const lx = num(p.x) * context.scale, ly = num(p.y) * context.scale;
    const x = width / 2 + (context.x + Math.cos(radians) * lx - Math.sin(radians) * ly) * unit;
    const y = height / 2 - (context.y + Math.sin(radians) * lx + Math.cos(radians) * ly) * unit;
    let layer;
    if (node.type === 'text') {
      const fontSize = clamp(num(p.size, 1) * unit, 1, 10000), content = text(p.text), textWidth = clamp(Math.max(100, content.length * fontSize * .7), 1, 32768), textHeight = Math.min(32768, fontSize * 1.3);
      layer = makeLayer('text', { text: content, fontSize, fontWeight: text(p.font).includes('bold') ? 700 : 400, letterSpacing: num(p.tracking) * unit, width: textWidth, height: textHeight, anchorX: textWidth / 2, anchorY: textHeight / 2 });
      warn(`${label}: outline font, extrusion, and text metrics were approximated with editable system text.`);
    } else {
      const shape = node.type === 'shape' ? p.shape : p.geometry, ellipse = ['sphere', 'torus', 'cylinder', 'cone'].includes(shape);
      const baseWidth = node.type === 'shape' ? p.shape === 'sphere' ? num(p.radius, 1) * 2 : num(p.width, 3.6) : num(p.size, 2);
      const baseHeight = node.type === 'shape' ? p.shape === 'sphere' ? num(p.radius, 1) * 2 : num(p.height, 3.6) : num(p.size, 2);
      const w = bounded(baseWidth * unit, 360, 1, 32768, `${label} width`, warn), h = bounded(baseHeight * unit, 360, 1, 32768, `${label} height`, warn);
      layer = makeLayer(ellipse ? 'ellipse' : 'rectangle', { width: w, height: h, anchorX: w / 2, anchorY: h / 2 });
      warn(`${label}: ${shape} geometry was approximated as an editable ${ellipse ? 'ellipse' : 'rectangle'}.`);
    }
    Object.assign(layer, { name: label, x, y, scaleX: scale, scaleY: scale, rotation: -(context.rotation + num(p.rotateZ)), opacity: clamp(num(p.opacity, 1) * context.opacity, 0, 1), fill: hex(context.color ?? p.color, '#b9b0ed', label, warn), visible, start: 0, end: duration });
    if (num(p.z) || num(p.rotateX) || num(p.rotateY)) warn(`${label}: depth and out-of-plane rotations were flattened.`);
    if (!context.wrapped) {
      addTrack(layer, 'x', node.id, 'x', value => width / 2 + num(value) * unit);
      addTrack(layer, 'y', node.id, 'y', value => height / 2 - num(value) * unit);
      addTrack(layer, 'scaleX', node.id, 'scale', value => num(value, 1));
      addTrack(layer, 'scaleY', node.id, 'scale', value => num(value, 1));
      addTrack(layer, 'rotation', node.id, 'rotateZ', value => -num(value));
    } else if (tracks.some(track => track.nodeId === node.id && ['x', 'y', 'scale', 'rotateZ'].includes(track.param))) warn(`${label}: transform animation inside a wrapper remains in the native snapshot.`);
    addTrack(layer, 'opacity', node.id, 'opacity', value => clamp(num(value, 1) * context.opacity, 0, 1));
    if (!context.color) addTrack(layer, 'fill', node.id, 'color', value => hex(value, layer.fill, label, warn));
    for (const track of tracks.filter(track => track.nodeId === node.id)) if (!['x', 'y', 'scale', 'rotateZ', 'opacity', 'color'].includes(track.param)) warn(`${label}: ${track.param} animation remains in the source snapshot.`);
    if (tracks.some(track => track.nodeId === node.id && track.param === 'color')) warn('Color animation uses sRGB interpolation in FluxMotion; intermediate colors may differ.');
    comp.layers.push(layer);
  };
  for (const connection of edges.filter(edge => edge.target === output.id && edge.input === 'scene')) visit(connection.source);
  if (!comp.layers.length) warn('No editable 2D layers were found. Export the FluxEffects scene as PNG or WebM, then import that footage. The original graph remains preserved.');
  return { project, warnings, exchange };
}
export function inspectExchange(input) {
  const envelope = envelopeOf(input), source = envelope.snapshots[envelope.sourceApp], native = envelope.sourceApp === 'fluxini' ? source.project : source;
  return { name: envelope.name, sourceApp: envelope.sourceApp, brief: envelope.brief, notes: envelope.notes, canvas: envelope.canvas, preservedApps: Object.keys(envelope.snapshots), compositions: native.compositions?.length ?? 0, nodes: native.graph?.nodes.length ?? 0, layers: native.compositions?.reduce((count, comp) => count + comp.layers.length, 0) ?? 0 };
}
