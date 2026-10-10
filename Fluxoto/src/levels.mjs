export const DEFAULT_LEVELS=Object.freeze({enabled:true,black:0,white:255,gamma:1});
export function normalizeLevels(value){
 if(value==null)return null;
 if(typeof value!=='object'||Array.isArray(value))throw Error('Levels must be an object.');
 const result={...DEFAULT_LEVELS,...Object.fromEntries(['enabled','black','white','gamma'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]))};
 if(typeof result.enabled!=='boolean')throw Error('Levels enabled must be true or false.');
 for(const [key,min,max] of [['black',0,255],['white',0,255],['gamma',.1,10]])if(typeof result[key]!=='number'||!Number.isFinite(result[key])||result[key]<min||result[key]>max)throw Error(`Levels ${key} must be between ${min} and ${max}.`);
 if(result.black>=result.white)throw Error('Levels black point must be below the white point.');
 return result;
}
export function levelsTable(value){const l=normalizeLevels(value),table=new Uint8ClampedArray(256);for(let i=0;i<256;i++)table[i]=!l?.enabled?i:Math.round(255*Math.pow(Math.max(0,Math.min(1,(i-l.black)/(l.white-l.black))),1/l.gamma));return table;}
export function applyLevels(data,value){if(value==null||value.enabled===false)return data;const table=levelsTable(value);for(let i=0;i<data.length;i+=4){data[i]=table[data[i]];data[i+1]=table[data[i+1]];data[i+2]=table[data[i+2]];}return data;}
export function histogram(data){
 if(!(data instanceof Uint8ClampedArray)||data.length%4)throw Error('Histogram requires RGBA pixels.');
 const red=new Float64Array(256),green=new Float64Array(256),blue=new Float64Array(256);let coverage=0;
 for(let i=0;i<data.length;i+=4){const a=data[i+3]/255;if(!a)continue;red[data[i]]+=a;green[data[i+1]]+=a;blue[data[i+2]]+=a;coverage+=a;}
 return{red,green,blue,coverage};
}

export const hasActiveLevels=value=>!!value?.enabled&&(value.black!==0||value.white!==255||value.gamma!==1);
