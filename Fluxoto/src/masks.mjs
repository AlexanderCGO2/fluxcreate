const fail=message=>{throw Error(message);};
const number=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:fail('Invalid layer mask dimensions or brush points.');
export function createMask(layer){return{enabled:true,width:Math.max(1,Math.round(layer.width)),height:Math.max(1,Math.round(layer.height)),src:'',defaultAlpha:255,strokes:[]};}
export function normalizeMask(raw){
 if(raw==null)return null;if(typeof raw!=='object'||Array.isArray(raw))fail('Invalid layer mask.');
 const width=number(raw.width,1,16384),height=number(raw.height,1,16384);if(width*height>33554432)fail('Layer masks support up to 32 megapixels.');
 if(typeof raw.enabled!=='boolean'||typeof raw.src!=='string'||raw.src.length>60000000||(raw.src&&!/^data:image\/png;base64,[a-z\d+/]+=*$/i.test(raw.src)))fail('Import a local PNG layer mask.');
 if(!Array.isArray(raw.strokes)||raw.strokes.length>1000)fail('A mask supports up to 1,000 brush strokes.');let count=0;
 const strokes=raw.strokes.map(s=>{if(!s||!['hide','reveal'].includes(s.mode)||!Array.isArray(s.points)||!s.points.length||(count+=s.points.length)>50000)fail('A mask supports up to 50,000 brush points.');return{mode:s.mode,size:number(s.size,.01,32768),points:s.points.map(p=>{if(!Array.isArray(p)||p.length!==2)fail('Invalid mask brush point.');return[number(p[0],-1000000,1000000),number(p[1],-1000000,1000000)];})};});
 return{enabled:raw.enabled,width,height,src:raw.src,defaultAlpha:number(raw.defaultAlpha,0,255),strokes};
}
export function maskPoint(layer,point){const a=-layer.rotation*Math.PI/180,dx=point.x-layer.x-layer.width/2,dy=point.y-layer.y-layer.height/2;return[(dx*Math.cos(a)-dy*Math.sin(a)+layer.width/2)*layer.mask.width/layer.width,(dx*Math.sin(a)+dy*Math.cos(a)+layer.height/2)*layer.mask.height/layer.height];}
