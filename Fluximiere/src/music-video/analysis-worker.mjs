import { analyzeMusic } from './analysis.mjs';

// Terminate the worker to interrupt a synchronous analysis already in progress.
// A request ID lets callers discard a completion after the selected song changes.
self.onmessage = ({ data }) => {
  const id = data?.id;
  if (data?.type !== 'analyze' || (typeof id !== 'string' && typeof id !== 'number')) return;
  try { self.postMessage({ type:'result', id, analysis:analyzeMusic(data.input) }); }
  catch (error) { self.postMessage({ type:'error', id, error:error instanceof Error ? error.message : 'Music analysis failed.' }); }
};
