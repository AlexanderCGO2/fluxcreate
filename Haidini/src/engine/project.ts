import { MAX_SCENE_DURATION } from './timing.ts';
import { z } from 'zod';
import { MAX_SCENE_PARTICLES, MAX_OTHER_SCENE_PARTICLES } from './particleLimits.ts';
import { PARTICLE_CONTROL_DEFAULTS } from './particleControls.ts';
import { canToggleVisibility } from './visibility.ts';
import { TrackSchema, animatedParams, type AnimationTrack } from './animation.ts';
import { findEffect } from './effects.ts';
import { CATALOG, defaults, NodeTypeSchema, paramSchema } from './catalog.ts';
export class ProjectError extends Error {status:number;constructor(message:string,status=400){super(message);this.status=status;}}
const Id=z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/);
const Scalar=z.union([z.number(),z.string(),z.boolean()]);
export const NodeSchema=z.object({id:Id,type:NodeTypeSchema,visible:z.boolean().optional(),label:z.string().trim().min(1).max(48),position:z.object({x:z.number().min(-10000).max(10000),y:z.number().min(-10000).max(10000)}).strict(),params:z.record(z.string(),Scalar)}).strict();
export const EdgeSchema=z.object({id:Id,source:Id,target:Id,input:z.string().min(1).max(MAX_SCENE_DURATION)}).strict();
export const GraphSchema=z.object({nodes:z.array(NodeSchema).min(1).max(64),edges:z.array(EdgeSchema).max(128)}).strict();
export const TimelineSchema=z.object({duration:z.number().min(1).max(MAX_SCENE_DURATION),fps:z.number().int().min(12).max(60)}).strict();
export const LockSchema=z.object({nodeId:Id,param:z.string().min(1).max(40)}).strict();
export const ProjectSchema=z.object({schemaVersion:z.literal(2),id:z.string().uuid(),workspaceId:z.literal('local'),branchId:z.literal('main'),name:z.string().trim().min(1).max(100),revision:z.number().int().nonnegative(),graph:GraphSchema,timeline:TimelineSchema,locks:z.array(LockSchema).max(100),animations:z.array(TrackSchema).max(128).default([])}).strict();
export type SceneNode=z.infer<typeof NodeSchema>;export type SceneEdge=z.infer<typeof EdgeSchema>;export type Graph=z.infer<typeof GraphSchema>;export type Project=z.infer<typeof ProjectSchema>;
export const CommandSchema=z.discriminatedUnion('op',[
  z.object({op:z.literal('visibility'),nodeId:Id,visible:z.boolean()}).strict(),
  z.object({op:z.literal('animate'),track:TrackSchema}).strict(),
  z.object({op:z.literal('removeAnimation'),nodeId:Id,param:z.string().min(1).max(40)}).strict(),
  z.object({op:z.literal('projectName'),name:z.string().trim().min(1).max(100)}).strict(),
  z.object({op:z.literal('add'),id:Id,type:NodeTypeSchema,label:z.string().trim().min(1).max(48).optional(),x:z.number().min(-10000).max(10000),y:z.number().min(-10000).max(10000)}).strict(),
  z.object({op:z.literal('remove'),nodeId:Id}).strict(),
  z.object({op:z.literal('duplicate'),nodeId:Id,id:Id,x:z.number().min(-10000).max(10000),y:z.number().min(-10000).max(10000)}).strict(),
  z.object({op:z.literal('set'),nodeId:Id,param:z.string().min(1).max(40),value:Scalar}).strict(),
  z.object({op:z.literal('rename'),nodeId:Id,label:z.string().trim().min(1).max(48)}).strict(),
  z.object({op:z.literal('move'),nodeId:Id,x:z.number().min(-10000).max(10000),y:z.number().min(-10000).max(10000)}).strict(),
  z.object({op:z.literal('connect'),edge:EdgeSchema}).strict(),
  z.object({op:z.literal('disconnect'),edgeId:Id}).strict(),
  z.object({op:z.literal('timeline'),duration:z.number().min(1).max(MAX_SCENE_DURATION),fps:z.number().int().min(12).max(60)}).strict(),
]);
export type Command=z.infer<typeof CommandSchema>;
export const PatchSchema=z.object({baseRevision:z.number().int().nonnegative(),summary:z.string().trim().min(1).max(400),commands:z.array(CommandSchema).min(1).max(32)}).strict();
export type Patch=z.infer<typeof PatchSchema>;
export function makeNode(id:string,type:string,x=0,y=0,params:Record<string,string|number|boolean>={},label?:string):SceneNode{return {id,type,label:label||CATALOG[type].label,position:{x,y},params:{...defaults(type),...params}};}
export function edge(source:string,target:string,input:string):SceneEdge{const raw='e_'+source+'_'+target+'_'+input;let hash=2166136261;for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);return {id:raw.length<=64?raw:raw.slice(0,54)+'_'+(hash>>>0).toString(16).padStart(8,'0'),source,target,input};}
export function isLocked(project:Project,nodeId:string,param:string){return project.locks.some(l=>l.nodeId===nodeId&&l.param===param);}
export function validateGraph(graph:Graph):string[]{
  GraphSchema.parse(graph);const nodes=new Map(graph.nodes.map(n=>[n.id,n]));
  if(nodes.size!==graph.nodes.length)throw new ProjectError('Node IDs must be unique.');
  if(graph.nodes.filter(n=>n.type==='output').length!==1)throw new ProjectError('A project needs exactly one Scene output.');
  let particles=0,otherParticles=0,vertices=0,solvers=0;
  for(const n of graph.nodes){if(n.visible===false&&!canToggleVisibility(n.type))throw new ProjectError('This node has no visual appearance to hide.');if(!paramSchema(n.type).safeParse(n.params).success)throw new ProjectError('Invalid parameters on '+n.label+'.');if(['emitter','water','cloud','particleSim'].includes(n.type))particles+=Number(n.params.count);if(['emitter','water','cloud'].includes(n.type))otherParticles+=Number(n.params.count);if(['water','cloud','cloth','particleSim','paint'].includes(n.type))solvers++;if(n.type==='grid')vertices+=(Number(n.params.resolution)+1)**2;}
  if(particles>MAX_SCENE_PARTICLES||otherParticles>MAX_OTHER_SCENE_PARTICLES||vertices>100000)throw new ProjectError('Scene budget: '+MAX_SCENE_PARTICLES.toLocaleString('en-US')+' total particles, '+MAX_OTHER_SCENE_PARTICLES.toLocaleString('en-US')+' across other particle solvers, or 100,000 terrain vertices.');
  if(solvers>2)throw new ProjectError('Use at most two simulation sources in one scene.');
  const ids=new Set<string>(),occupied=new Set<string>(),incoming=new Map(graph.nodes.map(n=>[n.id,0])),outgoing=new Map(graph.nodes.map(n=>[n.id,[] as string[]]));
  for(const e of graph.edges){const a=nodes.get(e.source),b=nodes.get(e.target);if(!a||!b)throw new ProjectError('A connection references a missing node.');if(ids.has(e.id))throw new ProjectError('Connection IDs must be unique.');ids.add(e.id);
    const port=CATALOG[b.type].inputs[e.input],domain=CATALOG[a.type].output;if(!port||!domain||!port.accept.includes(domain))throw new ProjectError('These ports have incompatible data types.');
    if(a.type==='motion'&&b.type==='motion')throw new ProjectError('Use one Particle motion operator per emitter branch.');
    if(e.input==='colliders'&&graph.edges.filter(link=>link.target===e.target&&link.input==='colliders').length>8)throw new ProjectError('Use at most eight colliders per simulation.');
    const key=e.target+':'+e.input;if(!port.multi&&occupied.has(key))throw new ProjectError('Disconnect the current input before connecting another node.');occupied.add(key);
    if(graph.edges.some(other=>other!==e&&other.source===e.source&&other.target===e.target&&other.input===e.input))throw new ProjectError('This connection already exists.');
    incoming.set(e.target,incoming.get(e.target)!+1);outgoing.get(e.source)!.push(e.target);
  }
  const ready=[...incoming].filter(([,n])=>n===0).map(([id])=>id),order:string[]=[];
  while(ready.length){const id=ready.shift()!;order.push(id);for(const child of outgoing.get(id)!){incoming.set(child,incoming.get(child)!-1);if(incoming.get(child)===0)ready.push(child);}}
  if(order.length!==nodes.size)throw new ProjectError('This connection creates a cycle.');
  // Count connected render work as well as source nodes: branching may instance a source many times.
  const work=new Map<string,{particles:number;otherParticles:number;vertices:number;glyphs:number;branches:number;solvers:number;lights:number;cameras:number}>();
  for(const id of order){const node=nodes.get(id)!,cost={particles:0,otherParticles:0,vertices:0,glyphs:0,branches:0,solvers:0,lights:0,cameras:0};
    if(node.type==='grid'){cost.vertices=(Number(node.params.resolution)+1)**2;cost.branches=1;}
    else if(['emitter','water','cloud','particleSim'].includes(node.type)){cost.particles=Number(node.params.count);cost.otherParticles=node.type==='particleSim'?0:cost.particles;cost.branches=1;cost.solvers=node.type==='emitter'?0:1;}
    else if(node.type==='paint'){cost.vertices=2000+(node.params.surfaceFinish==='sculptural'?(node.params.detail==='fine'?257:193):(node.params.detail==='fine'?193:129))**2;cost.solvers=1;cost.branches=1;}
    else if(node.type==='shape'){cost.vertices=1600;cost.branches=1;}
    else if(node.type==='primitive'){cost.vertices=(Number(node.params.detail)+1)**2*2;cost.branches=1;}
    else if(['light','camera'].includes(node.type)){cost.branches=1;if(node.type==='light')cost.lights=1;else cost.cameras=1;}
    else if(node.type==='cloth'){cost.vertices=(Number(node.params.resolution)+1)**2;cost.solvers=1;cost.branches=1;}
    else if(node.type==='fx'){cost.vertices=18000;cost.branches=1;}
    else if(node.type==='text'){cost.glyphs=String(node.params.text).length;cost.branches=1;}
    else if(node.type==='instance')cost.branches=1;
    else if(!['curve','prototype','scatter'].includes(node.type)){for(const e of graph.edges.filter(e=>e.target===id)){const parent=work.get(e.source)!;for(const k of Object.keys(cost) as (keyof typeof cost)[])cost[k]+=parent[k];}}
    if(cost.particles>MAX_SCENE_PARTICLES||cost.otherParticles>MAX_OTHER_SCENE_PARTICLES||cost.vertices>100000||cost.glyphs>384||cost.branches>128||cost.solvers>2||cost.lights>8||cost.cameras>8)throw new ProjectError('Connected branches exceed the scene rendering budget.');work.set(id,cost);
  }return order;
}
export function validateProject(project:Project){ProjectSchema.parse(project);validateGraph(project.graph);const animated=new Set<string>();for(const track of project.animations||[]){const node=project.graph.nodes.find(n=>n.id===track.nodeId),key=track.nodeId+':'+track.param;if(!node||!animatedParams(node.type).includes(track.param)||animated.has(key))throw new ProjectError('Invalid or duplicate animation track.');animated.add(key);const definition=CATALOG[node.type].params[track.param];for(let i=0;i<track.keys.length;i++){const frame=track.keys[i];if(frame.time>project.timeline.duration||(i>0&&frame.time<=track.keys[i-1].time))throw new ProjectError('Keyframes must have distinct increasing times within the scene duration.');if(definition.kind==='color'?typeof frame.value!=='string':typeof frame.value!=='number'||frame.value<definition.min!||frame.value>definition.max!)throw new ProjectError('Animation value is outside the parameter range.');}}for(const l of project.locks){const n=project.graph.nodes.find(n=>n.id===l.nodeId);if(!n||!CATALOG[n.type].params[l.param])throw new ProjectError('A lock references a missing parameter.');}return project;}
function computePatch(project:Project,input:unknown):{patch:Patch;next:Project}{
  const parsed=PatchSchema.safeParse(input);if(!parsed.success)throw new ProjectError('The graph change contains an unsupported command.');const patch=parsed.data;
  if(patch.baseRevision!==project.revision)throw new ProjectError('The scene changed. Create a new preview before applying this change.',409);
  const next=structuredClone(project),find=(id:string)=>{const n=next.graph.nodes.find(n=>n.id===id);if(!n)throw new ProjectError('Node not found: '+id);return n;};
  for(const c of patch.commands){
    if(c.op==='animate'||c.op==='removeAnimation'){const nodeId=c.op==='animate'?c.track.nodeId:c.nodeId,param=c.op==='animate'?c.track.param:c.param;find(nodeId);if(isLocked(next,nodeId,param))throw new ProjectError('Unlock this parameter before changing its animation.',409);const index=next.animations.findIndex(t=>t.nodeId===nodeId&&t.param===param);if(c.op==='removeAnimation'){if(index>=0)next.animations.splice(index,1);}else if(index>=0)next.animations[index]=structuredClone(c.track);else next.animations.push(structuredClone(c.track));}
    else if(c.op==='add'){if(next.graph.nodes.some(n=>n.id===c.id))throw new ProjectError('That node ID already exists.');next.graph.nodes.push(makeNode(c.id,c.type,c.x,c.y,{},c.label));}
    else if(c.op==='remove'){const n=find(c.nodeId);if(n.type==='output')throw new ProjectError('The Scene output cannot be removed.');if(next.locks.some(l=>l.nodeId===n.id))throw new ProjectError('Unlock this node’s parameters before removing it.',409);next.graph.nodes=next.graph.nodes.filter(n=>n.id!==c.nodeId);next.graph.edges=next.graph.edges.filter(e=>e.source!==c.nodeId&&e.target!==c.nodeId);next.animations=(next.animations||[]).filter(t=>t.nodeId!==c.nodeId);}
    else if(c.op==='duplicate'){const n=find(c.nodeId);if(n.type==='output'||next.graph.nodes.some(n=>n.id===c.id))throw new ProjectError('This node cannot be duplicated with that ID.');next.graph.nodes.push({...structuredClone(n),id:c.id,label:(n.label+' copy').slice(0,48),position:{x:c.x,y:c.y}});next.animations.push(...(next.animations||[]).filter(t=>t.nodeId===c.nodeId).map(t=>({...structuredClone(t),nodeId:c.id})));const inputs=next.graph.edges.filter(e=>e.target===c.nodeId);for(const e of inputs)next.graph.edges.push(edge(e.source,c.id,e.input));}
    else if(c.op==='set'){const n=find(c.nodeId);if(isLocked(next,c.nodeId,c.param))throw new ProjectError('This parameter is locked. Unlock it in the inspector first.',409);if(!CATALOG[n.type].params[c.param])throw new ProjectError('Unknown parameter: '+c.param);n.params[c.param]=c.value;}
    else if(c.op==='visibility'){const n=find(c.nodeId);if(!canToggleVisibility(n.type))throw new ProjectError('This node has no visual appearance to hide.');n.visible=c.visible;}
    else if(c.op==='rename')find(c.nodeId).label=c.label;
    else if(c.op==='move')find(c.nodeId).position={x:c.x,y:c.y};
    else if(c.op==='connect')next.graph.edges.push(c.edge);
    else if(c.op==='disconnect'){if(!next.graph.edges.some(e=>e.id===c.edgeId))throw new ProjectError('Connection not found.');next.graph.edges=next.graph.edges.filter(e=>e.id!==c.edgeId);}
    else if(c.op==='projectName')next.name=c.name;
    else if(c.op==='timeline')next.timeline={duration:c.duration,fps:c.fps};
  }
  next.revision++;validateProject(next);return {patch,next};
}
export function validatePatch(project:Project,input:unknown):Patch{return computePatch(project,input).patch;}
export function applyPatch(project:Project,input:unknown):Project{return computePatch(project,input).next;}
export function createProject(id:string,template:string='motion'):Project{
  const project:Project={schemaVersion:2,id,workspaceId:'local',branchId:'main',name:template==='motion'?'Flux / motion study':template==='alpine'?'Alpine passage':template==='water'?'Water / dam break':template==='cloud'?'Cloud / buoyant drift':'Untitled scene',revision:0,graph:{nodes:[],edges:[]},timeline:{duration:8,fps:30},locks:[],animations:[]};
  if(template==='alpine'){
    project.graph.nodes=[makeNode('grid','grid',0,0,{resolution:128}),makeNode('height','height',210,0),makeNode('curve','curve',210,125),makeNode('mask','mask',430,0),makeNode('rocks','scatter',650,-80,{},'Scatter rocks'),makeNode('rock','prototype',650,30,{},'Rock prototype'),makeNode('rockInstances','instance',870,-40,{},'Rock instances'),makeNode('trees','scatter',650,160,{density:.6,kind:'tree'},'Scatter pines'),makeNode('pine','prototype',650,270,{kind:'pine',color:'#426449'},'Pine prototype'),makeNode('pineInstances','instance',870,180,{},'Pine instances'),makeNode('output','output',1100,50)];
    project.graph.edges=[edge('grid','height','surface'),edge('height','mask','surface'),edge('curve','mask','curve'),edge('mask','rocks','surface'),edge('mask','trees','surface'),edge('rocks','rockInstances','points'),edge('rock','rockInstances','prototype'),edge('trees','pineInstances','points'),edge('pine','pineInstances','prototype'),edge('mask','output','scene'),edge('rockInstances','output','scene'),edge('pineInstances','output','scene')];project.locks=[{nodeId:'mask',param:'width'}];
  }else if(template==='motion'){
    project.graph.nodes=[makeNode('title','text',0,0),makeNode('letterMotion','textAnimate',250,0),makeNode('sparks','emitter',0,170,{z:-1}),makeNode('orbit','motion',250,170),makeNode('output','output',520,75)];
    project.graph.edges=[edge('title','letterMotion','text'),edge('sparks','orbit','particles'),edge('letterMotion','output','scene'),edge('orbit','output','scene')];
  }else if(template==='water'||template==='cloud'){project.graph.nodes=[makeNode(template,template,0,50),makeNode('output','output',330,50)];project.graph.edges=[edge(template,'output','scene')];project.timeline.duration=template==='water'?6:12;
  }else {const recipe=findEffect(template);if(recipe?.nodes){project.name=recipe.label;project.timeline.duration=recipe.duration||8;project.animations=structuredClone(recipe.animations||[]);project.graph.nodes=[...recipe.nodes.map(n=>makeNode(n.id,n.type,0,recipe.nodes!.indexOf(n)*150,n.params,n.label||(recipe.nodes!.length===1?recipe.label:undefined))),makeNode('output','output',520,100)];project.graph.edges=[...(recipe.links||[]).map(([a,b,input])=>edge(a,b,input)),...(recipe.outputs||[]).map(id=>edge(id,'output','scene'))];}else if(template==='blank')project.graph.nodes=[makeNode('output','output',520,100)];else throw new ProjectError('Unknown scene template.');}return validateProject(project);
}
const LegacyParamsSchema=z.object({seed:z.number().int().min(1).max(99999),height:z.number().min(.5).max(12),roughness:z.number().min(.1).max(1),pathWidth:z.number().min(1).max(8),rocks:z.number().min(0).max(1),trees:z.number().min(0).max(1)}).strict();
export type LandscapeParams=z.infer<typeof LegacyParamsSchema>;
const legacyMap:Record<keyof LandscapeParams,[string,string]>={seed:['height','seed'],height:['height','height'],roughness:['height','roughness'],pathWidth:['mask','width'],rocks:['rocks','density'],trees:['trees','density']};
export function parseProject(input:unknown):Project{
  if((input as {schemaVersion?:number})?.schemaVersion===1){
    const legacy=z.object({schemaVersion:z.literal(1),id:z.string().uuid(),workspaceId:z.literal('local'),branchId:z.literal('main'),name:z.string().trim().min(1).max(100),revision:z.number().int().nonnegative(),params:LegacyParamsSchema,locks:z.array(z.enum(['seed','height','roughness','pathWidth','rocks','trees'])).max(6)}).strict().parse(input);
    const project=createProject(legacy.id,'alpine');project.name=legacy.name;project.revision=legacy.revision;
    for(const [key,value] of Object.entries(legacy.params)){const [id,param]=legacyMap[key as keyof LandscapeParams];project.graph.nodes.find(n=>n.id===id)!.params[param]=value;}
    project.locks=legacy.locks.map(key=>({nodeId:legacyMap[key][0],param:legacyMap[key][1]}));return validateProject(project);
  }const project=ProjectSchema.parse(input);for(const node of project.graph.nodes){const initial=defaults(node.type);if(node.type==='paint'&&node.params.liquidDepth===undefined)node.params.liquidDepth=Math.max(.15,Math.min(1.6,Number(node.params.waveSpeed??2.8)**2/9.81));if(node.type==='particleSim')for(const key of Object.keys(PARTICLE_CONTROL_DEFAULTS))if(node.params[key]===undefined)node.params[key]=initial[key];for(const key of ['colorCount','separateColors','colorCycle','endlessMotion','colorD','colorE','colorF','colorG','colorH','colorI','colorJ','colorK','colorL','rotateX','rotateZ','liquidDepth','forceDuration','foldDepth','grainAmount','fillBasin','showInlets','waveMachine','waveHeight','waveFrequency','waveSpeed','waveDamping','waveDirection','wavePattern','surfaceFinish','tornadoRender','funnelHeight','coreWidth','volumeDensity','dust','font','opacity','scale','lifeTransition','endColor','endOpacity','endSize','lifeEasing','fadeIn'])if(node.params[key]===undefined&&initial[key]!==undefined)node.params[key]=initial[key];}return validateProject(project);
}
export function describeCommand(c:Command,project:Project):string{const name='nodeId' in c?project.graph.nodes.find(n=>n.id===c.nodeId)?.label||c.nodeId:'';switch(c.op){case 'visibility':return (c.visible?'Show ':'Hide ')+name;case 'animate':return 'Animate '+c.track.param+' on '+(project.graph.nodes.find(n=>n.id===c.track.nodeId)?.label||c.track.nodeId);case 'removeAnimation':return 'Remove '+c.param+' animation on '+name;case 'projectName':return 'Name project '+c.name;case 'add':return 'Add '+CATALOG[c.type].label;case 'set':return `${name}: ${c.param} → ${c.value}`;case 'connect':return `Connect ${c.edge.source} → ${c.edge.target} / ${c.edge.input}`;case 'disconnect':return 'Disconnect '+c.edgeId;case 'remove':return 'Remove '+name;case 'duplicate':return 'Duplicate '+name;case 'move':return 'Move '+name;case 'rename':return 'Rename '+name+' → '+c.label;case 'timeline':return `Timeline: ${c.duration}s / ${c.fps} fps`;}}
