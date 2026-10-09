import test from 'node:test';
import assert from 'node:assert/strict';
import {objectPDFTransform,imagePlacement,pdfFontName,jpegOrientation,pngNeedsConversion,jpegNeedsColorConversion} from '../src/pdf-export.mjs';
test('Object transform maps rotated editor corners into bottom-left PDF coordinates',()=>{
  for(const rotation of [0,90,-30,180,359]){
    const o={x:17,y:31,width:160,height:83,rotation},[a,b,c,d,e,f]=objectPDFTransform(o,842),angle=rotation*Math.PI/180;
    for(const [x,y]of[[0,0],[160,0],[0,83],[160,83]]){
      const cx=x-80,cy=(83-y)-41.5,expectedX=97+cx*Math.cos(angle)-cy*Math.sin(angle),expectedY=842-(72.5+cx*Math.sin(angle)+cy*Math.cos(angle));
      assert.ok(Math.abs(a*x+c*y+e-expectedX)<1e-9);assert.ok(Math.abs(b*x+d*y+f-expectedY)<1e-9);
    }
  }
});
test('Cover and contain preserve native image aspect and center within the clip',()=>{
  assert.deepEqual(imagePlacement({width:400,height:200},{width:100,height:100,fit:'cover'}),{x:-50,y:0,width:200,height:100});
  assert.deepEqual(imagePlacement({width:400,height:200},{width:100,height:100,fit:'contain'}),{x:0,y:25,width:100,height:50});
});
test('Only explicitly supported families use standard PDF text fonts',()=>{
  assert.equal(pdfFontName({fontFamily:'Arial',fontWeight:700}),'Helvetica-Bold');assert.equal(pdfFontName({fontFamily:'Times New Roman',fontWeight:400}),'Times-Roman');assert.equal(pdfFontName({fontFamily:'Courier New',fontWeight:400}),'Courier');assert.equal(pdfFontName({fontFamily:'Georgia',fontWeight:400}),null);assert.equal(pdfFontName({fontFamily:'Unknown',fontWeight:400}),null);
});
test('JPEG EXIF rotation and mirror tags are detected without reading past truncated metadata',()=>{
  for(const little of [true,false])for(let orientation=1;orientation<=8;orientation++){
    const bytes=new Uint8Array(40),view=new DataView(bytes.buffer);view.setUint16(0,0xffd8);view.setUint16(2,0xffe1);view.setUint16(4,34);view.setUint32(6,0x45786966);view.setUint16(12,little?0x4949:0x4d4d);view.setUint16(14,42,little);view.setUint32(16,8,little);view.setUint16(20,1,little);view.setUint16(22,0x112,little);view.setUint16(24,3,little);view.setUint32(26,1,little);view.setUint16(30,orientation,little);view.setUint16(38,0xffd9);
    assert.equal(jpegOrientation(bytes),orientation);for(let n=0;n<bytes.length;n++)assert.doesNotThrow(()=>jpegOrientation(bytes.subarray(0,n)));
  }
});
test('PNG metadata requiring browser color/orientation handling is detected with bounded chunk reads',()=>{
  for(const type of ['iCCP','gAMA','cHRM','eXIf','acTL','sRGB','IDAT']){
    const bytes=new Uint8Array(20);for(let i=0;i<4;i++)bytes[12+i]=type.charCodeAt(i);assert.equal(pngNeedsConversion(bytes),!['sRGB','IDAT'].includes(type));for(let n=0;n<bytes.length;n++)assert.doesNotThrow(()=>pngNeedsConversion(bytes.subarray(0,n)));
  }
});
test('JPEG ICC profiles and four-component images request browser color conversion',()=>{
  const icc=new Uint8Array(20),view=new DataView(icc.buffer);view.setUint16(0,0xffd8);view.setUint16(2,0xffe2);view.setUint16(4,16);for(let i=0;i<12;i++)icc[6+i]='ICC_PROFILE\0'.charCodeAt(i);assert.equal(jpegNeedsColorConversion(icc),true);
  const cmyk=new Uint8Array(16),sof=new DataView(cmyk.buffer);sof.setUint16(0,0xffd8);sof.setUint16(2,0xffc0);sof.setUint16(4,12);cmyk[11]=4;assert.equal(jpegNeedsColorConversion(cmyk),true);cmyk[11]=3;assert.equal(jpegNeedsColorConversion(cmyk),false);
});
