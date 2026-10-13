import {checkExport,validateVideoExport,preciseCodec,encodeCompositionWebM} from './video-export.mjs';
import { evaluateLayer } from './core.mjs';
import { loadSceneSource } from '../../Flux3D/src/compositor.mjs';
import {audioLayerGain,renderCompositionAudio} from './audio.mjs';

// Canvas rendering stays in composition pixels. The preview may use any backing size.
const assetCache = new Map();
const exportAssetKeys = new Set();
const layerMedia = new Map();
const layerScenes = new Map();
const mediaSubscribers = new Set();
const IDENTITY = [1, 0, 0, 1, 0, 0];
const BLEND_MODES = new Set(['source-over', 'multiply', 'screen', 'overlay', 'lighten', 'darken', 'difference', 'exclusion', 'color-dodge', 'color-burn', 'hard-light', 'soft-light']);
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const assetSource = asset => asset?.src || asset?.url || '';
const assetKey = asset => `${asset?.id || ''}|${assetSource(asset)}|${asset?.type || asset?.mimeType || ''}`;
const assetKind = asset => {
  const kind = String(asset?.type || asset?.mimeType || '').toLowerCase();
  if (kind === 'model3d') return 'model3d';
  if (kind.includes('video')) return 'video';
  if (kind.includes('audio')) return 'audio';
  return 'image';
};
const assetsArray = assets => Array.isArray(assets) ? assets : Object.values(assets || {});
const assetFor = (assets, id) => assetsArray(assets).find(asset => asset.id === id);

function notifyMediaChanged() {
  for (const callback of mediaSubscribers) {
    try { callback(); } catch { /* A preview subscriber cannot interrupt media decoding. */ }
  }
}

/** Redraw paused previews when an image loads or a video finishes an asynchronous seek. */
export function subscribeMedia(callback) {
  mediaSubscribers.add(callback);
  return () => mediaSubscribers.delete(callback);
}

function multiply(a, b) {
  return [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
}

function transformPoint(matrix, x, y) {
  return { x: matrix[0] * x + matrix[2] * y + matrix[4], y: matrix[1] * x + matrix[3] * y + matrix[5] };
}

function inverse(matrix) {
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-10) return null;
  return [d / determinant, -b / determinant, -c / determinant, a / determinant,
    (c * f - d * e) / determinant, (b * e - a * f) / determinant];
}

function localMatrix(layer) {
  const radians = number(layer.rotation) * Math.PI / 180;
  const sx = number(layer.scaleX, 1), sy = number(layer.scaleY, 1);
  const cosine = Math.cos(radians), sine = Math.sin(radians);
  const a = cosine * sx, b = sine * sx, c = -sine * sy, d = cosine * sy;
  const ax = number(layer.anchorX), ay = number(layer.anchorY);
  return [a, b, c, d, number(layer.x) - a * ax - c * ay, number(layer.y) - b * ax - d * ay];
}

function worldMatrix(layer, comp, time, visited = new Set()) {
  if (!layer || visited.has(layer.id)) return [...IDENTITY];
  visited.add(layer.id);
  const evaluated = evaluateLayer(layer, time);
  const parent = layer.parentId && comp.layers?.find(item => item.id === layer.parentId);
  return parent ? multiply(worldMatrix(parent, comp, time, visited), localMatrix(evaluated)) : localMatrix(evaluated);
}

function isActive(layer, time, comp) {
  return layer.visible !== false && time >= number(layer.start) && time < number(layer.end, comp.duration || Infinity);
}

function dimensions(layer) {
  return { width: Math.max(0, number(layer.width, 100)), height: Math.max(0, number(layer.height, 100)) };
}

/** Bounds are composition-space corners plus an axis-aligned rectangle and affine matrix. */
export function getLayerBounds(layer, comp, time = 0) {
  const evaluated = evaluateLayer(layer, time);
  const { width, height } = dimensions(evaluated);
  const matrix = worldMatrix(layer, comp, time);
  const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => transformPoint(matrix, x, y));
  const x = Math.min(...corners.map(point => point.x)), y = Math.min(...corners.map(point => point.y));
  return { x, y, width: Math.max(...corners.map(point => point.x)) - x,
    height: Math.max(...corners.map(point => point.y)) - y, corners, matrix };
}

