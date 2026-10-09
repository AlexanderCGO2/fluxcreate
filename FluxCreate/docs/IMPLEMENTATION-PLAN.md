# FluxCreate implementation plan

Prepared 2026-10-09. The user requested a complete per-app gap review and a detailed plan before further feature expansion, followed by a commit, push and deployment of the verified current work. This plan does not mark the future milestones implemented.

## Outcome and boundaries

Build a coherent creative suite with useful professional workflows, reliable editable interchange, selection-aware AI and predictable operating costs. Preserve the modern shared design, current document formats and existing user work. Full parity with Photoshop, InDesign, Premiere Pro, After Effects, Houdini and Blender is a multi-stage product program, not a single release promise.

Use the [app gap index](FEATURE-GAPS.md), each linked app report and the [integration review](INTEGRATION-REVIEW.md) as the scope inventory. No percentage-complete estimate is meaningful until each workflow has a defined acceptance test.

## Release 0 — Preserve and ship the current verified increment

1. Finish the already-started Fluxfoto drag ordering. Verify mouse, touch, keyboard, insertion markers, long-list scrolling, locked layers, cancellation, pixel stacking, one-step undo/redo and reload.
2. Finish bounded PSD export. Preserve separate rendered layers and normal layer properties. Verify actual PSD bytes, independent reader decode, canvas pixels and reimport. Document text/vector/mask rasterization, RGB/8-bit limitations and the canvas-eraser appearance fallback. Native Fluxfoto remains the complete editable backup.
3. Fix FluxAgents local text delivery to editors. Include localhost/loopback source-port tests, actual popup/opener exchange, review and document insertion.
4. Add FluxLab as a text destination with an explicit prompt-draft review. Do not start paid generation from a navigation action.
5. Keep partial embedded-source/MCP foundations clearly labelled. Do not add unfinished placement buttons or advertise the floating helper.
6. Publish the per-app comparisons, integration findings, realtime-audio/desktop assessment and this plan.
7. Run relevant unit/browser tests, the release build and hosted routing checks. Commit/push, deploy with authentication retained, and verify protected production routes.

**Exit:** the deployed increment is usable and reversible; the audit accurately distinguishes implemented, partial and planned work. No paid provider call is needed for this release's automated verification.

## Milestone 1 — Integration contracts and dependable transfers

**Depends on:** Release 0. **Primary code:** FluxCreate/shared, FluxExchange, receiver adapters and tests.

1. Define a versioned capability table for every app, with accepted artifact kinds, editable/preview fidelity, size/duration limits and available operations.
2. Generate Send/Place menus from that table; keep receiver validation authoritative.
3. Define a typed artifact envelope with IDs, source app, content hash, metadata and provenance. Retain backwards-compatible decoding for existing native and Markdown files.
4. Add a persistent outbox/inbox and distinct received/reviewed/applied statuses. Make transfer retries idempotent. Keep exact origin, source-window, nonce and ownership checks.
5. Introduce a document/selection adapter: read current context, validate proposed mutation, preview, commit once, expose revision, and report unsupported capabilities.
6. Add full conversion reports, missing-media diagnostics and explicit Open versus Place language.

**Tests:** source close/reload, receiver reload, duplicate delivery, invalid/expired payload, wrong origin/window, malformed media, locked/deleted selection, changed document and failed insert. Run the same matrix on distinct local ports and hosted app paths.

**Exit:** every enabled route proves actual insertion and one-step undo. Delivery failures never require regenerating an AI result.

## Milestone 2 — Objects from other studios

**Depends on:** selection/mutation and artifact contracts from Milestone 1.

1. Complete the bounded source descriptor and recursive-size checks. Store source identity, original file, selected page/composition/time, fidelity, preview hash and warnings.
2. Build actual renderer adapters for photo artwork, publication pages, motion frames, video frames and supported 3D/procedural scenes. Never use a placeholder as a successful render.
3. Add a shared Place from studio review with file selection, page/frame/time selection, preview and warnings.
4. Integrate Fluxfoto image layers, Fluxiffects footage/scene layers, Fluxini preview planes and Flux3D preview planes. Existing real geometry imports remain a separate higher-fidelity path.
5. Add source badges, Download/Open source, Replace source and Refresh preview. Replacement keeps destination transforms; refresh creates a history entry.
6. Export portable previews while retaining recoverable native source in native projects. Move media into shared asset references as Milestone 4 becomes available.

**Tests:** text/image/mask/transparent/animated/3D fixtures; missing source; nested object limits; source replacement after destination edit; save/reload/undo/duplicate; AI context does not contain embedded source bytes; geometry-versus-preview semantics visible to users.

