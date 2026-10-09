import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {imageHeader} from '../server/image-header.mjs';
const fixtures=JSON.parse(await readFile(new URL('./image-fixtures.json',import.meta.url),'utf8'));
const bytes=kind=>Buffer.from(fixtures[kind],'base64');
function chunk(kind,payload){const out=Buffer.alloc(8+payload.length+(payload.length%2));out.write(kind);out.writeUInt32LE(payload.length,4);payload.copy(out,8);return out;}
function webp(...chunks){const data=Buffer.concat(chunks),out=Buffer.alloc(12+data.length);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WEBP',8);data.copy(out,12);return out;}
function vp8l(width,height){const data=Buffer.alloc(5);data[0]=0x2f;data.writeUInt32LE((width-1)|((height-1)<<14),1);return chunk('VP8L',data);}
function extended(width,height,flags=0){const data=Buffer.alloc(10);data[0]=flags;data.writeUIntLE(width-1,4,3);data.writeUIntLE(height-1,7,3);return chunk('VP8X',data);}
test('real Edge encoded PNG, JPEG and extended lossy WebP expose bounded dimensions',()=>{for(const kind of ['png','jpeg','webp'])assert.deepEqual(imageHeader(bytes(kind)),{mimeType:'image/'+kind,width:16,height:12});});
test('JPEG dimensions and truncated segment tables fail before decode',()=>{const image=bytes('jpeg'),sof=image.indexOf(Buffer.from([255,192]));assert.ok(sof>0);image.writeUInt16BE(9000,sof+7);assert.throws(()=>imageHeader(image),/dimensions/);assert.throws(()=>imageHeader(Buffer.from([255,216,255,224,0,20,1,2])),/header/);assert.throws(()=>imageHeader(Buffer.from([255,216,255,217])),/header/);});
test('PNG and WebP encoded dimensions enforce both side and pixel budgets',()=>{const png=bytes('png');png.writeUInt32BE(8192,16);png.writeUInt32BE(8192,20);assert.throws(()=>imageHeader(png),/dimensions/);const lossy=bytes('webp'),at=lossy.indexOf(Buffer.from('VP8 '));assert.ok(at>0);lossy.writeUInt16LE(9000,at+14);assert.throws(()=>imageHeader(lossy),/dimensions/);assert.throws(()=>imageHeader(webp(extended(9000,12),vp8l(16,12))),/dimensions/);assert.throws(()=>imageHeader(webp(vp8l(8192,8192))),/dimensions/);});
test('lossless WebP header dimensions work with and without extended canvas',()=>{assert.deepEqual(imageHeader(webp(vp8l(16,12))),{mimeType:'image/webp',width:16,height:12});assert.deepEqual(imageHeader(webp(extended(16,12),vp8l(16,12))),{mimeType:'image/webp',width:16,height:12});});
test('WebP rejects missing image, mismatched canvas, animation and invalid container lengths',()=>{assert.throws(()=>imageHeader(webp(extended(16,12))),/header/);assert.throws(()=>imageHeader(webp(extended(17,12),vp8l(16,12))),/header/);assert.throws(()=>imageHeader(webp(extended(16,12,2),vp8l(16,12))),/Animated/);const image=bytes('webp');image.writeUInt32LE(image.length+100,4);assert.throws(()=>imageHeader(image),/header/);});
