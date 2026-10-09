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