/** The layer array is topmost-first. Hit tests invert the complete parent transform. */
export function hitTest(comp, time, x, y) {
  for (const layer of comp.layers || []) {
    if (!isActive(layer, time, comp) || layer.locked || layer.type === 'audio' || layer.type === 'null') continue;
    const evaluated = evaluateLayer(layer, time);
    if (number(evaluated.opacity, 1) <= 0) continue;
    const matrix = inverse(worldMatrix(layer, comp, time));
    if (!matrix) continue;
    const point = transformPoint(matrix, x, y);
    const { width, height } = dimensions(evaluated);
    if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) continue;
    if (layer.type === 'ellipse' && width > 0 && height > 0) {
      if (((point.x - width / 2) / (width / 2)) ** 2 + ((point.y - height / 2) / (height / 2)) ** 2 > 1) continue;
    }
    return layer;
  }
  return null;
}

function mediaReady(element, kind) {
  return kind === 'image' ? element.complete && element.naturalWidth > 0 : element.readyState >= 2;
}

function awaitElement(element, kind, signal) {
  checkExport(signal);
  if (mediaReady(element, kind)) return Promise.resolve(element);
  return new Promise((resolve, reject) => {
    const event = kind === 'image' ? 'load' : 'loadeddata';
    const cleanup = () => {
      clearTimeout(timeout);
      element.removeEventListener(event, success);
      element.removeEventListener('error', failure);
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => { cleanup(); reject(new DOMException('Export cancelled.', 'AbortError')); };
    const success = () => { cleanup(); resolve(element); };
    const failure = () => { cleanup(); reject(new Error('This media could not be decoded. Relink it to a supported image, video, or audio file.')); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Media loading timed out. Try a local file or relink this asset.')); }, 15000);
    element.addEventListener(event, success, { once: true });
    element.addEventListener('error', failure, { once: true });
    signal?.addEventListener('abort', abort, { once: true });
    if(signal?.aborted) abort();
  });
}

/** Cached per asset identity and source. HTTP assets must permit CORS for export. */
export function loadAsset(asset, signal) {
  checkExport(signal);
  if (!assetSource(asset)) return Promise.reject(new Error('This asset has no source. Relink the missing file.'));
  const key = assetKey(asset);
  if (assetCache.has(key)) return assetCache.get(key).promise;
  const kind = assetKind(asset);
  if (kind === 'model3d') {
    const record = { element: null, kind, state: 'loading', promise: null, disposed: false };
    assetCache.set(key, record);
    record.promise = loadSceneSource(asset).then(source => {
      if (record.disposed || assetCache.get(key) !== record) { source.dispose(); throw new DOMException('Scene load was superseded.', 'AbortError'); }
      record.element = source; record.state = 'ready'; notifyMediaChanged(); return source;
    }, error => { if (!record.disposed) { record.state = 'error'; record.error = error; notifyMediaChanged(); } throw error; });
    return record.promise;
  }
  const element = kind === 'image' ? new Image() : document.createElement(kind);
  if (/^https?:/i.test(assetSource(asset))) element.crossOrigin = 'anonymous';
  if (kind !== 'image') {
    element.preload = 'auto';
    element.playsInline = true;
    element.muted = true;
  }
  const record = { element, kind, state: 'loading', promise: null };
  assetCache.set(key, record);
  record.promise = awaitElement(element, kind, signal).then(result => { record.state = 'ready'; notifyMediaChanged(); return result; }, error => {
    record.state = 'error'; record.error = error; notifyMediaChanged(); throw error;
  });
  element.src = assetSource(asset);
  if (kind !== 'image') element.load();
  return record.promise;
}

/** Missing media is reported per asset; it does not prevent the rest of a project opening. */
export async function prepareAssets(assets) {
  const entries = assetsArray(assets);
  return Promise.all(entries.map(async asset => {
    try { await loadAsset(asset); return { assetId: asset.id, status: 'fulfilled' }; }
    catch (error) { return { assetId: asset.id, status: 'rejected', reason: error.message }; }
  }));
}

function getLayerMedia(comp, layer, asset) {
  if (!asset || !assetSource(asset)) return null;
  const key = assetKey(asset);
  if (!assetCache.has(key)) {
    loadAsset(asset).catch(() => {});
    return null;
  }
  const cached = assetCache.get(key);
  if (cached.state !== 'ready') return null;
  if (cached.kind === 'image') return cached.element;
  const instanceKey = `${comp.id || 'composition'}|${layer.id}|${key}`;
  if (!layerMedia.has(instanceKey)) {
    const element = cached.element.cloneNode(false);
    element.preload = 'auto';
    element.playsInline = true;
    element.muted = true;
    element.addEventListener('loadeddata', notifyMediaChanged);
    element.addEventListener('seeked', notifyMediaChanged);
    const record = { element, compId: comp.id || 'composition', layerId: layer.id, kind: cached.kind, promise: null };
    record.promise = awaitElement(element, cached.kind);
    // Playback may start before a clone is ready; preview will pick it up on the next frame.
    record.promise.catch(() => {});
    layerMedia.set(instanceKey, record);
    element.load();
  }
  return layerMedia.get(instanceKey).element;
}

function disposeSceneRecord(key, record) { record.disposed = true; record.instance?.dispose(); layerScenes.delete(key); }

function getLayerScene(comp, layer, asset) {
  if (!asset || assetKind(asset) !== 'model3d' || !assetSource(asset)) return null;
  const key = assetKey(asset), instanceKey = (comp.id || 'composition') + '|' + layer.id + '|' + key;
  for (const [oldKey, record] of layerScenes) if (record.compId === (comp.id || 'composition') && record.layerId === layer.id && oldKey !== instanceKey) disposeSceneRecord(oldKey, record);
  if (!assetCache.has(key)) { loadAsset(asset).catch(() => {}); return null; }
  const cached = assetCache.get(key); if (cached.state !== 'ready') return null;
  if (!layerScenes.has(instanceKey)) {
    const record = { compId: comp.id || 'composition', layerId: layer.id, assetKey: key, instance: null, error: null };
    try { record.instance = cached.element.create(); } catch (error) { record.error = error; }
    layerScenes.set(instanceKey, record);
  }
  return layerScenes.get(instanceKey);
}

function pruneCompositionScenes(comp, assets) {
  const active = new Map((comp.layers || []).filter(layer => layer.type === 'scene3d').map(layer => [layer.id, assetKey(assetFor(assets, layer.assetId))]));
  for (const [key, record] of layerScenes) if (record.compId === (comp.id || 'composition') && active.get(record.layerId) !== record.assetKey) disposeSceneRecord(key, record);
}

/** Drop removed model templates and stale layer instances without touching other project media. */
export function disposeUnusedAssets(assets) {
  const keep = new Set(assetsArray(assets).map(assetKey));
  for (const [key, record] of layerScenes) if (!keep.has(record.assetKey) && !exportAssetKeys.has(record.assetKey)) disposeSceneRecord(key, record);
  for (const [key, record] of assetCache) if (record.kind === 'model3d' && !keep.has(key) && !exportAssetKeys.has(key)) {
    record.disposed = true; record.element?.dispose(); assetCache.delete(key);
  }
}

function mediaTime(layer, time, element) {
  const requested = Math.max(0, (time - number(layer.start)) * number(layer.playbackRate, 1) + number(layer.sourceIn));
  return Number.isFinite(element.duration) ? clamp(requested, 0, Math.max(0, element.duration - 0.001)) : requested;
}

/** Preview and export share gain automation and independent picture/audio fades. */
export function syncMedia(comp, assets, time, playing = false) {
  const activeElements = new Set();
  for (const layer of comp.layers || []) {
    if (layer.type !== 'video' && layer.type !== 'audio') continue;
    const element = getLayerMedia(comp, layer, assetFor(assets, layer.assetId));
    if (!element) continue;
    activeElements.add(element);
    const active = isActive(layer, time, comp);
    if (!active) { element.pause(); continue; }
    const desired = mediaTime(layer, time, element);
    const tolerance = playing ? 0.22 : 0.025;
    if (element.readyState >= 1 && Math.abs(element.currentTime - desired) > tolerance) {
      try { element.currentTime = desired; } catch { /* Metadata is still becoming available. */ }
    }
    element.playbackRate = clamp(number(layer.playbackRate, 1), 0.1, 16);
    element.volume = clamp(audioLayerGain(layer,time), 0, 1);
    element.muted = !!layer.muted;
    if (playing && element.paused && !element.ended) element.play().catch(() => {});
    else if (!playing && !element.paused) element.pause();
  }
  for (const record of layerMedia.values()) {
    if (record.compId === (comp.id || 'composition') && !activeElements.has(record.element)) record.element.pause();
  }
}

/** Release an export's isolated media instances, or stop media when closing a project. */
export function disposeCompositionMedia(compId) {
  for (const [key, record] of layerScenes) if (record.compId === compId) disposeSceneRecord(key, record);
  for (const [key, record] of layerMedia) {
    if (record.compId !== compId) continue;
    record.element.pause();
    record.element.removeEventListener('loadeddata', notifyMediaChanged);
    record.element.removeEventListener('seeked', notifyMediaChanged);
    record.element.removeAttribute('src');
    record.element.load();
    layerMedia.delete(key);
  }
}

function roundedRect(ctx, width, height, radius) {
  const r = clamp(number(radius), 0, Math.min(width, height) / 2);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, width, height, r);
  else {
    ctx.moveTo(r, 0); ctx.lineTo(width - r, 0); ctx.quadraticCurveTo(width, 0, width, r);
    ctx.lineTo(width, height - r); ctx.quadraticCurveTo(width, height, width - r, height);
    ctx.lineTo(r, height); ctx.quadraticCurveTo(0, height, 0, height - r);
    ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath();
  }
}

function fillStyle(ctx, layer, width, height) {
  if (layer.gradient?.from && layer.gradient?.to) {
    const angle = number(layer.gradient.angle, 90) * Math.PI / 180;
    const extent = Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle));
    const dx = Math.cos(angle) * extent / 2, dy = Math.sin(angle) * extent / 2;
    const gradient = ctx.createLinearGradient(width / 2 - dx, height / 2 - dy, width / 2 + dx, height / 2 + dy);
    gradient.addColorStop(0, layer.gradient.from); gradient.addColorStop(1, layer.gradient.to);
    return gradient;
  }
  return layer.fill || '#ffffff';
}

