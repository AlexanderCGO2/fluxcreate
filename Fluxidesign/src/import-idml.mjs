import {Inflate} from 'fflate';
import {DOMParser} from '@xmldom/xmldom';
import {createBlankProjectNative, createPage, createObject, validateProject, uid} from './model.mjs';

const fail = message => {throw new Error(message);}, decoder = new TextDecoder('utf-8', {fatal: true});
const MAX_FILE = 64 * 1024 * 1024, MAX_ENTRY = 20 * 1024 * 1024, MAX_TOTAL = 80 * 1024 * 1024;
const children = node => Array.from(node.childNodes || []).filter(n => n.nodeType === 1);
const name = node => node.localName || node.nodeName.split(':').at(-1);
const all = (node, tag) => Array.from(node.getElementsByTagName('*')).filter(n => name(n) === tag);
const attr = (node, key, fallback = '') => node.hasAttribute(key) ? node.getAttribute(key) : fallback;
const first = (node, tag) => all(node, tag)[0];
const nums = (value, count, fallback) => {if (!value && fallback) return [...fallback]; const list = String(value).trim().split(/\s+/).map(Number); if (list.length !== count || list.some(n => !Number.isFinite(n) || Math.abs(n) > 1e8)) fail('IDML contains invalid coordinates or transforms.'); return list;};
const identity = [1, 0, 0, 1, 0, 0], matrix = node => nums(attr(node, 'ItemTransform'), 6, identity);
const mul = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
const point = (m, p) => [m[0]*p[0]+m[2]*p[1]+m[4], m[1]*p[0]+m[3]*p[1]+m[5]];
function inverse(m) {const d = m[0]*m[3]-m[1]*m[2]; if (Math.abs(d)<1e-10) fail('IDML contains a collapsed page transform.'); return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}
function safePath(path) {if (!path || path.length>500 || /[\\\x00-\x1f]/.test(path) || path.startsWith('/') || path.split('/').some(s=>['..','__proto__','constructor','prototype'].includes(s)) || /^[a-z]+:/i.test(path)) fail('IDML contains an unsafe package path.'); return path;}
const crcTable = Uint32Array.from({length:256}, (_, n) => {for (let k=0;k<8;k++) n=(n&1)?0xedb88320^(n>>>1):n>>>1; return n>>>0;});
function crc32(bytes) {let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
/** Check ZIP sizes and paths before allocating/decompressing any entry. No extraction to disk. */
export function readIDMLArchive(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input); if (bytes.length>MAX_FILE || bytes.length<22) fail('IDML must be a valid ZIP package under 64 MB.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--) if(view.getUint32(p,true)===0x06054b50&&p+22+view.getUint16(p+20,true)===bytes.length){end=p;break;}
  if(end<0) fail('IDML ZIP directory is missing.');
  const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
  if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||count!==view.getUint16(end+8,true)||count>2000||offset+size!==end) fail('Split, ZIP64, or oversized IDML archives are not supported.');
  let cursor=offset,total=0;const entries=new Map();
  for(let i=0;i<count;i++){
    if(cursor+46>end||view.getUint32(cursor,true)!==0x02014b50)fail('Malformed IDML ZIP directory.');
    const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),compressed=view.getUint32(cursor+20,true),length=view.getUint32(cursor+24,true),nl=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true),local=view.getUint32(cursor+42,true);
    if(cursor+46+nl+extra+comment>end||length>MAX_ENTRY||(total+=length)>MAX_TOTAL||flags&1||![0,8].includes(method)||method===0&&compressed!==length||local+30>offset)fail('IDML ZIP entry is encrypted, malformed, or exceeds its size limit.');
    const file=safePath(decoder.decode(bytes.subarray(cursor+46,cursor+46+nl)));if(entries.has(file))fail('IDML ZIP contains duplicate entries.');
    if(view.getUint32(local,true)!==0x04034b50||view.getUint16(local+8,true)!==method||view.getUint16(local+6,true)&1)fail('Invalid IDML ZIP local entry.');
    const ln=view.getUint16(local+26,true),le=view.getUint16(local+28,true);if(local+30+ln+le+compressed>offset||decoder.decode(bytes.subarray(local+30,local+30+ln))!==file)fail('IDML ZIP file bounds do not match its directory.');
    entries.set(file,{length,compressed,method,start:local+30+ln+le,crc:view.getUint32(cursor+16,true)});cursor+=46+nl+extra+comment;
  }
  if(cursor!==end)fail('IDML ZIP directory has unexpected data.');
  const files=Object.create(null);
  for(const [path,info] of entries){let file;try{const packed=bytes.subarray(info.start,info.start+info.compressed);if(info.method===0)file=packed.slice();else{file=new Uint8Array(info.length);let written=0;const stream=new Inflate(chunk=>{if(written+chunk.length>info.length)fail('Inflated ZIP entry exceeds its declared size.');file.set(chunk,written);written+=chunk.length;});for(let i=0;i<packed.length;i+=1024)stream.push(packed.subarray(i,i+1024),i+1024>=packed.length);if(written!==info.length)fail('Inflated ZIP entry size is incorrect.');}}catch{fail('IDML ZIP contents could not be decoded within their declared sizes.');}if(file.length!==info.length||crc32(file)!==info.crc)fail('IDML ZIP entry failed its size or checksum check.');files[path]=file;}
  if(!files['designmap.xml'])fail('This ZIP is not an IDML document: designmap.xml is missing.');
  return files;
}
function xml(bytes, label, budget={nodes:0}) {
  if(!bytes)fail(`IDML is missing ${label}.`);const text=decoder.decode(bytes);if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text))fail('IDML XML cannot contain DTDs or external entities.');
  // Bound element allocation before building the DOM, including deeply nested inputs.
  let offset=0,depth=0;while((offset=text.indexOf('<',offset))>=0){const endMarker=text.startsWith('<!--',offset)?'-->':text.startsWith('<![CDATA[',offset)?']]>':text.startsWith('<?',offset)?'?>':null;if(endMarker){const end=text.indexOf(endMarker,offset+2);if(end<0)fail('IDML XML contains an unterminated declaration.');offset=end+endMarker.length;continue;}let end=offset+1,quote='';for(;end<text.length;end++){const c=text[end];if(quote){if(c===quote)quote='';}else if(c==='"'||c==="'")quote=c;else if(c==='>')break;}if(end===text.length)fail('IDML XML contains an unterminated tag.');if(text[offset+1]==='/')depth--;else{if(++budget.nodes>150000)fail('IDML XML exceeds its document element budget.');if(!/\/\s*$/.test(text.slice(offset+1,end)))depth++;}if(depth>64||depth<0)fail('IDML XML exceeds supported nesting or has unbalanced tags.');offset=end+1;}
  const doc=new DOMParser({onError:(_level,message)=>fail(`Malformed IDML XML in ${label}: ${String(message).slice(0,180)}`)}).parseFromString(text,'application/xml');
  const stack=[[doc,0]];let count=0;while(stack.length){const [node,depth]=stack.pop();if(++count>150000||depth>64)fail('IDML XML exceeds supported nesting or element limits.');for(const child of children(node))stack.push([child,depth+1]);}return doc;
}
function geometry(node) {
  const paths=all(node,'PathGeometry').filter(n=>n.parentNode?.parentNode===node), anchors=paths.flatMap(p=>all(p,'PathPointType').concat(all(p,'PathPoint'))).map(p=>nums(attr(p,'Anchor',attr(p,'PathPointAnchor')),2));
  if(anchors.length){const xs=anchors.map(p=>p[0]),ys=anchors.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];}
  const b=nums(attr(node,'GeometricBounds'),4);return [b[1],b[0],b[3],b[2]];
}
function transformedBox(bounds,m,notes,label){const [l,t,r,b]=bounds,sx=Math.hypot(m[0],m[1]),sy=Math.hypot(m[2],m[3]);if(r<=l||b<=t||!sx||!sy)fail('IDML contains an empty or collapsed frame.');
  const center=point(m,[(l+r)/2,(t+b)/2]),skew=Math.abs(m[0]*m[2]+m[1]*m[3])>1e-5*sx*sy,mirror=m[0]*m[3]-m[1]*m[2]<0;
  if(skew||mirror){notes.add(`“${label}”: skewed or mirrored placement was approximated by its page-aligned bounds.`);const ps=[[l,t],[r,t],[r,b],[l,b]].map(p=>point(m,p)),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys),rotation:0,sx,sy};}
  const width=(r-l)*sx,height=(b-t)*sy;return{x:center[0]-width/2,y:center[1]-height/2,width,height,rotation:Math.atan2(m[1],m[0])*180/Math.PI,sx,sy};
}
function props(node){const result=Object.fromEntries(Array.from(node.attributes||[]).map(a=>[a.name,a.value]));for(const p of children(node).filter(n=>name(n)==='Properties'))for(const child of children(p))result[name(child)]=child.textContent;return result;}
const finite=(v,fallback,min=-1e8,max=1e8)=>{if(v===undefined||v==='')return fallback;const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)fail('IDML contains an invalid numeric property.');return n;};
function embeddedImage(files,uri){let base;try{base=decodeURIComponent(uri).replaceAll('\\','/').split('/').at(-1);}catch{return null;}if(!base)return null;const found=Object.keys(files).filter(p=>p===`Links/${base}`||p===`Resources/${base}`);if(found.length!==1)return null;const data=files[found[0]];let mime;if(data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71)mime='png';else if(data[0]===255&&data[1]===216)mime='jpeg';else if(String.fromCharCode(...data.slice(0,4))==='RIFF'&&String.fromCharCode(...data.slice(8,12))==='WEBP')mime='webp';if(!mime)return null;let binary='';for(let i=0;i<data.length;i+=16384)binary+=String.fromCharCode(...data.subarray(i,i+16384));return `data:image/${mime};base64,${btoa(binary)}`;}

