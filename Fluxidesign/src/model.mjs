import {layoutGuides,EDGE_NAMES} from './layout.mjs';
import {TEXT_STYLE_FIELDS,markTextOverrides} from './text-styles.mjs';
import {createBlankProject, createLayer, parseProject, evaluateLayer} from '../../Fluxiffects/src/core.mjs';

export const uid = () => globalThis.crypto.randomUUID();
export const PRESETS = {A4: [595, 842], Letter: [612, 792], Square: [720, 720], Landscape: [842, 595]};
export const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'];
const TYPES = new Set(['text', 'rectangle', 'ellipse', 'image']);
const numeric = {x: [-32768, 32768], y: [-32768, 32768], width: [1, 16384], height: [1, 16384], rotation: [-36000, 36000], opacity: [0, 1], fontSize: [1, 1000], fontWeight: [100, 900], lineHeight: [0.7, 4], letterSpacing: [-50, 100], cornerRadius: [0, 4096], strokeWidth: [0, 100]};
const fail = message => {throw new Error(message);};
function num(v, fallback, min, max, label) {if (v === undefined) return fallback; if (!Number.isFinite(v) || v < min || v > max) fail(`${label} must be between ${min} and ${max}.`); return v;}
function str(v, fallback, max = 2000) {if (v === undefined) return fallback; if (typeof v !== 'string' || v.length > max) fail('Text exceeds the supported limit.'); return v;}
function id(v) {const s = str(v, uid(), 200); if (!s || /[\x00-\x1f]/.test(s) || ['__proto__', 'constructor', 'prototype'].includes(s)) fail('Invalid identifier.'); return s;}
function color(v, fallback) {v ??= fallback; if (typeof v !== 'string' || v.length > 100 || !/^(?:#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\)|transparent|black|white)$/i.test(v)) fail('Use a valid hex, RGB, or HSL color.'); return v;}
function bool(v, fallback) {if (v === undefined) return fallback; if (typeof v !== 'boolean') fail('Expected a true or false value.'); return v;}
function record(v) {if (!v || typeof v !== 'object' || Array.isArray(v)) fail('Expected an object.'); return v;}
function list(v, max) {if (!Array.isArray(v) || v.length > max) fail(`Expected a list of at most ${max} items.`); return v;}
function unique(items) {const ids = new Set(); for (const item of items) {if (ids.has(item.id)) fail('Duplicate identifiers.'); ids.add(item.id);}}
export function createObject(type = 'text', properties = {}) {
  return {id: uid(), type, name: type === 'text' ? 'Text frame' : type === 'image' ? 'Image frame' : 'Shape', x: 48, y: 100, width: 240, height: type === 'text' ? 90 : 180, rotation: 0, opacity: 1, visible: true, locked: false,
    fill: type === 'text' ? '#202a27' : '#d87758', stroke: '#202a27', strokeWidth: 0, cornerRadius: 0,
    text: type === 'text' ? 'Make room for an idea.' : '', fontFamily: 'Arial', fontSize: 26, fontWeight: 400, lineHeight: 1.2, letterSpacing: 0, textAlign: 'left', assetId: null, fit: 'cover', ...properties};
}
export function createPage(properties = {}) {return {id: uid(), name: 'Untitled page', width: 595, height: 842, margin: 42, columns: 3, gutter: 16, background: '#fffdf8', objects: [], ...properties};}
export function createBlankProjectNative() {const page = createPage({name: 'Page 1'}); return {format: 'fluxidesign', version: 1, id: uid(), name: 'Untitled publication', activePageId: page.id, pages: [page], assets: []};}
export function getPage(project) {return project.pages.find(page => page.id === project.activePageId) ?? project.pages[0];}
function normalizeObject(raw) {
  record(raw); if (!TYPES.has(raw.type)) fail('Unsupported frame type.');
  const base = createObject(raw.type), out = {...base, id: id(raw.id), name: str(raw.name, base.name, 200), text: str(raw.text, base.text, 50000), fontFamily: str(raw.fontFamily, base.fontFamily, 200)};
  for (const [key, range] of Object.entries(numeric)) out[key] = num(raw[key], base[key], ...range, key);
  for (const key of ['visible', 'locked']) out[key] = bool(raw[key], base[key]);
  out.fill = color(raw.fill, base.fill); out.stroke = color(raw.stroke, base.stroke);
  out.textAlign = ['left', 'center', 'right'].includes(raw.textAlign) ? raw.textAlign : 'left';
  out.assetId = raw.assetId == null ? null : id(raw.assetId); out.fit = raw.fit === 'contain' ? 'contain' : 'cover';
  if(raw.textStyleId!=null){if(raw.type!=='text')fail('Only text frames can use a text style.');out.textStyleId=id(raw.textStyleId);const overrides=list(raw.textStyleOverrides??[],TEXT_STYLE_FIELDS.length);if(overrides.some(key=>!TEXT_STYLE_FIELDS.includes(key))||new Set(overrides).size!==overrides.length)fail('Invalid text style overrides.');out.textStyleOverrides=[...overrides];}
  else if(raw.textStyleOverrides?.length)fail('Style overrides need a linked text style.');
  return out;
}
export function validateProject(raw) {
  record(raw); if (raw.format !== 'fluxidesign' || raw.version !== 1) fail('Choose a supported FluxDesign project.');
  const textStyles=list(raw.textStyles??[],100).map(style=>{record(style);if(Object.keys(style).some(key=>!['id','name','properties'].includes(key)))fail('Unsupported text style fields.');record(style.properties);if(Object.keys(style.properties).some(key=>!TEXT_STYLE_FIELDS.includes(key)))fail('Unsupported text style property.');const frame=normalizeObject({type:'text',...style.properties});const name=str(style.name,'',80).trim();if(!name)fail('Text styles need a name.');return{id:id(style.id),name,properties:Object.fromEntries(TEXT_STYLE_FIELDS.map(key=>[key,frame[key]]))};});unique(textStyles);if(new Set(textStyles.map(s=>s.name.toLowerCase())).size!==textStyles.length)fail('Text style names must be unique.');
  let objectCount = 0;
  const pages = list(raw.pages, 100).map(p => {record(p); const objects = list(p.objects, 1000).map(normalizeObject); unique(objects); objectCount += objects.length;
    return {id: id(p.id), name: str(p.name, 'Untitled page', 200), width: num(p.width, 595, 72, 4096, 'Page width'), height: num(p.height, 842, 72, 4096, 'Page height'), margin: num(p.margin, 42, 0, 1000, 'Margins'), columns: Math.round(num(p.columns, 3, 1, 12, 'Columns')), gutter: num(p.gutter, 16, 0, 500, 'Gutter'), background: color(p.background, '#fffdf8'), objects,...(p.margins===undefined?{}:{margins:(()=>{record(p.margins);if(Object.keys(p.margins).some(key=>!EDGE_NAMES.includes(key)))fail('Unsupported margin edge.');return Object.fromEntries(EDGE_NAMES.map(key=>[key,num(p.margins[key],p.margin??42,0,1000,'Margin '+key)]));})()})};});
  for(const page of pages)if(page.margins&&!layoutGuides(page).valid)fail(layoutGuides(page).reason);
  for(const page of pages)for(const frame of page.objects)if(frame.textStyleId){const style=textStyles.find(s=>s.id===frame.textStyleId);if(!style)fail('A linked text style is missing.');for(const key of TEXT_STYLE_FIELDS)if(!frame.textStyleOverrides.includes(key))frame[key]=style.properties[key];}
  if (!pages.length || objectCount > 5000) fail('Use 1–100 pages and at most 5,000 frames.'); unique(pages);
  const assets = list(raw.assets ?? [], 500).map(a => {record(a); const src = str(a.src, '', 40000000); if (src && !/^data:image\/(png|jpeg|webp|svg\+xml);(?:base64,|charset=utf-8,|utf8,)/i.test(src)) fail('Only embedded PNG, JPEG, WebP, and SVG images are supported.');
    return {id: id(a.id), name: str(a.name, 'Image', 300), type: 'image', src, width: num(a.width, 1, 1, 32768, 'Image width'), height: num(a.height, 1, 1, 32768, 'Image height'), missing: !src};}); unique(assets);
  return {format: 'fluxidesign', version: 1, id: id(raw.id), name: str(raw.name, 'Untitled publication', 200), activePageId: pages.some(p => p.id === raw.activePageId) ? raw.activePageId : pages[0].id, pages, assets,...(textStyles.length?{textStyles}:{})};
}
const art = `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1000" viewBox="0 0 1100 1000"><rect width="1100" height="1000" fill="#e8e5d8"/><circle cx="807" cy="226" r="172" fill="#e17852"/><path d="M-40 1050V442C173 156 437 398 567 454s384-229 579-4v600" fill="#354c40"/><path d="M-40 1050V778C183 414 406 516 587 648s270 64 559-50v452" fill="#8e9c70"/><path d="M-40 1050V924c266-228 469-160 660-2s427-4 526-115v243" fill="#c8c5a5"/><path d="M660 1000c-121-278-235-437-96-659M621 723c-134 3-206-49-188-146 118-23 184 38 188 146M570 485c-74-58-98-123-42-185 74 12 99 88 42 185M612 793c114-15 150-88 110-160-94 2-132 72-110 160" fill="none" stroke="#f5efd9" stroke-width="15" stroke-linecap="round"/></svg>`;
export function createDemoProject() {
  const p = createBlankProjectNative(); p.name = 'FIELD NOTES — Issue 08';
  const image = {id: uid(), name: 'An illustrated landscape', type: 'image', src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(art)}`, width: 1100, height: 1000}; p.assets = [image];
  const text = (text, x, y, width, height, fontSize, extra = {}) => createObject('text', {text, name: text.slice(0, 32), x, y, width, height, fontSize, ...extra});
  const shape = (x, y, width, height, fill, extra = {}) => createObject('rectangle', {x, y, width, height, fill, ...extra});
  p.pages = [createPage({name: 'Cover', objects: [
    text('INDEPENDENT CULTURE & DESIGN', 38, 30, 405, 20, 9, {letterSpacing: 1.8, fontWeight: 600}), text('VOL. 08 / 2026', 436, 30, 124, 20, 9, {textAlign: 'right', letterSpacing: 1}),
    text('FIELD NOTES', 31, 65, 540, 82, 76, {fontFamily: 'Georgia', letterSpacing: -4, fontWeight: 400}),
    shape(38, 162, 519, 1, '#343e34'),
    createObject('image', {name: 'The quiet landscape', x: 38, y: 186, width: 519, height: 461, assetId: image.id}),
    text('The art of\nslowing down.', 38, 671, 355, 105, 40, {fontFamily: 'Georgia', letterSpacing: -1.5, lineHeight: 1.07}),
    text('A new perspective on\nspace, nature, and the\nthings we choose to keep.', 419, 686, 140, 78, 11, {lineHeight: 1.5}),
    shape(38, 796, 519, 1, '#343e34'), text('GOOD THINGS TAKE SHAPE.', 38, 808, 340, 14, 8, {letterSpacing: 1.6}), text('€ 14.00', 490, 808, 67, 14, 8, {textAlign: 'right'}),
  ]}), createPage({name: 'A note from the editor', objects: [
    text('FIELD NOTES', 40, 31, 380, 20, 10, {letterSpacing: 2, fontWeight: 600}), text('02', 500, 31, 54, 20, 10, {textAlign: 'right'}),
    shape(40, 71, 515, 1, '#b9c1b5'), text('Less,\nbut better.', 40, 109, 492, 182, 72, {fontFamily: 'Georgia', lineHeight: 1.03, letterSpacing: -3}),
    text('A NOTE FROM THE EDITOR', 42, 329, 490, 25, 10, {letterSpacing: 2.2, fontWeight: 600, fill: '#a84c34'}),
    text('We live in a world that moves quickly. This issue is an invitation to pause — to notice the grain in a piece of wood, the light in an empty room, the ideas hiding in ordinary places.\n\nInside, we meet people making thoughtful work at their own pace. Designers, artists, and makers who know that what we leave out matters just as much as what we put in.', 42, 381, 234, 286, 13, {fontFamily: 'Georgia', lineHeight: 1.55}),
    text('There is a quiet confidence in things made with care. It does not ask for attention. It earns it, slowly, through the way it feels to hold, to read, to live alongside.\n\nWe hope these pages give you room for a new thought, a small experiment, or simply a slower afternoon.\n\nThank you for being here.\n\nThe Field Notes team', 306, 381, 248, 326, 13, {fontFamily: 'Georgia', lineHeight: 1.55}),
    shape(42, 752, 512, 1, '#b9c1b5'), text('MAKE SPACE FOR WHAT MATTERS.', 42, 777, 512, 24, 9, {letterSpacing: 2, fill: '#6b776a'}),
  ]}), createPage({name: 'Objects with a story', objects: [
    text('OBJECTS WITH A STORY', 40, 31, 480, 20, 10, {letterSpacing: 2, fontWeight: 600}), text('03', 505, 31, 50, 20, 10, {textAlign: 'right'}),
    createObject('image', {name: 'A closer look', x: 0, y: 85, width: 595, height: 435, assetId: image.id}),
    text('A softer\npoint of view.', 40, 552, 480, 129, 52, {fontFamily: 'Georgia', lineHeight: 1.03, letterSpacing: -2}),
    text('01 / IN THE STUDIO', 42, 707, 192, 32, 10, {letterSpacing: 1.5, fill: '#a84c34', fontWeight: 600}),
    text('Finding a balance between the natural and the made. An exploration of color, form, and the landscapes we carry with us.', 263, 707, 292, 87, 13, {lineHeight: 1.5}),
  ]})]; p.activePageId = p.pages[0].id; return validateProject(p);
}

export function toMotion(project) {
  const p = validateProject(project), m = createBlankProject({projectName: p.name}); m.id = p.id; m.activeCompId = p.activePageId; m.assets = p.assets.map(a => ({...a}));
  m.compositions = p.pages.map(page => ({id: page.id, name: page.name, width: page.width, height: page.height, fps: 30, duration: 8, background: page.background,
    layers: [...page.objects].reverse().map(o => createLayer(o.type, {id: o.id, name: o.name, x: o.x + o.width / 2, y: o.y + o.height / 2, width: o.width, height: o.height, anchorX: o.width / 2, anchorY: o.height / 2, rotation: o.rotation, opacity: o.opacity, visible: o.visible, locked: o.locked, fill: o.fill, stroke: o.stroke, strokeWidth: o.strokeWidth, cornerRadius: o.cornerRadius, text: o.text, fontFamily: o.fontFamily, fontSize: o.fontSize, fontWeight: o.fontWeight, textAlign: o.textAlign, letterSpacing: o.letterSpacing, assetId: o.assetId, aeMetadata: {fluxidesign: {lineHeight: o.lineHeight, fit: o.fit}}}))}));
  return parseProject(JSON.stringify(m)).project;
}
export function fromMotion(input) {
  const {project: m, warnings} = parseProject(JSON.stringify(input)); const notes = [...warnings, 'Compositions become pages. Animation is sampled at time 0. Layouts use RGB color; print profiles, linked text flow, and advanced effects are not transferred.'];
  const assets = m.assets.filter(a => a.type === 'image' && (!a.src || /^data:image\//i.test(a.src))).map(a => ({...a, width: a.width || 1, height: a.height || 1}));
  const assetIds = new Set(assets.map(a => a.id));
  const pages = m.compositions.map(c => createPage({id: c.id, name: c.name, width: Math.max(72, Math.min(4096, c.width)), height: Math.max(72, Math.min(4096, c.height)), background: c.background,
    objects: [...c.layers].reverse().filter(l => {if (TYPES.has(l.type)) return true; notes.push(l.type === 'scene3d' ? `“${l.name}”: live 3D scenes stay editable in Fluxiffects. Export a PNG frame there for publication; keep the original project for geometry and animation.` : `Skipped ${l.type} layer “${l.name}”.`); return false;}).map(layer => {
      const l = evaluateLayer(layer, 0); if (l.effects?.length || l.gradient || l.parentId || l.scaleX < 0 || l.scaleY < 0) notes.push(`“${l.name}”: effects, gradients, parenting, or flipped transforms need a rendered image for matching appearance.`);
      if (l.assetId && !assetIds.has(l.assetId)) notes.push(`“${l.name}”: import its image into FluxDesign to relink missing media.`);
      const radians = l.rotation * Math.PI / 180, dx = (l.width / 2 - l.anchorX) * l.scaleX, dy = (l.height / 2 - l.anchorY) * l.scaleY;
      const width = Math.max(1, Math.min(16384, l.width * Math.abs(l.scaleX))), height = Math.max(1, Math.min(16384, l.height * Math.abs(l.scaleY)));
      const cx = l.x + dx * Math.cos(radians) - dy * Math.sin(radians), cy = l.y + dx * Math.sin(radians) + dy * Math.cos(radians);
      if (l.type === 'text' && (l.scaleX !== 1 || l.scaleY !== 1)) notes.push(`“${l.name}”: scaled type uses an unscaled editable font; adjust typography for a matching appearance.`);
      return createObject(l.type, {...l, x: Math.max(-32768, Math.min(32768, cx - width / 2)), y: Math.max(-32768, Math.min(32768, cy - height / 2)), width, height, rotation: Math.max(-36000, Math.min(36000, l.rotation)), fontSize: Math.min(1000, l.fontSize), fontWeight: Math.max(100, Math.min(900, l.fontWeight)), cornerRadius: Math.min(4096, l.cornerRadius), strokeWidth: Math.min(100, l.strokeWidth), letterSpacing: Math.max(-50, Math.min(100, l.letterSpacing)), lineHeight: l.aeMetadata?.fluxidesign?.lineHeight ?? 1.2, fit: l.aeMetadata?.fluxidesign?.fit ?? 'cover'});
    })}));
  return {project: validateProject({format: 'fluxidesign', version: 1, id: m.id, name: m.name, activePageId: m.activeCompId, pages, assets}), warnings: [...new Set(notes)]};
}

const editable = new Set(['name', 'x', 'y', 'width', 'height', 'rotation', 'opacity', 'fill', 'stroke', 'strokeWidth', 'cornerRadius', 'text', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textAlign', 'visible']);
function onlyKeys(value, allowed) {record(value); for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`Unsupported command property: ${key}.`);}
export function applyAICommands(project, commands, {selection = [], scope = 'composition'} = {}) {
  if (!['composition', 'selection'].includes(scope)) fail('Unknown edit scope.');
  const p = validateProject(structuredClone(project)); list(commands, 40); let page = getPage(p); const selected = new Set(selection);
  const getObject = objectId => {const o = page.objects.find(o => o.id === objectId); if (!o) fail('This frame is not on the selected page.'); if (o.locked) fail('This frame is locked.'); if (scope === 'selection' && !selected.has(o.id)) fail('AI can edit only selected frames.'); return o;};
  for (const command of commands) {record(command);
    switch (command.type) {
      case 'updateObject': {
        onlyKeys(command, ['type', 'objectId', 'properties']); const target = getObject(command.objectId); onlyKeys(command.properties, [...editable]); markTextOverrides(target, command.properties); break;
      }
      case 'addObject': {
        onlyKeys(command, ['type', 'object']); if (scope === 'selection') fail('Choose page scope to add frames.'); onlyKeys(command.object, ['type', ...editable]); if (!['text', 'rectangle', 'ellipse'].includes(command.object.type)) fail('AI can add text and shapes.'); page.objects.push(createObject(command.object.type, command.object)); break;
      }
      case 'removeObject': {onlyKeys(command, ['type', 'objectId']); const target = getObject(command.objectId); page.objects = page.objects.filter(o => o.id !== target.id); break;}
      case 'updatePage': {onlyKeys(command, ['type', 'properties']); if (scope === 'selection') fail('Choose page scope to edit page settings.'); onlyKeys(command.properties, ['name', 'width', 'height', 'background', 'margin', 'columns', 'gutter']); Object.assign(page, command.properties);if(Object.hasOwn(command.properties,'margin'))delete page.margins;break;}
      case 'addPage': {onlyKeys(command, ['type', 'name', 'width', 'height', 'background']); if (scope === 'selection') fail('Choose page scope to add a page.'); const fresh = createPage({name: command.name ?? 'New idea', width: command.width ?? page.width, height: command.height ?? page.height, background: command.background ?? page.background}); p.pages.push(fresh); p.activePageId = fresh.id; page = fresh; break;}
      default: fail(`Unsupported command: ${String(command.type).slice(0, 80)}.`);
    }
  }
  return validateProject(p);
}
export function getAIContext(project, {selection = [], scope = 'composition'} = {}) {
  const p = validateProject(project), source = getPage(p); const objects = source.objects.filter(o => scope !== 'selection' || selection.includes(o.id));
  return {name: p.name, page: {...source, objects}, assets: p.assets.filter(a => objects.some(o => o.assetId === a.id)).map(({id, width, height, missing}) => ({id, type: 'image', width, height, missing})), units: 'points (72 per inch)', selection, scope};
}
export const AI_SPEC = {
  app: 'FluxDesign', purpose: 'An editable multipage publication and page-layout editor. Work on the chosen page. Page coordinates are points (72 per inch). Objects use top-left anchors and stack bottom to top.',
  commands: {updateObject: {objectId: 'existing frame ID', properties: 'allowed editable properties'}, addObject: {object: {type: 'text | rectangle | ellipse', text: 'plain text', x: 42, y: 100, width: 240, height: 90, fontSize: 24, fill: '#202a27'}}, removeObject: {objectId: 'existing unlocked frame ID'}, updatePage: {properties: 'name, width, height, background, margin, columns, gutter'}, addPage: {name: 'new page name', width: 595, height: 842, background: '#fffdf8'}},
  properties: [...editable], limits: numeric, guidance: 'Max 40 commands. Each command needs type. Text frames clip overflow; allow enough height, wrap naturally, use lineHeight 1.1–1.6. No HTML, code, remote assets, locked-frame edits or unselected-frame edits. New pages become the chosen page for subsequent commands. Prefer readable hierarchy, aligned margins, intentional whitespace. Keep shapes behind text by adding them first. addObject can only create text, rectangle and ellipse.',
  examples: [{type: 'addObject', object: {type: 'text', text: 'A new perspective.', x: 42, y: 100, width: 510, height: 100, fontFamily: 'Georgia', fontSize: 52, fill: '#202a27'}}],
};
