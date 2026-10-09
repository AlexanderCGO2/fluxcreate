import { CATALOG, type Value, type Domain } from './catalog.ts';
import type { StudioObject } from './studioObject.ts';
import { validateGraph, type Graph, type LandscapeParams } from './project.ts';
import { buildLandscape, type Instance, type TerrainSettings } from './geometry.ts';
export type Params=Record<string,Value>;
export type Surface={params:LandscapeParams;settings:TerrainSettings};
export type SurfaceItem={kind:'surface';nodeId:string;surface:Surface};
export type InstanceItem={kind:'instances';nodeId:string;points:Instance[];prototype:Params};
export type TextItem={kind:'text';nodeId:string;params:Params;styleId:string;animations?:Params[]};
export type ParticleItem={kind:'particles';nodeId:string;params:Params;styleId?:string;motion?:Params};
export type SimulationItem={kind:'simulation';nodeId:string;simulation:'water'|'cloud'|'cloth'|'particle'|'paint';params:Params;source?:TextItem|ShapeItem;colliders?:ShapeItem[]};
export type SceneToolItem={kind:'primitive'|'light'|'camera';nodeId:string;params:Params};
export type StudioImageItem={kind:'studioImage';nodeId:string;params:Params;preview:StudioObject['preview']};
export type MaterialItem={kind:'material';nodeId:string;params:Params;items:RenderItem[]};
export type GroupItem={kind:'group';nodeId:string;params:Params;items:RenderItem[]};
export type FxItem={kind:'fx';nodeId:string;params:Params};
export type ShapeItem={kind:'shape';nodeId:string;params:Params};
export type RenderItem=(StudioImageItem|SceneToolItem|MaterialItem|ShapeItem|FxItem|SurfaceItem|InstanceItem|TextItem|ParticleItem|SimulationItem|GroupItem)&{visibilityIds?:string[]};
type Output={domain:'shape';item:ShapeItem}|{domain:'surface';surface:Surface}|{domain:'curve';params:Params}|{domain:'points';points:Instance[]}|{domain:'prototype';params:Params}|{domain:'objects';items:RenderItem[]}|{domain:'text';item:TextItem}|{domain:'particles';item:ParticleItem}|{domain:'simulation';item:SimulationItem};
export type Evaluation={items:RenderItem[];diagnostics:Record<string,string>;computed:number;cached:number};
function renderables(value:Output,nodeId:string):RenderItem[]{const items:RenderItem[]=value.domain==='surface'?[{kind:'surface',nodeId,surface:value.surface}]:value.domain==='objects'?value.items:['text','particles','simulation','shape'].includes(value.domain)&&'item' in value?[value.item]:[];return items.map(item=>({...item,visibilityIds:[...new Set([...(item.visibilityIds||[]),nodeId])]}));}
export class GraphEvaluator {
  cache=new Map<string,{key:string;value:Output|null;error?:string;version:number}>();serial=0;
  evaluate(graph:Graph):Evaluation{
    const order=validateGraph(graph),nodes=new Map(graph.nodes.map(n=>[n.id,n])),result:Evaluation={items:[],diagnostics:{},computed:0,cached:0};
    for(const id of [...this.cache.keys()])if(!nodes.has(id))this.cache.delete(id);
    for(const id of order){const node=nodes.get(id)!,links=graph.edges.filter(e=>e.target===id),key=JSON.stringify([node.type,node.params,node.studioObject?.preview,links.map(e=>[e.source,e.input,this.cache.get(e.source)?.version])]);
      const cached=this.cache.get(id);if(cached?.key===key){result.cached++;if(cached.error)result.diagnostics[id]=cached.error;if(node.type==='output'&&cached.value?.domain==='objects')result.items=cached.value.items;continue;}
      result.computed++;let value:Output|null=null,error:string|undefined;
      const input=(name:string)=>{const link=links.find(e=>e.input===name),out=link&&this.cache.get(link.source)?.value;if(!out)throw new Error('Connect a valid '+name+' input.');return out;};
      const allItems=()=>links.flatMap(e=>{const v=this.cache.get(e.source)?.value;return v?renderables(v,e.source):[];});
      try{
        const p=node.params,colliders=()=>links.filter(e=>e.input==='colliders').map(e=>this.cache.get(e.source)?.value).filter((v):v is Extract<Output,{domain:'shape'}>=>v?.domain==='shape').map(v=>v.item);
        switch(node.type){
          case 'studioImage':if(!node.studioObject)throw new Error('This object has no embedded preview. Studio snapshot import controls are planned.');value={domain:'objects',items:[{kind:'studioImage',nodeId:id,params:p,preview:node.studioObject.preview}]};break;
          case 'grid':value={domain:'surface',surface:{params:{seed:42,height:6.4,roughness:.54,pathWidth:3.2,rocks:0,trees:0},settings:{size:Number(p.size),resolution:Number(p.resolution),flat:true,mask:false,amplitude:4.5,frequency:.13}}};break;
          case 'height':{const source=input('surface');if(source.domain!=='surface')throw new Error('Expected a surface.');value={domain:'surface',surface:{params:{...source.surface.params,seed:Number(p.seed),height:Number(p.height),roughness:Number(p.roughness)},settings:{...source.surface.settings,flat:false}}};break;}
          case 'curve':value={domain:'curve',params:p};break;
          case 'mask':{const s=input('surface'),c=input('curve');if(s.domain!=='surface'||c.domain!=='curve')throw new Error('Expected surface and curve.');value={domain:'surface',surface:{params:{...s.surface.params,pathWidth:Number(p.width)},settings:{...s.surface.settings,mask:true,amplitude:Number(c.params.amplitude),frequency:Number(c.params.frequency)}}};break;}
          case 'scatter':{const s=input('surface');if(s.domain!=='surface')throw new Error('Expected a surface.');const land=buildLandscape({...s.surface.params,rocks:p.kind==='rock'?Number(p.density):0,trees:p.kind==='tree'?Number(p.density):0},s.surface.settings);value={domain:'points',points:p.kind==='rock'?land.rocks:land.trees};break;}
          case 'prototype':value={domain:'prototype',params:p};break;
          case 'instance':{const points=input('points'),prototype=input('prototype');if(points.domain!=='points'||prototype.domain!=='prototype')throw new Error('Expected points and prototype.');value={domain:'objects',items:[{kind:'instances',nodeId:id,points:points.points,prototype:prototype.params}]};break;}
          case 'text':value={domain:'text',item:{kind:'text',nodeId:id,styleId:id,params:p}};break;
          case 'textAnimate':{const s=input('text');if(s.domain!=='text')throw new Error('Expected text.');value={domain:'text',item:{...s.item,nodeId:id,animations:[...(s.item.animations||[]),p]}};break;}
          case 'emitter':value={domain:'particles',item:{kind:'particles',nodeId:id,styleId:id,params:p}};break;
          case 'motion':{const s=input('particles');if(s.domain!=='particles')throw new Error('Expected particles.');value={domain:'particles',item:{...s.item,nodeId:id,motion:p}};break;}
          case 'primitive':case 'light':case 'camera':value={domain:'objects',items:[{kind:node.type,nodeId:id,params:p}]};break;
          case 'material':{const source=input('scene');value={domain:'objects',items:[{kind:'material',nodeId:id,params:p,items:renderables(source,links[0].source)}]};break;}
          case 'shape':value={domain:'shape',item:{kind:'shape',nodeId:id,params:p}};break;
          case 'particleSim':{const link=links.find(e=>e.input==='source'),source=link?input('source'):null;value={domain:'simulation',item:{kind:'simulation',nodeId:id,simulation:'particle',params:p,source:source?.domain==='shape'||source?.domain==='text'?source.item:undefined,colliders:colliders()}};break;}
          case 'fx':value={domain:'objects',items:[{kind:'fx',nodeId:id,params:p}]};break;
          case 'paint':case 'water':case 'cloud':case 'cloth':value={domain:'simulation',item:{kind:'simulation',nodeId:id,simulation:node.type,params:p,colliders:colliders()}};break;
          case 'transform':{const source=input('scene');value={domain:'objects',items:[{kind:'group',nodeId:id,params:p,items:renderables(source,links[0].source)}]};break;}
          case 'merge':case 'output':value={domain:'objects',items:allItems()};break;
        }
      }catch(e){error=e instanceof Error?e.message:'Could not evaluate this operator.';result.diagnostics[id]=error;}
      this.cache.set(id,{key,value,error,version:++this.serial});if(node.type==='output'&&value?.domain==='objects')result.items=value.items;
    }
    return result;
  }
}
