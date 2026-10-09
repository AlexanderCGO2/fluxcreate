// Array order is the visual stacking order: first layer is on top.
export function moveLayer(layers, sourceId, targetId, edge = 'before') {
  if (!['before', 'after'].includes(edge)) return layers;
  const source = layers.find(layer => layer.id === sourceId);
  if (!source || source.locked || sourceId === targetId || !layers.some(layer => layer.id === targetId)) return layers;
  const result = layers.filter(layer => layer.id !== sourceId);
  const index = result.findIndex(layer => layer.id === targetId) + (edge === 'after' ? 1 : 0);
  result.splice(index, 0, source);
  return result.every((layer, i) => layer === layers[i]) ? layers : result;
}

export function moveLayers(layers,ids,targetId,edge='before') {
 const chosen=new Set(ids);if(!['before','after'].includes(edge)||!chosen.size||chosen.has(targetId)||!layers.some(l=>l.id===targetId))return layers;
 const moving=layers.filter(l=>chosen.has(l.id));if(moving.length!==chosen.size||moving.some(l=>l.locked))return layers;
 const remaining=layers.filter(l=>!chosen.has(l.id)),index=remaining.findIndex(l=>l.id===targetId)+(edge==='after'?1:0);remaining.splice(index,0,...moving);
 return remaining.every((l,i)=>l===layers[i])?layers:remaining;
}
export function editLayers(layers,ids,action){
 const chosen=new Set(ids),targets=layers.filter(l=>chosen.has(l.id));if(!chosen.size||targets.length!==chosen.size)throw Error('A selected layer no longer exists.');
 if(targets.some(l=>l.locked))throw Error('Unlock every selected layer before editing.');
 if(action.type==='delete')return layers.filter(l=>!chosen.has(l.id));
 if(action.type==='move'){if(!Number.isFinite(action.dx)||!Number.isFinite(action.dy))throw Error('Invalid move.');return layers.map(l=>chosen.has(l.id)?{...l,x:l.x+action.dx,y:l.y+action.dy}:l);}
 if(action.type==='duplicate')return layers.flatMap(l=>chosen.has(l.id)?[{...structuredClone(l),id:crypto.randomUUID(),name:l.name+' copy',x:l.x+24,y:l.y+24},l]:[l]);
 throw Error('Unknown layer action.');
}
