# FluxAgents feature gaps and implementation plan

Source audit: 2026-10-09. The comparison target is a reliable visual workflow builder with optional bounded AI agents, not one specific product. FluxAgents currently provides a useful local text-workflow foundation. It is not yet a full cloud automation platform or a self-directed tool agent.

**Working** means an implemented path exists, subject to the stated limits. **Partial** means the category has a useful subset. **Missing** means no usable implementation was found. **In progress** must pass its release checks before being counted as working. Priorities separate practical next steps from optional platform expansion.

## Current baseline

The editor supports input, text-generation, deterministic text transformation, text conditions, true/false branch guards, ordered joins, approval, delay and output steps. Version-2 graphs validate text inputs and boolean decisions; version-1 graphs remain readable. Joins collect active inputs or require every selected input. Execution remains sequential and acyclic. See the implemented [branching slice](BRANCHING.md) for contracts and verification.

Live local runs use a SQLite operation ledger, persisted delays and approvals, a single-runner lease, conservative spending reservations and explicit retry for uncertain paid calls. Closing the browser does not stop the local server. Turning off that server or computer does. The hosted application currently supports designing, validating, importing/exporting and simulating workflows; live cloud execution is deliberately disabled.

## Feature inventory

| Area | Current state | Missing or restricted behavior | Priority |
| --- | --- | --- | --- |
| Visual workflow editor | Partial | Typed step cards, inspector, source selection and undo/redo. No free-position canvas, draggable connection ports, pan/zoom, minimap, multi-select, groups, alignment or collapsed subflows. | P1 |
| Graph structure | Partial | Acyclic graph, one input, multiple outputs, true/false condition guards and 2–8-source text joins. No switch node, bounded loops, parallel execution or general multi-type port wiring. | P1 |
| Data model | Partial | Bounded typed text/boolean values, versioned per-step artifacts with provenance, and prompt interpolation. No typed JSON schemas, file/media ports, arrays/maps, binary artifacts or expression builder. | P1 |
| Text generation | Working / partial | Live Gateway model choice and output-token limit. No streamed step output, structured-output schema, tool calls, multimodal input or model-specific generation settings. | P1 |
| Transformations | Partial | Trim, case changes, prefix and suffix. No field mapping, parsing, format conversion, safe expressions, validation nodes or collection processing. | P1 |
| Human review | Partial | Persisted approval pause, correct-node approval and explicit continuation. No edited approval output, rejection branch, reviewer assignment, comments, escalation or expiry policy. | P1 |
| Delays | Working / partial | Persisted deadlines resume after local restart. No calendar/date timezone scheduling, business hours, recurring cron or overlap policy. | P2 |
| Local background execution | Working / bounded | SQLite run/operation records, one runner lease, restart recovery and retained successful outputs. Not a distributed worker system; machine/server downtime pauses work. | Preserve |
| Hosted execution | Missing | Hosted studio is design/simulation only. No durable cloud run ledger, worker/runtime adapter, artifact ownership or background account credential store. | P1 platform gate |
| Retry and uncertainty | Working / partial | A possibly charged request pauses for explicit acknowledged retry; previous attempts remain counted. No general deterministic retry/backoff policy, connector-specific idempotency or automated reconciliation of uncertain provider results. | P1 |
| Cancellation | Working / bounded | Stops future steps, propagates abort and rejects late state writes. It cannot promise cancellation or refund of already accepted provider work. No compensating actions for future external side effects. | Preserve / P2 |
| Concurrency and queues | Partial | Single owner and sequential execution with bounded unfinished runs. No tenant fairness, priority queues, bounded parallel branches, concurrency groups or horizontal workers. | P2 |
| Budgets | Partial | Pre-call conservative reservations, step/model-attempt/token limits and stale-price rejection. No exact charge reconciliation, infrastructure costs, per-team quotas or spend forecasting across schedules. | P1 |
| Credentials | Partial | Live local runs explicitly bill the suite connection; only credential fingerprints are persisted. Personal browser keys are not background-run credentials. No revocable account vault, per-workflow provider identity, OAuth connector accounts or scoped secret references. | P1 platform gate |
| Workflow library | Partial | One protected browser draft plus a named browser library with 30 stable entries, 20 immutable versions per entry, explicit save/open/duplicate/rename/remove and transactional version checks. Read-only field/connection comparison is implemented. No folders/tags, graph-overlay diff, version branching, cloud ownership or publish/activate lifecycle. | P1 |
| Run snapshots and portability | Working / partial | Each run pins its validated graph; JSON/text audit downloads and inactive portable workflow imports exist. No resumable cross-machine run package, migration tooling or artifact-inclusive backup. | P2 |
| Start request recovery | Working / bounded | Atomic browser intent records pin request ID, graph, billing and stable local database identity before POST. Reload only looks up an existing run; a missing result requires fresh approval to retry the same ID/snapshot. Storage/lookup failures retain recovery; expired records cannot replay. Explicit removal does not cancel prior work. No cross-machine or distributed exactly-once guarantee. | Preserve |
| Run monitoring | Partial | Status, step output, token/estimate totals and bounded event history. No streaming trace, step-duration breakdown, searchable full history, log retention settings, alerts or stuck-run dashboard. | P1 |
| Simulation | Working / bounded | Clearly labelled, deterministic, no-charge preview of branches, joins, reviews and delays. Conditions evaluate simulated model placeholders and do not predict live model routes, real timing, cost or tool effects. | Preserve |
| Testing and evaluation | Partial | Automated schema/runner/API/browser regressions exist. No in-product assertions, fixture inputs, golden outputs, eval datasets, regression scorecards or model comparison reports. | P1/P2 |
| Suite outputs | Working / partial | Reviewed text handoff to FluxFoto, FluxDesign, FluxMotion, FluxVideo and FluxLab, plus downloads, with simulations visibly labelled. Real local origins and all five destinations passed browser checks. No project-reference inputs, binary/media output nodes, linked updates or source-to-result lineage. | P1/P2 |
| FluxLab destination | Working | A reviewed output-to-prompt route accepts editable text without automatically generating or billing. Long text can be shortened before applying; the original run output remains in FluxAgents. | Preserve |
| Media generation | Missing | No image, speech, music or video nodes. FluxLab support does not automatically provide workflow artifact persistence or resumable media nodes. | P2 |
| Tools and connectors | Missing | No HTTP connector, MCP client/node, database connector, email/publishing action, web search, retrieval or file tool. Existing suite MCP capabilities are not wired into this runner. | P2 |
| Autonomous agents | Missing | No model-driven tool loop, agent delegation, planning/replanning, long-term memory or bounded agent runtime. The existing writing step calls a model once. | P2/P3 |
| Triggers | Missing | Runs start explicitly. No webhook, schedule, event subscription, watched folder or remote authenticated launch endpoint. | P2 |
| Collaboration and administration | Missing | No cloud accounts, team roles, shared workflows, assigned approvals, organization audit trail, tenant quotas or administration UI. | P3 |

