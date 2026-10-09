import {PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, concatTransformationMatrix, rectangle, clip, endPath, beginText, endText, setCharacterSpacing} from 'pdf-lib';
import {renderPage, textLines, fontString, loadImage, canvasBlob} from './render.mjs';

// Browser layout remains authoritative. The core PDF fonts cover these familiar
// Latin families; unsupported faces or glyphs use a reported whole-page proof.
const faces = {
  Arial: [StandardFonts.Helvetica, StandardFonts.HelveticaBold],
  'Times New Roman': [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold],
  'Courier New': [StandardFonts.Courier, StandardFonts.CourierBold],
};
export function pdfFontName(object) {
  return faces[object.fontFamily]?.[object.fontWeight >= 600 ? 1 : 0] ?? null;
}
export function objectPDFTransform(object, pageHeight) {
  const a = object.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), w = object.width, h = object.height;
  return [c, -s, s, c, object.x + w / 2 - c * w / 2 - s * h / 2, pageHeight - object.y - h / 2 + s * w / 2 - c * h / 2];
}
export function imagePlacement(image, object) {
  const scale = object.fit === 'contain' ? Math.min(object.width / image.width, object.height / image.height) : Math.max(object.width / image.width, object.height / image.height);
  const width = image.width * scale, height = image.height * scale;
  return {x: (object.width - width) / 2, y: (object.height - height) / 2, width, height};
}
function roundedPath(w, h, r) {
  // SVG paths use the same downward Y axis as the editor.
  const k = r * .5522847498307936;
  return `M ${r} 0 H ${w-r} C ${w-r+k} 0 ${w} ${r-k} ${w} ${r} V ${h-r} C ${w} ${h-r+k} ${w-r+k} ${h} ${w-r} ${h} H ${r} C ${r-k} ${h} 0 ${h-r+k} 0 ${h-r} V ${r} C 0 ${r-k} ${r-k} 0 ${r} 0 Z`;
}
let colors, metrics;
function color(value) {
  colors ||= document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  colors.clearRect(0, 0, 1, 1); colors.fillStyle = value; colors.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = colors.getImageData(0, 0, 1, 1).data;
  return {color: rgb(r / 255, g / 255, b / 255), alpha: a / 255};
}
function bytes(src) {
  const comma = src.indexOf(','), header = src.slice(0, comma), raw = src.slice(comma + 1);
  return Uint8Array.from(/;base64/i.test(header) ? atob(raw) : decodeURIComponent(raw), c => c.charCodeAt(0));
}
export function jpegOrientation(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = 2; offset + 4 <= data.length;) {
    const marker = view.getUint16(offset), length = view.getUint16(offset + 2);
    if (marker === 0xffda || marker === 0xffd9 || length < 2 || offset + 2 + length > data.length) break;
    if (marker === 0xffe1 && length >= 16 && view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0) {
      const tiff = offset + 10, little = view.getUint16(tiff) === 0x4949, end = offset + 2 + length, ifd = tiff + view.getUint32(tiff + 4, little);
      if (ifd < tiff + 8 || ifd + 2 > end) return 1;
      const count = view.getUint16(ifd, little);
      for (let i = 0; i < count; i++) {const p = ifd + 2 + i * 12;if (p + 12 > end) break;if (view.getUint16(p, little) === 0x112 && view.getUint16(p + 2, little) === 3 && view.getUint32(p + 4, little) === 1) return view.getUint16(p + 8, little);}
    }
    offset += 2 + length;
  }
  return 1;
}
export function jpegNeedsColorConversion(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = 2; offset + 4 <= data.length;) {
    const marker = view.getUint16(offset), length = view.getUint16(offset + 2);
    if (marker === 0xffda || marker === 0xffd9 || length < 2 || offset + 2 + length > data.length) break;
    if (marker === 0xffe2 && length >= 14 && String.fromCharCode(...data.subarray(offset + 4, offset + 16)) === 'ICC_PROFILE\0') return true;
    if ([0xffc0,0xffc1,0xffc2].includes(marker) && length >= 8 && data[offset + 9] === 4) return true;
    offset += 2 + length;
  }
  return false;
}
export function pngNeedsConversion(data) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  for (let offset = 8; offset + 12 <= data.length;) {
    const length = view.getUint32(offset);
    if (length > data.length - offset - 12) break;
    const type = String.fromCharCode(...data.subarray(offset + 4, offset + 8));
    if (['iCCP','gAMA','cHRM','eXIf','acTL'].includes(type)) return true;
    if (type === 'IEND') break;
    offset += length + 12;
  }
  return false;
}
async function embedImage(pdf, asset, report, objects) {
  const image = await loadImage(asset?.src);
  if (!image) throw Error(`“${asset?.name || 'Missing image'}” could not be decoded; the editor's missing-image placeholder is preserved.`);
  const mime = asset.src.slice(5).split(/[;,]/, 1)[0].toLowerCase();
  if (mime === 'image/png' && !pngNeedsConversion(bytes(asset.src))) return pdf.embedPng(bytes(asset.src));
  let colorConversion = false;
  if (mime === 'image/jpeg') {
    const data = bytes(asset.src);colorConversion = jpegNeedsColorConversion(data);
    // EXIF orientation is interpreted by the browser. A rotated source needs
    // browser conversion so the PDF uses exactly the editor's orientation.
    if (jpegOrientation(data) === 1 && !colorConversion) {const embedded = await pdf.embedJpg(data);if (embedded.width === image.width && embedded.height === image.height) return embedded;}
  }
  const requestedScale = mime === 'image/svg+xml' ? Math.max(1, ...objects.map(object => (object.fit === 'contain' ? Math.min(object.width / image.width, object.height / image.height) : Math.max(object.width / image.width, object.height / image.height)) * 2)) : 1;
  const scale = Math.min(requestedScale, 8192 / Math.max(image.width, image.height), Math.sqrt(24_000_000 / (image.width * image.height)));
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
  try {
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const embedded = await pdf.embedPng(await (await canvasBlob(canvas)).arrayBuffer());
    report.push(`“${asset.name}”: ${mime === 'image/svg+xml' ? 'SVG artwork and effects' : mime === 'image/jpeg' ? colorConversion ? 'profiled / CMYK JPEG (browser RGB colors)' : 'oriented JPEG' : mime === 'image/png' ? 'PNG color profile, orientation or animation (browser appearance)' : 'image format'} converted to PNG at ${canvas.width} × ${canvas.height}${scale < requestedScale ? ' (limited to 24 megapixels / 8,192 pixels per side)' : ''}; other page content stays vector.`);
    return embedded;
  } finally {canvas.width = canvas.height = 1;}
}
function lineWidth(font, line, size, tracking) {
  // PDF's basic Tj operator advances individual glyphs without pair kerning.
  return [...line].reduce((width, char) => width + font.widthOfTextAtSize(char, size), 0) + line.length * tracking;
}
function drawText(page, object, font) {
  metrics ||= document.createElement('canvas').getContext('2d'); metrics.font = fontString(object); metrics.letterSpacing = `${object.letterSpacing}px`;
  const fill = color(object.fill), opacity = object.opacity * fill.alpha;
  if (!opacity) return;
  page.pushOperators(rectangle(0, 0, object.width, object.height), clip(), endPath());
  for (const [i, line] of textLines(object).entries()) {
    const baseline = object.fontSize * .84 + i * object.fontSize * object.lineHeight;
    if (!line || baseline - object.fontSize > object.height) continue;
    const width = metrics.measureText(line).width, natural = lineWidth(font, line, object.fontSize, object.letterSpacing);
    const x = object.textAlign === 'center' ? (object.width - width) / 2 : object.textAlign === 'right' ? object.width - width : 0;
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(natural ? width / natural : 1, 0, 0, 1, x, object.height - baseline), beginText(), setCharacterSpacing(object.letterSpacing), endText());
    page.drawText(line, {x: 0, y: 0, size: object.fontSize, font, color: fill.color, opacity});
    page.pushOperators(popGraphicsState());
  }
}
function drawShape(page, object) {
  const fill = color(object.fill), stroke = color(object.stroke), options = {color: fill.color, opacity: object.opacity * fill.alpha, borderColor: stroke.color, borderOpacity: object.opacity * stroke.alpha, borderWidth: object.strokeWidth};
  if (object.type === 'ellipse') page.drawEllipse({x: object.width / 2, y: object.height / 2, xScale: object.width / 2, yScale: object.height / 2, ...options});
  else if (object.cornerRadius) page.drawSvgPath(roundedPath(object.width, object.height, Math.min(object.cornerRadius, object.width / 2, object.height / 2)), {x: 0, y: object.height, ...options});
  else page.drawRectangle({x: 0, y: 0, width: object.width, height: object.height, ...options});
}
export async function createPDF(project, onProgress = () => {}, {rasterProof = false} = {}) {
  await document.fonts?.ready;
  const pdf = await PDFDocument.create(); pdf.setTitle(project.name); pdf.setCreator('FluxDesign · FluxCreate');
  const report = {documentName: project.name, pages: [], notes: ['RGB output; no tagged reading order, bleed, CMYK conversion or PDF/X compliance.', 'Arial, Times New Roman and Courier New use the standard PDF Helvetica, Times and Courier faces. Fonts are not embedded; keep the native file for editing. Unsupported fonts or characters use a page image to preserve their appearance.']};
  const fonts = new Map(), imageCache = new Map(), imageUses = new Map();
  for (const page of project.pages) for (const object of page.objects) if (object.type === 'image' && object.visible && object.opacity > 0) {const src = project.assets.find(asset => asset.id === object.assetId)?.src;if (!imageUses.has(src)) imageUses.set(src, []);imageUses.get(src).push(object);}
  for (let index = 0; index < project.pages.length; index++) {
    const source = project.pages[index], entry = {number: index + 1, name: source.name, mode: 'vector', reasons: [], conversions: []}, prepared = new Map(); report.pages.push(entry); onProgress(index + 1, project.pages.length);
    if (rasterProof) entry.reasons.push('Image proof requested.');
    for (const object of source.objects.filter(o => !rasterProof && o.visible && o.opacity > 0)) {
      if (object.type === 'text' && object.text) {
        const face = pdfFontName(object);
        if (!face) {entry.reasons.push(`“${object.name}”: ${object.fontFamily} has no compatible PDF font.`); continue;}
        if (object.text.includes('\u00ad')) {entry.reasons.push(`“${object.name}”: discretionary hyphens require browser text layout.`); continue;}
        if (!fonts.has(face)) fonts.set(face, await pdf.embedFont(face));
        const font = fonts.get(face);
        try {for (const line of textLines(object)) font.encodeText(line); prepared.set(object.id, font);}
        catch {entry.reasons.push(`“${object.name}”: some characters cannot be encoded in ${object.fontFamily}. All glyphs are preserved in the page image.`);}
        if (prepared.has(object.id) && textLines(object).some(line => line && lineWidth(font, line, object.fontSize, object.letterSpacing) <= 0)) entry.reasons.push(`“${object.name}”: extreme negative tracking requires browser text layout.`);
      }
    }
    for (const object of source.objects.filter(o => !entry.reasons.length && o.visible && o.opacity > 0 && o.type === 'image')) {
        const asset = project.assets.find(asset => asset.id === object.assetId);
        try {
          if (!imageCache.has(asset?.src)) {const conversions = []; const image = await embedImage(pdf, asset, conversions, imageUses.get(asset?.src)); imageCache.set(asset?.src, {image, conversions});}
          const cached = imageCache.get(asset?.src); prepared.set(object.id, cached.image); entry.conversions.push(...cached.conversions);
        } catch (error) {entry.reasons.push(`“${object.name}”: ${error.message}`);}
    }
    const page = pdf.addPage([source.width, source.height]);
    if (entry.reasons.length) {
      entry.mode = 'raster'; entry.conversions = []; const scale = Math.min(2, 8192 / Math.max(source.width, source.height)); entry.dpi = Math.round(scale * 72);
      const canvas = await renderPage(source, project.assets, scale);
      try {page.drawImage(await pdf.embedPng(await (await canvasBlob(canvas)).arrayBuffer()), {x: 0, y: 0, width: source.width, height: source.height});}
      finally {canvas.width = canvas.height = 1;}
    } else {
      const background = color(source.background); page.drawRectangle({x: 0, y: 0, width: source.width, height: source.height, color: background.color, opacity: background.alpha});
      for (const object of source.objects.filter(o => o.visible && o.opacity > 0)) {
        page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...objectPDFTransform(object, source.height)));
        if (object.type === 'text' && object.text) drawText(page, object, prepared.get(object.id));
        else if (object.type === 'image') {page.pushOperators(rectangle(0, 0, object.width, object.height), clip(), endPath());const image = prepared.get(object.id);page.drawImage(image, {...imagePlacement(image, object), opacity: object.opacity});}
        else if (object.type !== 'text') drawShape(page, object);
        page.pushOperators(popGraphicsState());
      }
    }
    entry.reasons = [...new Set(entry.reasons)]; entry.conversions = [...new Set(entry.conversions)];
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return {blob: new Blob([await pdf.save()], {type: 'application/pdf'}), report};
}
