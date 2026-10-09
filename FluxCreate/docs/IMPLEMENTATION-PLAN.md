# FluxCreate implementation plan

> Working-source update (2026-10-09): the approved batch now includes four-editor source-object controls, durable browser handoff/history, the floating MCP helper, bounded reference edits, Fluxfoto selection masks, Fluxini design alignment, Fluximiére audio/precise export, Fluxiffects real-time audio export and FluxAgents branching. The status notes below identify completed subsets and remaining acceptance work; no full milestone or native-product parity is implied.

Prepared and updated 2026-10-09. The earlier review release published the plan; subsequent authorized implementation is recorded below. Current local verification is distinct from publication. Unfinished milestone items remain the backlog.

## Outcome and boundaries

Build a coherent creative suite with useful professional workflows, reliable editable interchange, selection-aware AI and predictable operating costs. Preserve the modern shared design, current document formats and existing user work. Full parity with Photoshop, InDesign, Premiere Pro, After Effects, Houdini and Blender is a multi-stage product program, not a single release promise.

Use the [app gap index](FEATURE-GAPS.md), each linked app report and the [integration review](INTEGRATION-REVIEW.md) as the scope inventory. No percentage-complete estimate is meaningful until each workflow has a defined acceptance test.

## Release 0 — Earlier published review increment

This increment was delivered before the current implementation batch; its publication record is in [OPTIMIZATIONS.md](OPTIMIZATIONS.md). The original release scope was:

1. Finish the already-started Fluxfoto drag ordering. Verify mouse, touch, keyboard, insertion markers, long-list scrolling, locked layers, cancellation, pixel stacking, one-step undo/redo and reload.
2. Finish bounded PSD export. Preserve separate rendered layers and normal layer properties. Verify actual PSD bytes, independent reader decode, canvas pixels and reimport. Document text/vector/mask rasterization, RGB/8-bit limitations and the canvas-eraser appearance fallback. Native Fluxfoto remains the complete editable backup.
3. Fix FluxAgents local text delivery to editors. Include localhost/loopback source-port tests, actual popup/opener exchange, review and document insertion.
4. Add FluxLab as a text destination with an explicit prompt-draft review. Do not start paid generation from a navigation action.
5. Keep the then-partial embedded-source/MCP foundations clearly labelled. Placement and the floating helper were not part of that earlier release; their verified current subsets are recorded below.
6. Publish the per-app comparisons, integration findings, realtime-audio/desktop assessment and this plan.
7. Run relevant unit/browser tests, the release build and hosted routing checks. Commit/push, deploy with authentication retained, and verify protected production routes.

**Exit:** the deployed increment is usable and reversible; the audit accurately distinguishes implemented, partial and planned work. No paid provider call is needed for this release's automated verification.

## Milestone 1 — Integration contracts and dependable transfers

**Depends on:** Release 0. **Primary code:** FluxCreate/shared, FluxExchange, receiver adapters and tests.

**Implemented subset:** registry-driven destinations, bounded browser IndexedDB inbox/outbox and activity history, persistent review/terminal receipts, reload recovery and atomic cross-tab application claims. Origin/window/nonce checks, document/selection guards and explicit review remain. Browser records are origin-local; a receipt and destination autosave are not one distributed transaction, so interrupted application is not silently replayed. General cloud artifact ownership, universal conversion reports and distributed delivery remain open.

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

**Implemented subset:** shared source-file review, supported page/composition/frame choice, actual bounded renders, placement, original-source download/open, replacement and refresh in Fluxfoto, Fluxiffects, Fluxini and Flux3D. Native save/reload, transforms, undo and stale/cancel checks are covered. These are rendered snapshots with recoverable source; Fluxini source files use Flux Exchange rather than arbitrary native graph evaluation. Live source synchronization, shared asset references and broader native fidelity remain open.

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

**Implemented subset:** All four requested editors mount the official-SDK MCP helper with planner preview/apply, explanation, stale revision/selection rejection and cancellation. Fluxfoto and Fluxiffects also review/insert generated text/images and edit selected embedded image sources; Fluxini reviews/inserts text and image planes and can reference-edit a selected studio plane preview. Flux3D currently supports editable proposals and explanation only. Local and hosted same-origin routes preserve immutable personal connection isolation; removed/expired personal credentials never fall back silently. Documented/live-capable reference-image models use a genuine image-edit request and preserve the original. [Focused evidence](FLOATING-AI-IMPLEMENTATION.md) covers mocks and actual editor adapters. **Still open:** paid provider smoke, mask-guided actions, genuine AI upscale, durable cross-instance paid jobs and reconciled costs; duplicate protection is process-local.

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

**Implemented subset:** exported sound is no longer a blanket gap. Fluximiére has bounded PCM playback, AudioWorklet scrub/scratch and shuttle, real worker-generated waveforms/output meter, offline stereo mixing and deterministic timestamped WebCodecs VP8/VP9 + Opus export, with an explicit real-time compatibility option. Short and ten-minute decoded marker fixtures verify timing. See [AUDIO-ENGINE.md](../../Fluximiere/docs/AUDIO-ENGINE.md) and the original [audio/desktop plan](AUDIO-DESKTOP-PLAN.md).

**Still open:** hardware listening and latency/device/load measurements, chunked long-source/proxy decode, professional routing/loudness/pan, pitch-preserving stretch, MP4 and recoverable native/background exports. Fluxiffects separately includes animated-gain/fade stereo audio in its 60-second/60-fps real-time WebM; deterministic Fluximiére encoding is not claimed for Fluxiffects.

