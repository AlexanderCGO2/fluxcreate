# FluxCreate optimization audit

Current source-audited follow-up (2026-10-09): [per-app missing features](FEATURE-GAPS.md), [integration review](INTEGRATION-REVIEW.md), [detailed implementation plan](IMPLEMENTATION-PLAN.md), and [realtime audio / desktop assessment](AUDIO-DESKTOP-PLAN.md). These distinguish partial foundations from finished workflows and correct stale status labels below.

Updated 2026-10-09. **Building** identifies the first implementation round; **Next** is the prioritized backlog, not a shipped feature. **Verified** requires actual editing, undo, save/reopen and rendering checks. Each studio’s detailed docs record findings and evidence. Tables below include the current verified subsets; the [release record](RELEASE-2026-10-09.md) confirms their publication. Older dated sections retain historical results.

## Shared foundation

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Atomic imports: malformed or excessive files leave the current document unchanged; unsupported content produces useful notices | Building |
| P0 | Reliable autosave: aborted IndexedDB transactions reject and handles close; Flux3D recovery pauses writes | Verified |
| P0 | Adobe interoperability: real supported PSD/PSB, IDML, PDF-compatible AI/PDF and Premiere/FCP XML decoding | Verified |
| P0 | Full-suite repository: all ten sibling projects versioned, with no credentials, user media caches or runtime data | Verified |
| P0 | Hosted routing: direct app URLs, app switching, APIs, workers, fonts and downloads work on one Vercel origin | Verified |
| P0 | Durable Fluxini cloud storage: replace dependence on a local SQLite file; never present temporary function storage as persistence | Verified |
| P0 | Protected cloud AI: authenticate access before using the shared Gateway key; keep credentials server-side | Verified |
| P0 | General settings: private browser-scoped Gateway credentials, free connection checks, request isolation and shared studio access | Implemented · isolation tests and nine-workspace browser checks pass |
| P1 | AI preview performance: typing a prompt does not rehash large media or rebuild unchanged previews; stale proposals still reject | Verified |
| P1 | Progress/cancellation: lengthy imports and renders report progress and cannot commit partially after cancellation | Building in importers |
| P1 | Recovery quarantine: Fluxfoto, FluxDesign, Fluximiére and Fluxiffects preserve invalid/unreadable autosaves and resume saving only after explicit New or successful project opening | Verified |
| P1 | Shared asset library: content-addressed assets, missing-media detection and explicit relink across editors | Next |
| P1 | Named documents and recovery checkpoints: multiple recent files, timestamps and storage-usage visibility | Next |
| P1 | Accessibility: keyboard workflows, focus-restoring dialogs, readable controls and consistent shortcuts | Next |
| P1 | Source objects: render/review/place, page/frame choice, retain/download source, replace and refresh in Fluxfoto/Fluxiffects/Fluxini/Flux3D | Implemented · bounded snapshots, native undo/reload and stale guards verified; live linking remains next |
| P1 | Browser handoff inbox/outbox/history: recover review after reload and reject duplicate application claims | Implemented · bounded origin-local IndexedDB and cross-tab claim checks; distributed exactly-once is not claimed |
| P1 | Floating selection-aware AI through actual MCP with review/apply, cancel and isolated credentials | Implemented · four editor adapters and official SDK routes verified with mocked providers; paid smoke/upscale/durable remote jobs remain open |

## Fluxfoto — photographs and layered artwork

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Real-photo editing: JPEG/PNG/WebP originals survive transforms, adjustments, save and export | Verified |
| P0 | Nondestructive layer masks: hide/reveal painting, disable/remove, undo and reopening preserve original pixels | Verified |
| P0 | Photoshop layers: supported PSD/PSB offsets, order, visibility, opacity, common blends and masks import correctly | Verified |
| P1 | Rounded rectangles: visible radius control with matching canvas, saved model and export | Verified |
| P1 | Targeted brushes: selected content or mask is the explicit target; locked layers stay protected | Verified |
| P1 | Large-photo memory limits: inspect dimensions before decoding; bound aggregate layer pixels and reusable previews | Verified |
| P1 | Selection tools: rectangle/ellipse/lasso, inversion/feathering and selection-to-mask | Implemented · pixels, undo/reload, source preservation and cancellation verified; copy/fill/selection algebra remain next |
| P1 | Adjustment layers: editable levels, curves and white balance with defined scope | Next |
| P2 | Retouching and advanced embedded editing: healing/clone and native Smart Object semantics | Next · bounded source snapshots with recovery/refresh are implemented, not Photoshop Smart Object parity |
| P2 | Color management: ICC, 16-bit editing and proofing; report unsupported modes | Next |

