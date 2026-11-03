# FluxMotion: feature gaps and delivery plan

Initial audit: **9 October 2026**; delivered subsets reconciled **15 October 2026**. Reference product: **Adobe After Effects**. This is a source-based implementation audit, not a claim of feature parity or a usability certification. “Working” means the stated subset exists; “Partial” names its boundary; “Missing” means there is no complete user workflow. Priorities: P0 reliability and honest interoperability, P1 core creation, P2 advanced production, P3 specialist breadth.

The reference scope follows Adobe’s current [workflow overview](https://helpx.adobe.com/after-effects/desktop/get-started/understand-after-effects-workflow/workflows.html) and [After Effects help index](https://helpx.adobe.com/after-effects/desktop.html): composition, animation, effects, tracking, expressions and delivery. These are feature categories, not copied implementation requirements.

## Current position

FluxMotion can create editable motion graphics, mix browser-supported footage, animate properties with bounded custom easing, import real animated 3D scene layers, and render PNG/WebM with sound. It remains substantially narrower than After Effects. The biggest practical gaps are masks/mattes, nested compositions, advanced animation tools, queued movie delivery, professional media/color workflows and a dependable render queue.

Evidence reviewed: `src/core.mjs`, `main.jsx`, `renderer.mjs`, `storage.mjs`, `ai-commands.mjs`, `StudioAI.jsx`, `scene-import.mjs`, `Scene3DInspector.jsx`; shared Flux3D loader/compositor; `public/bridge/Export-to-Fluxiffects.jsx`; existing import, rendering, AI, exchange and recovery tests. Existing verification is recorded in the README; it was not all rerun for this audit.

## Coverage and gaps

| Area | Status and current behavior | Missing or incomplete work | Priority |
| --- | --- | --- | --- |
| Composition management | Working: multiple compositions, dimensions, frame rate, background and duration | Project folders, search/filter organization, duplication of complete comp dependencies, work-area presets | P1 |
| Layers and timing | Working: text, simple shapes, solid, null, image/video/audio and scene3d; reorder, lock, hide, duplicate, trim and split | Multi-selection edits, groups, solo/shy/guide semantics, adjustment layers, markers, slip/stretch tools | P1 |
| Parenting | Partial: imported 2D affine parent transforms evaluate | Friendly parent picker, pick-whip, preserve-world reparenting and hierarchy tools | P1 |
| Precompositions | Missing: a project may contain several compositions, but layers cannot render a nested comp | Nested reference type, recursion checks, timing/time remapping, shared dependency cache and precompose/unpack UI | P1 |
| Keyframes | Working: numeric/color properties, bounded custom cubic Bézier easing, value graph, and multi-property selection/move/delete and copy/paste on one selected layer; global-anchor clipboard, numeric/frame controls and cancellable group drag preserve outgoing curves; [grouped scope](GROUPED-KEYFRAMES.md); [easing scope](CUSTOM-EASING.md), [selection scope](KEYFRAME-SELECTION.md) | Selection across layers, marquee selection, timing stretch, overshoot/linked tangents, spatial Bézier paths, velocity graph, roving keys | P1 |
| Retiming | Partial: source start, layer timing, constant playback rate and [freeze-frame image copies](FREEZE-FRAME.md) over the whole layer interval, retaining hidden/muted original video | Animated time remapping, reverse controls, hold insertion/ripple, optical-flow/frame blending | P2 |
| Text | Partial: editable text, font family/weight/size/tracking and alignment | Per-character/range selectors, text-on-path, paragraph layout, rich mixed styles, variable font axes and font packaging | P1/P2 |
| Shape authoring | Partial: rectangles/ellipses, fill/stroke and rounded corners | Pen tool, Bézier paths, compound shapes, groups, trim/repeat/merge paths and gradient editing | P1 |
| Masks and mattes | Missing | Editable masks, feather/expansion, animated paths, alpha/luma track mattes and invert modes | P1 |
| Blend/effects stack | Partial: common blend modes and a small Canvas-based blur/glow/color filter set | Adjustment layers, effect parameter animation UI, reusable effect presets, displacement, keying, distortion and a broader effect library | P1/P2 |
| Tracking and roto | Missing | Point/planar tracking, stabilization, camera tracking, assisted subject mattes, edge refinement and roto propagation | P2/P3 |
| Paint and removal | Missing | Brush/clone stroke timing, object removal/content-aware fill, puppet deformation and pin tools | P3 |
| Expressions and automation | Missing: inert AE expression metadata is retained, never executed | A bounded expression language, diagnostics, expression controls and an intentional scripting/plugin API | P2/P3 |
| 3D scene layers | Working: native Flux3D and self-contained GLB/glTF retain source motion, hierarchy, skins, morphs and embedded textures through the separate loader | Internal mesh/rig/material editing stays in the source app; separate scene layers do not share depth, shadows or lights | P1/P2 |
| AE 3D workflow | Missing | Shared 3D world, editable cameras/lights, 3D text/shape extrusion, render passes, depth of field and motion blur | P2 |
| Media interpretation | Partial: browser codecs and basic timing/size metadata | Image sequences, frame-rate interpretation, field/pixel-aspect controls, proxies, variable-frame-rate normalization and dependable professional codecs | P1/P2 |
| Audio | Partial: bounded mono/stereo export mix, volume keyframes/easing, audio fades, mute, source offsets/rate and matching preview gain | Shared sample-accurate preview transport, waveforms, track/bus routing, effects and device/latency qualification | P1/P2 |
| Color pipeline | Partial: browser/Canvas color behavior | Explicit working space, linear compositing, 16/32-bit processing, OCIO/ICC handling, HDR and display transforms | P2 |
| Preview performance | Partial: local live rendering and media preparation | Managed RAM/disk frame cache, region of interest, preview resolution, background preparation, profiling and worker scheduling | P1/P2 |
| Output | Working bounded subset: PNG, timestamped VP9/VP8 WebM with stereo Opus and explicit real-time fallback; 60 seconds/60 fps, progress/cancel and picture-only output; [precise scope](AUDIO-EXPORT.md) | MP4, alpha codecs, EXR/image sequences, render queue, crash-resumable jobs and broader codec/device qualification | P1/P2 |
| AE files | Partial: supplied AE-host export bridge transfers supported 2D layers/keys and records unsupported data | Direct `.aep`/`.aepx` decoding is absent; bridge cannot reproduce masks, paths, nested rendering, AE 3D or third-party effects; real AE-host execution remains unverified | P0 |
| Adobe ecosystem | Missing | `.mogrt`, Essential Graphics controls, Dynamic Link, plugin hosting and template packaging | P3 |
| FluxCreate interchange | Working subset: `.flux.md`, suite motion wrappers, rendered media, live Flux3D scene layers, and reviewed studio snapshot placement/refresh | Broader per-object editable adapters, live linked updates and cross-app fidelity qualification | P0/P1 |
| Studio snapshots | Working bounded subset: `SuiteObjectControls` places rendered image previews with retained original source; explicit refresh preserves placement, rejects locked/stale targets, and commits atomically | Snapshots do not expose native source objects for live editing inside Effects; broader renderer and format coverage remains | P0/P1 |
| AI | Working subset: selected/composition changes, editable comps, explain mode, three reviewed directions, rules, one-step undo, and shared floating helper with reviewed typed edits and text/image insertion | Broader grounded visual understanding, typed commands and native shared-object edits; provider behavior and paid requests are outside this local verification | P1/P2 |
| Reliability | Working subset: native copies, undo/redo, IndexedDB autosave and recovery quarantine | Versioned backups, storage usage/quota UI, reusable media store and stronger large-project recovery | P0/P1 |
| Collaboration/desktop | Missing | Shared multi-user revisions, comments, asset permissions, packaged/signed desktop and wider hardware accessibility validation | P3 |

## Detailed implementation sequence

| Stage | Deliverable and dependencies | Acceptance before marking complete |
| --- | --- | --- |
| F0 — preserve work | Stabilize project/asset versioning and source provenance. The bounded snapshot placement/refresh workflow is now delivered; extend source adapters with the same retention checks. Preserve original source separately from preview bytes and keep both outside provider context. | Real native save/reload retains the source byte-for-byte; stale import and failed render change nothing; undo removes the whole placement; locked layers cannot be refreshed; retained source downloads correctly; malformed/oversized sources fail before allocation. |
| F1 — reusable compositions | Add composition-reference layers, precompose/unpack, source timing and cycle detection. Build dependency-aware caches before adding nested effects. | Three nested comps render identical sampled frames before/after reopen; modifying a reused child refreshes all instances; cycles fail atomically; trim/rate changes preserve expected time. |
| F2 — compositing essentials | Add vector paths, masks and alpha/luma mattes, then adjustment layers. Define parent/local/world coordinates and matte evaluation order explicitly. | Feathered and inverted masks plus animated mattes match deterministic pixel fixtures under rotation, scaling and parenting; precomps export the same result; no hidden matte is accidentally drawn. |
| F3 — animation control | Implement key selection/copy/paste, Bézier tangents, motion paths, retiming and text selectors on the common model. | Tangent edits survive native/exchange roundtrip; keyboard edits respect locks; reverse/freeze fixtures sample the expected source frame; one drag is one undo. |
| F4 — reliable delivery | Add waveforms/mix graph, timestamped offline video/audio encoding and render queue. Start with one supported browser/codec path and explicit fallback. | Decode an exported film with audio and assert duration, frame count, frame content and bounded A/V drift; cancel mid-render cleanly; queue restart never silently drops a frame or claims completion. |
| F5 — production media | Add proxy/relink/collect workflows, image sequences and explicit color management; move costly rendering work off the UI thread. | Missing assets produce a complete report; a collected project reopens offline; declared color transforms pass reference patches; measured preview memory/frame time stay within published budgets. |
| F6 — advanced creation | Add tracking/roto, richer effects, shared 3D rendering and constrained expressions incrementally. Choose one user task per milestone. | Tracking error is measured on known motion; segmentation exposes uncertainty and manual correction; expressions have time/memory bounds; unsupported source features remain recoverable. |
| F7 — ecosystem | Extend and verify the AE bridge in real supported AE hosts, then evaluate template and plugin bridges separately. | Fixture matrix states exact transferred properties and losses; no binary format is advertised as supported without a genuine parser or host bridge test. |

Every stage also needs a usable preset, plain-language controls, saved/undoable data, import failure atomicity, keyboard/accessibility checks and a real browser export test. Dates and “full AE parity” promises are intentionally not estimated before the foundational prototypes and scope are reviewed.

## Historical pause and verification record — 9 October

This paragraph records the earlier planning checkpoint, not current integration status. On 9 October, new feature expansion was paused for this planning pass. Unfinished snapshot import controls were removed because the shared browser adapter does not yet exist. The source-retention/placement foundation remains isolated in `core.mjs`, `ai-commands.mjs` and `suite-object.mjs`. **Two new snapshot core tests and the FluxMotion build pass.** The broader Node regression run passed 64 cases; two suites initially could not access dependency junctions, then passed all 27 of their cases with that access (91 passing cases in total). No paid model requests were made. This does not verify a snapshot UI or constitute a fresh browser regression run. At that checkpoint, floating-helper integration was planned. The current table now reflects delivered `SuiteObjectControls` and `FloatingMotionAI`/shared `FloatingAIHelper` integration; snapshot previews remain ordinary image layers with retained source, not live editable native objects.

## Audio delivery increment — 2026-10-09

The previous silent export gap is closed for bounded real-time WebM. Native scene output and actual decoded stereo sound were verified together. Animated gain and fades now survive native save/open. At that checkpoint output used real-time capture. The explicit 60-second/60-fps limit remains; the later precise-delivery increment below supersedes that timing limitation for supported codecs. See [AUDIO-EXPORT.md](AUDIO-EXPORT.md) for architecture, measured cues, resource limits and remaining work.

## Precise delivery increment — 2026-10-13

Effects now encodes every requested composition frame with explicit timestamps and synchronized stereo sound from a committed snapshot. Real-time capture remains an explicit fallback, never silently selected. This closes the bounded offline frame-encoding part of F4, not the render queue, professional codec/color, or full AE delivery scope. See [AUDIO-EXPORT.md](AUDIO-EXPORT.md) for exact bounds and decoded verification.

## Freeze-frame increment — 2026-10-13

The selected embedded video can now produce an ordinary still copy at the committed source time, over its whole layer duration. Picture animation, parenting and effects stay editable; the original is hidden/muted in one Undo transaction with its bytes/settings retained. Native/exchange/Premiere import and decoded precise/real-time movies are verified. This closes a bounded freeze workflow in F3, not reverse or general time remapping. See [scope and verification](FREEZE-FRAME.md).

## Grouped animation increment — 2026-10-15

Key selection now spans properties of one selected layer. Move, nudge, drag, delete and global-anchor copy/paste are atomic and preserve outgoing easing. Compatible picture/audio properties retain their relative timing; unsupported tracks, collisions and aggregate capacity failures reject the whole operation. Committed native/PNG/precise WebM exports and the existing freeze workflow are verified. Cross-layer selection, marquee and timing stretch remain outside this increment. See [scope and evidence](GROUPED-KEYFRAMES.md).
