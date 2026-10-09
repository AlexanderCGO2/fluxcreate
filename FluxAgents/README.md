# FluxAgents

A visual workflow studio for FluxCreate. Build editable flows, test them without model calls, and run real background text workflows on your own computer.

## What works

- An Apple-inspired light/dark designer, typed step inspector, templates, source connections, undo/redo, draft autosave and protected recovery.
- Input, Gateway text generation, deterministic text transformations, approval, delay and output nodes. Graphs may branch through explicit source references; every non-input step accepts one text source. Graphs are bounded and acyclic.
- Portable `.fluxagent.json` and `.fluxagent.md` files. Markdown has one authoritative `flux-agent` JSON block. Imported files remain inactive. Credentials and run histories are never included in graph exports.
- Deterministic, visibly labeled simulation. It calls no AI model, previews reviews/delays and records the simulation in browser history.
- Real local background runs, SQLite run/operation ledger, persisted approval pauses and delay deadlines, cancellation and restart recovery. Successful writing results are reused after restart. A crash or failed request with an uncertain model outcome pauses for explicit retry; retries keep prior reservations and call counts.
- Downloadable run records/text, and editable-text handoff to FluxDesign, Fluxfoto, Fluxiffects and Fluximiére. Simulation handoffs include a visible simulation label.

## Run locally

Requires Node 24+. Install the pinned dependencies, run `npm run build`, then `npm start`. The standalone local address is `http://localhost:4327/`. Suite launchers may run `server/index.mjs`; `scripts/serve.mjs` also exports `serve(port, {service, resolveService, storePath})` for tests/integration.

The local server binds to loopback, rejects unexpected hosts/origins and cross-site browser requests, and serves only its built assets/API. SQLite is stored in `.data/runs.sqlite` with WAL journaling. Keep the server running for background work; the browser can close. If the computer/server is off, delays resume once it restarts, rather than executing while offline.

Only one runner may own a database. A crashed process can hold its lease for up to 30 seconds; a second startup during that interval reports the ownership conflict. Recent history includes up to 200 records with unfinished work prioritized. All runnable unfinished records are scanned on recovery, even beyond the history window. At most 50 runs may remain unfinished. Database records are not automatically purged.

Live runs **explicitly use and bill the suite Gateway connection**. Personal browser connection settings do not supply local background credentials. The runner resolves an immutable credential for each operation and stores only its fingerprint; if the suite credential changes, later writing pauses. Keys never appear in graphs, run records or operation records. Existing connection settings are managed through the shared FluxCreate settings UI.

## Limits and spending

Workflows have 2–32 steps, at most 16 model attempts, bounded output-token allowances and an estimated model budget. Each paid attempt reserves a conservative token estimate before calling FluxLab. Unknown/stale prices pause the run. Retrying an uncertain request may charge again and requires an explicit confirmation; its earlier reservation remains counted.

The estimate is not an exact total billing cap: tokenization, provider prices, reasoning charges and infrastructure may differ. Configure a Gateway budget for account-level protection. Live text uses the existing FluxLab service with 12,000-character expanded prompts and 128–4,096 output-token limits. No model calls are made by automated tests.

## Hosted behavior

The current hosted release offers the designer, import/export, browser history and no-charge simulation. It clearly disables live background execution: the suite does not yet have durable cloud application storage for a run/operation ledger and artifact ownership. `server/hosted.mjs` exports `createAgentsService()` with `status`, `validate` and `simulate`; it does not import SQLite.

The local runner is a real local implementation, **not** Vercel Workflow SDK, and no cloud durability is claimed. A future managed Workflow adapter needs a compiled Nitro/Next integration, durable application records, credential references, atomic spending controls, and restart/duplicate-delivery tests. Research: [FluxAgents technology review](../FluxCreate/docs/FLUXAGENTS_RESEARCH.md).

## Deliberate first-release boundaries

No schedules, remote webhooks, arbitrary JavaScript, shell tools, imported executable code, self-directed tool agents, publishing connectors, multiple users, automatic paid retries, media-generation steps or cloud execution yet. The UI edits explicit source connections rather than freely positioned nodes. Each run pins its validated graph; editing the designer affects future runs only.

`npm test` passes 15 checks covering schema/format safety, simulation, HTTP boundaries, restart recovery, approvals, uncertainty, cancellation races, lease ownership and budgets. `npm run test:browser` passes six real Edge workflow groups using an injected unpaid model fixture. `node scripts/recovery-browser-smoke.mjs` passes five additional recovery, blocked-storage and text-handoff groups. Screenshots and reports are in ignored `artifacts/`. No paid model calls were used for verification.