## Existing constraints are deliberate, not defects to remove blindly

- Graphs contain 2–32 steps, at most 16 configured model attempts, and bounded text and prompt sizes. Increasing limits requires memory, cost and failure tests.
- Imports remain inactive. A workflow file never grants permission to run tools, read files or spend money.
- The runner records an operation before a paid call. An interrupted or ambiguous call is not automatically repeated. A future connector must preserve this property for its own side effects.
- A run keeps the graph snapshot it started with. Editing the designer must not silently change a waiting or executing run.
- An estimated model budget is not an exact invoice cap. Tokenization, provider charging and infrastructure can differ; current conservative reservations are intentionally retained across uncertain retries.
- The local service is a single-user loopback service. Its origin protections are not a multi-user cloud authorization model.
- A workflow SDK, agent library or queue package alone does not supply workflow ownership, artifact storage, secret revocation, billing controls or product-level recovery.

## Detailed implementation plan

### Phase 0 — verify the current release boundary

The FluxLab destination and reviewed handoff correction are implemented and verified across five destinations. Preserve the existing local/hosted distinction in every start button and status message. Keep the handoff, approval, lease, uncertainty and cancellation regression suites as release gates.

Regression gate: the real-origin five-destination test already demonstrates labelled simulation transfer and reviewed insertion. Keep existing fixture-run and shared receiver tests; expand hosted route, unsaved destination and cancellation coverage as integrations grow. No hosted action can start a temporary in-memory imitation of a durable run. Repeated approval or a wrong node ID cannot advance the workflow twice.

### Phase 1 — make workflows reusable and inspectable

Implemented: a bounded named workflow library with stable IDs, explicit save-as/duplicate, immutable versions and metadata revision checks. A readable change view remains open. Implemented: unresolved start intents persist before submission, and reload performs read-only recovery of the same request. Preserve this boundary while expanding the library. Add a useful run monitor with current step, wait reason, duration, attempt history and explicit retry consequences. Keep draft recovery and failed-import preservation.

