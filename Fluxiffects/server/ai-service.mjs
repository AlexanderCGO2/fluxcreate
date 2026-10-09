import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {AIEditError, applyProposal, fingerprintProject, projectForAI, PROPERTY_RULES} from '../src/ai-commands.mjs';
import {getComp, parseProject} from '../src/core.mjs';

const fluxini = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Haidini');
const configuredModel = () => process.env.FLUXINI_MODEL || 'anthropic/claude-sonnet-5';
const fail = (message, status = 400) => {throw new AIEditError(message, status);};
const shortText = (value, label, max, optional = false) => {
  if (value === undefined && optional) return '';
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) fail(`${label} must contain ${optional ? 'at most ' : '1–'}${max} characters.`);
  return value;
};

/** Reuse the user-authorized Fluxini connection read-only. Never expose credentials or local paths. */
async function connectionStatus() {
  let reason;
  try {
    if (!process.env.AI_GATEWAY_API_KEY) {
      const {loadConnection} = await import(pathToFileURL(path.join(fluxini, 'server/connection.mjs')).href);
      await loadConnection(process.env.FLUXINI_DATA_DIR || path.join(fluxini, '.data'));
    }
  } catch {reason = 'The existing Flux connection is unavailable. Check the Fluxini connection settings.';}
  if (!process.env.AI_GATEWAY_API_KEY) reason ||= 'Connect Fluxini to AI Gateway to enable live AI here.';
  return {available: !!process.env.AI_GATEWAY_API_KEY, provider: 'Flux / AI Gateway', model: configuredModel(), ...(reason ? {reason} : {})};
}

/** Only the chosen scene, request, explicit brief and chosen preferences reach the provider. */
export function buildAIContext(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('An AI request must be an object.');
  const allowed = ['project', 'selection', 'intent', 'mode', 'scope', 'time', 'brief', 'preferences', 'variations'];
  if (Object.keys(body).some(key => !allowed.includes(key))) fail('The AI request contains unsupported fields.');
  const intent = shortText(body.intent, 'Request', 2000), mode = body.mode || 'edit', scope = body.scope || 'composition';
  if (!['edit', 'create', 'explain'].includes(mode) || !['selection', 'composition'].includes(scope)) fail('Choose a valid AI mode and scope.');
  const variations = body.variations === undefined ? 1 : body.variations;
  if (![1, 3].includes(variations) || (mode === 'explain' && variations !== 1)) fail('Choose one direction or three directions. Explain mode supports one response.');
  const rawPreferences = body.preferences === undefined ? [] : body.preferences;
  if (!Array.isArray(rawPreferences) || rawPreferences.length > 10) fail('Choose at most 10 creative preferences.');
  const preferences = rawPreferences.map(value => shortText(value, 'Creative preference', 300).trim());
  if (new Set(preferences).size !== preferences.length) fail('Creative preferences must be unique.');
  if (!body.project || !Array.isArray(body.project.compositions) || !Array.isArray(body.project.assets)) fail('Include the current project.');
  const project = projectForAI(body.project), encoded = JSON.stringify(project);
  if (encoded.length > 1000000) fail('This project is too large for one AI request. Simplify the scene or animation first.', 413);
  let validated;
  try {validated = parseProject(encoded).project;} catch {fail('The project contains invalid composition or layer data.');}
  const comp = getComp(validated), selection = body.selection ?? [];
  if (!Array.isArray(selection) || selection.length > 200 || selection.some(id => typeof id !== 'string' || !comp.layers.some(layer => layer.id === id))) fail('Select valid layers from the active composition.');
  if (mode === 'edit' && scope === 'selection' && !selection.length) fail('Select a layer before requesting a selected-layer edit.');
  const time = body.time ?? 0;
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0 || time > comp.duration) fail('Playhead time must lie within the active composition.');
  const brief = shortText(body.brief, 'Creative brief', 6000, true);
  const chosen = scope === 'selection' && mode !== 'create' ? comp.layers.filter(layer => selection.includes(layer.id)) : comp.layers;
  const assetIds = new Set(chosen.map(layer => layer.assetId).filter(Boolean));
  const context = {
    composition: {id: comp.id, name: comp.name, width: comp.width, height: comp.height, fps: comp.fps, duration: comp.duration, background: comp.background,
      layers: chosen.map(layer => ({id: layer.id, type: layer.type, locked: !!layer.locked,
        ...Object.fromEntries(Object.keys(PROPERTY_RULES).filter(key => layer[key] !== undefined).map(key => [key, layer[key]])),
        keyframes: layer.keyframes || {}, effects: layer.effects || []})),
    },
    assets: validated.assets.filter(asset => assetIds.has(asset.id)).map(asset => ({id: asset.id, type: asset.type, width: asset.width, height: asset.height, duration: asset.duration, missing: !!asset.missing, ...(asset.type === 'model3d' ? {modelFormat: asset.modelFormat, clips: asset.clips || []} : {})})),
    selection, time, mode, scope, untrustedCreativeBrief: brief, untrustedCreativePreferences: preferences,
  };
  const characters = JSON.stringify(context).length;
  if (characters > 65000) fail('The chosen scene exceeds the AI context budget. Reduce layers, animation keys, or the brief.', 413);
  return {project, intent, mode, scope, selection, variations, context, contextCharacters: characters};
}

