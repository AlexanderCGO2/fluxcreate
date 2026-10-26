import React from 'react';
import {Image as ImageIcon,Type,Film,AudioLines,Music2} from 'lucide-react';
const MODES=[['image','Image',ImageIcon],['text','Text',Type],['video','Video',Film],['audio','Speech',AudioLines],['music','Music',Music2]];
export function GenerationModes({value,onChange,disabled=false}){
 return <div className="mode-picker" role="group" aria-label="Generation type">
  {MODES.map(([id,label,Icon])=><button key={id} type="button" aria-pressed={value===id} className={value===id?'active':''} onClick={()=>onChange(id)} disabled={disabled}><Icon size={16}/>{label}</button>)}
 </div>;
}