**Exit:** users can place, see, move and recover objects from other apps in all four requested destinations. Live synchronization remains a later feature until asset versions and identity exist.

## Milestone 3 — Floating AI helper and real pixel operations

**Depends on:** Milestone 1; uses Milestone 2 provenance. **Primary code:** shared floating UI/client, FluxLab MCP dispatcher, authenticated app routes and editor adapters.

1. Implement the actual MCP browser transport through the official SDK. Keep existing stdio MCP App compatibility. Route on the current protected app origin and pass request-scoped credentials.
2. Deliver one floating helper with current-selection name/preview, scope, available actions, prompt, progress/cancel and a review panel. Reuse each editor's validated command application.
3. Capture document/selection revision per request. Disable stale Apply and offer a new proposal. Respect locks, recovery state and pending imports.
4. First actions: explain supported object properties, propose editable changes, generate text/image and insert reviewed output. Keep existing side panels usable during migration.
5. Separately validate image-edit and upscale providers: reference image/mask support, dimension limits, privacy, price basis, accepted output and whether the connected Gateway account exposes the capability. Document unsupported providers and fallback choices. A catalog model name is insufficient proof.
6. Implement reference-image editing/upscaling only after that capability check. Preserve the original as a separate layer/version; allow comparison, replace or insert. Any local resizing is explicitly labelled non-AI.
7. Add request IDs, cancellation and paid-request duplicate protection; large operations use a recoverable job record.

**Tests:** mocked MCP initialization/list/call and error paths, schema bounds, personal/suite-key isolation, context change during generation, cancel/retry, failed media decode, undo, light/dark/mobile keyboard navigation. A provider smoke test is separate from simulation and its actual cost must be recorded.

**Exit:** all four requested apps have a genuinely connected, selection-aware helper. AI upscaling is enabled only when its provider integration actually works.

## Milestone 4 — Assets, document recovery and performance

**Can begin alongside Milestones 2–3 after contracts stabilize.**

1. Add content-addressed asset storage and immutable references; migrate existing embedded documents without discarding originals.
2. Make histories store edit metadata and shared asset references rather than repeatedly serializing large images/geometry.
3. Introduce recent named documents, manual checkpoints, storage usage and export/recovery tools.
4. Define renderer budgets for decoded images, masks, textures, video/audio decoders, thumbnails and temporary canvases. Release replaced/deleted resources.
5. Move expensive parsers and thumbnails into cancellable workers with progress and stale-result checks.
6. Add missing-media/relink and proxy generation. Keep preview resolution separate from full-resolution output.

**Benchmarks:** a 32 MP masked photo; a 100-page publication; 500/2,000-clip timelines; a scene with repeated meshes; embedded animated GLB; large generated-media library. Record actual p50/p95 interaction delay, peak memory, decode/render time, cancellation delay and export correctness before choosing thresholds.

**Exit:** budgets are enforced, leaks do not accumulate across open/delete/relink cycles, and representative interaction improves measurably without reducing export fidelity.

## Milestone 5 — Fluximiére audio, scrubbing and export

**Priority:** exported sound is a P0 functional gap; the audio investigation can start before other app feature expansions. See [AUDIO-DESKTOP-PLAN.md](AUDIO-DESKTOP-PLAN.md).

1. Establish an audio clock, routing/mix bus, clip source ranges, gain/fade/mute/solo semantics and real peak data.
2. Implement decoded audio caching with bounded memory; derive waveforms from actual samples.
3. Add audible timeline scrubbing and jog/shuttle first. Then implement continuous forward/reverse scratch control in an AudioWorklet with smoothing and underrun handling.
4. Keep record-style speed/pitch changes separate from pitch-preserving time stretch. The latter is a separate algorithm and cost.
5. Build offline audio mixing and synchronized video muxing. Replace the current silent export path; add cancel/progress and output recovery.
6. Add deterministic frame export with browser capability detection and an explicitly documented fallback.

**Tests:** single tone, impulse markers, reverse traversal, fast drag, boundary loops, mute/fades, multiple sample rates, stereo/channel handling, 10-minute and long-program sources, UI load, tab visibility and device change. Compare exported timing to known audio/video markers. Human listening on representative hardware is necessary in addition to automated checks.

**Exit:** timeline gestures are audible and stable; video exports contain the expected mix with measured synchronization. Do not promise a universal latency figure before hardware/browser measurements.

## Milestone 6 — Professional editing workflows by app

These can proceed independently once shared mutation and asset contracts are stable. Each slice needs a real user workflow, import/export fidelity checks and recovery tests; do not implement a toolbar of nonfunctional buttons.

