
const images = new Map();
function limitImages() {let pixels=0;for(const entry of images.values())pixels+=entry.pixels;while(images.size>12||pixels>24_000_000){const [key,entry]=images.entries().next().value;pixels-=entry.pixels;images.delete(key);}}
export function releaseUnusedImages(assets) {const active=new Set(assets.map(asset=>asset.src));for(const src of images.keys())if(!active.has(src))images.delete(src);}
export function loadImage(src) {
  if (!src) return Promise.resolve(null);
  if(images.has(src)){const entry=images.get(src);images.delete(src);images.set(src,entry);return entry.promise;}
  const entry={pixels:0};entry.promise=new Promise(resolve => {const image = new Image(); image.onload = () => {entry.pixels=image.width*image.height;limitImages();resolve(image);}; image.onerror = () => {images.delete(src);resolve(null);}; image.src = src;});images.set(src,entry);limitImages();return entry.promise;
}
export function fontString(o) {return `${o.fontWeight} ${o.fontSize}px "${o.fontFamily.replace(/["\\]/g, '')}"`;}
let measure, wrappedText=new WeakMap();
export function textLines(o) {
  if (!measure && typeof document !== 'undefined') {measure = document.createElement('canvas').getContext('2d');document.fonts?.addEventListener('loadingdone',()=>{wrappedText=new WeakMap();});}
  const key=JSON.stringify([o.text,o.width,o.fontFamily,o.fontSize,o.fontWeight,o.letterSpacing,!!measure]),cached=wrappedText.get(o);if(cached?.key===key)return cached.lines;
  if (measure) {measure.font = fontString(o); measure.letterSpacing = `${o.letterSpacing}px`;}
  const width = text => measure ? measure.measureText(text).width : text.length * o.fontSize * 0.53;
  const lines = [];
  for (const paragraph of o.text.split('\n')) {
    if (!paragraph) {lines.push(''); continue;}
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (width(next) <= o.width) {line = next; continue;}
      if (line) {lines.push(line); line = '';}
      if (width(word) <= o.width) {line = word; continue;}
      for (const char of word) {if (line && width(line + char) > o.width) {lines.push(line); line = '';} line += char;}
    }
    if (line) lines.push(line);
  }
  Object.freeze(lines);wrappedText.set(o,{key,lines});return lines;
}
export function textFit(o){const lines=o.text?textLines(o):[],leading=o.fontSize*o.lineHeight,requiredHeight=lines.length?o.fontSize+(lines.length-1)*leading:0,visibleLines=Math.max(0,Math.floor((o.height-o.fontSize)/leading+1+1e-8));if(measure){measure.font=fontString(o);measure.letterSpacing=`${o.letterSpacing}px`;}let maxWidth=0;for(const line of lines)maxWidth=Math.max(maxWidth,measure?measure.measureText(line).width:line.length*o.fontSize*.53);return{lineCount:lines.length,visibleLines,hiddenLines:Math.max(0,lines.length-visibleLines),requiredHeight,maxWidth,vertical:requiredHeight>o.height+.01,horizontal:maxWidth>o.width+.01,overflow:requiredHeight>o.height+.01||maxWidth>o.width+.01};}
export function hasOverflow(o) {return o.type==='text'&&textFit(o).overflow;}
export function textFitReport(project){return project.pages.flatMap((page,index)=>page.objects.filter(o=>o.type==='text').map(o=>({pageId:page.id,pageNumber:index+1,pageName:page.name,frameId:o.id,frameName:o.name,visible:o.visible,locked:o.locked,width:o.width,height:o.height,...textFit(o)})));}
function fitImage(ctx, image, o) {
  const factor = o.fit === 'contain' ? Math.min(o.width / image.width, o.height / image.height) : Math.max(o.width / image.width, o.height / image.height);
  const width = image.width * factor, height = image.height * factor; ctx.drawImage(image, (o.width - width) / 2, (o.height - height) / 2, width, height);
}
export async function renderPage(page, assets, scale = 1) {
  const canvas = document.createElement('canvas'); canvas.width = Math.round(page.width * scale); canvas.height = Math.round(page.height * scale); const ctx = canvas.getContext('2d'); ctx.scale(scale, scale); ctx.fillStyle = page.background; ctx.fillRect(0, 0, page.width, page.height);
  for (const o of page.objects) {
    if (!o.visible) continue;
    ctx.save(); ctx.translate(o.x, o.y); ctx.translate(o.width / 2, o.height / 2); ctx.rotate(o.rotation * Math.PI / 180); ctx.translate(-o.width / 2, -o.height / 2); ctx.globalAlpha = o.opacity;
    ctx.fillStyle = o.fill; ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth;
    if (o.type === 'text') {ctx.beginPath(); ctx.rect(0, 0, o.width, o.height); ctx.clip(); ctx.font = fontString(o); ctx.textBaseline = 'alphabetic'; ctx.textAlign = o.textAlign; ctx.letterSpacing = `${o.letterSpacing}px`;
      textLines(o).forEach((line, i) => ctx.fillText(line, o.textAlign === 'center' ? o.width / 2 : o.textAlign === 'right' ? o.width : 0, o.fontSize * 0.84 + i * o.fontSize * o.lineHeight));
    } else if (o.type === 'image') {
      ctx.beginPath(); ctx.rect(0, 0, o.width, o.height); ctx.clip(); const asset = assets.find(a => a.id === o.assetId), image = await loadImage(asset?.src);
      if (image) fitImage(ctx, image, o); else {ctx.fillStyle = '#e3e2dc'; ctx.fillRect(0, 0, o.width, o.height); ctx.strokeStyle = '#b7b9b2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.width, o.height); ctx.moveTo(o.width, 0); ctx.lineTo(0, o.height); ctx.stroke();}
    } else {
      ctx.beginPath(); if (o.type === 'ellipse') ctx.ellipse(o.width / 2, o.height / 2, o.width / 2, o.height / 2, 0, 0, Math.PI * 2); else ctx.roundRect(0, 0, o.width, o.height, Math.min(o.cornerRadius, o.width / 2, o.height / 2));
      ctx.fill(); if (o.strokeWidth) ctx.stroke();
    }
    ctx.restore();
  }
  return canvas;
}
const esc = str => String(str).replace(/[<>&"']/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'}[c]));
export function pageSVG(page, assets) {
  const objects = page.objects.filter(o => o.visible).map((o, index) => {
    const common = `fill="${esc(o.fill)}" stroke="${esc(o.stroke)}" stroke-width="${o.strokeWidth}"`;
    let content = '';
    if (o.type === 'text') {
      content = `<defs><clipPath id="text-${index}"><rect width="${o.width}" height="${o.height}"/></clipPath></defs><text clip-path="url(#text-${index})" fill="${esc(o.fill)}" font-family="${esc(o.fontFamily)}" font-size="${o.fontSize}" font-weight="${o.fontWeight}" letter-spacing="${o.letterSpacing}" text-anchor="${o.textAlign === 'center' ? 'middle' : o.textAlign === 'right' ? 'end' : 'start'}">${textLines(o).map((line, i) => `<tspan x="${o.textAlign === 'center' ? o.width / 2 : o.textAlign === 'right' ? o.width : 0}" y="${o.fontSize * 0.84 + i * o.fontSize * o.lineHeight}">${esc(line)}</tspan>`).join('')}</text>`;
    } else if (o.type === 'image') {
      const asset = assets.find(a => a.id === o.assetId); content = asset?.src ? `<defs><clipPath id="image-${index}"><rect width="${o.width}" height="${o.height}"/></clipPath></defs><image clip-path="url(#image-${index})" href="${esc(asset.src)}" width="${o.width}" height="${o.height}" preserveAspectRatio="xMidYMid ${o.fit === 'contain' ? 'meet' : 'slice'}"/>` : `<rect width="${o.width}" height="${o.height}" fill="#e3e2dc"/><path d="M0 0L${o.width} ${o.height}M${o.width} 0L0 ${o.height}" stroke="#b7b9b2"/>`;
    } else if (o.type === 'ellipse') content = `<ellipse cx="${o.width / 2}" cy="${o.height / 2}" rx="${o.width / 2}" ry="${o.height / 2}" ${common}/>`;
    else content = `<rect width="${o.width}" height="${o.height}" rx="${o.cornerRadius}" ${common}/>`;
    return `<g transform="translate(${o.x} ${o.y}) rotate(${o.rotation} ${o.width / 2} ${o.height / 2})" opacity="${o.opacity}">${content}</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}"><title>${esc(page.name)}</title><rect width="100%" height="100%" fill="${esc(page.background)}"/>${objects}</svg>`;
}
export function canvasBlob(canvas, type = 'image/png') {return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image export failed.')), type));}
export async function exportPDF(project, onProgress = () => {}, options = {}) {
  const {createPDF} = await import('./pdf-export.mjs');
  const {blob, report} = await createPDF(project, onProgress, options);
  options.onReport?.(report);
  return blob;
}