function applyEffects(ctx, layer) {
  const filters = [];
  const transform = ctx.getTransform();
  const pixelScale = (Math.hypot(transform.a, transform.b) + Math.hypot(transform.c, transform.d)) / 2;
  for (const effect of layer.effects || []) {
    if (effect.enabled === false) continue;
    const amount = number(effect.amount, ['brightness', 'contrast', 'saturate'].includes(effect.type) ? 100 : 0);
    if (effect.type === 'blur') filters.push(`blur(${clamp(amount, 0, 200) * pixelScale}px)`);
    else if (['brightness', 'contrast', 'saturate'].includes(effect.type)) filters.push(`${effect.type}(${clamp(amount, 0, 1000)}%)`);
    else if (effect.type === 'grayscale') filters.push(`grayscale(${clamp(amount, 0, 100)}%)`);
    else if (effect.type === 'sepia') filters.push(`sepia(${clamp(amount, 0, 100)}%)`);
    else if (effect.type === 'hue') filters.push(`hue-rotate(${amount}deg)`);
    else if (effect.type === 'shadow' && amount > 0) {
      ctx.shadowColor = effect.color || '#33225322';
      ctx.shadowBlur = clamp(amount, 0, 200) * pixelScale;
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = amount * 0.4 * pixelScale;
    }
    else if (effect.type === 'glow' && amount > 0) {
      ctx.shadowColor = effect.color || layer.fill || '#aeb9ff';
      ctx.shadowBlur = clamp(amount, 0, 200) * pixelScale;
      ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    }
  }
  ctx.filter = filters.length ? filters.join(' ') : 'none';
}

