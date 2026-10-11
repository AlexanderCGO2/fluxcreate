export const DEFAULT_LEVELS=Object.freeze({enabled:true,black:0,white:255,gamma:1});
export const LEVELS_CHANNELS=Object.freeze(['red','green','blue']);
const INPUT_DEFAULTS=Object.freeze({black:0,white:255,gamma:1});
function normalizePoints(value,label){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error(label+' must be an object.');
 const result={...INPUT_DEFAULTS,...Object.fromEntries(['black','white','gamma','outputBlack','outputWhite'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]))};
 for(const [key,min,max] of [['black',0,255],['white',0,255],['gamma',.1,10],['outputBlack',0,255],['outputWhite',0,255]])if(result[key]!==undefined&&(typeof result[key]!=='number'||!Number.isFinite(result[key])||result[key]<min||result[key]>max))throw Error(label+' '+key+' must be between '+min+' and '+max+'.');
 if(result.black>=result.white)throw Error(label+' black point must be below the white point.');
 if((result.outputBlack??0)>(result.outputWhite??255))throw Error(label+' output black must not exceed output white.');
 return result;
}
export function normalizeLevels(value){
 if(value==null)return null;
 const points=normalizePoints(value,'Levels'),enabled=value.enabled??true;
 if(typeof enabled!=='boolean'||value.enabled===null)throw Error('Levels enabled must be true or false.');
 const result={enabled,...points};
 if(value.channels!==undefined){
  if(!value.channels||typeof value.channels!=='object'||Array.isArray(value.channels))throw Error('Levels channels must be an object.');
  result.channels={};
  for(const key of Object.keys(value.channels)){if(!LEVELS_CHANNELS.includes(key))throw Error('Unknown Levels channel: '+key+'.');result.channels[key]=normalizePoints(value.channels[key],'Levels '+key);}
 }
 return result;
}
function pointTable(l){const table=new Uint8ClampedArray(256),low=l.outputBlack??0,high=l.outputWhite??255;for(let i=0;i<256;i++)table[i]=Math.round(low+(high-low)*Math.pow(Math.max(0,Math.min(1,(i-l.black)/(l.white-l.black))),1/l.gamma));return table;}
export function levelsTable(value){const l=normalizeLevels(value);return pointTable(!l?.enabled?INPUT_DEFAULTS:l);}
export function applyLevels(data,value){
 if(value==null||value.enabled===false)return data;
 const l=normalizeLevels(value),combined=pointTable(l),tables=LEVELS_CHANNELS.map(channel=>{
  if(!l.channels?.[channel])return combined;
  const channelTable=pointTable(l.channels[channel]);return combined.map(v=>channelTable[v]);
 });
 for(let i=0;i<data.length;i+=4){data[i]=tables[0][data[i]];data[i+1]=tables[1][data[i+1]];data[i+2]=tables[2][data[i+2]];}return data;
}
export function histogram(data){
 if(!(data instanceof Uint8ClampedArray)||data.length%4)throw Error('Histogram requires RGBA pixels.');
 const red=new Float64Array(256),green=new Float64Array(256),blue=new Float64Array(256);let coverage=0;
 for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;if(!a)continue;red[data[i]]+=a;green[data[i+1]]+=a;blue[data[i+2]]+=a;coverage+=a;}
 return{red,green,blue,coverage};
}


const activePoints=value=>!!value&&((value.black??0)!==0||(value.white??255)!==255||(value.gamma??1)!==1||(value.outputBlack??0)!==0||(value.outputWhite??255)!==255);
export const hasActiveLevels=value=>!!value&&(value.enabled??true)&&(activePoints(value)||LEVELS_CHANNELS.some(channel=>activePoints(value.channels?.[channel])));
