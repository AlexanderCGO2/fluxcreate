export function captureAIContext(context){
 if(!context||context.documentId==null||context.revision==null)throw Error('Open a document before asking AI.');
 return Object.freeze({documentId:String(context.documentId),revision:String(context.revision),selectionRevision:String(context.selectionRevision??''),selection:Object.freeze((context.selection||[]).map(item=>Object.freeze({id:String(item.id),label:String(item.label||item.id).slice(0,200),kind:String(item.kind||'object').slice(0,80)})))});
}
export function sameAIContext(a,b){if(!a||!b)return false;try{return JSON.stringify(captureAIContext(a))===JSON.stringify(captureAIContext(b));}catch{return false;}}
export function decodeMcpAsset(result){
 const value=result?.structuredContent;if(!value||!['text','image'].includes(value.kind)||typeof value.id!=='string')throw Error('FluxLab returned an invalid asset.');
 if(value.kind==='text'){if(typeof value.text!=='string'||!value.text.trim()||value.text.length>200000)throw Error('FluxLab returned invalid text.');return {...value,images:[]};}
 const images=(result.content||[]).filter(part=>part.type==='image');if(images.length!==1||!/^image\/(png|jpeg|webp)$/.test(images[0].mimeType)||typeof images[0].data!=='string'||images[0].data.length>3500000||images[0].data.length%4||!/^[A-Za-z0-9+/]+={0,2}$/.test(images[0].data))throw Error('FluxLab returned an invalid image.');
 const metadata=value.images?.[0];if(!metadata||!Number.isInteger(metadata.width)||!Number.isInteger(metadata.height)||metadata.width<1||metadata.height<1||metadata.width>8192||metadata.height>8192||metadata.width*metadata.height>32000000)throw Error('FluxLab returned unsupported image dimensions.');
 return {...value,images:[{...metadata,src:`data:${images[0].mimeType};base64,${images[0].data}`} ]};
}
