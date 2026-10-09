import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { BUILTIN_FONTS } from '../src/engine/builtinFonts.ts';
import { ProjectError } from '../src/engine/project.ts';
const MAX_FONT=3*1024*1024;
const cleanName=value=>{if(typeof value!=='string'||!value.trim()||value.length>100||/[\x00-\x1f]/.test(value))throw new ProjectError('Use a font name between 1 and 100 characters.');return value.trim();};
function normalize(data){
 if(!data||typeof data!=='object'||!data.glyphs||typeof data.glyphs!=='object'||Array.isArray(data.glyphs)||!Number.isFinite(data.resolution)||data.resolution<16||data.resolution>100000)throw new ProjectError('This font has invalid metrics.');
 const entries=Object.entries(data.glyphs);if(!entries.length||entries.length>6000||JSON.stringify(data).length>MAX_FONT)throw new ProjectError('Use an outline font under 3 MB with at most 6,000 glyphs.');
 const glyphs={};for(const [char,g] of entries){if(Array.from(char).length!==1||!g||!Number.isFinite(g.ha)||Math.abs(g.ha)>100000||(g.o!==undefined&&typeof g.o!=='string')||(g.o?.length||0)>16000)throw new ProjectError('This font contains an unsupported glyph.');const tokens=(g.o||'').trim().split(/\s+/).filter(Boolean),arity={m:2,l:2,q:4,b:6,z:0};for(let i=0;i<tokens.length;){const op=tokens[i++],n=arity[op];if(n===undefined||i+n>tokens.length)throw new ProjectError('Invalid glyph outline.');for(let a=0;a<n;a++){const v=Number(tokens[i++]);if(!Number.isFinite(v)||Math.abs(v)>100000)throw new ProjectError('Invalid glyph outline coordinate.');}}glyphs[char]={ha:g.ha,x_min:Number.isFinite(g.x_min)?g.x_min:0,x_max:Number.isFinite(g.x_max)?g.x_max:g.ha,o:g.o||''};}
 if(!glyphs['?'])glyphs['?']={ha:data.resolution*.6,x_min:0,x_max:data.resolution*.5,o:'m 0 0 l 0 700 l 500 700 l 500 0 l 0 0'};
 const box=data.boundingBox||{},metric=(x,f)=>Number.isFinite(x)&&Math.abs(x)<=100000?x:f;
 return {glyphs,original_font_information:data.original_font_information&&typeof data.original_font_information==='object'?data.original_font_information:{},resolution:data.resolution,familyName:cleanName(data.familyName||'Imported font'),ascender:metric(data.ascender,data.resolution),descender:metric(data.descender,-data.resolution*.2),underlinePosition:metric(data.underlinePosition,-100),underlineThickness:metric(data.underlineThickness,50),boundingBox:{xMin:metric(box.xMin,0),xMax:metric(box.xMax,data.resolution),yMin:metric(box.yMin,-data.resolution*.2),yMax:metric(box.yMax,data.resolution)}};
}
const fontId=data=>'font_'+createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0,32);
export class FontStore {
 constructor(file){this.db=new DatabaseSync(file);this.db.exec('CREATE TABLE IF NOT EXISTS fonts(id TEXT PRIMARY KEY,name TEXT NOT NULL,data TEXT NOT NULL,builtin INTEGER NOT NULL,favorite INTEGER NOT NULL DEFAULT 0,hidden INTEGER NOT NULL DEFAULT 0)');for(const [id,data] of Object.entries(BUILTIN_FONTS))this.db.prepare('INSERT OR IGNORE INTO fonts(id,name,data,builtin) VALUES(?,?,?,1)').run(id,id.replaceAll('_',' ').replace(/\b\w/g,s=>s.toUpperCase()),JSON.stringify(data));}
 list(){return this.db.prepare('SELECT * FROM fonts WHERE hidden=0 ORDER BY builtin DESC,name COLLATE NOCASE').all().map(r=>{const data=JSON.parse(r.data);return {id:r.id,name:r.name,family:data.familyName,builtin:!!r.builtin,favorite:!!r.favorite,glyphCount:Object.keys(data.glyphs).length};});}
 get(id){const row=this.db.prepare('SELECT * FROM fonts WHERE id=?').get(id);if(!row)throw new ProjectError('Font is missing. Import it into the font library.',404);return {id:row.id,name:row.name,data:JSON.parse(row.data)};}
 import(input){
  let data=input.data;
  if(input.base64!==undefined){if(typeof input.base64!=='string'||input.base64.length>4*1024*1024||!/^.{1,200}\.(ttf|otf)$/i.test(String(input.filename)))throw new ProjectError('Import a TTF or OTF outline font under 3 MB.');try{const bytes=Buffer.from(input.base64,'base64');data=new TTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));}catch{throw new ProjectError('This font could not be read. Use a static TTF, OTF or typeface JSON font.');}}
  data=normalize(data);const id=fontId(data),name=cleanName(input.name||data.familyName);this.save({id,name,data});return {id,name};
 }
 save({id,name,data}){if(!this.db.prepare('SELECT id FROM fonts WHERE id=?').get(id)&&this.db.prepare('SELECT count(*) AS n FROM fonts WHERE builtin=0').get().n>=100)throw new ProjectError('The local library supports 100 imported font styles.');this.db.prepare('INSERT INTO fonts(id,name,data,builtin) VALUES(?,?,?,0) ON CONFLICT(id) DO UPDATE SET hidden=0').run(id,name,JSON.stringify(data));}
 update(id,input){this.get(id);if(input.name!==undefined)this.db.prepare('UPDATE fonts SET name=? WHERE id=?').run(cleanName(input.name),id);if(input.favorite!==undefined){if(typeof input.favorite!=='boolean')throw new ProjectError('Invalid favorite.');this.db.prepare('UPDATE fonts SET favorite=? WHERE id=?').run(+input.favorite,id);}if(input.hidden!==undefined){if(typeof input.hidden!=='boolean')throw new ProjectError('Invalid visibility.');this.db.prepare('UPDATE fonts SET hidden=? WHERE id=? AND builtin=0').run(+input.hidden,id);}return this.list();}
 assets(project){return [...new Set(project.graph.nodes.filter(n=>n.type==='text').map(n=>n.params.font))].filter(id=>!Object.hasOwn(BUILTIN_FONTS,id)).map(id=>this.get(id));}
 prepareAssets(assets=[]){if(!Array.isArray(assets)||assets.length>64)throw new ProjectError('Invalid font assets.');return assets.map(asset=>{const data=normalize(asset.data),id=fontId(data);if(asset.id!==id)throw new ProjectError('A packaged font has an invalid identifier.');return {id,data,name:cleanName(asset.name||data.familyName)};});}
 close(){this.db.close();}
}