## FluxDesign — pages and publishing

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | IDML import: editable pages, text frames and supported graphics; missing links are reported | Verified |
| P0 | PDF/Illustrator import: correct multipage dimensions and honest rasterized-page output | Verified |
| P1 | Linked-image recovery: visible placeholders and relink controls preserve frame geometry | Verified |
| P1 | Import limits: bounded ZIP/XML/PDF parsing, no external fetches, cancellation and atomic failure | Verified |
| P1 | Text threading: visible overset text and linked frames with stable reading order | Next |
| P1 | Master pages and styles: reusable page templates, paragraph and character styles | Next |
| P1 | Precision layout: bleed, margins, columns, baseline grids, alignment and distribution | Next |
| P1 | PDF output: vector shapes, searchable standard-font text, native compatible images, clipping/rotation/opacity, explicit fallback and per-page export report | Verified bounded subset |
| P2 | PDF font embedding/subsetting, broader glyph shaping, page-range/resolution choices and export cancellation | Next |
| P2 | Print preflight: missing fonts/images, resolution, bleed and color-space checks | Next |

## Fluximiére — video editing

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Premiere project import: supported sequence timing, source offsets and offline references; clear feature limits | Verified |
| P0 | Premiere-exported Final Cut XML: preserve timebase, clip bounds and source references | Verified |
| P0 | Offline footage: editable placeholders and relinking without changing timing | Verified |
| P1 | Track conversion: support or report extra source tracks; never silently merge overlapping footage | Verified |
| P1 | Audio output: stereo PCM mix respects source trims, speed, gain/mute/fades and rejects invalid sound | Implemented and decoded-output verified · [engine limits/evidence](../../Fluximiere/docs/AUDIO-ENGINE.md) |
| P1 | Deterministic frame/audio export: timestamped WebCodecs VP8/VP9 + Opus; explicit real-time fallback | Implemented · short and ten-minute marker fixtures verified; browser codec limits, MP4 and recoverable background jobs remain |
| P1 | Audible scrub/scratch: AudioWorklet clock, signed traversal, smoothing and release/cancel silence | Implemented · hardware latency/listening and sustained-load certification remain open |
| P1 | Timeline tools: ripple, roll, slip and snapping with atomic undo | Next |
| P1 | Proxy media and thumbnails: responsive large-footage preview while originals remain export sources | Next |
| P1 | Audio waveforms/meters: real worker-generated source peaks and generated-output level | Implemented · bounded PCM cache; source proxies, professional meters and channel routing remain next |
| P2 | Captions/transitions: editable subtitles, standard caption interchange and bounded transitions | Next |
| P2 | Color grading: scopes, nondestructive correction and validated LUTs | Next |

## Fluxiffects — motion and compositing

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Async import safety: changing project or composition while loading cannot change the wrong document | Verified |
| P1 | Large-scene efficiency: media/geometry reuse and bounded history without weakening stale-source detection | Building |
| P1 | Discoverable 3D workflow: clips, camera controls, keyframes and an editable sample | Verified in previous round |
| P1 | Deterministic 3D output: rewind, trim, looping, skin/morph and embedded cameras agree in preview and export | Verified in previous round |
| P1 | Adobe layered artwork: import supported Fluxfoto PSD conversion with clear cross-editor limits | Building |
| P1 | Masks/mattes: editable mask paths, feathering and layer alpha/luma mattes with export parity | Next |
| P1 | Precompositions: nested compositions with independent timelines and predictable transforms | Next |
| P1 | Curve editing: spatial/temporal Bézier handles and multi-key editing | Next |
| P1 | Audio-inclusive WebM: source timing, gain keyframes/fades, stereo mix and explicit silent option | Implemented · decoded audio/video fixture verified; 60-second/60-fps real-time limit and hidden-tab cancellation apply |
| P2 | Deterministic export and render queue: accurate frame timing, queued compositions and recoverable outputs | Next · current Fluxiffects output remains real-time; see [audio scope](../../Fluxiffects/docs/AUDIO-EXPORT.md) |
| P2 | AE bridge coverage: more supported properties without claiming native AEP or arbitrary plugin compatibility | Next |

