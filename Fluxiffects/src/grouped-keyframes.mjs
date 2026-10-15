import {ANIMATABLE_PROPERTIES,editKeyframes,copyKeyframes,pasteKeyframes,supportsKeyframePaste} from './core.mjs';

// Selection identities include the property: imported tracks can reuse key IDs.
function selectedTracks(layer,selection){
  if(!Array.isArray(selection)||!selection.length||selection.length>100000)throw Error('Select keys on this layer first (at most 100,000 keys).');
  const groups=new Map(),seen=new Set();
  for(const ref of selection){
    if(!ref||typeof ref.id!=='string'||!supportsKeyframePaste(layer,ref.property))throw Error('This layer does not support every selected property. Select compatible tracks.');
    const identity=JSON.stringify([ref.property,ref.id]);
    if(seen.has(identity))throw Error('The keyframe selection contains duplicate keys. Select the keys again.');
    seen.add(identity);if(!groups.has(ref.property))groups.set(ref.property,[]);groups.get(ref.property).push(ref.id);
  }
  // Validate every reference before building a candidate, including a zero-delta move.
  for(const [property,ids]of groups){const track=layer.keyframes?.[property]??[],existing=new Set(track.map(k=>k.id));if(existing.size!==track.length||ids.some(id=>!existing.has(id)))throw Error('The keyframe selection changed or has ambiguous keys. Select the keys again.');}
  return groups;
}

/** Build only a detached candidate; a failure on any track returns no edit. */
export function editKeyframeGroup(layer,selection,action,options){
  const groups=selectedTracks(layer,selection);let next=layer;
  for(const [property,ids]of groups)next=editKeyframes(next,property,ids,action,options);
  return next;
}

export function copyKeyframeGroup(layer,selection){
  const groups=selectedTracks(layer,selection),tracks=[];let anchor=Infinity;
  for(const [property,ids]of groups){const selected=new Set(ids),start=Math.min(...layer.keyframes[property].filter(k=>selected.has(k.id)).map(k=>k.time));anchor=Math.min(anchor,start);tracks.push({...copyKeyframes(layer,property,ids),offset:start});}
  return {version:1,tracks:tracks.map(track=>({...track,offset:track.offset-anchor}))};
}

export function pasteKeyframeGroup(layer,clipboard,time,{duration,remainingKeys=100000}={}){
  if(layer?.locked)throw Error('Unlock the layer before pasting keyframes.');
  if(clipboard?.version!==1||!Array.isArray(clipboard.tracks)||!clipboard.tracks.length||clipboard.tracks.length>ANIMATABLE_PROPERTIES.length)throw Error('Choose valid copied keyframe tracks.');
  if(!Number.isFinite(time)||!Number.isFinite(duration)||duration<=0||time<0||time>duration)throw Error('Choose a playhead time between 0 and the composition duration.');
  if(!Number.isInteger(remainingKeys)||remainingKeys<0||remainingKeys>100000)throw Error('The native project key capacity is invalid.');
  const properties=new Set();let count=0,earliest=Infinity;
  for(const track of clipboard.tracks){
    if(!track||!supportsKeyframePaste(layer,track.property))throw Error('The destination does not support every copied property. Choose a compatible layer.');
    if(properties.has(track.property))throw Error('Copied properties must be unique.');properties.add(track.property);
    if(!Number.isFinite(track.offset)||track.offset<0||!Array.isArray(track.keys)||!track.keys.length||track.keys[0]?.time!==0)throw Error('Copied tracks have invalid offsets.');
    if(track.keys.length>10000)throw Error('This paste exceeds the native limit of 10,000 keys per property.');
    earliest=Math.min(earliest,track.offset);count+=track.keys.length;
  }
  if(earliest!==0)throw Error('The earliest copied track must start at the global anchor.');
  if(count>remainingKeys)throw Error('This paste exceeds the native project capacity of 100,000 keys.');
  let next=layer,remaining=remainingKeys;
  for(const track of clipboard.tracks){
    // Each existing helper packet starts at zero; the separate track offset preserves the global anchor.
    next=pasteKeyframes(next,track.property,track,time+track.offset,{duration,remainingKeys:remaining});remaining-=track.keys.length;
  }
  return next;
}
