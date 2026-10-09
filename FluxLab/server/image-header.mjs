const invalid=()=>{throw Error('The provider returned an invalid or unsupported image header.');};
function bounded(width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>8192||height>8192||width*height>33554432)throw Error('The generated image dimensions are too large for the suite.');return {width,height};}
/** Inspect encoded dimensions before any browser decoder allocates image pixels. */
export function imageHeader(bytes){
 if(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){if(bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(8)!==13||bytes.length<33)invalid();return {mimeType:'image/png',...bounded(bytes.readUInt32BE(16),bytes.readUInt32BE(20))};}
 if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216){
  let at=2,segments=0;while(at<bytes.length&&++segments<=4096){if(bytes[at++]!==255)invalid();while(at<bytes.length&&bytes[at]===255)at++;if(at>=bytes.length)invalid();const marker=bytes[at++];if(marker===0xda||marker===0xd9)break;if(marker===1||marker>=0xd0&&marker<=0xd7)continue;if(at+2>bytes.length)invalid();const length=bytes.readUInt16BE(at);if(length<2||at+length>bytes.length)invalid();if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){if(length<8||length<8+3*bytes[at+7])invalid();return {mimeType:'image/jpeg',...bounded(bytes.readUInt16BE(at+5),bytes.readUInt16BE(at+3))};}at+=length;}
  invalid();
 }
 if(bytes.length>=20&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
  const end=bytes.readUInt32LE(4)+8;if(end!==bytes.length)invalid();let at=12,canvas=null,picture=null,chunks=0;
  while(at+8<=end&&++chunks<=4096){const kind=bytes.toString('ascii',at,at+4),length=bytes.readUInt32LE(at+4),start=at+8;if(start+length>end)invalid();
   if(kind==='VP8X'){if(length!==10||canvas)invalid();canvas=bounded(1+bytes.readUIntLE(start+4,3),1+bytes.readUIntLE(start+7,3));if(bytes[start]&2)throw Error('Animated WebP output is not supported. Request a still image.');}
   if(kind==='VP8 '){if(length<10||bytes[start]&1||bytes[start+3]!==0x9d||bytes[start+4]!==1||bytes[start+5]!==0x2a)invalid();picture=bounded(bytes.readUInt16LE(start+6)&0x3fff,bytes.readUInt16LE(start+8)&0x3fff);}
   if(kind==='VP8L'){if(length<5||bytes[start]!==0x2f)invalid();const bits=bytes.readUInt32LE(start+1);if(bits>>>29)invalid();picture=bounded((bits&0x3fff)+1,((bits>>>14)&0x3fff)+1);}
   at=start+length+(length%2);
  }
  if(at!==end||!picture)invalid();if(canvas&&(canvas.width!==picture.width||canvas.height!==picture.height))invalid();return {mimeType:'image/webp',...(canvas||picture)};
 }
 invalid();
}