## Flux3D — scene design

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Recovery errors: invalid autosaves produce recovery guidance and cannot be silently overwritten by a demo | Verified |
| P1 | Import lifecycle: reject oversized models before reading and reject completion after switching scenes | Verified |
| P1 | Cheap mesh duplication: immutable geometry is shared while transforms and materials stay independent | Verified |
| P1 | Numeric editing: natural typing, sensible ranges and grouped history for slider gestures | Next |
| P1 | Native animation authoring: object/camera tracks, timeline and GLB animation output | Next |
| P1 | Hierarchy/multi-selection: parenting, grouping, local/world transforms and batch operations | Next |
| P1 | Textures/materials: UV maps, texture slots and portable asset persistence | Next |
| P2 | Mesh tools: vertex/edge/face editing, normals and basic modifiers with undo | Next |
| P2 | Lighting/render controls: editable lights/environment, transparent output and quality presets | Next |
| P2 | Performance diagnostics: visible geometry/texture budgets, instancing and LOD | Next |

## Fluxini — procedural scenes and simulation

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Hosted project storage: CRUD, history, fonts and preferences without an ephemeral server filesystem | Verified |
| P0 | Hosted workers/assets: simulations and fonts load under the editor's URL prefix | Verified |
| P1 | Simulation budgets: predictable particle/cloth/fluid limits, reusable buffers and measured frame timing | Existing baseline; expand next |
| P1 | Heavy-work cancellation: obsolete simulation or AI results cannot replace newer work | Partial · floating AI and source placement reject stale/cancelled work; production simulation/render cancellation remains next |
| P1 | Suite design: shared header/scene slot, neutral persisted themes, consistent fields and resizable readable graph dock | Implemented · desktop visual/data-preservation checks verified; deeper grouping/mobile remain open |
| P1 | Node graph usability: search, grouping, readable errors, frame selection and connection affordances | Partial · readable selection focus, fit/fullscreen and keyboard dock sizing verified; richer graph authoring remains next |
| P1 | Playback cache: deterministic cached playback with clear invalidation and memory controls | Next |
| P1 | Exchange fidelity: stable source snapshots and explicit 2D/3D approximations | Existing baseline; expand next |
| P2 | Reusable node assets: parameterized saved groups and per-project libraries | Next |
| P2 | Job queue: visible progress, cancellation and recoverable long-running render/simulation outputs | Next |

## FluxLab — shared AI content studio

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Shared Gateway credential remains server-only; live model discovery advertises supported text/image/video/speech capabilities | Verified |
| P0 | Cancel, timeout and upstream failures preserve the previous result; bounded image/JSON memory | Verified |
| P0 | Durable result library commits before reporting saved; duplicate IDs cannot overwrite another result | Verified |
| P1 | Text/image handoffs preview before adding into Fluxfoto, FluxDesign, Fluximiére and Fluxiffects | Verified |
| P1 | Video/audio handoffs retain original media, preview before Add, and persist in Fluximiére/Fluxiffects | Verified |
| P1 | Genuine MCP App with official tools, UI resource and external stdio transport | Verified |
| P1 | Bounded reference-image editing through documented/live-capable Gateway models | Implemented · real images/edits adapter and original/result review tested with fixtures; paid provider smoke and mask/upscale remain open |
| P1 | Image variations and editable generation recipes | Next |
| P1 | Searchable model metadata and accurate per-request provider cost reporting | Next |
| P2 | Audio/video generation and background job recovery | Verified · speech and text-to-video; resumable video jobs; permanent saved media |
| P2 | Dedicated music generation: separate ElevenLabs connection, instrumental/vocals and duration controls, saved audio and motion-editor handoff | Planned, not implemented · see research below |
| P1 | Same-origin authenticated browser MCP using the official SDK and request-scoped credentials | Implemented · initialization/list/call, personal isolation, cancellation and app adapters verified; replay ledger is process-local |
| P2 | Durable cross-instance AI jobs and multi-device asset library | Next |