function drawText(ctx, layer, width, height) {
  const fontSize = Math.max(1, number(layer.fontSize, 48));
  const family = layer.fontFamily || 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.font = `${layer.fontStyle || 'normal'} ${layer.fontWeight || 600} ${fontSize}px ${family}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = ['left', 'center', 'right'].includes(layer.textAlign) ? layer.textAlign : 'left';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${number(layer.letterSpacing)}px`;
  const x = ctx.textAlign === 'center' ? width / 2 : ctx.textAlign === 'right' ? width : 0;
  const lineHeight = number(layer.lineHeight, 1.18) * fontSize;
  const lines = String(layer.text ?? 'Text').split('\n');
  const textHeight = lines.length * lineHeight;
  const offsetY = layer.verticalAlign === 'middle' ? (height - textHeight) / 2 : layer.verticalAlign === 'bottom' ? height - textHeight : 0;
  ctx.fillStyle = fillStyle(ctx, layer, width, height);
  for (let index = 0; index < lines.length; index++) {
    const y = offsetY + index * lineHeight;
    if (layer.fill !== 'none') ctx.fillText(lines[index], x, y);
    if (layer.stroke && number(layer.strokeWidth) > 0) {
      ctx.strokeStyle = layer.stroke; ctx.lineWidth = number(layer.strokeWidth);
      ctx.strokeText(lines[index], x, y);
    }
  }
}

