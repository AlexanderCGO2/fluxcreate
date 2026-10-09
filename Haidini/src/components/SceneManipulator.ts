import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { manipulationKeys, manipulationValues, manipulationCommands, type ManipulationMode } from '../engine/manipulation.ts';
import { isLocked, type Project, type Command } from '../engine/project.ts';
type Context={project:Project;selected:string;time:number;disabled:boolean;onCommands?:(commands:Command[],summary:string)=>void;onStart?:()=>void};
export class SceneManipulator {
 readonly control:TransformControls;readonly helper:THREE.Object3D;
 dragging=false;mode:ManipulationMode='translate';
 draft:{nodeId:string;values:Record<string,number>}|null=null;
 private active:Context|null=null;
 constructor(scene:THREE.Scene,camera:THREE.Camera,canvas:HTMLElement,private context:()=>Context){
  this.control=new TransformControls(camera,canvas);this.control.setSize(.85);this.control.setSpace('world');
  this.helper=this.control.getHelper();scene.add(this.helper);
  this.control.addEventListener('mouseDown',()=>{const c=this.context();if(c.disabled)return;this.active={...c};this.dragging=true;this.draft={nodeId:c.selected,values:manipulationValues(c.project,c.selected,c.time)};c.onStart?.();});
  this.control.addEventListener('objectChange',()=>{const object=this.control.object;if(!object||!this.active||!this.draft)return;const values=this.draft.values;
   if(this.mode==='translate')for(const axis of ['x','y','z'] as const)values[axis]=object.position[axis];
   else if(this.mode==='rotate')for(const axis of ['x','y','z'] as const)values['rotate'+axis.toUpperCase()]=THREE.MathUtils.radToDeg(object.rotation[axis]);
   else{const axis=this.control.axis?.[0]?.toLowerCase() as 'x'|'y'|'z';const scale=object.scale[axis]??object.scale.x;values.scale=Math.max(.01,Math.min(5,scale));object.scale.setScalar(values.scale);}
  });
  this.control.addEventListener('mouseUp',()=>{if(!this.active)return;const c=this.active,values=this.draft?.values||{};this.active=null;this.dragging=false;this.draft=null;
   const keys=manipulationKeys(this.mode),commands=manipulationCommands(c.project,c.selected,Object.fromEntries(Object.entries(values).filter(([k])=>keys.includes(k))),c.time);if(commands.length)c.onCommands?.(commands,(this.mode==='translate'?'Move ':this.mode==='rotate'?'Rotate ':'Scale ')+(c.project.graph.nodes.find(n=>n.id===c.selected)?.label||'object'));
  });
 }
 setMode(mode:ManipulationMode){if(this.dragging)this.cancel();this.mode=mode;this.control.setMode(mode);this.control.setSpace(mode==='translate'?'world':'local');}
 sync(root:THREE.Group){
  if(this.dragging)return;const c=this.context(),node=c.project.graph.nodes.find(n=>n.id===c.selected),keys=manipulationKeys(this.mode),values=manipulationValues(c.project,c.selected,c.time);
  let object:THREE.Object3D|undefined;root.traverse(o=>{if(!object&&o.userData.transformNode===c.selected)object=o;});
  const usable=!!node&&keys.some(k=>k in values&&!isLocked(c.project,c.selected,k))&&!c.disabled&&!!c.onCommands;
  if(!usable||!object){this.control.detach();return;}
  this.control.enabled=true;if(this.control.object!==object)this.control.attach(object);
  this.control.showX=this.mode==='scale'||keys[0] in values&&!isLocked(c.project,c.selected,keys[0]);
  this.control.showY=this.mode==='scale'||keys[1] in values&&!isLocked(c.project,c.selected,keys[1]);
  this.control.showZ=this.mode==='scale'||keys[2] in values&&!isLocked(c.project,c.selected,keys[2]);
 }
 cancel(){this.control.reset();this.active=null;this.dragging=false;this.draft=null;}
 detach(){this.cancel();this.control.detach();}
 dispose(){this.detach();this.helper.removeFromParent();this.control.dispose();}
}