### Music availability — checked 2026-10-09

The [live Gateway catalog](https://ai-gateway.vercel.sh/v1/models) has no standalone music model or ElevenLabs entry; its music-related descriptions concern sound accompanying video. ElevenLabs offers the direct `music_v2_5` [Music API](https://elevenlabs.io/docs/api-reference/music/compose), including instrumental/vocal music and 3-second to 10-minute durations. A [paid ElevenLabs account and separate server-side API key](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music) are required; this is not currently available through the suite's Gateway connection.

The proposed FluxLab Music mode would provide instrumental/vocals and duration controls, preview, durable library storage, downloads and audio handoff. It is not implemented. Background recovery must not be claimed unless a documented provider job/status mechanism supports it. Research used no paid generation requests. Detailed notes are in `FluxLab/docs/OPTIMIZATIONS.md`.

## FluxAgents — workflow studio

Comprehensive technology research is complete in [FLUXAGENTS_RESEARCH.md](FLUXAGENTS_RESEARCH.md), checked 2026-10-09. The separate `FluxAgents` app now includes editable version-2 text conditions, true/false branch rules, ordered active/all joins, text/boolean artifacts, templates, portable JSON/Markdown, no-charge simulations and local persistent runs with approvals, delays and model-call limits. Its local runner stores immutable graphs, step results and an operation ledger in SQLite. Interrupted model requests require explicit review before another attempt. The hosted app supports design and simulation; it does not claim unattended cloud execution.

The managed Workflow runtime, authenticated accounts, revocable background credentials, durable cloud records, schedules and hosted artifact storage remain the next production phase. The initial implementation does not include Eve, arbitrary code nodes, third-party connectors or an unrestricted agent loop. Model dollar limits are conservative estimates, not an all-inclusive billing guarantee.

| Priority | Work and acceptance condition | State |
|---|---|---|
| P0 | Research agent frameworks, durable runtimes, visual platforms, licensing, integration and total cost | Research complete |
| P0 | Prove crash recovery, duplicate-effect prevention, approval waits, deployment safety and spending reservations | Local recovery and operation ledger implemented; hosted execution remains next |
| P0 | Versioned workflow schema, durable run records and artifact ownership | Version 1 compatibility plus version 2 branches/joins and local typed artifacts implemented; cloud ownership/storage next |
| P1 | Guided visual designer, sample testing, run timeline and useful creative templates | Four templates including a complete no-model branching workflow; decisions/skips, join controls and local history verified |
| P1 | Safe conditional execution and recovery | Verified · skipped writing reserves/calls zero; decisions/skips/artifacts survive restart; uncertain paid retries retain approvals/reservations |
| P1 | FluxLab/editor integration, schedules, authenticated connectors and portable workflow files | Shared settings/shell and portable workflow files implemented; schedules/connectors next |

Personal connection behavior and deployment configuration are documented in [CONNECTION_SETTINGS.md](CONNECTION_SETTINGS.md). Background FluxAgents runs explicitly use the suite connection; the browser's personal credential is not copied into saved workflow records.

### Settings and FluxAgents verification — 2026-10-09

- All ten package suites pass: 394 tests passed, with one optional external Premiere fixture skipped. The complete nine-workspace release builds and Fluxini's TypeScript check passes.
- All 36 hosted browser checks pass, including direct FluxAgents navigation and existing cross-editor media/text handoffs. General settings passes 19 real-browser groups across all nine workspaces.
- FluxAgents passes 15 schema, HTTP and local-run tests plus 11 browser groups for editing, billing choice, simulation, approvals, reload/recovery, cancellation, import safety, blocked storage and editable text handoff.
- Local servers are available on 4318 and 4320–4327. FluxAgents opens at `http://localhost:4327/`.
- Verification invokes no paid generation. Provider responses for workflow execution are injected fixtures; live model quality and latency are not claimed tested. Cloud unattended workflows, account-linked credential storage and music generation remain outstanding.

Runtime commit `e63baa5` is pushed and deployed at https://fluxcreate.vercel.app. Deployment `dpl_6MxARdo6APD93GiT9ZcGQ1iePW63` is Ready with Vercel Authentication retained. All 35 live checks pass: the existing suite, settings in all nine workspaces, an actual non-inference Gateway key check, hosted workflow validation/simulation, and rejection of anonymous settings/workflow access. Fluxini's matching integration is pushed as `39c87e4`.

## Release checks

Build every editor from the complete repository. Exercise actual supported import files, undo, native save/reopen and exports. Inspect light/dark rendering. Test every hosted app prefix, simulation worker and downloadable bridge/example. Record the exact remaining format limitations. Previous tests are regression evidence, not proof of new behavior.


## Previous published baseline — 2026-10-09

- Production: https://fluxcreate.vercel.app (Vercel Authentication required).
- Complete source: https://github.com/AlexanderCGO2/fluxcreate — runtime commit `b457475`.
- Fluxini source: https://github.com/AlexanderCGO2/fluxini — commit `1e6e59e`.
- All nine package suites pass: 327 tests passed; one optional externally downloaded Premiere fixture is skipped in the clean release. Its independent Adobe fixture check passed in the source workspace.
- All 34 hosted browser checks pass, including editable text and real pixel image handoffs.
- All 20 live deployment checks pass: eight pages, required resources, seven protected AI connections, live model catalog (304 supported models) and rejected anonymous access.
- Local ports 4318 and 4320–4326 are healthy; the home page shows all seven updated app names.
- No paid model generation was performed during verification. Provider generation behavior and account credits remain unverified live.
- Native AEP/INDD/BLEND require the documented bridges/exports. FluxLab MCP uses local stdio; remote authenticated MCP and reference uploads remain later work. The media continuation is recorded below.


## Earlier published continuation — media and recovery

- Video: live text-to-video model settings, asynchronous Gateway jobs, saved submission IDs and signed tickets, pause/resume checking, seven-day ticket recovery, bounded media downloads and durable Blob library entries.
- Audio: speech generation with documented voices, MP3/WAV output, real playback, downloads, durable library entries and motion-editor handoff. Music, sound effects and transcription remain outside this implementation.
- MCP: video start/status tools with studio recovery links, and standard playable speech content in the App.
- Recovery — verified: shared quarantine and editor-specific storage handling prevent unreadable or invalid autosaves from being silently replaced by demo projects. Explicit New or successful project opening resumes saving; failed imports keep quarantine active. Real-browser evidence: 12 Fluxfoto checks, 19 FluxDesign/Fluximiére checks, and 6 Fluxiffects checks, including retained original records, failed imports, explicit recovery and blocked asset handoff during recovery.
- Import safety: reject late file results when the target document changed; preserve the active project when parsing or validation fails.

At that earlier media release, reference-image generation and remote authenticated MCP were not included. Their bounded implementations are recorded in the current tables and batch below. Full Adobe compatibility, shared cloud media storage and music generation remain outside the delivered scope.

### Continuation verification — 2026-10-09

- The complete release builds, all nine package suites pass (361 passed; one optional external Premiere fixture skipped), and Fluxini's TypeScript check passes.
- All 34 hosted browser checks pass. Separate media checks cover 9 FluxLab generation/library groups, 6 cross-tab job-removal checks, 13 video/audio handoff checks, and the actual MCP App bridge for text, image, video and speech.
- Recovery checks cover 12 Fluxfoto, 19 FluxDesign/Fluximiére and 6 Fluxiffects browser groups. Existing editing and import browser regressions also pass.
- The live Gateway catalog exposes 26 supported text-to-video models and 8 supported speech adapters to FluxLab. Other advertised provider capabilities are not assumed compatible.
- No paid model generation was run. Playback, saved bytes, handoff and recovery use valid local media fixtures and controlled provider responses; provider latency, account credits and generation output quality remain unverified live.

### Published media release — 2026-10-09

Runtime commit `14e6519` is pushed and deployed to https://fluxcreate.vercel.app. Vercel deployment `dpl_4PvXfnaFDNChdpaCDe8orYmtdtRK` is Ready and retains Vercel Authentication for all deployments. All 20 live suite checks pass. Additional live checks verify 338 supported catalog entries (capabilities overlap), video/speech availability, signed media query preservation and the published MCP media interface. The local app servers are healthy. No paid generation requests were made.

## Earlier published integration review and bounded release — 2026-10-09

The requested per-app gap audits, integration review and detailed plan are indexed in [FEATURE-GAPS.md](FEATURE-GAPS.md). New feature expansion was paused while those plans were prepared. At that release, cross-app placement, the floating MCP helper and realtime scratching were still partial/planned. The current verified batch below supersedes those feature-status statements; a desktop media engine remains planned.

Implemented and checked in this continuation: Fluxfoto layer drag ordering and bounded layered raster PSD export; the FluxAgents local origin fix; FluxLab as a reviewed workflow prompt destination. Five real-local-origin browser routes now deliver output to Fluxfoto, FluxDesign, Fluximiére, Fluxiffects and FluxLab. The text is reviewed before insertion; prompt routing makes no model call.

Verification before release: 409 suite unit/integration tests; complete nine-workspace hosted build; 36 hosted browser checks; 16 layer-ordering checks; 11 PSD round-trip checks; 25 existing Fluxfoto editor checks; five real-origin FluxAgents destination workflows. No paid generation calls.

### Publication verification

Runtime commit `813b18b` is pushed and deployed at https://fluxcreate.vercel.app. Deployment `dpl_2qKcZURFD7RkjXuHEfLsK8CQeETd` is Ready in the project’s current **Flux AI Inc** team; the local deployment link was corrected after detecting the existing project had moved teams. Vercel Authentication remains enabled for all deployments. All 43 production checks pass: suite pages/resources and AI availability, settings and workflow validation/simulation, anonymous-access rejection, and the published layer/PSD/prompt-routing features. No paid generations were made. Matching Fluxini commit: `1fabf7d`.

At that publication, Fluxini’s [design consistency review](../../Haidini/docs/DESIGN-CONSISTENCY.md) was complete and its visual redesign remained planned. The current shared-theme/header/graph pass is now implemented and locally verified. Vercel’s broad function-tracing TypeScript pass still prints existing diagnostics in auxiliary Fluxini scripts (and a graph callback); the app’s dedicated typecheck/build passes and the deployment is Ready. Aligning those validation scopes is additional build-hygiene work.


## Current locally verified implementation batch — 2026-10-09

- Shared source-object controls now render and review actual supported photo/page/motion/video/scene content, retain original source, and support placement, source download/open, replacement and refresh in Fluxfoto, Fluxiffects, Fluxini and Flux3D. Destination transforms, native undo/reload and stale document/selection checks are preserved. Sources and previews are bounded; placement is a snapshot, not live synchronization or arbitrary procedural-graph evaluation.
- The shared handoff inbox/outbox and activity history persist pending results and terminal receipts in browser IndexedDB. Reload recovery, two-tab duplicate claims, origin/window/nonce checks and storage limits are covered. Interrupted application remains reviewable; there is no distributed exactly-once transaction with destination autosave.
- The four-editor floating AI helper uses the official MCP SDK, authenticated same-origin local/hosted routes and immutable request-scoped personal connections. Existing planner commands remain authoritative. Review/apply, stale selection/revision rejection, cancellation, text/image insertion and bounded reference edits are verified with mocked providers. [Evidence and limits](FLOATING-AI-IMPLEMENTATION.md) distinguish process-local paid replay protection from durable jobs; actual upscale and paid provider smoke remain open.
- Fluxfoto rectangle/ellipse/lasso selections support invert/feather and undoable mask application, preserve original source pixels and reject cancelled or obsolete preparation. Selected-pixel clipboard/fill, selection combination and retouching remain open.
- Fluxini’s [design pass](../../Haidini/docs/DESIGN-CONSISTENCY.md) includes the shared header/scene picker, persisted light/dark themes, consistent controls/dialogs and a keyboard/pointer-resizable readable graph dock. Desktop checks preserve scene JSON/revision; mobile support is not certified.
- Fluximiére’s [audio engine](../../Fluximiere/docs/AUDIO-ENGINE.md) adds PCM playback, audible scrub/scratch, real peaks/meters and deterministic timestamped WebCodecs export with stereo sound. Decoded short and ten-minute marker fixtures verify timing; bounded whole-file decoding, codec availability and unmeasured hardware latency remain explicit limits. Fluxiffects separately ships [audio-inclusive real-time WebM](../../Fluxiffects/docs/AUDIO-EXPORT.md), including animated gain/fades, with its existing 60-second/60-fps ceiling.
- FluxAgents’ [branching slice](../../FluxAgents/docs/BRANCHING.md) adds validated text/boolean conditions, branch guards, ordered joins and durable local decisions/skips/artifacts. All 22 app tests and 17 browser groups pass; independent model/runtime review found no actionable issue. Hosted execution remains design/simulation only.

This section records implemented subsets and their focused local evidence. It makes no full-feature-parity, universal codec/latency, cloud-sync or new-production-deployment claim. No paid generation calls were used. Final suite build/deployment results are recorded separately.

### FluxDesign PDF increment — 2026-10-09

Native PDF shapes and searchable Latin text are implemented for Arial/Times New Roman/Courier New through disclosed standard Helvetica/Times/Courier faces. Fonts are not embedded. PNG and compatible profile-free RGB JPEG preserve source detail; EXIF-oriented/profiled/CMYK JPEG, WebP and SVG effects use reported PNG conversion. Unsupported font families, characters, discretionary hyphens or extreme tracking preserve the whole page as an image at up to 144 dpi. A downloadable per-page report and an explicit all-image proof are available.

Verified: 22 unit/import/PDF tests; 19 existing editor browser checks; six PDF browser groups with independent PDF.js extraction/rendering, JPEG compressed-byte preservation, frame clipping/rotation/transparency/alignment, Unicode/font fallback, EXIF mirroring, color conversion, report light/dark layouts and native document equality. The vector reference measured mean maximum-channel pixel delta 1.90/255 and 1.23% of pixels over 32; fallback pages matched exactly at 2×. Evidence is in Fluxidesign/artifacts/pdf-export. An independent Adobe RGB sample also matched the editor with PDF.js native image decoding disabled. No font-embedding, tagging, CMYK output or PDF/X compliance claim.

PDF color fidelity: PNG files carrying ICC, gamma/chromaticity, orientation or animation metadata are normalized through the browser to RGB PNG with an explicit conversion notice; ordinary profile-free/sRGB PNG stays directly embedded. An independent Adobe RGB PNG fixture exposed and verified this correction.

## Published feature-gap milestone — 2026-10-09

The current implemented subsets above are now published in Flux AI: runtime commit `7815f25`, deployment `dpl_8So38G1KzyEgUeXhzyGBg21Yr3yF`, READY and protected by Vercel Authentication. All 454 source tests, nine builds, hosted browser checks and final live verification passed. See [the full verification record](RELEASE-2026-10-09.md). Remaining specialist editing, cloud assets and hosted autonomous execution stay open.

## Music research update — 2026-10-10

The earlier music finding applied to Vercel’s catalog and the direct ElevenLabs API. Cloudflare now documents a separate `elevenlabs/music-v2` account-API route with Unified Billing. Prefer this path for the next integration; a separate direct ElevenLabs key is not the only option. See [verified references and design](CLOUDFLARE-AI-GATEWAY.md). Independent Cloudflare settings, guarded text routing and bounded Music v2 generation are now implemented. Actual account access/output and durable cross-instance music recovery remain open.
