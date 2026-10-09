// Explicitly authorized synthetic diagnostic; never run by npm test.
import {createAIService, buildAIContext} from '../server/ai-service.mjs';
import {planWithGateway} from '../server/ai-provider.mjs';
import {createBlankProject, createLayer, getComp} from '../src/core.mjs';
if (!process.argv.includes('--run-live')) throw new Error('Explicit --run-live authorization is required.');
const status = await createAIService().status();
if (!status.available) throw new Error('Existing AI connection is unavailable.');
const project = createBlankProject({name: 'Public synthetic AI validation', width: 1280, height: 720, duration: 4});
getComp(project).layers = [createLayer('text', {id: 'synthetic-title', name: 'Public title', text: 'Hello', x: 160, y: 220, end: 4})];
const request = buildAIContext({project, selection: ['synthetic-title'], scope: 'selection', mode: 'edit', time: 0, brief: '', intent: 'Change the selected text to exactly Tomorrow. Add editable opacity keyframes fading from 0 at time 0 to 1 at time 1 with ease-out. Preserve all other properties.'});
const safe = value => String(value || '').replaceAll(process.env.AI_GATEWAY_API_KEY, '[credential]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').replace(/[A-Z]:[\\/][^\s"']+/gi, '[local path]').replace(/https?:\/\/[^\s"']+/g, '[endpoint]').slice(0, 550);
try {
  const result = await planWithGateway({intent: request.intent, context: request.context, model: status.model, signal: AbortSignal.timeout(45000)});
  console.log(JSON.stringify({ok: true, model: status.model, commands: result.commands.length}));
} catch (error) {
  const diagnostics = [];
  for (let current = error, depth = 0; current && depth < 6; current = current.cause, depth++) {
    let response;
    try {response = JSON.parse(current.responseBody || '{}');} catch {}
    const message = response?.error?.message || response?.message || current.message;
    diagnostics.push({kind: safe(current.name), status: Number(current.statusCode) || null, code: safe(response?.error?.code || response?.error?.type), message: safe(message)});
  }
  console.log(JSON.stringify({ok: false, model: status.model, diagnostics}, null, 2)); process.exitCode = 1;
}
