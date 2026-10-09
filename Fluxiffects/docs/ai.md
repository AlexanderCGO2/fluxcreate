# Fluxiffects AI

Fluxiffects reuses the existing Fluxini AI Gateway connection and its configured Claude model. The user explicitly chose connection reuse and both editing existing compositions and creating new editable compositions. The app calls the provider only when the user submits a prompt using the send control in the Refine, Create, or Understand panel. Connection status makes no model request.

The provider receives the user's current prompt, the explicit creative brief, selected creative preference text, and the chosen active composition or selected layers. It does not receive media bytes, local paths, unrelated compositions, AE metadata, exchange snapshots, unselected preferences, handoff notes, or conversation history. Selected-layer context omits other layers entirely; requests that need broader scene changes should use composition scope. Scene text, preferences and briefs are untrusted data, never privileged instructions.

The existing Fluxini connection loader is imported read-only from the sibling Haidini project. It uses an existing `AI_GATEWAY_API_KEY`, the selected `FLUXINI_FLUX_ENV`, or the `.data/connection.json` environment-file pointer. Only the gateway credential is loaded into the server environment; keys are never copied into this project or returned to the browser. `FLUXINI_MODEL` is honored, with the same `anthropic/claude-sonnet-5` default used by Fluxini. There is no automatic provider/model fallback.

## Integration

`createAIService({planner?})` in `server/ai-service.mjs` returns:

- `status()` → connection availability, provider, configured model, and busy state.
- `plan(body, {signal}?)` → `{proposal, previewProject, changes, warnings, explanation?}`.

Requests have `{project, selection, intent, mode, scope, time, brief?, preferences?, variations?}`. Modes are `edit`, `create`, and `explain`; scopes are `selection` and `composition`. Preferences are at most 10 unique nonblank strings, each at most 300 characters. `variations` is 1 (default) or 3; explain requires 1. Send `projectForAI(project)` from the browser so media and exchange snapshots never leave it. The returned preview has stripped media; reapply the proposal to the original local project with `applyProposal` for a full-media visual preview and for the final one-step undoable commit.

## Creative preferences

The `CreativePreferences` dialog stores a versioned library under `fluxiffects.creative-preferences.v1` in this origin's localStorage. Up to 30 entries contain only an ID, name (60 characters), and rule text (300 characters). Add, edit and delete are explicit user actions; the model cannot write to this library. Corrupt or inaccessible storage produces a visible error. Clearing browser storage removes these rules.

The saved library and request selection are separate. New rules start unselected; editing a rule removes it from the current selection. Selections clear on submission (including a later error or cancellation), project changes, and AI panel unmount. Only selected rule text enters `untrustedCreativePreferences`; IDs, names, the rest of the library and selection state do not enter the provider request. Preferences are not silently added to project or exchange files. The existing creative brief remains portable with those files.

## Editable directions

The three-direction option makes one provider call with a small `alternativesJson` string envelope. Its decoded array must contain exactly three distinct named alternatives, each with 1–16 strictly validated commands. All proposals use the same baseline fingerprint and are applied independently to the original project. If any alternative is invalid, the whole response is rejected. No partial result is applied or previewed.

The response adds `alternatives: [{label, proposal, previewProject, changes, warnings, explanation?}]` while retaining the first alternative's original top-level fields for compatibility. The UI independently validates every alternative against the current full local project. Tabs change only the preview; Apply commits the chosen alternative as one undo step. Create mode adds only the chosen new composition. Any intervening scene edit makes every proposal stale.

Three-direction generation has an 11,000-token output budget, versus 6,500 for a single direction. Both retain the 45-second timeout and cancellation behavior. The user can choose one direction for a smaller request; failures do not trigger automatic retries, extra provider calls, or a fallback model.

## Validation and execution

The client and server independently validate commands. The provider uses a small required-field response envelope whose command list is an inert JSON string; the full Zod command schema validates the decoded list before the shared edit engine runs. This keeps the remote schema within [Claude's structured-output complexity limits](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) while preserving strict local validation. Proposals carry a deterministic fingerprint of editor structure and full media-source hashes. Changes made while planning invalidate the proposal. Media bytes themselves are not sent. Inert AE/exchange metadata does not influence the fingerprint and is preserved by applying commands to the original local project.

The edit engine accepts at most 32 typed commands: add/update/delete/duplicate layer, replace an animation track, remove a keyframe/track, replace effects, update composition settings, or create one new composition. It rejects unknown fields, scripts, arbitrary URLs, invalid values, orphaned parents, parent cycles, locked-layer edits and edits outside the selected scope. It also blocks indirect transform edits that move locked or unselected descendants. Edits validate as one atomic batch. Create mode targets a new composition and preserves existing scenes. Explain mode cannot issue edits. Unsupported requests may return an explanation with no commands.

Requests have a 2,000-character prompt limit, 6,000-character brief limit, 65,000-character selected scene context budget, and 45-second timeout. One request runs at a time. Cancellation aborts the provider request. Gateway errors are sanitized. Offline operation is reported honestly; there is no canned-response fallback.

## Verification

`node --test tests/ai-commands.test.mjs tests/ai-service.test.mjs tests/creative-preferences.test.mjs` runs local-only tests with injected planners. `node scripts/ai-variations-smoke.mjs` checks the new workflows in an isolated Edge browser. `node tests/ai-live-smoke.mjs --run-live`, `node tests/ai-live-create.mjs --run-live`, and `node scripts/ai-variations-live.mjs --run-live` are separately invoked synthetic live checks; they require the configured gateway and are excluded from automated tests.

Verified on 2026-09-30 with the configured `anthropic/claude-sonnet-5`: the synthetic edit changed a public test title and added two editable opacity keys; the synthetic create produced a new three-second composition containing editable text, a shape, and two opacity keys while preserving the original composition exactly. On 2026-10-03, the single live three-direction check returned gateway HTTP 402 before producing a result. Three-direction behavior is verified with injected planners; live variations remain unverified until the existing gateway account permits requests. These checks cover small neutral fixtures, not every design request or imported project.

This project intentionally matches the installed working Fluxini stack: AI SDK `5.0.216`, Gateway provider `1.0.41`, and Zod `4.4.3`. SDK usage follows the local Fluxini implementation and [AI SDK structured object generation](https://v5.ai-sdk.dev/docs/reference/ai-sdk-core/generate-object) with the [AI Gateway provider](https://ai-sdk.dev/providers/ai-sdk-providers/ai-gateway). No newer API migration or model substitution is required.

## Next steps — future work

The current foundation supports reviewed, editable composition changes. These deeper integrations are not implemented yet:

- Motion critique and retiming over a user-selected time range, preserving animation outside that range.
- A rendered procedural handoff attached to its editable source, so collaborators can inspect both the intended appearance and the underlying scene.
