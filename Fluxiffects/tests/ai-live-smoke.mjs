// Manual, explicitly authorized synthetic check. npm test never runs this file.
import {createAIService} from '../server/ai-service.mjs';
import {createBlankProject, createLayer, getComp} from '../src/core.mjs';
import {applyProposal, projectForAI} from '../src/ai-commands.mjs';
import {writeFile} from 'node:fs/promises';

if (!process.argv.includes('--run-live')) throw new Error('Use --run-live only after authorizing this synthetic provider request.');
const service = createAIService(), status = await service.status();
const report = {provider: status.provider, model: status.model, available: status.available, synthetic: true, timestamp: new Date().toISOString()};
try {
  if (!status.available) throw new Error(status.reason);
  const project = createBlankProject({name: 'Public synthetic AI validation', width: 1280, height: 720, duration: 4});
  getComp(project).layers = [createLayer('text', {id: 'synthetic-title', name: 'Public title', text: 'Hello', x: 160, y: 220, end: 4})];
  const response = await service.plan({project: projectForAI(project), selection: ['synthetic-title'], scope: 'selection', mode: 'edit', time: 0, brief: '', intent: 'Change the selected text to exactly Tomorrow. Add editable opacity keyframes fading from 0 at time 0 to 1 at time 1 with ease-out. Preserve all other properties.'});
  const applied = applyProposal(project, response.proposal, {scope: 'selection', selection: ['synthetic-title']}).project;
  const title = getComp(applied).layers[0];
  if (title.text !== 'Tomorrow' || title.keyframes.opacity?.length !== 2 || title.keyframes.opacity[0].value !== 0 || title.keyframes.opacity[1].value !== 1) throw new Error('The model response did not satisfy the synthetic editable-title check.');
  Object.assign(report, {ok: true, commandCount: response.proposal.commands.length, textChanged: true, editableOpacityKeys: title.keyframes.opacity.length});
} catch (error) {
  Object.assign(report, {ok: false, status: error.status || error.statusCode || null, reason: error.name === 'AIEditError' || /synthetic|connection|Connect Fluxini/.test(error.message) ? error.message : 'Live request failed; raw diagnostics omitted.'});
  process.exitCode = 1;
}
await writeFile(new URL('../server/ai-live-report.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
