# Conditional workflows and typed results

Implemented and verified locally on 2026-10-09. This is a bounded extension to the existing FluxAgents local runner and hosted simulator. It does not enable hosted live execution, external connectors, media generation, parallel workers or autonomous agents.

## Use the workflow

Choose **Route a request** in the designer. Its condition checks whether the input contains “urgent”, ignoring letter case. The true and false routes add different prefixes; a join collects the chosen route, and an approval step pauses before the final output. The template makes no model calls in either simulation or an explicitly started local run.

Select a **Condition** step to choose Contains, Equals exactly, or Is empty or whitespace. Select another step and set its **Branch rule** to that condition’s true or false result. Keep its text source connected separately. A boolean condition cannot be connected to a text input. A step whose branch rule does not match is skipped, as are its dependent steps until an active-input join collects another available route. Removing a referenced step requires reconnecting its dependents first; removing a condition cannot silently remove a spending guard.

Select **Join text** to choose 2–8 distinct text sources and their order, separator and behavior:

- **Collect the active inputs** waits for every selected source to finish or be skipped, then concatenates completed text in the configured order. If all sources were skipped, the join is skipped.
- **Require every input** is skipped if any selected source was skipped.

Execution remains sequential in validated dependency order. A join does not create concurrency. Branch rules and source connections both participate in cycle detection. All text, prompt, step and model-attempt limits remain enforced. The graph still reserves enough configured allowance for all writing nodes; it does not optimize the declared allowance using mutually exclusive branches.

## Version and value contracts

Version-1 workflow JSON and Markdown continue to round-trip unchanged. Adding a condition, join or branch rule upgrades the edited graph to version 2. Importing either version remains inactive. Older clients that only understand version 1 must reject version-2 files rather than discard their guards.

All ordinary steps produce text. Conditions produce boolean decisions. Text inputs accept text only; branch rules accept condition decisions only. The port types are inferred from the validated step type. JSON objects, arrays, file handles and binary/media ports are not implemented.

New run records retain the existing `outputs` values for compatibility and add an `artifacts` map. Each completed step stores a bounded result with `schemaVersion: 1`, an immutable version-1 ID scoped to its run and step, its `type` (`text` or `boolean`), and provenance containing the run, step, mode, source step IDs and writing model when applicable. Boolean artifacts have `value`; text artifacts have `text`. A skipped step has a persisted reason and no output artifact. The final output nodes remain text destinations; boolean decisions can be inspected in the run record but are not sent as editor text.

Example version-2 branch and join fields:

```json
{
  "id": "priority",
  "type": "transform",
  "name": "Priority route",
  "from": "input",
  "when": { "nodeId": "condition", "equals": true },
  "config": { "operation": "prefix", "text": "Priority queue: " }
}
```

```json
{
  "id": "join",
  "type": "join",
  "name": "Collect the chosen route",
  "from": ["priority", "standard"],
  "config": { "mode": "active", "separator": "\n\n" }
}
```

## Recovery, spending and simulation

The SQLite runner saves each decision, skip, completed artifact, approval and delay checkpoint in the pinned run. Restart recovery reuses those results. An unchosen writing step never reaches catalog preparation, reservation or generation. An accepted writing request whose outcome becomes uncertain remains paused for explicit acknowledged retry; earlier attempts and reservations remain counted. Cancellation remains final and late model results cannot write artifacts or start the join.

The existing explicit suite-billing confirmation remains required for local live starts. A graph containing writing nodes still requires an available suite connection at start, even if a later decision may skip them. Personal browser keys do not become background credentials. Hosted live runs remain disabled.

Simulation is deterministic for the same graph, input and supplied simulation identity. It makes no provider calls. Conditions connected to a writing step evaluate the labelled simulated placeholder, so the chosen route does not predict the route a real model result would take. Simulated approval and delay steps remain previews. The run view identifies decisions, skipped steps and saved result types; text handoffs retain the simulation label.

## Verification

- All 22 FluxAgents unit/API/runner tests pass. The seven new branching cases cover v1 compatibility, both condition outcomes, typed ports, guard/source cycles, malformed IDs, join semantics and bounds, zero calls/reservations on skipped paid branches, durable decisions/artifacts, uncertain paid recovery, delay recovery and cancellation.
- `node scripts/branching-browser.mjs` passes six browser groups: actual condition edits, true/false routes, typed result display, guarded removal and undo, join validation, live local approval/reload and mobile dark layout.
- Existing `scripts/browser-smoke.mjs` and `scripts/recovery-browser-smoke.mjs` pass their six and five browser groups. Provider work is injected and unpaid. The app build passes.

Remaining work includes persistent browser start-intent recovery, a named workflow/version library, richer typed data and mappings, free-position graph editing, approval rejection/editing, cloud execution and artifact ownership. The local SQLite implementation is not a distributed or managed cloud executor.
