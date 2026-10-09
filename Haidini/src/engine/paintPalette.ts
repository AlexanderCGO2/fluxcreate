import type { Value } from './catalog.ts';
export const PAINT_COLOR_KEYS=['colorA','colorB','colorC','colorD','colorE','colorF','colorG','colorH','colorI','colorJ','colorK','colorL'];
export const PAINT_PALETTES:Record<string,string[]>={
 Vivid:['#07a8b5','#ef3971','#ffc42c','#f15b27','#6537cf','#1256e9','#16a079','#ff9275','#b8df38','#f1ead9','#163264','#a643ad'],
 Gallery:['#ef3c24','#154ac7','#e3ede6','#ff9b24','#32b6da','#ad2636','#f9da83','#294892','#a5d2d1','#e97968','#556581','#f4f1e5'],
 Mineral:['#126b74','#51b8b5','#eee5d5','#c98959','#864d34','#dab593','#1b3d58','#699cad','#beb9a4','#4d685b','#a4b097','#e3ccb1']
};
export const paintColorDefaults=Object.fromEntries(PAINT_COLOR_KEYS.slice(3).map((key,index)=>[key,{label:'Color '+(index+4),kind:'color' as const,default:PAINT_PALETTES.Vivid[index+3]}]));
export function paintPaletteParams(name:string):Record<string,Value>{const palette=PAINT_PALETTES[name];if(!palette)throw new Error('Unknown paint palette.');return {colorCount:palette.length,...Object.fromEntries(PAINT_COLOR_KEYS.map((key,index)=>[key,palette[index]]))};}