function validateAnswer(answer, request, baseFingerprint, {multiple = false} = {}) {
  const allowed = ['summary', 'commands', 'explanation', ...(multiple ? ['label'] : [])];
  if (!answer || typeof answer !== 'object' || Array.isArray(answer) || Object.keys(answer).some(key => !allowed.includes(key))) fail('The model returned an invalid proposal. No changes were applied.', 502);
  const summary = shortText(answer.summary, 'Proposal summary', 1200), explanation = shortText(answer.explanation, 'Explanation', 6000, true);
  if (multiple && (!Array.isArray(answer.commands) || answer.commands.length < 1 || answer.commands.length > 16)) fail('Each direction must contain 1–16 editable commands. No changes were applied.', 502);
  const proposal = {summary, commands: answer.commands, baseFingerprint, mode: request.mode, scope: request.scope, selection: [...request.selection]};
  const result = applyProposal(request.project, proposal);
  return {proposal, previewProject: result.project, changes: result.changes, warnings: result.warnings, ...(explanation ? {explanation} : {})};
}

export function createAIService({planner} = {}) {
  let inFlight = false;
  return {
    async status() {
      if (planner) return {available: true, provider: 'Injected test planner', model: 'test-only', busy: inFlight, testOnly: true};
      return {...await connectionStatus(), busy: inFlight};
    },
    async plan(body, {signal} = {}) {
      const request = buildAIContext(body);
      if (inFlight) fail('Another AI request is already running. Cancel it or wait for it to finish.', 409);
      if (signal?.aborted) fail('AI request cancelled.', 499);
      inFlight = true;
      const controller = new AbortController(), onAbort = () => controller.abort(new DOMException('Cancelled', 'AbortError'));
      signal?.addEventListener('abort', onAbort, {once: true});
      const timeout = setTimeout(() => controller.abort(new DOMException('Timed out', 'TimeoutError')), 45000);
      let abortListener;
      try {
        const abort = new Promise((resolve, reject) => {abortListener = () => reject(new AIEditError(signal?.aborted ? 'AI request cancelled.' : 'The AI request exceeded 45 seconds. Try a smaller request.', signal?.aborted ? 499 : 504)); controller.signal.addEventListener('abort', abortListener, {once: true});});
        const run = async () => {
          if (planner) return await planner({intent: request.intent, context: request.context, mode: request.mode, scope: request.scope, selection: request.selection, variations: request.variations, signal: controller.signal});
          const status = await connectionStatus(); if (!status.available) fail(status.reason, 503);
          const {planWithGateway} = await import('./ai-provider.mjs');
          return await planWithGateway({intent: request.intent, context: request.context, variations: request.variations, model: status.model, signal: controller.signal});
        };
        let answer;
        try {answer = await Promise.race([run(), abort]);}
        catch (error) {
          if (error instanceof AIEditError) throw error;
          const upstream = Number(error?.statusCode || error?.cause?.statusCode);
          if (upstream === 402) fail('Your Flux AI Gateway account returned HTTP 402. Check gateway credits or billing before trying again.', 502);
          const detail = Number.isInteger(upstream) && upstream >= 400 && upstream <= 599 ? ` (HTTP ${upstream})` : '';
          fail(`The AI Gateway request failed${detail}. Check the selected Claude model and the existing Flux connection.`, 502);
        }
        if (controller.signal.aborted) fail('AI request cancelled.', 499);
        const baseFingerprint = fingerprintProject(request.project);
        if (request.variations === 1) return validateAnswer(answer, request, baseFingerprint);
        if (!answer || typeof answer !== 'object' || Array.isArray(answer) || Object.keys(answer).some(key => key !== 'alternatives') || !Array.isArray(answer.alternatives) || answer.alternatives.length !== 3) fail('The model must return exactly three directions. No changes were applied.', 502);
        const labels = new Set();
        // Validate each choice against the same immutable source. Nothing is returned until
        // every choice succeeds, and no preview becomes another choice's input.
        const alternatives = answer.alternatives.map(alternative => {
          const label = shortText(alternative?.label, 'Direction label', 80).trim(), key = label.toLowerCase();
          if (labels.has(key)) fail('Direction labels must be unique. No changes were applied.', 502);
          labels.add(key);
          return {label, ...validateAnswer(alternative, request, baseFingerprint, {multiple: true})};
        });
        const {label, ...first} = alternatives[0];
        return {...first, alternatives};
      } finally {
        clearTimeout(timeout); signal?.removeEventListener('abort', onAbort);
        if (abortListener) controller.signal.removeEventListener('abort', abortListener);
        inFlight = false;
      }
    },
  };
}