Acceptance: refresh during submission finds the existing run without billing twice; renaming or editing a draft does not alter a pinned run; storage failure keeps the original draft; duplicate IDs have explicit conflict handling. A user can distinguish an approval wait, delay, credential pause, budget stop, provider uncertainty and terminal failure without reading raw logs.

### Phase 2 — grow the graph without sacrificing validation

The initial version-2 text/boolean ports, deterministic conditions and guarded joins are implemented and tested; decisions, skips and artifacts survive local restart. Next extend this bounded type model with safe mappings and richer value schemas. Separate canvas layout metadata from executable semantics. Add draggable nodes/connections, keyboard connection editing and accessible list navigation. Add approval rejection and optional reviewed output edits with an audit record. Add parallel execution only after join and accounting semantics are defined.

Acceptance: imports migrate or fail with a specific report; malformed data cannot traverse incompatible ports; skipped branches do not spend tokens; a join waits only for its defined inputs; loops remain rejected until a bounded loop type exists. Undo preserves graph and layout coherently. Old workflow exports still open, and an in-flight run retains its original version.

### Phase 3 — establish durable hosted execution

Choose the runtime adapter using the existing technology research, then build the product foundations: authenticated ownership, durable run/operation records, private artifact storage, revocable credential references and atomic reservation/start coordination. Wire the chosen runtime's compiled deployment and lifecycle; do not relabel the SQLite implementation as a hosted workflow engine. Keep local execution available.

Acceptance: test process loss before submission, after provider acceptance, after output persistence and during approval/delay; duplicate deliveries and concurrent workers must not duplicate paid calls or effects. Test tenant isolation, credential revocation, version pinning, server redeploy, long waits, quota enforcement and deletion/export. Unknown outcomes must remain reviewable. Only then enable live hosted execution in the UI.

### Phase 4 — introduce trusted tools and triggers

Start with a small allowlisted MCP/tool adapter and the existing FluxLab services. Tools declare their input/output schema, side effects, cost behavior, permission scope, timeout and idempotency support. Add preview/approval before consequential external actions. Add schedules and authenticated webhooks only after durable execution exists, including duplicate-event and overlap policy.

Acceptance: untrusted content cannot expand tool permissions; a retry cannot silently repeat a publishing or sending action; denied tools fail before execution; revoked credentials stop the next operation. Replayed webhooks resolve to the same request where appropriate. Calendar triggers have tested timezone and daylight-saving behavior. Do not introduce arbitrary JavaScript or shell execution as a shortcut.

### Phase 5 — add media nodes and complete suite interoperability

Use durable artifact references rather than copying base64 media into every run event. Add image and speech nodes with bounded decoded outputs, then video nodes that persist the existing provider job ticket and resume status checks instead of resubmitting. Add project/selection references only with explicit context capture and reviewed application. Music remains dependent on a real configured provider in FluxLab.

Acceptance: provider URLs expiring after a completed run do not remove stored outputs; interrupted downloads retry without rebilling; each artifact has an owner, byte limit and retention policy. Audio/video previews and handoff work after reload. Editor changes invalidate stale proposals, and originals remain recoverable.

### Phase 6 — add measurable, bounded autonomy

Build evaluation fixtures, assertions, trace inspection and cost reconciliation before offering autonomous tool agents. If the selected runtime supports model-driven loops, expose explicit tool/call/time/spend limits, durable checkpoints and approval boundaries. Add subflows and reusable agent presets only after their version and failure semantics are clear.

Acceptance: a fixed test set measures task success and cost; repeated tool errors terminate within limits; injected hostile content cannot grant a tool; interrupted tool loops resume safely; all external effects can be attributed to a run and attempt. The UI distinguishes simulation, a deterministic workflow and an autonomous agent.

## Priority recommendation

For immediate user value, retain the verified handoff and extend the implemented workflow library with readable diffs, restart-visible run monitoring and richer graph editing. In parallel, decide whether hosted unattended execution is essential: if it is, authenticated durable storage and credential ownership are mandatory before schedules, external tools or media automation. A complex agent framework should not precede those requirements.

## Evidence and verification scope

