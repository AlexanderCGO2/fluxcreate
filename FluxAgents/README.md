# FluxAgents

A visual workflow studio for FluxCreate. Build editable flows, test them without model calls, and run real background text workflows on your own computer.

## What works

- An Apple-inspired light/dark designer, typed step inspector, templates, source connections, undo/redo, draft autosave and protected recovery.
- Input, Gateway text generation, deterministic text transformations, text conditions, guarded true/false branches, ordered joins, approval, delay and output nodes. Graphs are bounded and acyclic; text inputs and boolean condition ports are validated. The Route a request template is a complete branching workflow with no model calls. See [conditional workflows and typed results](docs/BRANCHING.md).
- Portable `.fluxagent.json` and `.fluxagent.md` files. Markdown has one authoritative `flux-agent` JSON block. Imported files remain inactive. Credentials and run histories are never included in graph exports.
- Deterministic, visibly labeled simulation. It calls no AI model, previews reviews/delays and records decisions, skipped branches and typed text/boolean results in browser history. Conditions on simulated model text do not predict live model routing.
- Real local background runs, SQLite run/operation ledger, persisted decisions/skips, versioned step artifacts, approval pauses and delay deadlines, cancellation and restart recovery. Successful writing results are reused after restart. A crash or failed request with an uncertain model outcome pauses for explicit retry; retries keep prior reservations and call counts.
- Downloadable run records/text, and editable-text handoff to FluxDesign, Fluxfoto, Fluxiffects, Fluximiére and FluxLab prompt review. Simulation handoffs include a visible simulation label.

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

`npm test` passes 29 checks covering schema/format safety, simulation, HTTP boundaries, restart recovery, approvals, uncertainty, cancellation races, lease ownership and budgets. `npm run test:browser` passes six real Edge workflow groups using an injected unpaid model fixture. `node scripts/recovery-browser-smoke.mjs` passes five additional recovery, blocked-storage and text-handoff groups. `node scripts/branching-browser.mjs` passes six additional condition, join, branch, typed-output and live approval/reload groups. Screenshots and reports are in ignored `artifacts/`. No paid model calls were used for verification.

## Interrupted start requests

The browser atomically saves an unresolved start record before posting a live run: the unique request ID, validated frozen graph, suite billing choice, timestamp and local database identity. Browser storage failure prevents submission. Only one unresolved start can occupy this browser workspace at a time, including across tabs. Designer edits stay separate from the saved request.

Reload performs a read-only request-ID lookup. A confirmed run must match the saved ID and graph before the record is cleared; it opens the original pinned run without another model call. If no run is recorded yet, the app retains the intent and offers a fresh explicit approval to retry the same ID and snapshot. Lookup failures, expired sessions and changed local databases do not trigger automatic POSTs. Records older than seven days or with a clock more than five minutes in the future can be checked but cannot be resubmitted through the UI. An explicit acknowledged removal is available after reviewing history; removing a record does not cancel a run and a later new start could bill again. Download the record before discarding important recovery information.

The SQLite database stores a stable, non-secret runner identity. `GET /api/start-intents/:requestId?runnerId=...` verifies that identity and returns only the existing run or null; it performs no provider calls. New browser POSTs also require the matching identity. Legacy local API clients may omit `runnerId` and retain existing request-ID/graph deduplication; supplied mismatches always reject. This is local recovery, not a distributed exactly-once guarantee or cloud execution. Restoring the original database preserves its identity.

`node scripts/start-recovery-browser-smoke.mjs` adds eight browser groups: accepted POST with lost response, expired lookup session, two-tab blocking, reload lookup without duplicate work, frozen snapshot retry, expired records, database mismatch and browser quota failure. `artifacts/start-recovery/report.json` records the mocked requests; only one injected model call occurs across the lost-response/reload scenario. The two added unit/API checks cover format bounds and lookup after restart with unavailable credentials. All checks use local injected services, with no paid calls.

Independent review correction: refreshing a saved start clears all prior approval/removal acknowledgments; retry re-reads and compares the complete saved record before POST. The two-tab A→B replacement regression and an unrefreshed stale retry both pass without a new submission.

## Named local workflow library — 2026-10-09

Saved workflows now use a separate IndexedDB database, independent of the autosaved draft, simulation history and unresolved-start record. Up to 30 entries each hold 20 immutable graph versions, bounded to 256 KB of validated UTF-8 JSON per version. Listing reads only metadata. Save as new creates a stable new ID; Save draft as new version appends atomically. Duplicate copies the selected saved version into a new entry. Library labels can be renamed independently; the immutable graph titles remain exactly as saved. Updates, rename and confirmed deletion compare the selected metadata revision. Stale or deleted entries require an explicit current-record selection; quota failures roll back metadata and graph writes together.

Open saved version replaces only the editable design and adds one undo step. A changed design during an asynchronous read rejects the open. Existing active run graphs, waiting approvals and unresolved start identities remain unchanged. No save, open, duplicate, rename, removal or restoration starts a run or submits a model request. Confirmed removal deletes only that library entry and its saved versions; draft/run/start records stay intact. Malformed or unsupported records are preserved and rejected, never silently repaired. Browser data is local to its origin and is not cloud backup. Export important versions individually before clearing browser data or removing them.

Build, 29 unit/API checks, six editor groups, five draft-recovery groups, six branching groups, eight start-recovery groups and ten new library browser groups pass with injected services and no paid calls. Run `node scripts/library-browser-smoke.mjs`; evidence is in `artifacts/library-browser/report.json`. The new groups verify immutable versions, old-version undo, rename/duplicate identity, cross-tab stale/deleted entry rejection, quota rollback, delayed-open guards, exact run/start snapshots, capacity/corruption limits and mobile layout. Library-wide archives, folders/tags, visual diffs, version branching, richer monitoring, structured data/media/tools and durable hosted execution remain open.
