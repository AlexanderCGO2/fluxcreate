import { Eye, EyeOff } from 'lucide-react';
import { canToggleVisibility } from '../engine/visibility.ts';
import type { SceneNode, Command } from '../engine/project.ts';
export default function VisibilityToggle({node,disabled,onCommands,selected=false}:{node:SceneNode;disabled:boolean;onCommands:(commands:Command[],summary:string)=>void;selected?:boolean}){
 if(!canToggleVisibility(node.type))return null;
 const visible=node.visible!==false,action=visible?'Hide':'Show',Icon=visible?Eye:EyeOff;
 return <button className={'visibility-toggle '+(!visible?'is-hidden':'')} aria-label={action+' '+(selected?'selected object':node.label)} aria-pressed={visible} title={action+' in viewport and exports · connections stay active'} disabled={disabled} onClick={()=>onCommands([{op:'visibility',nodeId:node.id,visible:!visible}],action+' '+node.label)}><Icon size={15}/></button>;
}