Primary source: [graph validation and simulation](../src/model.mjs), [editor](../src/main.jsx), [browser storage](../src/storage.mjs), [local execution engine](../server/engine.mjs), [SQLite store](../server/store.mjs), [hosted boundary](../server/hosted.mjs), [runner tests](../tests/runner.test.mjs), [API tests](../tests/api.test.mjs), [core tests](../tests/core.test.mjs), [browser harness](../scripts/browser-smoke.mjs) and [recovery harness](../scripts/recovery-browser-smoke.mjs). See also [README](../README.md), [optimization status](OPTIMIZATIONS.md) and the suite's [framework/runtime research](../../FluxCreate/docs/FLUXAGENTS_RESEARCH.md).

This document records the source audit, the explicitly implemented branching slice linked above, and durable browser start recovery. Missing features remain missing; no managed runtime was deployed and no paid model/provider trial was performed.

## Completed local start-recovery increment — 2026-10-09

Build, 29 unit/API checks, six standard browser groups, five draft-recovery groups, six branching groups and eight new start-recovery groups pass. Accepted-but-lost responses, lookup authentication failure, reload, frozen-graph recovery, cross-tab blocking, expired records, changed SQLite identity and pre-submit storage failure are covered without paid calls. No automatic resubmission or hosted live execution was added. Version diffs and branching, richer run monitoring, edited/rejected approvals, structured data, tools/media and durable hosted execution remain open.

Independent review correction: refreshing a saved start clears all prior approval/removal acknowledgments; retry re-reads and compares the complete saved record before POST. The two-tab A→B replacement regression and an unrefreshed stale retry both pass without a new submission.

## Named local workflow library — 2026-10-09

Saved workflows now use a separate IndexedDB database, independent of the autosaved draft, simulation history and unresolved-start record. Up to 30 entries each hold 20 immutable graph versions, bounded to 256 KB of validated UTF-8 JSON per version. Listing reads only metadata. Save as new creates a stable new ID; Save draft as new version appends atomically. Duplicate copies the selected saved version into a new entry. Library labels can be renamed independently; the immutable graph titles remain exactly as saved. Updates, rename and confirmed deletion compare the selected metadata revision. Stale or deleted entries require an explicit current-record selection; quota failures roll back metadata and graph writes together.

Open saved version replaces only the editable design and adds one undo step. A changed design during an asynchronous read rejects the open. Existing active run graphs, waiting approvals and unresolved start identities remain unchanged. No save, open, duplicate, rename, removal or restoration starts a run or submits a model request. Confirmed removal deletes only that library entry and its saved versions; draft/run/start records stay intact. Malformed or unsupported records are preserved and rejected, never silently repaired. Browser data is local to its origin and is not cloud backup. Export important versions individually before clearing browser data or removing them.

Build, 29 unit/API checks, six editor groups, five draft-recovery groups, six branching groups, eight start-recovery groups and ten new library browser groups pass with injected services and no paid calls. Run `node scripts/library-browser-smoke.mjs`; evidence is in `artifacts/library-browser/report.json`. The new groups verify immutable versions, old-version undo, rename/duplicate identity, cross-tab stale/deleted entry rejection, quota rollback, delayed-open guards, exact run/start snapshots, capacity/corruption limits and mobile layout. Library-wide archives, folders/tags, visual diffs, version branching, richer monitoring, structured data/media/tools and durable hosted execution remain open.


## Saved-version comparison — 2026-10-11

The named workflow library now compares a selected immutable version with the current draft snapshot or the latest saved version. A floating read-only panel shows workflow settings, added/removed/changed steps, full prompts/model settings/approval messages/conditions, and ordered input/branch connections. Stable node IDs distinguish edits from additions; nonsemantic ordering does not create noise. Version pairs and their revision guard are read in one IndexedDB transaction.

Compare never opens a version, saves a graph, starts a run or changes approvals. Current draft changes mark the displayed snapshot stale; a delayed read cannot claim it is current. Refresh is explicit. Closing or switching versions cancels late presentation; Escape closes and restores focus. Missing/corrupt records and storage read failures remain visible errors while preserving the draft. Text is rendered as text, not markup. Existing 32-step/256 KB graph bounds remain.

Verification: 33 unit/API tests, eight new comparison browser groups and ten existing library groups pass; build passes. New checks cover no writes/POSTs, exact prompt/model/budget changes, draft changes during review/read, close during pending read, storage retry, missing versions, focus and both themes/mobile. Browser evidence is in artifacts/version-compare/report.json; run node scripts/version-compare-browser-smoke.mjs. Library changes do not alter pinned runs or unresolved starts. No paid provider calls were made.

Still open: visual graph overlay, arbitrary saved-version pairs, text intraline highlighting, automatic merge, version branching, library archives/folders/tags, cloud ownership and durable hosted execution.
