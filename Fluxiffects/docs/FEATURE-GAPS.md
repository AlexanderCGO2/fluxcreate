# Fluxiffects: feature gaps and delivery plan

Audit date: **9 October 2026**. Reference product: **Adobe After Effects**. This is a source-based implementation audit, not a claim of feature parity or a usability certification. “Working” means the stated subset exists; “Partial” names its boundary; “Missing” means there is no complete user workflow. Priorities: P0 reliability and honest interoperability, P1 core creation, P2 advanced production, P3 specialist breadth.

The reference scope follows Adobe’s current [workflow overview](https://helpx.adobe.com/after-effects/desktop/get-started/understand-after-effects-workflow/workflows.html) and [After Effects help index](https://helpx.adobe.com/after-effects/desktop.html): composition, animation, effects, tracking, expressions and delivery. These are feature categories, not copied implementation requirements.

## Current position

Fluxiffects can create editable motion graphics, mix browser-supported footage, animate properties with bounded custom easing, import real animated 3D scene layers, and render PNG/WebM with sound. It remains substantially narrower than After Effects. The biggest practical gaps are masks/mattes, nested compositions, advanced animation tools, deterministic movie export, professional media/color workflows and a dependable render queue.

Evidence reviewed: `src/core.mjs`, `main.jsx`, `renderer.mjs`, `storage.mjs`, `ai-commands.mjs`, `StudioAI.jsx`, `scene-import.mjs`, `Scene3DInspector.jsx`; shared Flux3D loader/compositor; `public/bridge/Export-to-Fluxiffects.jsx`; existing import, rendering, AI, exchange and recovery tests. Existing verification is recorded in the README; it was not all rerun for this audit.

## Coverage and gaps

| Area | Status and current behavior | Missing or incomplete work | Priority |
| --- | --- | --- | --- |
| Composition management | Working: multiple compositions, dimensions, frame rate, background and duration | Project folders, search/filter organization, duplication of complete comp dependencies, work-area presets | P1 |
| Layers and timing | Working: text, simple shapes, solid, null, image/video/audio and scene3d; reorder, lock, hide, duplicate, trim and split | Multi-selection edits, groups, solo/shy/guide semantics, adjustment layers, markers, slip/stretch tools | P1 |
| Parenting | Partial: imported 2D affine parent transforms evaluate | Friendly parent picker, pick-whip, preserve-world reparenting and hierarchy tools | P1 |
| Precompositions | Missing: a project may contain several compositions, but layers cannot render a nested comp | Nested reference type, recursion checks, timing/time remapping, shared dependency cache and precompose/unpack UI | P1 |
| Keyframes | Working: numeric/color properties, bounded custom cubic Bézier easing, value graph, and multi-key selection/move/delete and single-property copy/paste to compatible layers; numeric/frame controls and cancellable group drag preserve outgoing curves; [easing scope](CUSTOM-EASING.md), [selection scope](KEYFRAME-SELECTION.md) | Selection across properties/layers, marquee selection, multi-property copy/paste, overshoot/linked tangents, spatial Bézier paths, velocity graph, roving keys | P1 |
| Retiming | Partial: source start, layer timing and playback rate | Animated time remapping, reverse controls, freeze-frame workflow, optical-flow/frame blending | P2 |
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
| Output | Working: PNG still and real-time WebM with stereo Opus, currently capped at 60 seconds/60 fps; progress/cancel and explicit picture-only output | Deterministic offline frame encoder, MP4, alpha codecs, EXR/image sequences, render queue and crash-resumable jobs | P1/P2 |
| AE files | Partial: supplied AE-host export bridge transfers supported 2D layers/keys and records unsupported data | Direct `.aep`/`.aepx` decoding is absent; bridge cannot reproduce masks, paths, nested rendering, AE 3D or third-party effects; real AE-host execution remains unverified | P0 |
| Adobe ecosystem | Missing | `.mogrt`, Essential Graphics controls, Dynamic Link, plugin hosting and template packaging | P3 |
| FluxCreate interchange | Working subset: `.flux.md`, suite motion wrappers, rendered media and live Flux3D scene layers | Per-object editable adapters, source refresh, fidelity review and cross-app layer placement | P0/P1 |
| New studio snapshots | Partial engineering only: bounded source metadata and atomic placement helper have two new core tests | Shared browser renderer and reviewed import UI are paused; no completed “place object” workflow is claimed | P0 |
| AI | Working subset: selected/composition changes, new editable comps, explain mode, three reviewed directions, rules and one-step undo | General floating helper, grounded visual understanding, per-step cost display, broader typed commands and shared object operations | P1/P2 |
| Reliability | Working subset: native copies, undo/redo, IndexedDB autosave and recovery quarantine | Versioned backups, storage usage/quota UI, reusable media store and stronger large-project recovery | P0/P1 |
| Collaboration/desktop | Missing | Shared multi-user revisions, comments, asset permissions, packaged/signed desktop and wider hardware accessibility validation | P3 |

## Detailed implementation sequence

| Stage | Deliverable and dependencies | Acceptance before marking complete |
| --- | --- | --- |
| F0 — preserve work | Stabilize project/asset versioning and source provenance. Complete the paused snapshot adapter only after this plan is accepted. Preserve original source separately from preview bytes and keep both outside provider context. | Real native save/reload retains the source byte-for-byte; stale import and failed render change nothing; undo removes the whole placement; locked layers cannot be refreshed; retained source downloads correctly; malformed/oversized sources fail before allocation. |
| F1 — reusable compositions | Add composition-reference layers, precompose/unpack, source timing and cycle detection. Build dependency-aware caches before adding nested effects. | Three nested comps render identical sampled frames before/after reopen; modifying a reused child refreshes all instances; cycles fail atomically; trim/rate changes preserve expected time. |
| F2 — compositing essentials | Add vector paths, masks and alpha/luma mattes, then adjustment layers. Define parent/local/world coordinates and matte evaluation order explicitly. | Feathered and inverted masks plus animated mattes match deterministic pixel fixtures under rotation, scaling and parenting; precomps export the same result; no hidden matte is accidentally drawn. |
| F3 — animation control | Implement key selection/copy/paste, Bézier tangents, motion paths, retiming and text selectors on the common model. | Tangent edits survive native/exchange roundtrip; keyboard edits respect locks; reverse/freeze fixtures sample the expected source frame; one drag is one undo. |
| F4 — reliable delivery | Add waveforms/mix graph, timestamped offline video/audio encoding and render queue. Start with one supported browser/codec path and explicit fallback. | Decode an exported film with audio and assert duration, frame count, frame content and bounded A/V drift; cancel mid-render cleanly; queue restart never silently drops a frame or claims completion. |
| F5 — production media | Add proxy/relink/collect workflows, image sequences and explicit color management; move costly rendering work off the UI thread. | Missing assets produce a complete report; a collected project reopens offline; declared color transforms pass reference patches; measured preview memory/frame time stay within published budgets. |
| F6 — advanced creation | Add tracking/roto, richer effects, shared 3D rendering and constrained expressions incrementally. Choose one user task per milestone. | Tracking error is measured on known motion; segmentation exposes uncertainty and manual correction; expressions have time/memory bounds; unsupported source features remain recoverable. |
| F7 — ecosystem | Extend and verify the AE bridge in real supported AE hosts, then evaluate template and plugin bridges separately. | Fixture matrix states exact transferred properties and losses; no binary format is advertised as supported without a genuine parser or host bridge test. |

Every stage also needs a usable preset, plain-language controls, saved/undoable data, import failure atomicity, keyboard/accessibility checks and a real browser export test. Dates and “full AE parity” promises are intentionally not estimated before the foundational prototypes and scope are reviewed.

## Pause and verification record

On 9 October, new feature expansion was paused for this planning pass. Unfinished snapshot import controls were removed because the shared browser adapter does not yet exist. The source-retention/placement foundation remains isolated in `core.mjs`, `ai-commands.mjs` and `suite-object.mjs`. **Two new snapshot core tests and the Fluxiffects build pass.** The broader Node regression run passed 64 cases; two suites initially could not access dependency junctions, then passed all 27 of their cases with that access (91 passing cases in total). No paid model requests were made. This does not verify a snapshot UI or constitute a fresh browser regression run. Floating-helper integration remains planned.

## Audio delivery increment — 2026-10-09

The previous silent export gap is closed for bounded real-time WebM. Native scene output and actual decoded stereo sound were verified together. Animated gain and fades now survive native save/open. The explicit 60-second/60-fps limit remains, and deterministic Fluximiére output is not claimed for this app. See [AUDIO-EXPORT.md](AUDIO-EXPORT.md) for architecture, measured cues, resource limits and remaining work.