| App | First slice | Second slice | Later specialist work |
|---|---|---|---|
| Fluxfoto | Pixel selections, selection-aware masks/fill/copy, layer groups/multiselect | Adjustment layers/levels/curves; clone/heal and selected-layer painting | Smart Objects, vector paths/styles, rich typography, RAW/ICC/16-bit; deeper editable PSD writing |
| FluxDesign | Text runs, threaded frames, overset detection, styles | Master pages, guides/bleed/columns and font diagnostics | Searchable vector PDF/font embedding, print preflight, tables/long-document features |
| Fluximiére | Audio milestone, ripple/roll/slip/snapping and linked AV | Proxies, captions, transitions and sequence diagnostics | Scopes/LUTs, advanced retiming/multicam, richer XML interchange |
| Fluxiffects | Masks/mattes and precompositions | Graph editor, spatial/temporal handles, multi-key edits | Tracking/expressions/advanced effects and richer AE bridge; recoverable render queue |
| Fluxini | Graph search/groups/errors and cancellation | Deterministic simulation caches, reusable groups and budgets | Broader procedural tools/interchange and production render/simulation job controls |
| Flux3D | Hierarchy/multiselect and basic vertex/edge/face editing | UV/textures/material slots, animation authoring | Rigging/modifiers, lighting/environment/render tools and large-scene acceleration |
| FluxLab | Reference images, recipes/variations and trustworthy capabilities | Music provider integration, collection search/thumbs and portable library | Multi-device assets, authenticated remote MCP and richer cost accounting |
| FluxAgents | Branch/condition/multi-input graph and typed output nodes | Durable cloud milestone, schedules/webhooks and connectors | Bounded autonomous agents, team approvals, evaluations and actual-cost reconciliation |

**Exit for each slice:** detailed acceptance criteria from that app's feature-gap report are fulfilled; unsupported original-product behavior stays documented. No generic claim of full native Adobe or BLEND compatibility.

## Milestone 7 — Accounts and reliable hosted automation

**Depends on:** durable artifacts and explicit credential ownership; not on completing every creative tool.

1. Add application identities, workspaces, permissions and a revocable encrypted background-connection vault.
2. Select and pin a durable runtime based on the existing FluxAgents framework research and a failure/recovery prototype. Keep the versioned FluxAgents graph independent of the vendor.
3. Store runs/steps/artifacts in durable services; atomically coordinate run requests/outbox/events; reserve spending and concurrency limits.
4. Implement approvals, cancellation, retries and uncertain-paid-effect review. Never assume replay means exactly-once external effects.
5. Add authenticated schedules/webhooks, signature validation, event deduplication, overlap rules and time zones.
6. Reconcile provider usage with reservations; distinguish provider spend from storage/runtime/tool costs.

**Tests:** crash before/after provider response, deployment mid-run, duplicated event, expired/revoked credential, approval replay, clock/time-zone changes, quota exhaustion, artifact expiration and tenant isolation.

**Exit:** a browser can close and a server can restart without losing a run, losing an approval or silently repeating a billable effect. Only then enable hosted live execution.

## Milestone 8 — Optional desktop acceleration

**Decision depends on measurements from Milestones 4–5.** Reuse the web UI/document contracts. Prototype a local companion or Tauri desktop shell with a narrowly scoped media/compute service for disk caches, decode/proxy creation, long-running exports and selected heavy simulation/render tasks. Fluxini already contains desktop scaffolding worth inspecting before introducing another packaging stack.

Benchmark identical fixtures in browser and prototype. Decide between system WebView and a bundled engine using codec consistency, audio-device behavior, deployment size and maintenance cost. Bundle only licensed, versioned native tools; avoid a general shell-command bridge. Preserve file/asset formats so projects can move between hosted and local editions.

**Exit:** a measured workload improves enough to justify packaging, updates, signing and native dependencies. A desktop wrapper alone is not treated as a performance optimization.

## Progress and release discipline

Keep a milestone checklist with links to tests and files, and a current supported-format matrix. Before each release, rerun the affected behavior and shared integration contracts; broaden testing when shared state or formats change. Record deployed commit, URL, authentication state, tested cases and known limitations. Never update a status to Working because its UI exists or its package builds.

## Parallel visual milestone — Fluxini suite consistency

Follow [DESIGN-CONSISTENCY.md](../../Haidini/docs/DESIGN-CONSISTENCY.md), based on five rendered local apps. Sequence: (1) shared header/app switching while preserving scene-picker behavior, (2) shared neutral light/dark surface and typography tokens with the Fluxini accent, (3) consistent inspector controls, tabs, dialogs and AI panel, (4) graph dock resizing, useful fit zoom and keyboard legibility. Verify 1600/1280 desktop, constrained viewport, both themes, fullscreen, graph selection, history, exports and connection settings. Changes are planned separately from the present review release.