1. Establish an audio clock, routing/mix bus, clip source ranges, gain/fade/mute/solo semantics and real peak data.
2. Implement decoded audio caching with bounded memory; derive waveforms from actual samples.
3. Add audible timeline scrubbing and jog/shuttle first. Then implement continuous forward/reverse scratch control in an AudioWorklet with smoothing and underrun handling.
4. Keep record-style speed/pitch changes separate from pitch-preserving time stretch. The latter is a separate algorithm and cost.
5. Offline audio mixing and synchronized video muxing, progress and cancellation are implemented. Preserve their regression gates; add recoverable queued/background outputs.
6. Deterministic frame export, browser encoder checks and an explicit real-time fallback are implemented; broaden measured codec/source coverage without silently dropping sound.

**Tests:** single tone, impulse markers, reverse traversal, fast drag, boundary loops, mute/fades, multiple sample rates, stereo/channel handling, 10-minute and long-program sources, UI load, tab visibility and device change. Compare exported timing to known audio/video markers. Human listening on representative hardware is necessary in addition to automated checks.

**Exit:** timeline gestures are audible and stable; video exports contain the expected mix with measured synchronization. Do not promise a universal latency figure before hardware/browser measurements.

## Milestone 6 — Professional editing workflows by app

These can proceed independently once shared mutation and asset contracts are stable. Each slice needs a real user workflow, import/export fidelity checks and recovery tests; do not implement a toolbar of nonfunctional buttons.

| App | First slice | Second slice | Later specialist work |
|---|---|---|---|
| Fluxfoto | Rectangle/ellipse/lasso, invert/feather and selection masks implemented; pixel fill/copy, selection algebra and groups/multiselect remain | Adjustment layers/levels/curves; clone/heal and selected-layer painting | Smart Objects, vector paths/styles, rich typography, RAW/ICC/16-bit; deeper editable PSD writing |
| FluxDesign | Text runs, threaded frames, overset detection, styles; bounded vector/searchable standard-font PDF now verified | Master pages, guides/bleed/columns and font diagnostics | Embedded/subset PDF fonts, broader shaping, print preflight, tables/long-document features |
| Fluximiére | Audio/scrub/waveforms/precise WebCodecs export implemented within documented bounds; ripple/roll/slip/snapping and linked AV remain | Proxies, captions, transitions and sequence diagnostics | Scopes/LUTs, advanced retiming/multicam, richer XML interchange |
| Fluxiffects | Bounded real-time stereo export implemented; masks/mattes and precompositions remain | Graph editor, spatial/temporal handles, multi-key edits | Tracking/expressions/advanced effects and richer AE bridge; recoverable render queue |
| Fluxini | Shared design, themes and readable resizable graph dock implemented; richer graph groups/errors and heavy-work cancellation remain | Deterministic simulation caches, reusable groups and budgets | Broader procedural tools/interchange and production render/simulation job controls |
| Flux3D | Hierarchy/multiselect and basic vertex/edge/face editing | UV/textures/material slots, animation authoring | Rigging/modifiers, lighting/environment/render tools and large-scene acceleration |
| FluxLab | Same-origin MCP and bounded reference editing implemented; paid provider verification, mask/upscale and recipes/variations remain | Music provider integration, collection search/thumbs and portable library | Multi-device assets, durable remote AI jobs and richer cost accounting |
| FluxAgents | Text/boolean conditions, branch guards, ordered joins and durable local artifacts implemented; see [scope and checks](../../FluxAgents/docs/BRANCHING.md). Richer typed data and canvas remain | Durable cloud milestone, schedules/webhooks and connectors | Bounded autonomous agents, team approvals, evaluations and actual-cost reconciliation |

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

The first pass in [DESIGN-CONSISTENCY.md](../../Haidini/docs/DESIGN-CONSISTENCY.md) is implemented and locally verified: shared header/app switching with preserved scene picker, persisted neutral light/dark tokens, consistent fields/dialogs/AI panel, and pointer/keyboard graph resizing with readable focus/fit/fullscreen behavior. Checks cover 1600/1280 desktops and the supported 1000 × 720 minimum, both themes, scene-data/revision preservation, graph editing/history, export/cancel and settings. Deeper inspector grouping, object-list sizing refinements, shared modal consolidation and mobile certification remain separate work.

### Verified FluxDesign PDF delivery — 2026-10-09

The initial PDF milestone now retains native vector shapes, searchable compatible Latin text, source-resolution PNG/JPEG images, clipping, rotation, opacity and alignment. Standard PDF face substitutions are disclosed. Unsupported fonts/characters, soft hyphens and extreme tracking use a reported whole-page visual fallback; SVG/WebP and JPEG orientation/profile conversion have image-specific notices. The export dialog keeps a downloadable report and offers an all-image proof. Existing editing/import regressions and independent PDF.js extraction/render comparison passed; native document bytes/properties remain unaffected by exports. Font embedding/subsetting, broader shaping, tags/reading order, export cancellation, page ranges and production color/PDF-X remain future work.

PDF color fidelity: PNG files carrying ICC, gamma/chromaticity, orientation or animation metadata are normalized through the browser to RGB PNG with an explicit conversion notice; ordinary profile-free/sRGB PNG stays directly embedded. An independent Adobe RGB PNG fixture exposed and verified this correction.