function drawPlaceholder(ctx, layer, width, height, missing) {
  roundedRect(ctx, width, height, Math.min(12, width / 12));
  ctx.fillStyle = '#222330'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = '#45475a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(width, height); ctx.moveTo(width, 0); ctx.lineTo(0, height); ctx.stroke();
  ctx.fillStyle = '#b4b8ce';
  ctx.font = `500 ${Math.max(10, Math.min(18, width / 16))}px -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(missing ? 'Missing footage' : 'Loading media', width / 2, height / 2, Math.max(1, width - 20));
  ctx.restore();
}

function drawLayer(ctx, layer, originalLayer, comp, assets, time, options = {}) {
  const { width, height } = dimensions(layer);
  if (width <= 0 || height <= 0 || layer.type === 'audio' || layer.type === 'null') return;
  if (layer.type === 'text') { drawText(ctx, layer, width, height); return; }
  if (layer.type === 'scene3d') {
    const asset = assetFor(assets, layer.assetId), record = getLayerScene(comp, originalLayer, asset);
    if (record?.instance && !record.error) {
      try {
        const transform = ctx.getTransform(), sample = Math.max(0, (time - number(layer.start)) * number(layer.playbackRate, 1) + number(layer.sourceIn));
        const frame = record.instance.render({ time: sample, layer, width: width * Math.hypot(transform.a, transform.b), height: height * Math.hypot(transform.c, transform.d) });
        ctx.save(); if (number(layer.cornerRadius) > 0) { roundedRect(ctx, width, height, layer.cornerRadius); ctx.clip(); }
        ctx.drawImage(frame, 0, 0, width, height); ctx.restore();
      } catch (error) { record.error = error; if (options.throwMediaErrors) throw error; drawPlaceholder(ctx, layer, width, height, true); }
    } else {
      if (options.throwMediaErrors) throw record?.error || new Error('The 3D scene has not finished loading.');
      drawPlaceholder(ctx, layer, width, height, !!record?.error || !asset || !assetSource(asset) || assetCache.get(assetKey(asset))?.state === 'error');
    }
    return;
  }
  if (layer.type === 'image' || layer.type === 'video') {
    const asset = assetFor(assets, layer.assetId);
    const media = getLayerMedia(comp, originalLayer, asset);
    if (media && mediaReady(media, layer.type)) {
      ctx.save();
      if (number(layer.cornerRadius) > 0) { roundedRect(ctx, width, height, layer.cornerRadius); ctx.clip(); }
      ctx.drawImage(media, 0, 0, width, height);
      ctx.restore();
    } else drawPlaceholder(ctx, layer, width, height, !asset || !assetSource(asset) || assetCache.get(assetKey(asset))?.state === 'error');
    return;
  }
  if (layer.type === 'ellipse') {
    ctx.beginPath(); ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else roundedRect(ctx, width, height, layer.cornerRadius);
  if (layer.fill !== 'none') { ctx.fillStyle = fillStyle(ctx, layer, width, height); ctx.fill(); }
  if (layer.stroke && number(layer.strokeWidth) > 0) {
    ctx.strokeStyle = layer.stroke; ctx.lineWidth = number(layer.strokeWidth); ctx.stroke();
  }
}

export function renderComposition(ctx, comp, assets, time = 0, options = {}) {
  if (!ctx || !comp || !comp.width || !comp.height) return;
  pruneCompositionScenes(comp, assets);
  const sx = ctx.canvas.width / comp.width, sy = ctx.canvas.height / comp.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!options.transparent && comp.background && comp.background !== 'transparent') {
    ctx.fillStyle = comp.background; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  for (let index = (comp.layers?.length || 0) - 1; index >= 0; index--) {
    const original = comp.layers[index];
    if (!isActive(original, time, comp)) continue;
    const layer = evaluateLayer(original, time);
    const opacity = clamp(number(layer.opacity, 1), 0, 1);
    if (opacity === 0) continue;
    const matrix = worldMatrix(original, comp, time);
    ctx.save(); ctx.setTransform(sx, 0, 0, sy, 0, 0); ctx.transform(...matrix);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = BLEND_MODES.has(layer.blendMode) ? layer.blendMode : 'source-over';
    applyEffects(ctx, layer);
    drawLayer(ctx, layer, original, comp, assets, time, options);
    ctx.restore();
  }
  if (options.selectionId) {
    const selected = comp.layers?.find(layer => layer.id === options.selectionId);
    if (selected && isActive(selected, time, comp) && selected.type !== 'audio') {
      const { corners } = getLayerBounds(selected, comp, time);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = options.selectionColor || '#acafff'; ctx.lineWidth = Math.max(1, number(options.selectionLineWidth, 1.5));
      ctx.beginPath(); corners.forEach((point, index) => index === 0 ? ctx.moveTo(point.x * sx, point.y * sy) : ctx.lineTo(point.x * sx, point.y * sy));
      ctx.closePath(); ctx.stroke();
      const handleSize = number(options.handleSize, 6);
      for (const corner of corners) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(corner.x * sx - handleSize / 2, corner.y * sy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(corner.x * sx - handleSize / 2, corner.y * sy - handleSize / 2, handleSize, handleSize);
      }
    }
  }
  ctx.restore();
}

async function loadCompositionMedia(comp, assets, frameTime = null, signal) {
  checkExport(signal);
  const neededLayers = (comp.layers || []).filter(layer => (layer.type === 'image' || layer.type === 'video' || layer.type === 'scene3d') &&
    layer.visible !== false && (frameTime === null ? number(layer.start) < comp.duration && number(layer.end, comp.duration) > 0 : isActive(layer, frameTime, comp)));
  const assetIds = new Set(neededLayers.map(layer => layer.assetId));
  const needed = assetsArray(assets).filter(asset => assetIds.has(asset.id));
  for(const asset of needed){checkExport(signal);await waitForExport(loadAsset(asset,signal),signal);}
  checkExport(signal);
  for (const layer of neededLayers) {
    if (!assetFor(assets, layer.assetId)) throw new Error(`Cannot export: relink missing footage for “${layer.name || 'Untitled layer'}”.`);
    if (layer.type === 'scene3d') {
      const record = getLayerScene(comp, layer, assetFor(assets, layer.assetId));
      if (!record?.instance || record.error) throw record?.error || new Error('The 3D scene could not be prepared.');
    } else {
      const element = getLayerMedia(comp, layer, assetFor(assets, layer.assetId));
      if (element) await awaitElement(element, layer.type, signal);
    }
  }
  if (document.fonts?.ready) await waitForExport(document.fonts.ready,signal);
  checkExport(signal);
}

function waitForExport(promise,signal){
  checkExport(signal);if(!signal)return promise;
  return new Promise((resolve,reject)=>{const abort=()=>{cleanup();reject(new DOMException('Export cancelled.','AbortError'));},cleanup=()=>signal.removeEventListener('abort',abort);signal.addEventListener('abort',abort,{once:true});Promise.resolve(promise).then(value=>{cleanup();resolve(value);},error=>{cleanup();reject(error);});if(signal.aborted)abort();});
}

async function seekVideos(comp, assets, time, signal, exact = false) {
  for(const layer of (comp.layers || []).filter(layer => layer.type === 'video' && isActive(layer, time, comp))){
    checkExport(signal);
    const element = getLayerMedia(comp, layer, assetFor(assets, layer.assetId));
    if (!element) throw new Error('Cannot decode video. Relink the source before exporting.');
    element.pause(); element.muted = true;
    const requested=(time-number(layer.start))*number(layer.playbackRate,1)+number(layer.sourceIn);
    if(exact&&(!Number.isFinite(element.duration)||requested<0||requested>=element.duration))throw new Error('Video extends beyond its source. Shorten the layer or relink it before exporting.');
    const desired = exact ? requested : mediaTime(layer, time, element);
    if (!element.seeking && Math.abs(element.currentTime - desired) < .0000001 && element.readyState >= 2) continue;
    await new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timeout); element.removeEventListener('seeked', success); element.removeEventListener('error', failure);signal?.removeEventListener('abort',abort); };
      const success = () => { if(element.seeking||element.readyState<2)return;cleanup(); resolve(); };
      const failure = () => { cleanup(); reject(new Error('Could not decode the requested video frame. Relink the source.')); };
      const abort=()=>{cleanup();reject(new DOMException('Export cancelled.','AbortError'));};
      const timeout = setTimeout(failure, 10000);
      element.addEventListener('seeked', success); element.addEventListener('error', failure, { once: true });signal?.addEventListener('abort',abort,{once:true});
      try { element.currentTime = desired; } catch { failure(); }
      if(signal?.aborted)abort();
    });
    checkExport(signal);
  }
}

function exportComposition(comp) {
  const width = Math.round(number(comp.width)), height = Math.round(number(comp.height));
  if (width < 1 || height < 1 || width > 7680 || height > 7680 || width * height > 33177600) {
    throw new Error('Choose composition dimensions between 1 and 7680 pixels, with no more than 33 megapixels.');
  }
  return { ...structuredClone(comp), id: `${comp.id || 'composition'}:export:${Date.now()}:${Math.random().toString(36).slice(2)}`, width, height };
}

/** Full-resolution PNG; video layers are decoded at the requested timeline time. */
export async function exportFrame(comp, assets, time = 0) {
  const isolated = exportComposition(comp);
  try {
    await loadCompositionMedia(isolated, assets, time);
    await seekVideos(isolated, assets, time);
    const canvas = document.createElement('canvas'); canvas.width = isolated.width; canvas.height = isolated.height;
    renderComposition(canvas.getContext('2d'), isolated, assets, time, { throwMediaErrors: true });
    return await new Promise((resolve, reject) => {
      try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser could not encode this frame.')), 'image/png'); }
      catch { reject(new Error('This frame contains media that does not allow export. Import the original file from your computer.')); }
    });
  } finally { disposeCompositionMedia(isolated.id); }
}

/** Bounded real-time WebM with an offline native-layer sound mix and an audio clock. */
async function exportRealtimeVideo(comp, assets, onProgress = () => {}, { signal, pictureOnly=false } = {}) {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) throw new Error('Video export needs a browser with MediaRecorder and canvas capture support, such as Chrome or Edge.');
  const duration = number(comp.duration);
  if (duration <= 0 || duration > 60) throw new Error('Video export supports compositions from 0 to 60 seconds. Shorten the duration and try again.');
  const fps = clamp(number(comp.fps, 30), 1, 60);
  const mimeType = (pictureOnly?['video/webm;codecs=vp9','video/webm;codecs=vp8']:['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus']).find(type => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error('This browser cannot encode WebM video. Try Chrome or Edge.');
  if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
  const isolated = exportComposition(comp);
  let stream,mix,destination,sound;
  try {
    if(!pictureOnly)mix=await renderCompositionAudio(isolated,assets,signal,value=>onProgress(value*.15));
    await loadCompositionMedia(isolated, assets, null, signal);
    await seekVideos(isolated, assets, 0, signal);
    if (signal?.aborted) throw new DOMException('Export cancelled.', 'AbortError');
    const canvas = document.createElement('canvas'); canvas.width = isolated.width; canvas.height = isolated.height;
    const ctx = canvas.getContext('2d', { alpha: false });
    renderComposition(ctx, isolated, assets, 0, { throwMediaErrors: true });
    stream = canvas.captureStream(fps);
    if(mix){await mix.context.resume();if(mix.context.state!=='running')throw Error('Sound is suspended. Click Export again to enable audio.');destination=mix.context.createMediaStreamDestination();destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));sound=mix.context.createBufferSource();sound.buffer=mix.buffer;sound.connect(destination);}
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: clamp(isolated.width * isolated.height * fps * 0.15, 2500000, 25000000),audioBitsPerSecond:192000 });
    const chunks = [];
    let timer, startedAt, finished = false, renderError;
    const notify = value => { try { onProgress(value); } catch { /* A UI callback cannot invalidate recording. */ } };
    const result = new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer);clearTimeout(stalled);signal?.removeEventListener('abort', cancel);document.removeEventListener('visibilitychange',visibility); };
      const fail = error => {
        if (finished) return;
        finished = true; cleanup();
        if (recorder.state !== 'inactive') recorder.stop();
        reject(error);
      };
      const cancel = () => fail(new DOMException('Export cancelled.', 'AbortError'));
      const visibility=()=>{if(document.hidden)fail(Error('Export stopped because this tab was hidden. Keep the editor visible and export again.'));};
      const stalled=setTimeout(()=>fail(Error('Export stalled. Check the audio output device and try again.')),(duration+20)*1000);
      signal?.addEventListener('abort', cancel, { once: true });
      document.addEventListener('visibilitychange',visibility);
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = event => fail(event.error || new Error('The browser could not finish recording.'));
      recorder.onstop = () => {
        if (finished) return;
        finished = true; cleanup();
        if (renderError) { reject(renderError); return; }
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType });
        if (!blob.size) { reject(new Error('The browser returned an empty video. Try again with a smaller composition.')); return; }
        notify(1); resolve({ blob, mimeType: recorder.mimeType || mimeType, hasAudio: !pictureOnly, mode: 'realtime' });
      };
      const tick = () => {
        if (finished || recorder.state === 'inactive') return;
        const elapsed = (mix?mix.context.currentTime:performance.now()/1000) - startedAt;
        const time = Math.min(Math.floor(elapsed * fps) / fps, Math.max(0, duration - 1 / fps));
        try {
          // Each export owns separate video instances so recording cannot disrupt preview playback.
          for (const layer of isolated.layers || []) {
            if (layer.type !== 'video') continue;
            const element = getLayerMedia(isolated, layer, assetFor(assets, layer.assetId));
            if (!element) continue;
            element.muted = true;
            if (!isActive(layer, time, isolated)) { element.pause(); continue; }
            const desired = mediaTime(layer, time, element);
            if (Math.abs(element.currentTime - desired) > 0.2) element.currentTime = desired;
            element.playbackRate = clamp(number(layer.playbackRate, 1), 0.1, 16);
            if (element.paused && !element.ended) element.play().catch(() => {});
          }
          renderComposition(ctx, isolated, assets, time, { throwMediaErrors: true });
          notify(.15+.85*Math.min(0.995, elapsed / duration));
        } catch (error) { renderError = error; recorder.stop(); return; }
        if (elapsed >= duration) { recorder.stop(); return; }
        timer = setTimeout(tick, 1000 / fps);
      };
      if(signal?.aborted){cancel();return;}if(document.hidden){visibility();return;}recorder.start(250); startedAt = mix?mix.context.currentTime:performance.now()/1000;sound?.start(startedAt);notify(.15);tick();stream.getVideoTracks()[0]?.requestFrame?.();
    });
    return await result;
  } finally {
    try{sound?.stop();}catch{}sound?.disconnect();destination?.disconnect();await mix?.store.dispose();
    stream?.getTracks().forEach(track => track.stop());
    disposeCompositionMedia(isolated.id);
  }
}

/** A committed native snapshot owns every decoder/template until export settles. */
export async function exportVideo(comp,assets,onProgress=()=>{},{signal,pictureOnly=false,mode='precise'}={}){
  checkExport(signal);validateVideoExport(comp,mode==='precise');
  if(!['precise','realtime'].includes(mode))throw new Error('Choose precise or real-time WebM export.');
  const isolated=exportComposition(comp),snapshotAssets=structuredClone(assetsArray(assets));
  const prefix=isolated.id+':asset:';
  for(const asset of snapshotAssets){asset.id=prefix+asset.id;exportAssetKeys.add(assetKey(asset));}
  for(const layer of isolated.layers)if(layer.assetId)layer.assetId=prefix+layer.assetId;
  let mix,progress=0;
  const notify=value=>{progress=Math.max(progress,Math.min(1,value));try{onProgress(progress);}catch{/* Progress UI cannot invalidate an export. */}};
  try{
    if(mode==='realtime')return await exportRealtimeVideo(isolated,snapshotAssets,notify,{signal,pictureOnly});
    const encoding=await preciseCodec(isolated,pictureOnly,signal);checkExport(signal);notify(0);
    if(!pictureOnly)mix=await renderCompositionAudio(isolated,snapshotAssets,signal,p=>notify(p*.15));
    await loadCompositionMedia(isolated,snapshotAssets,null,signal);checkExport(signal);
    const canvas=document.createElement('canvas');canvas.width=isolated.width;canvas.height=isolated.height;
    const ctx=canvas.getContext('2d',{alpha:false});
    return await encodeCompositionWebM({comp:isolated,canvas,mix,...encoding,signal,onProgress:notify,drawFrame:async time=>{
      await seekVideos(isolated,snapshotAssets,time,signal,true);checkExport(signal);
      renderComposition(ctx,isolated,snapshotAssets,time,{throwMediaErrors:true});
    }});
  }finally{
    await mix?.store.dispose();disposeCompositionMedia(isolated.id);
    for(const asset of snapshotAssets){const key=assetKey(asset),record=assetCache.get(key);exportAssetKeys.delete(key);if(!record)continue;record.disposed=true;if(record.kind==='model3d')record.element?.dispose();else if(record.element){record.element.pause?.();record.element.removeAttribute('src');if(record.kind!=='image')record.element.load();}assetCache.delete(key);}
  }
}
