export const CURVE_CHANNELS=Object.freeze(['red','green','blue']);
export const IDENTITY_CURVE=Object.freeze([Object.freeze([0,0]),Object.freeze([255,255])]);
export const DEFAULT_CURVES=Object.freeze({enabled:true,points:IDENTITY_CURVE});
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function normalizePoints(value){
 if(!Array.isArray(value)||value.length<2||value.length>16)throw Error('Curves require 2 to 16 points.');
 const points=value.map(point=>{
  if(!Array.isArray(point)||point.length!==2||point.some(v=>!Number.isInteger(v)||v<0||v>255))throw Error('Curve input and output must be whole numbers between 0 and 255.');
  return [...point];
 });
 if(points[0][0]!==0||points.at(-1)[0]!==255)throw Error('Curve input endpoints must stay at 0 and 255.');
 if(points.some((p,i)=>i>0&&p[0]<=points[i-1][0]))throw Error('Curve inputs must be strictly increasing; points cannot overlap.');
 return points;
}
export function normalizeCurves(value){
 if(value==null)return null;
 if(!object(value)||Object.keys(value).some(k=>!['enabled','points','channels'].includes(k)))throw Error('Curves must contain only enabled, points and channels.');
 if(value.enabled!==undefined&&typeof value.enabled!=='boolean')throw Error('Curves enabled must be true or false.');
 const result={enabled:value.enabled??true,points:normalizePoints(value.points===undefined?IDENTITY_CURVE:value.points)};
 if(value.channels!==undefined){
  if(!object(value.channels))throw Error('Curves channels must be an object.');
  result.channels={};for(const key of Object.keys(value.channels)){if(!CURVE_CHANNELS.includes(key))throw Error('Unknown Curves channel: '+key+'.');result.channels[key]=normalizePoints(value.channels[key]);}
 }
 return result;
}
const activePoints=points=>!!points?.some(([x,y])=>x!==y);
export const hasActiveCurves=value=>!!value&&(value.enabled??true)&&(activePoints(value.points)||CURVE_CHANNELS.some(channel=>activePoints(value.channels?.[channel])));
// Deliberately piecewise linear: no overshoot, and each composite/channel stage rounds to 8-bit.
function table(points){const values=new Uint8ClampedArray(256);let segment=0;for(let input=0;input<256;input++){while(segment<points.length-2&&input>points[segment+1][0])segment++;const [x0,y0]=points[segment],[x1,y1]=points[segment+1];values[input]=Math.round(y0+(y1-y0)*(input-x0)/(x1-x0));}return values;}
export function applyCurves(data,value){
 if(!hasActiveCurves(value))return data;
 const curves=normalizeCurves(value),combined=table(curves.points),tables=CURVE_CHANNELS.map(channel=>{if(!curves.channels?.[channel])return combined;const separate=table(curves.channels[channel]);return combined.map(v=>separate[v]);});
 for(let i=0;i<data.length;i+=4){data[i]=tables[0][data[i]];data[i+1]=tables[1][data[i+1]];data[i+2]=tables[2][data[i+2]];}return data;
}