export function importIDML(input,filename='Imported publication.idml') {
  const files=readIDMLArchive(input),budget={nodes:0},design=xml(files['designmap.xml'],'designmap.xml',budget),notes=new Set(['IDML imports editable pages, simple frames, and plain story text. Fonts must be installed locally. Rich text styles, text threading, master items, tables, paths, effects, and print color profiles may need adjustment.']);
  const docs=new Map();const read=path=>{safePath(path);if(!docs.has(path))docs.set(path,xml(files[path],path,budget));return docs.get(path);};
  const refs=tag=>all(design,tag).filter(n=>n.hasAttribute('src')).map(n=>attr(n,'src'));
  const colors=new Map([['Color/Black','#000000'],['Color/Paper','#ffffff'],['Color/White','#ffffff'],['Swatch/None','transparent'],['Color/None','transparent']]);
  for(const path of refs('Graphic'))for(const c of all(read(path),'Color')){const v=attr(c,'ColorValue').split(/\s+/).map(Number),space=attr(c,'Space',attr(c,'ColorSpace'));let rgb;if(space==='RGB'&&v.length===3)rgb=v;else if(space==='CMYK'&&v.length===4){rgb=v.slice(0,3).map(n=>255*(1-n/100)*(1-v[3]/100));notes.add('CMYK and spot colors are approximated in RGB; this is not a press-color conversion.');}if(rgb?.every(Number.isFinite))colors.set(attr(c,'Self'),'#'+rgb.map(n=>Math.round(Math.max(0,Math.min(255,n))).toString(16).padStart(2,'0')).join(''));}
  const getColor=(value,fallback='#000000')=>{if(!value)return fallback;if(colors.has(value))return colors.get(value);notes.add(`Unsupported swatch “${value.slice(0,100)}” uses a fallback color.`);return fallback;};
  const styles=new Map();for(const path of refs('Styles'))for(const n of all(read(path),'ParagraphStyle').concat(all(read(path),'CharacterStyle')))styles.set(attr(n,'Self'),props(n));
  function style(id,seen=new Set()){if(!id||!styles.has(id))return{};if(seen.has(id)||seen.size>20)fail('IDML style inheritance contains a cycle.');seen.add(id);const v=styles.get(id);return{...style(v.BasedOn,seen),...v};}
  const stories=new Map();for(const path of refs('Story')){const doc=read(path),story=all(doc,'Story').find(n=>n.hasAttribute('Self'));if(!story)continue;let text='',firstStyle=null,stylesUsed=new Set();
    const walk=(node,p={})=>{const kind=name(node);if(kind==='Properties'||kind==='Note')return;let s=p;if(kind==='ParagraphStyleRange')s={...p,...style(attr(node,'AppliedParagraphStyle')),...props(node)};if(kind==='CharacterStyleRange')s={...p,...style(attr(node,'AppliedCharacterStyle')),...props(node)};if(kind==='Content'){text+=node.textContent;if(node.textContent){firstStyle??=s;stylesUsed.add(JSON.stringify(s));}return;}if(kind==='Br'){text+='\n';return;}if(kind==='Tab'){text+='\t';return;}if(kind==='Table'){notes.add('Tables are imported as plain story text; cell layout is not preserved.');}for(const child of children(node))walk(child,s);};walk(story);if(text.length>50000)fail('An IDML story exceeds 50,000 characters.');if(stylesUsed.size>1)notes.add('Mixed paragraph/character formatting uses the first text run’s style in each imported story.');stories.set(attr(story,'Self'),{text,style:firstStyle||{}});
  }
  const layers=new Map(all(design,'Layer').map((n,i)=>[attr(n,'Self'),{index:i,locked:attr(n,'Locked')==='true',visible:attr(n,'Visible')!=='false'}]));
  const project=createBlankProjectNative();project.name=filename.replace(/\.idml$/i,'').slice(0,200);project.pages=[];const storyUsed=new Set(),mediaBySource=new Map();let frameCount=0,encodedMedia=0;
  const spreadRefs=refs('Spread');if(!spreadRefs.length)fail('IDML contains no document spreads.');
  for(const path of spreadRefs){const doc=read(path),spread=all(doc,'Spread').find(n=>n.hasAttribute('Self'));if(!spread)fail('IDML spread is malformed.');const pages=children(spread).filter(n=>name(n)==='Page').map(node=>{const b=nums(attr(node,'GeometricBounds'),4),margin=first(node,'MarginPreference'),p=createPage({name:attr(node,'Name',`Page ${project.pages.length+1}`),width:b[3]-b[1],height:b[2]-b[0],background:'#ffffff',margin:margin?finite(attr(margin,'Top'),36,0,1000):36,columns:margin?finite(attr(margin,'ColumnCount'),1,1,12):1,gutter:margin?finite(attr(margin,'ColumnGutter'),12,0,500):12});if(p.width<72||p.height<72||p.width>4096||p.height>4096)fail('IDML pages must be between 72 and 4,096 points on each side.');if(attr(node,'AppliedMaster')&&!['n','None'].includes(attr(node,'AppliedMaster')))notes.add('Applied master-page artwork is not copied; override master items in InDesign or import a PDF for matching appearance.');return{node,page:p,toPage:mul([1,0,0,1,-b[1],-b[0]],inverse(matrix(node))),items:[]};});
    if(!pages.length)continue;project.pages.push(...pages.map(p=>p.page));if(project.pages.length>100)fail('Import up to 100 IDML pages at a time.');let order=0;
    function visit(node,parent=identity,inherited={locked:false,visible:true}){for(const child of children(node)){const kind=name(child);if(['Page','Properties'].includes(kind))continue;const layer=layers.get(attr(child,'ItemLayer'))||{index:0,locked:false,visible:true};const flags={locked:inherited.locked||layer.locked||attr(child,'Locked')==='true',visible:inherited.visible&&layer.visible&&attr(child,'Visible')!=='false'};
      if(kind==='Group'){visit(child,mul(parent,matrix(child)),flags);notes.add('Groups are expanded into independent editable frames.');continue;}
      if(!['Rectangle','Oval','TextFrame','Polygon','GraphicLine'].includes(kind))continue;if(++frameCount>5000)fail('IDML exceeds 5,000 supported page items.');
      if(['Polygon','GraphicLine'].includes(kind)){notes.add(`${kind} paths are not converted. Export PDF to preserve their appearance.`);continue;}
      const label=attr(child,'Name')&&!attr(child,'Name').startsWith('$ID/')?attr(child,'Name'):kind,transform=mul(parent,matrix(child)),bounds=geometry(child),image=first(child,'Image'),pdf=first(child,'PDF'),eps=first(child,'EPS'),type=kind==='TextFrame'?'text':image||pdf||eps?'image':kind==='Oval'?'ellipse':'rectangle';
      let properties={name:label,...flags,fill:getColor(attr(child,'FillColor'),'transparent'),stroke:getColor(attr(child,'StrokeColor')),strokeWidth:finite(attr(child,'StrokeWeight'),0,0,100),opacity:1};const blending=first(child,'BlendingSetting');if(blending)properties.opacity=finite(attr(blending,'Opacity'),100,0,100)/100;
      if(type==='text'){const story=stories.get(attr(child,'ParentStory'));if(!story){notes.add(`“${label}”: its story is missing.`);properties.text='';}else{const s=story.style;properties.text=storyUsed.has(attr(child,'ParentStory'))?'':story.text;storyUsed.add(attr(child,'ParentStory'));const size=finite(s.PointSize,12,1,1000);properties={...properties,fontFamily:(s.AppliedFont||'Arial').split('\t')[0].slice(0,200),fontSize:size,fontWeight:/bold|black|heavy/i.test(s.FontStyle||'')?700:400,lineHeight:s.Leading&&/^\d/.test(s.Leading)?Math.max(.7,Math.min(4,Number(s.Leading)/size)):1.2,letterSpacing:Math.max(-50,Math.min(100,finite(s.Tracking,0)*size/1000)),textAlign:/center/i.test(s.Justification||'')?'center':/right/i.test(s.Justification||'')?'right':'left',fill:getColor(s.FillColor,'#000000')};if(/italic|oblique/i.test(s.FontStyle||''))notes.add('Italic styling is not preserved; choose an installed italic font face after import.');}
        if(!['','n'].includes(attr(child,'NextTextFrame'))||!['','n'].includes(attr(child,'PreviousTextFrame')))notes.add('Threaded stories are retained once in the first encountered frame; continuation frames remain empty. Text may overflow and needs manual reflow.');
      }
      if(type==='image'){const link=first(image||pdf||eps,'Link'),uri=link?attr(link,'LinkResourceURI'):'',key=uri||attr(child,'Self',label);let asset=mediaBySource.get(key);if(!asset){const src=embeddedImage(files,uri)||'';encodedMedia+=src.length;if(encodedMedia>35_000_000)fail('IDML images exceed the portable project limit (35 MB encoded). Import a smaller publication.');asset={id:uid(),name:decodeURIComponent(uri.split('/').at(-1)||label).slice(0,300),type:'image',src,width:Math.max(1,bounds[2]-bounds[0]),height:Math.max(1,bounds[3]-bounds[1])};project.assets.push(asset);mediaBySource.set(key,asset);}properties.assetId=asset.id;properties.fit='cover';if(!asset.src)notes.add(`“${asset.name}”: linked image is missing. Select the frame and import the original image to relink it; no external paths or URLs were read.`);else notes.add('Packaged images use centered cover fitting; original image crops may need adjustment.');}
      let placements=0;for(const pg of pages){const box=transformedBox(bounds,mul(pg.toPage,transform),notes,label);const [l,t,r,b]=bounds,ps=[[l,t],[r,t],[r,b],[l,b]].map(p=>point(mul(pg.toPage,transform),p));const xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);if(Math.max(...xs)<=0||Math.min(...xs)>=pg.page.width||Math.max(...ys)<=0||Math.min(...ys)>=pg.page.height)continue;const {sx,sy,...position}=box;let placed=properties;if(type==='text'&&(Math.abs(sx-1)>.001||Math.abs(sy-1)>.001)){placed={...properties,fontSize:Math.max(1,Math.min(1000,(properties.fontSize||12)*sy))};if(Math.abs(sx-sy)>.001)notes.add('Non-uniformly scaled text uses its vertical font scale; character widths may differ.');}pg.items.push({layer:layer.index,order:order++,object:createObject(type,{...placed,...position})});placements++;}
      if(!placements)notes.add('Pasteboard-only items outside all pages were skipped.');else if(placements>1)notes.add('Spread-spanning items become separate editable copies on each intersected page.');
    }}visit(spread);
    for(const pg of pages)pg.page.objects=pg.items.sort((a,b)=>b.layer-a.layer||a.order-b.order).map(i=>i.object);
  }
  if(!project.pages.length)fail('IDML contains no supported document pages.');project.activePageId=project.pages[0].id;
  return{project:validateProject(project),warnings:[...notes],sourceKind:'IDML',rasterized:false};
}
