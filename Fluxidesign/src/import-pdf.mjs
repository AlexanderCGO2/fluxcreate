import {createBlankProjectNative,createPage,createObject,validateProject,uid} from './model.mjs';

export function checkPDFInput(bytes,filename='document.pdf') {
  if(!(bytes instanceof Uint8Array)||bytes.length>64*1024*1024)throw Error('Import a PDF or PDF-compatible Illustrator file under 64 MB.');
  const header=new TextDecoder().decode(bytes.subarray(0,1024));
  if(!header.includes('%PDF-'))throw Error(/\.ai$/i.test(filename)?'This Illustrator file has no PDF-compatible content. In Illustrator, save with Create PDF Compatible File enabled, or export a PDF.':'This file is not a PDF. Export a PDF from the original application.');
}
const aborted=signal=>{if(signal?.aborted)throw new DOMException('Import cancelled.','AbortError');};
/** PDF art is rendered locally into one image per page; no document scripts or links are run. */
export async function importPDF(bytes,filename='Imported document.pdf',{signal,onProgress=()=>{}}={}) {
  checkPDFInput(bytes,filename);aborted(signal);
  const pdfjs=await import('pdfjs-dist/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('/pdfjs/pdf.worker.js',location.origin).href;
  const base=new URL('/pdfjs/',location.origin).href;
  const task=pdfjs.getDocument({data:bytes.slice(),isEvalSupported:false,enableXfa:false,useWorkerFetch:false,useSystemFonts:true,stopAtErrors:true,disableAutoFetch:true,disableStream:true,cMapUrl:base+'cmaps/',cMapPacked:true,standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/',verbosity:0});
  const cancel=()=>{task.destroy().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});let document;
  try{
    document=await task.promise;aborted(signal);if(document.numPages<1||document.numPages>100)throw Error('Import 1–100 PDF pages at a time.');
    const sizes=[];let totalArea=0,maxSide=1;
    for(let i=1;i<=document.numPages;i++){aborted(signal);const p=await document.getPage(i),v=p.getViewport({scale:1});if(![v.width,v.height].every(n=>Number.isFinite(n)&&n>=72&&n<=4096))throw Error('PDF pages must be between 72 and 4,096 points on each side.');sizes.push([v.width,v.height]);totalArea+=v.width*v.height;maxSide=Math.max(maxSide,v.width,v.height);p.cleanup();}
    const scale=Math.min(2,4096/maxSide,Math.sqrt(80_000_000/totalArea));if(scale<.5)throw Error('This PDF is too large to rasterize safely. Import a smaller page range.');
    const project=createBlankProjectNative();project.name=filename.replace(/\.(pdf|ai)$/i,'').slice(0,200);project.pages=[];let encoded=0;
    for(let i=1;i<=document.numPages;i++){
      aborted(signal);onProgress(i,document.numPages);const pdfPage=await document.getPage(i),viewport=pdfPage.getViewport({scale}),canvas=globalThis.document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      try{const render=pdfPage.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,background:'#ffffff',annotationMode:pdfjs.AnnotationMode.DISABLE});const stop=()=>render.cancel();signal?.addEventListener('abort',stop,{once:true});try{await render.promise;}finally{signal?.removeEventListener('abort',stop);}aborted(signal);
        const src=canvas.toDataURL('image/png');encoded+=src.length;if(src.length>35_000_000||encoded>35_000_000)throw Error('Rendered PDF pages exceed the portable project image limit (35 MB encoded). Import fewer pages.');
        const asset={id:uid(),name:`${filename} · page ${i}`,type:'image',src,width:canvas.width,height:canvas.height};project.assets.push(asset);const [width,height]=sizes[i-1];project.pages.push(createPage({name:`Page ${i}`,width,height,background:'#ffffff',margin:0,columns:1,objects:[createObject('image',{name:`Rendered ${/\.ai$/i.test(filename)?'Illustrator':'PDF'} page ${i}`,assetId:asset.id,x:0,y:0,width,height,fit:'contain'})]}));
      }finally{canvas.width=canvas.height=1;pdfPage.cleanup();}
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    project.activePageId=project.pages[0].id;
    return{project:validateProject(project),sourceKind:/\.ai$/i.test(filename)?'Illustrator PDF':'PDF',rasterized:true,warnings:[`${document.numPages} pages rendered locally at up to ${Math.round(scale*72)} dpi in RGB. Page sizes and page rotation are preserved.`,`Each page is a single movable image. PDF/Illustrator text, paths, layers and effects are not individually editable; add new frames above the artwork.`,`Interactive links, form controls, annotations, document scripts, print profiles and embedded attachments are not imported. Keep the original source file for editing.`]};
  }catch(error){if(signal?.aborted)throw new DOMException('Import cancelled.','AbortError');if(error.name==='PasswordException')throw Error('This PDF requires a password. Export an unlocked copy from its source application.');throw error;}
  finally{signal?.removeEventListener('abort',cancel);await task.destroy().catch(()=>{});}
}
