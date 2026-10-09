import {createPDF} from '../../src/pdf-export.mjs';
import {renderPage} from '../../src/render.mjs';
import {createObject as object, createPage, createBlankProjectNative, validateProject, toMotion} from '../../src/model.mjs';
import {encodeProject} from '../../../FluxCreate/shared/browser.mjs';
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs';
const b64 = bytes => {let text='';for (const byte of bytes) text+=String.fromCharCode(byte);return btoa(text);};
export async function check() {
  const image = document.createElement('canvas'); image.width=320;image.height=160;const ctx=image.getContext('2d');ctx.fillStyle='#eb6a38';ctx.fillRect(0,0,160,160);ctx.fillStyle='#2b7dcd';ctx.fillRect(160,0,160,160);ctx.clearRect(20,20,50,50);
  const project=createBlankProjectNative();project.name='Vector PDF verification';project.assets=[{id:'png',name:'Transparent original PNG',src:image.toDataURL('image/png'),width:320,height:160,type:'image'},{id:'jpeg',name:'Original JPEG',src:image.toDataURL('image/jpeg'),width:320,height:160,type:'image'},{id:'webp',name:'WebP image',src:image.toDataURL('image/webp'),width:320,height:160,type:'image'},{id:'svg',name:'Filtered SVG',type:'image',width:320,height:160,src:'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160"><defs><filter id="blur"><feGaussianBlur stdDeviation="6"/></filter><linearGradient id="g"><stop stop-color="#c62b8b"/><stop offset="1" stop-color="#346eca"/></linearGradient></defs><rect x="10" y="10" width="290" height="130" rx="30" fill="url(#g)" filter="url(#blur)"/></svg>')}];
  const profiledSrc=project.assets[1].src,profiledBytes=Uint8Array.from(atob(profiledSrc.split(',')[1]),x=>x.charCodeAt(0)),jpegParts=[profiledBytes.subarray(0,2)];
  for(let offset=2;offset<profiledBytes.length;){const marker=(profiledBytes[offset]<<8)|profiledBytes[offset+1];if(marker===0xffda){jpegParts.push(profiledBytes.subarray(offset));break;}const length=(profiledBytes[offset+2]<<8)|profiledBytes[offset+3];if(marker!==0xffe2)jpegParts.push(profiledBytes.subarray(offset,offset+2+length));offset+=2+length;}
  const plain=new Uint8Array(jpegParts.reduce((n,p)=>n+p.length,0));let pos=0;for(const part of jpegParts){plain.set(part,pos);pos+=part.length;}project.assets[1].src='data:image/jpeg;base64,'+b64(plain);
  const exif = new Uint8Array(36), view = new DataView(exif.buffer);view.setUint16(0,0xffe1);view.setUint16(2,34);view.setUint32(4,0x45786966);view.setUint16(10,0x4949);view.setUint16(12,42,true);view.setUint32(14,8,true);view.setUint16(18,1,true);view.setUint16(20,0x112,true);view.setUint16(22,3,true);view.setUint32(24,1,true);view.setUint16(28,2,true);
  const jpeg=Uint8Array.from(atob(project.assets[1].src.split(',')[1]),x=>x.charCodeAt(0)),oriented=new Uint8Array(jpeg.length+exif.length);oriented.set(jpeg.subarray(0,2));oriented.set(exif,2);oriented.set(jpeg.subarray(2),38);project.assets.push({id:'oriented',name:'Mirrored JPEG',src:'data:image/jpeg;base64,'+b64(oriented),width:320,height:160,type:'image'});
  const text=(text,properties={})=>object('text',{text,name:text,x:28,y:28,width:440,height:50,fontSize:24,fontFamily:'Arial',fill:'#173143',...properties});
  const page=(name,objects)=>createPage({name,width:500,height:640,background:'#fffaf1',objects});
  project.pages=[
    page('Native artwork',[
      text('Searchable café — Arial'),text('Times centered & bold',{y:75,fontFamily:'Times New Roman',fontWeight:700,textAlign:'center'}),text('Courier aligned right',{y:122,fontFamily:'Courier New',fontSize:21,textAlign:'right',letterSpacing:1}),
      object('rectangle',{x:28,y:194,width:130,height:100,cornerRadius:24,fill:'rgba(220,40,60,.7)',stroke:'#173143',strokeWidth:5,rotation:12,opacity:.65}),
      object('ellipse',{x:205,y:202,width:165,height:87,fill:'#237ddb88',stroke:'#299945',strokeWidth:7,rotation:-28,opacity:.8}),
      object('image',{assetId:'png',x:40,y:335,width:140,height:100,fit:'cover',rotation:16,opacity:.75}),object('image',{assetId:'jpeg',x:220,y:335,width:230,height:100,fit:'contain',rotation:-12}),
      text('Clipped text must stay inside the frame. Second line is clipped.',{x:28,y:488,width:235,height:32,fontSize:22,rotation:8}),
      text('AVATAR tracking -0.5',{x:28,y:564,width:440,fontSize:26,letterSpacing:-.5}),
    ]),
    page('Font fallback',[text('Georgia stays faithful.',{fontFamily:'Georgia',fontSize:32,y:110}),text('No font is silently dropped.',{fontFamily:'Verdana',y:185}),object('ellipse',{x:80,y:290,width:320,height:190,fill:'#df826a',rotation:30})]),
    page('Glyph fallback',[text('Latin and 日本語 and 🌍',{fontSize:31,y:120}),text('All characters remain visible.',{y:210})]),
    page('Converted images',[text('SVG, WebP and oriented JPEG'),object('image',{assetId:'svg',x:35,y:115,width:430,height:235,fit:'contain',rotation:11}),object('image',{assetId:'webp',x:35,y:400,width:190,height:180,fit:'cover'}),object('image',{assetId:'oriented',x:255,y:400,width:210,height:180,fit:'cover'})]),
    page('Hidden content',[text('Visible searchable text'),text('日本語',{visible:false}),text('Georgia invisible',{fontFamily:'Georgia',opacity:0})]),
  ];project.activePageId=project.pages[0].id;Object.assign(project,validateProject(project));
  const before=JSON.stringify(project),{blob,report}=await createPDF(project),pdfBytes=new Uint8Array(await blob.arrayBuffer());
  if(JSON.stringify(project)!==before)throw Error('Export changed the project.');
  pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.js';const base=new URL('/pdfjs/',location.origin).href;
  const task=pdfjs.getDocument({data:pdfBytes.slice(),standardFontDataUrl:base+'standard_fonts/',wasmUrl:base+'wasm/',cMapUrl:base+'cmaps/',cMapPacked:true,useSystemFonts:false,isEvalSupported:false});const pdf=await task.promise,results=[];
  for(let i=0;i<project.pages.length;i++){
    const p=await pdf.getPage(i+1),viewport=p.getViewport({scale:2}),rendered=document.createElement('canvas');rendered.width=viewport.width;rendered.height=viewport.height;
    await p.render({canvasContext:rendered.getContext('2d'),viewport}).promise;
    const reference=await renderPage(project.pages[i],project.assets,2),a=rendered.getContext('2d').getImageData(0,0,rendered.width,rendered.height).data,b=reference.getContext('2d').getImageData(0,0,reference.width,reference.height).data;
    let delta=0,changed=0,ink=0;for(let k=0;k<a.length;k+=4){const d=Math.max(Math.abs(a[k]-b[k]),Math.abs(a[k+1]-b[k+1]),Math.abs(a[k+2]-b[k+2]));delta+=d;if(d>32)changed++;if(b[k]<235||b[k+1]<225||b[k+2]<215)ink++;}
    const content=await p.getTextContent(),ops=await p.getOperatorList();results.push({name:project.pages[i].name,text:content.items.map(x=>x.str).join(' '),meanDelta:delta/(a.length/4),changedFraction:changed/(a.length/4),inkChangedFraction:changed/ink,images:ops.fnArray.filter(x=>[pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject].includes(x)).length,textOperators:ops.fnArray.filter(x=>x===pdfjs.OPS.showText).length,rendered:rendered.toDataURL(),reference:reference.toDataURL()});p.cleanup();rendered.width=rendered.height=reference.width=reference.height=1;
  }
  await task.destroy();const proof=await createPDF(project,()=>{},{rasterProof:true});
  const edge=structuredClone(project);edge.assets.push({id:'profile',name:'Profiled JPEG',src:profiledSrc,width:320,height:160,type:'image'});edge.assets.push({id:'broken',name:'Undecodable image',src:'data:image/png;base64,AAAA',width:10,height:10,type:'image'});edge.pages=[page('Discretionary hyphen',[text('Soft\u00adhyphen')]),page('Extreme tracking',[text('Tracked',{letterSpacing:-50})]),page('Missing image',[object('image',{assetId:'broken'})]),page('Profiled JPEG',[object('image',{assetId:'profile',x:30,y:30,width:440,height:220})])];const edgeResult=await createPDF(edge);
  return {report,results,pdf:b64(pdfBytes),proofReport:proof.report,edgeReport:edgeResult.report,native:encodeProject('fluxidesign',project,toMotion(project)),jpeg:project.assets.find(a=>a.id==='jpeg').src.split(',')[1]};
}
