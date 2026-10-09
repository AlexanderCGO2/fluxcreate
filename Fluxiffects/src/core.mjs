import {normalizeSuiteSource} from '../../FluxCreate/shared/suite-source.mjs';
import { validateExchange } from '@flux-studio/exchange';
/** The serializable, renderer-independent Fluxiffects project model. */
export const EASINGS = Object.freeze({linear: 'Linear', 'ease-in': 'Ease in', 'ease-out': 'Ease out', 'ease-in-out': 'Easy ease', hold: 'Hold'});
export const SCENE3D_DEFAULTS = Object.freeze({modelX: 0, modelY: 0, modelZ: 0, modelRotationX: 0, modelRotationY: 0, modelRotationZ: 0, modelScale: 1, cameraYaw: 0, cameraPitch: 0, cameraZoom: 1, modelClip: 0, modelLoop: true});
export const SCENE3D_RANGES = Object.freeze({modelX: [-1000000, 1000000], modelY: [-1000000, 1000000], modelZ: [-1000000, 1000000], modelRotationX: [-36000, 36000], modelRotationY: [-36000, 36000], modelRotationZ: [-36000, 36000], modelScale: [0.001, 1000], cameraYaw: [-36000, 36000], cameraPitch: [-89, 89], cameraZoom: [0.01, 1000]});
export const SCENE3D_ANIMATABLE = Object.freeze(Object.keys(SCENE3D_RANGES));
export const ANIMATABLE_PROPERTIES = Object.freeze(['x', 'y', 'width', 'height', 'anchorX', 'anchorY', 'scaleX', 'scaleY', 'rotation', 'opacity', 'volume', 'fontSize', 'letterSpacing', 'strokeWidth', 'cornerRadius', 'fill', 'stroke', ...SCENE3D_ANIMATABLE]);
const TYPES = new Set(['text', 'rectangle', 'ellipse', 'image', 'video', 'audio', 'solid', 'null', 'scene3d']);
const BLENDS = new Set(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'exclusion']);
const EFFECTS = new Set(['blur', 'shadow', 'brightness', 'contrast', 'saturate', 'hue', 'grayscale', 'sepia', 'glow']);
const COLOR = /^(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\)|transparent|black|white)$/i;
const PROPERTY_RANGES = {opacity: [0, 1], volume:[0,1], scaleX: [-1000, 1000], scaleY: [-1000, 1000], width: [0, 32768], height: [0, 32768], fontSize: [1, 10000], strokeWidth: [0, 10000], cornerRadius: [0, 32768], letterSpacing: [-10000, 10000], ...SCENE3D_RANGES};
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
let sequence = 0;
export function uid() { return globalThis.crypto?.randomUUID?.() ?? `fx-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }

export function createLayer(type = 'rectangle', overrides = {}) {
  if (!TYPES.has(type)) throw new Error(`Unsupported layer type: ${type}`);
  const text = type === 'text';
  const width = overrides.width ?? (text ? 800 : 360), height = overrides.height ?? (text ? 150 : 360);
  return {
    id: uid(), name: text ? 'Your next idea' : type[0].toUpperCase() + type.slice(1),
    visible: true, locked: false, start: 0, end: 8,
    x: 960, y: 540, width, height, anchorX: text ? 0 : width / 2, anchorY: text ? 0 : height / 2,
    scaleX: 1, scaleY: 1, rotation: 0, opacity: 1,
    fill: text ? '#1d1d26' : '#8c82fc', stroke: '#ffffff', strokeWidth: 0, cornerRadius: 40,
    text: text ? 'Your next idea' : '', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: 100, fontWeight: 600, textAlign: 'left', letterSpacing: -2,
    assetId: null, blendMode: 'normal', effects: [], keyframes: {}, parentId: null, ...(['audio','video'].includes(type)?{volume:1,muted:false,sourceIn:0,playbackRate:1,fadeIn:0,fadeOut:0}:{}), ...(type === 'scene3d' ? SCENE3D_DEFAULTS : {}), ...overrides, type,
  };
}

export function createBlankProject(settings = {}) {
  const comp = {id: uid(), name: settings.name ?? 'Untitled composition', width: settings.width ?? 1920, height: settings.height ?? 1080, fps: settings.fps ?? 30, duration: settings.duration ?? 8, background: settings.background ?? '#f6f5fa', layers: []};
  return {format: 'fluxiffects', version: 1, id: uid(), name: settings.projectName ?? settings.name ?? 'Untitled project', activeCompId: comp.id, compositions: [comp], assets: []};
}
export function getComp(project) { return project?.compositions?.find(comp => comp.id === project.activeCompId) ?? project?.compositions?.[0] ?? null; }

export function createDemoProject() {
  const project = createBlankProject({name: 'A little movement', projectName: 'First light', background: '#f6f5fa'});
  const animated = (layer, tracks) => { for (const [property, keys] of Object.entries(tracks)) for (const [time, value, easing = 'ease-in-out'] of keys) layer = setKeyframe(layer, property, time, value, easing); return layer; };
  getComp(project).layers = [
    animated(createLayer('text', {name: 'Ideas, in motion.', text: 'Ideas,\nin motion.', x: 180, y: 285, width: 1050, height: 420, fontSize: 155, fontWeight: 600, letterSpacing: -7, anchorX: 0, anchorY: 0}), {y: [[0, 335], [1.1, 285]], opacity: [[0, 0], [0.85, 1]]}),
    animated(createLayer('text', {name: 'A little movement', text: 'A LITTLE MOVEMENT. ENDLESS POSSIBILITY.', x: 190, y: 210, width: 1110, height: 55, fontSize: 22, fontWeight: 600, letterSpacing: 3.4, fill: '#797780', anchorX: 0, anchorY: 0}), {opacity: [[0.2, 0], [1.05, 1]]}),
    createLayer('text', {name: 'Made in Fluxiffects', text: 'Made in Fluxiffects', x: 190, y: 890, width: 600, height: 50, fontSize: 27, fontWeight: 400, letterSpacing: 0, fill: '#84818b', anchorX: 0, anchorY: 0}),
    animated(createLayer('ellipse', {name: 'Pearl', x: 1432, y: 352, width: 150, height: 150, fill: '#ece5ff', gradient: {from: '#fffaff', to: '#b7adfa', angle: 130}, effects: [{id: uid(), type: 'shadow', enabled: true, amount: 20}]}), {y: [[0, 305], [1.4, 352], [4, 322], [8, 352]]}),
    animated(createLayer('ellipse', {name: 'Coral orbit', x: 1512, y: 680, width: 295, height: 295, fill: '#f6b9d3', gradient: {from: '#ffd8e5', to: '#d584c2', angle: 135}, effects: [{id: uid(), type: 'shadow', enabled: true, amount: 18}]}), {y: [[0, 745], [1.3, 680], [4.5, 650], [8, 680]], scaleX: [[0, 0.7], [1.3, 1]], scaleY: [[0, 0.7], [1.3, 1]]}),
    animated(createLayer('rectangle', {name: 'Lilac ribbon', x: 1362, y: 570, width: 310, height: 580, cornerRadius: 155, rotation: -27, fill: '#a499ee', gradient: {from: '#d8ceff', to: '#7466dc', angle: 115}, effects: [{id: uid(), type: 'shadow', enabled: true, amount: 22}]}), {rotation: [[0, -39], [1.4, -27], [4, -22], [8, -27]], y: [[0, 680], [1.3, 570]]}),
    animated(createLayer('ellipse', {name: 'Blue hour', x: 1500, y: 483, width: 455, height: 455, fill: '#708ff4', gradient: {from: '#acbcff', to: '#4d6fe2', angle: 135}, effects: [{id: uid(), type: 'shadow', enabled: true, amount: 20}]}), {x: [[0, 1600], [1.25, 1500], [4, 1520], [8, 1500]], opacity: [[0, 0], [0.9, 1]]}),
    createLayer('ellipse', {name: 'Soft reflection', x: 1430, y: 849, width: 505, height: 72, fill: '#cbc8e5', opacity: 0.38, effects: [{id: uid(), type: 'blur', enabled: true, amount: 24}]}),
  ];
  return project;
}

export const DEFAULT_BEZIER = Object.freeze([.25,.1,.25,1]);
export function normalizeBezier(value){
  if(!Array.isArray(value)||value.length!==4||value.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1))throw Error('Bezier curve controls must be four numbers between 0 and 1.');
  return [...value];
}
export function ease(progress, easing = 'linear', bezier) {
  const t = clamp(progress, 0, 1);
  if(easing==='cubic-bezier'){
    const [x1,y1,x2,y2]=bezier??DEFAULT_BEZIER;
    if(t===0||t===1)return t;
    const point=(u,a,b)=>3*(1-u)*(1-u)*u*a+3*(1-u)*u*u*b+u*u*u;
    // Invert the time coordinate; using the parameter directly changes timing.
    let u=t,low=0,high=1;
    for(let i=0;i<24;i++){const x=point(u,x1,x2),delta=x-t;if(Math.abs(delta)<1e-9)break;if(delta<0)low=u;else high=u;const derivative=3*(1-u)*(1-u)*x1+6*(1-u)*u*(x2-x1)+3*u*u*(1-x2),next=u-delta/derivative;u=derivative>1e-8&&next>low&&next<high?next:(low+high)/2;}
    return clamp(point(u,y1,y2),0,1);
  }
  if (easing === 'hold') return t < 1 ? 0 : 1;
  if (easing === 'ease-in') return t * t * t;
  if (easing === 'ease-out') return 1 - (1 - t) ** 3;
  if (easing === 'ease-in-out') return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  return t;
}
function interpolate(a, b, t) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * t;
  if (typeof a === 'string' && typeof b === 'string' && /^#[\da-f]{6}$/i.test(a) && /^#[\da-f]{6}$/i.test(b)) return '#' + [1, 3, 5].map(index => Math.round(parseInt(a.slice(index, index + 2), 16) + (parseInt(b.slice(index, index + 2), 16) - parseInt(a.slice(index, index + 2), 16)) * t).toString(16).padStart(2, '0')).join('');
  return t < 1 ? a : b;
}
/** A keyframe's easing controls the segment beginning at that keyframe. */
export function evaluateLayer(layer, time) {
  const result = {...layer};
  for (const property of ANIMATABLE_PROPERTIES) {
    const keys = layer.keyframes?.[property];
    if (!keys?.length) continue;
    if (time <= keys[0].time) {result[property] = keys[0].value; continue;}
    const last = keys[keys.length - 1];
    if (time >= last.time) {result[property] = last.value; continue;}
    let low = 0, high = keys.length - 1;
    while (low + 1 < high) {const mid = (low + high) >>> 1; if (keys[mid].time <= time) low = mid; else high = mid;}
    const a = keys[low], b = keys[high];
    result[property] = interpolate(a.value, b.value, ease((time - a.time) / (b.time - a.time), a.easing, a.bezier));
  }
  return result;
}
export function setKeyframe(layer, property, time, value, easing, bezier) {
  if (!ANIMATABLE_PROPERTIES.includes(property)) throw new Error(`Cannot animate property: ${property}`);
  if(property==='volume'&&(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1))throw new Error('Volume keyframes must be between 0 and 1.');
  if (SCENE3D_ANIMATABLE.includes(property)) {
    if (layer.type !== 'scene3d') throw new Error('3D animation controls require a 3D scene layer.');
    const [min, max] = SCENE3D_RANGES[property];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`3D keyframe ${property} must be between ${min} and ${max}.`);
  }
  if (!Number.isFinite(time) || time < -86400 || time > 172800) throw new Error('Keyframe time must be a finite number between -86400 and 172800 seconds.');
  const validValue = property === 'fill' || property === 'stroke' ? typeof value === 'string' && COLOR.test(value) : typeof value === 'number' && Number.isFinite(value);
  if (!validValue) throw new Error(`Invalid keyframe value for ${property}.`);
  const track = [...(layer.keyframes?.[property] ?? [])];
  const index = track.findIndex(key => Math.abs(key.time - time) < 0.000001);
  easing??=track[index]?.easing??'ease-in-out';
  if (!own(EASINGS, easing)&&easing!=='cubic-bezier') throw new Error(`Unknown easing: ${easing}`);
  const key = {id: index < 0 ? uid() : track[index].id, time, value, easing,...(easing==='cubic-bezier'?{bezier:normalizeBezier(bezier??track[index]?.bezier??DEFAULT_BEZIER)}:{})};
  if (index < 0) track.push(key); else track[index] = key;
  track.sort((a, b) => a.time - b.time);
  return {...layer, keyframes: {...layer.keyframes, [property]: track}};
}
export function updateKeyframeEasing(layer,property,keyId,easing,bezier){
  if(layer.locked)throw Error('Unlock the layer before changing its curve.');
  const key=layer.keyframes?.[property]?.find(k=>k.id===keyId);if(!key)throw Error('This keyframe no longer exists.');
  return setKeyframe(layer,property,key.time,key.value,easing,bezier);
}
export function removeKeyframe(layer, property, keyId) {
  if (!ANIMATABLE_PROPERTIES.includes(property)) return layer;
  const keyframes = {...layer.keyframes};
  keyframes[property] = (keyframes[property] ?? []).filter(key => key.id !== keyId);
  if (!keyframes[property].length) delete keyframes[property];
  return {...layer, keyframes};
}

const fail = message => {throw new Error(`Invalid project: ${message}`);};
function object(value, label) {if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`); return value;}
function string(value, fallback, label, limit = 2000) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.length > limit) fail(`${label} must be text of at most ${limit} characters.`);
  return value;
}
function number(value, fallback, label, min = -1000000, max = 1000000) {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${label} must be a number between ${min} and ${max}.`);
  return value;
}
function bool(value, fallback, label) {if (value === undefined) return fallback; if (typeof value !== 'boolean') fail(`${label} must be true or false.`); return value;}
function array(value, fallback, label, limit) {if (value === undefined) return fallback; if (!Array.isArray(value) || value.length > limit) fail(`${label} must be an array with at most ${limit} entries.`); return value;}
function color(value, fallback, label) {if (value === undefined) return fallback; if (typeof value !== 'string' || value.length > 100 || !COLOR.test(value)) fail(`${label} must be a valid color.`); return value;}
function identifier(value, fallback, label) {
  const result = string(value, fallback, label, 200);
  if (!result || /[\u0000-\u001f]/.test(result) || ['__proto__', 'constructor', 'prototype'].includes(result)) fail(`${label} is not a valid identifier.`);
  return result;
}

// Interchange metadata remains inert JSON. It is preserved for inspection and future fidelity.
function metadata(value, counters, depth = 0) {
  if (++counters.metadata > 100000 || depth > 20) fail('After Effects metadata exceeds the supported size or nesting depth.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') return string(value, '', 'metadata text', 100000);
  if (typeof value === 'number') {if (!Number.isFinite(value)) fail('metadata numbers must be finite.'); return value;}
  if (Array.isArray(value)) return array(value, [], 'metadata array', 10000).map(item => metadata(item, counters, depth + 1));
  object(value, 'metadata');
  const entries = Object.entries(value);
  if (entries.length > 10000) fail('metadata objects have too many properties.');
  return Object.fromEntries(entries.filter(([key]) => !['__proto__', 'constructor', 'prototype'].includes(key)).map(([key, item]) => [string(key, '', 'metadata key', 500), metadata(item, counters, depth + 1)]));
}
function preserveInterchange(input, output, warnings, counters) {
  if (input.aeMetadata !== undefined) output.aeMetadata = metadata(input.aeMetadata, counters);
  if (input.warnings !== undefined) {
    output.warnings = array(input.warnings, [], 'warnings', 1000).map(entry => string(entry, '', 'warning', 4000));
    warnings.push(...output.warnings);
  }
  return output;
}

function normalizeLayer(input, comp, warnings, counters) {
  object(input, 'layer');
  const type = input.type ?? 'null';
  if (!TYPES.has(type)) fail(`unsupported layer type "${String(type).slice(0, 80)}".`);
  if (type !== 'scene3d' && Object.keys(SCENE3D_DEFAULTS).some(key => input[key] !== undefined)) fail('3D controls require a 3D scene layer.');
  const base = createLayer(type);
  const layer = {
    ...base,
    id: identifier(input.id, base.id, 'layer id'), name: string(input.name, base.name, 'layer name'),
    visible: bool(input.visible, true, 'layer visibility'), locked: bool(input.locked, false, 'layer lock'),
    start: number(input.start, 0, 'layer start', -86400, 86400), end: number(input.end, comp.duration, 'layer end', -86400, 172800),
    width: number(input.width, base.width, 'layer width', 0, 32768), height: number(input.height, base.height, 'layer height', 0, 32768),
    scaleX: number(input.scaleX, 1, 'horizontal scale', -1000, 1000), scaleY: number(input.scaleY, 1, 'vertical scale', -1000, 1000),
    opacity: number(input.opacity, 1, 'opacity', 0, 1), rotation: number(input.rotation, 0, 'rotation'),
    fill: color(input.fill, base.fill, 'fill'), stroke: color(input.stroke, base.stroke, 'stroke'),
    strokeWidth: number(input.strokeWidth, 0, 'stroke width', 0, 10000), cornerRadius: number(input.cornerRadius, base.cornerRadius, 'corner radius', 0, 32768),
    text: string(input.text, base.text, 'layer text', 100000), fontFamily: string(input.fontFamily, base.fontFamily, 'font family', 300),
    fontSize: number(input.fontSize, base.fontSize, 'font size', 1, 10000), fontWeight: number(input.fontWeight, base.fontWeight, 'font weight', 1, 1000),
    letterSpacing: number(input.letterSpacing, base.letterSpacing, 'letter spacing', -10000, 10000),
    textAlign: ['left', 'center', 'right'].includes(input.textAlign) ? input.textAlign : 'left', blendMode: BLENDS.has(input.blendMode) ? input.blendMode : 'normal',
    assetId: input.assetId == null ? null : identifier(input.assetId, null, 'asset id'), parentId: input.parentId == null ? null : identifier(input.parentId, null, 'parent id'), effects: [], keyframes: {},
  };
  if (layer.end < layer.start) fail(`layer "${layer.name}" ends before it begins.`);
  for (const key of ['x', 'y', 'anchorX', 'anchorY']) layer[key] = number(input[key], base[key], key);
  if (type === 'scene3d') {
    for (const [key, range] of Object.entries(SCENE3D_RANGES)) layer[key] = number(input[key], SCENE3D_DEFAULTS[key], key, ...range);
    layer.modelClip = number(input.modelClip, 0, '3D animation clip', 0, 199);
    if (!Number.isInteger(layer.modelClip)) fail('3D animation clip must be a whole-number index.');
    layer.modelLoop = bool(input.modelLoop, true, '3D animation loop');
  }
  for (const key of ['sourceIn', 'playbackRate', 'volume']) {
    if (input[key] !== undefined) {
      const ranges = {sourceIn: [0, 86400], playbackRate: [0.1, 16], volume: [0, 1]};
      layer[key] = number(input[key], undefined, key, ...ranges[key]);
    }
  }
  if (input.muted !== undefined) layer.muted = bool(input.muted, false, 'media mute');
  for(const key of ['fadeIn','fadeOut'])if(input[key]!==undefined)layer[key]=number(input[key],0,key,0,86400);
  if (input.gradient != null) {object(input.gradient, 'gradient'); layer.gradient = {from: color(input.gradient.from, layer.fill, 'gradient start'), to: color(input.gradient.to, layer.fill, 'gradient end'), angle: number(input.gradient.angle, 135, 'gradient angle', -36000, 36000)};}
  for (const entry of array(input.effects, [], 'effects', 50)) {
    object(entry, 'effect');
    if (!EFFECTS.has(entry.type)) {warnings.push(`Skipped unsupported effect "${String(entry.type).slice(0, 80)}" on ${layer.name}.`); continue;}
    layer.effects.push({id: identifier(entry.id, uid(), 'effect id'), type: entry.type, enabled: bool(entry.enabled, true, 'effect enabled'), amount: number(entry.amount, 0, 'effect amount', -10000, 10000)});
  }
  if (input.keyframes !== undefined) object(input.keyframes, 'keyframes');
  for (const [property, entries] of Object.entries(input.keyframes ?? {})) {
    if (!ANIMATABLE_PROPERTIES.includes(property)) {warnings.push(`Skipped animation for unsupported property "${property.slice(0, 80)}".`); continue;}
    if (SCENE3D_ANIMATABLE.includes(property) && type !== 'scene3d') fail('3D animation controls require a 3D scene layer.');
    const track = array(entries, [], `${property} keyframes`, 10000);
    counters.keys += track.length;
    if (counters.keys > 100000) fail('a project can contain at most 100,000 keyframes.');
    const normalized = new Map();
    for (const key of track) {
      object(key, 'keyframe');
      const time = number(key.time, undefined, 'keyframe time', -86400, 172800);
      if (time === undefined) fail('keyframe time is required.');
      const value = property === 'fill' || property === 'stroke' ? color(key.value, undefined, 'keyframe color') : number(key.value, undefined, `${property} keyframe value`, ...(PROPERTY_RANGES[property] ?? [-1000000, 1000000]));
      if (value === undefined) fail('keyframe value is required.');
      normalized.set(time, {id: identifier(key.id, uid(), 'keyframe id'), time, value, easing: key.easing==='cubic-bezier'?'cubic-bezier':own(EASINGS, key.easing) ? key.easing : 'linear',...(key.easing==='cubic-bezier'?{bezier:normalizeBezier(key.bezier)}:{})});
    }
    layer.keyframes[property] = [...normalized.values()].sort((a, b) => a.time - b.time);
  }
  if(input.suiteSource!=null){layer.suiteSource=normalizeSuiteSource(input.suiteSource);counters.suiteSourceBytes=(counters.suiteSourceBytes||0)+new TextEncoder().encode(layer.suiteSource.text).length;if(counters.suiteSourceBytes>32*1024*1024)fail('Studio object sources exceed the 32 MB project budget.');}
  return preserveInterchange(input, layer, warnings, counters);
}

function normalizeAsset(input, warnings, counters) {
  object(input, 'asset');
  const type = input.type ?? 'image';
  if (!['image', 'video', 'audio', 'model3d'].includes(type)) fail('asset type must be image, video, audio, or model3d.');
  const asset = {id: identifier(input.id, uid(), 'asset id'), name: string(input.name, 'Untitled media', 'asset name'), type};
  const src = string(input.src ?? input.url, '', 'asset source', 140000000);
  // Sources are decoded only as Image/HTMLMediaElement input, never inserted as HTML.
  if (type === 'model3d') {
    const formats = {glb: 'model/gltf-binary', gltf: 'model/gltf+json', flux3d: 'application/vnd.flux3d+json'};
    if (!Object.hasOwn(formats, input.modelFormat)) fail('3D assets need a supported modelFormat: glb, gltf, or flux3d.');
    asset.modelFormat = input.modelFormat;
    if (src) {
      const prefix = `data:${formats[asset.modelFormat]};base64,`, payload = src.slice(prefix.length);
      if (!src.startsWith(prefix) || !payload.length || payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) fail(`unsafe or unsupported 3D source for asset "${asset.name}". Embed the complete source file as matching base64 data.`);
    }
    if (input.clips !== undefined) asset.clips = array(input.clips, [], '3D animation clips', 200).map(entry => {object(entry, '3D animation clip'); return {name: string(entry.name, '', '3D clip name', 240), duration: number(entry.duration, 0, '3D clip duration', 0, 86400)};});
  } else if (src && !/^(?:blob:|https?:\/\/|data:(?:image|video|audio)\/[a-z0-9.+-]+[;,])/i.test(src)) fail(`unsafe or unsupported source for asset "${asset.name}".`);
  asset.src = src;
  for (const key of ['width', 'height', 'duration']) if (input[key] !== undefined) asset[key] = number(input[key], 0, `asset ${key}`, 0, 1000000);
  if (input.path !== undefined) asset.path = string(input.path, '', 'asset path', 4000);
  if (input.missing !== undefined || !src) asset.missing = bool(input.missing, false, 'missing media') || !src;
  return preserveInterchange(input, asset, warnings, counters);
}

/** Validate imported files using a whitelist; never hydrate executable expressions or HTML. */
export function parseProject(text) {
  if (typeof text !== 'string') throw new Error('Choose a Fluxiffects project or an After Effects bridge JSON file.');
  if (text.length > 200000000) throw new Error('Project is too large. Keep project JSON under 200 MB and relink larger media separately.');
  let data;
  try {data = JSON.parse(text.replace(/^\uFEFF/, ''));} catch {throw new Error('This file is not valid JSON. Binary .aep projects need the included After Effects export script.');}
  object(data, 'project');
  let suiteWarning;
  if (data.format === 'fluxcreate-project') {
    if (data.version !== 1 || !['fluxoto', 'fluxidesign', 'fluximiere', 'flux3d'].includes(data.app)) fail('this FluxCreate project version or app is not supported.');
    object(data.project, 'source project');
    if (!data.motion) throw new Error(data.app === 'flux3d' ? 'Use Import → 3D scenes & motion to add this Flux3D document as a live 3D layer.' : 'This FluxCreate project has no portable composition. Export a new native project from its source app.');
    if (!['fluxiffects', 'fluxiffects-ae'].includes(data.motion.format)) fail('the FluxCreate portable scene must be a Fluxiffects composition.');
    suiteWarning = `Imported the portable composition from ${data.app}. Open the original file in its source app to recover its complete native project.`;
    data = object(data.motion, 'portable composition');
  }
  if (data.format !== 'fluxiffects' && data.format !== 'fluxiffects-ae') throw new Error('Unrecognized project format. Open a .fluxiffects file or JSON created by the After Effects bridge.');
  if (data.version !== undefined && data.version !== 1) fail('this project version is not supported.');
  const warnings = suiteWarning ? [suiteWarning] : [], counters = {layers: 0, keys: 0, metadata: 0};
  const assets = array(data.assets, [], 'assets', 2000).map(asset => normalizeAsset(asset, warnings, counters));
  const assetIds = new Set();
  for (const asset of assets) {if (assetIds.has(asset.id)) fail('duplicate asset ids.'); assetIds.add(asset.id);}
  const compIds = new Set();
  const compositions = array(data.compositions, [], 'compositions', 100).map(input => {
    object(input, 'composition');
    const comp = {
      id: identifier(input.id, uid(), 'composition id'), name: string(input.name, 'Untitled composition', 'composition name'),
      width: number(input.width, 1920, 'composition width', 1, 16384), height: number(input.height, 1080, 'composition height', 1, 16384),
      fps: number(input.fps, 30, 'frame rate', 1, 240), duration: number(input.duration, 8, 'duration', 0.01, 86400), background: color(input.background, '#f6f5fa', 'composition background'), layers: [],
    };
    if (compIds.has(comp.id)) fail('duplicate composition ids.'); compIds.add(comp.id);
    const layers = array(input.layers, [], 'layers', 2000);
    counters.layers += layers.length;
    if (counters.layers > 5000) fail('a project can contain at most 5,000 layers.');
    comp.layers = layers.map(layer => normalizeLayer(layer, comp, warnings, counters));
    const layerMap = new Map();
    for (const layer of comp.layers) {
      if (layerMap.has(layer.id)) fail('duplicate layer ids in a composition.'); layerMap.set(layer.id, layer);
      if (layer.assetId && !assetIds.has(layer.assetId)) warnings.push(`Media for "${layer.name}" is missing. Import and relink its source file.`);
      const asset = layer.assetId && assets.find(asset => asset.id === layer.assetId);
      if (asset && ((layer.type === 'scene3d') !== (asset.type === 'model3d'))) fail(`3D scene layer "${layer.name}" must reference a model3d asset; other layers cannot use model sources.`);
      if (layer.type === 'scene3d' && asset?.clips && layer.modelClip >= Math.max(1, asset.clips.length)) fail(`3D animation clip is unavailable on "${layer.name}".`);
    }
    for (const layer of comp.layers) {
      if (layer.parentId && !layerMap.has(layer.parentId)) {warnings.push(`Removed missing parent from "${layer.name}".`); layer.parentId = null;}
      const visited = new Set([layer.id]); let parentId = layer.parentId;
      while (parentId) {if (visited.has(parentId)) fail(`parent cycle involving "${layer.name}".`); visited.add(parentId); parentId = layerMap.get(parentId)?.parentId;}
    }
    return preserveInterchange(input, comp, warnings, counters);
  });
  if (!compositions.length) fail('at least one composition is required.');
  const activeCompId = compIds.has(data.activeCompId) ? data.activeCompId : compositions[0].id;
  const project = {format: 'fluxiffects', version: 1, id: identifier(data.id, uid(), 'project id'), name: string(data.name, 'Untitled project', 'project name'), activeCompId, compositions, assets};
  preserveInterchange(data, project, warnings, counters);
  if (data.brief !== undefined) project.brief = string(data.brief, '', 'creative brief', 6000);
  if (data.exchange !== undefined) project.exchange = validateExchange(data.exchange);
  return {project, warnings: [...new Set(warnings)].slice(0, 1000)};
}
