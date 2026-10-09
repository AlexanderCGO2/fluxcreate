# Fluxini 0.4 — a workspace for designers

27 September 2026

The confirmed audience is people with design knowledge. The interface uses composition, typography, motion, material and timing as its main concepts. Procedural connections and simulation detail remain available through Graph and Advanced controls. This release delivers the first usability package from the [roadmap](Fluxini-UX-Review-and-Roadmap.md); it does not complete every M1 research or platform gate.

## Delivered

| Area | Result |
| --- | --- |
| Workspace | Scene opens by default. Graph is collapsible; Ask Flux occupies the right panel on demand. The inspector resizes by pointer or keyboard. Panel choices persist locally. |
| Creation | New opens a starter chooser. Add → Effects inserts a complete connected effect into the current project. Add → Operators retains individual graph tools. |
| Inspector | Five primary water controls fit at 1280×720. Units, local numeric validation, per-field reset, editable object names, Position and Advanced controls reduce searching. Protection appears in Advanced or on an already protected field. |
| Suggestions | Actions derive from the selection and respect locks. Water offers Calmer water and Stronger splash; irrelevant particle/terrain actions disappear. Before/After previews remain unapplied until accepted. |
| Navigation | F frames the selection; Home frames the composition. Orbit camera settings persist per project. Layout, label, project-name and timeline edits no longer rebuild simulation workers. |
| Keyboard | Interactive controls retain native Space behavior. Dialogs contain focus, close with Escape and restore focus. Numeric timeline edits commit with Enter. |
| Export | One dialog explains Video, Image and 3D scene. PNG waits for the calculated frame. GLB remains current-frame geometry; WebM remains a real-time viewport recording. Cancellation suppresses the download. |
| History | Project rename uses the same atomic command/undo mechanism as scene edits. History displays object labels and leaves AI context details expandable. Flux/Claude configuration is preserved; no LangChain or LangGraph was added. |
| Water | Falling drops initialize a spherical lattice at normal rest spacing. The compressed rectangular initialization was removed. |

## Verification

- TypeScript passes; all **22 engine/server tests** pass, including new effect-bundle, contextual-action, rename and falling-drop regressions.
- Studio browser checks pass: keyboard focus, five visible water controls, local invalid-value feedback, reset, protection, before/after, undo/redo, project rename, node dragging without worker replacement, saved panel layout, PNG/GLB/WebM, recording cancellation, and Add versus New semantics.
- Motion browser checks pass: text editing, playback, scrubbing, previews, Flux preference approval, wiring, duplicate/delete, GLB, decoded moving WebM and project import/export.
- Graph browser checks pass: manual node construction, port dragging, layout persistence and reload.
- Simulation browser checks pass: repeatable water/cloud rewind, saved controls, fluid surface GLB, cloud parcel GLB, decoded moving water video and two solvers in one scene.
- The bundled local service passes static-asset, session, project-store and Flux-memory checks.
- The running service was restarted at port 4318. The active project `853354cd-3dc6-44dd-bc11-bde484624238` was compared before and after restart: its full project document was identical, at revision **17**.

Measured with optional panels closed:

| Window | Viewport | Viewport share of editing workspace | Main water controls | Document overflow |
| --- | --- | --- | --- | --- |
| 1280 × 720 | 818 × 548 | 55.6% | All five visible | None |
| 1440 × 900 | 938 × 710 | 57.1% | All five visible | None |

The second measurement retained the 296 px inspector width from the first window size. Screenshots were visually inspected. These are browser/engineering checks, not participant-study findings or a full accessibility certification.

Evidence: [layout measurements](../artifacts/studio/layout-measurements.json), [studio report](../artifacts/studio/studio-smoke.json), [motion report](../artifacts/browser-smoke.json), [simulation report](../artifacts/simulation-smoke.json), [graph report](../artifacts/graph-smoke.json), [running release](../artifacts/studio/running-0.4.png).

## Open checks and limits

The live Claude request reached the existing AI Gateway and received HTTP 500. A second, minimal text-only request also returned HTTP 500, so the failure is not specific to scene-edit payloads. Live generation was not verified for this release; the original gateway and model configuration were preserved. Local memory, manual editing and offline validated previews passed. The failed live check is recorded in [live-gateway-check.json](../artifacts/studio/live-gateway-check.json).

Rust/MSVC are absent, so the native Tauri shell and Windows installer remain uncompiled and unverified. The frontend, bundled Node service and launcher are prepared and running. Windows scaling at 125%, a complete contrast audit and sessions with designers remain open M1 gates.

Simulation counts and physics models are unchanged apart from falling-drop initialization. Water remains a small CPU PBF preview with fixed colliders. Clouds remain an artistic parcel/volume model. GLB has no animation tracks; clouds export parcel geometry. WebM can stretch when calculation is slower than real time. Exact-frame encoding, export resolution controls and progress estimates remain later work.

## Next delivery sequence

1. **Close M1 validation:** reproduce the gateway failure separately, check Windows scaling and keyboard contrast, and observe designers making a title, a water/cloud variation and an export. Measure task failures before adding more controls.
2. **M2 — composition and timing:** coherent object selection and visible selection feedback, transform handles, object visibility, practical font controls, animation presets, then tracks and property timing. Keep the graph synchronized with every direct edit.
3. **M3 — predictable simulation and export:** explicit requested/calculated frame state, bounded caching, quality presets, exact-frame rendering and encoding, chosen resolution, progress and recovery. Validate output duration and frame count automatically.
4. **M4 — Flux refinement:** selection-aware suggestions, understandable change summaries, reusable recipes and visible preference scope. Resolve the gateway integration before treating live AI as a release dependency.
5. **M5 — Windows beta:** compile and test the native shell, package and sign an installer, test WebView2 downloads/recording, recovery and hardware tiers, then run the full create-to-export journey with designers.

The original 10–14 week planning range remains an estimate for two engineers plus design/QA participation. It is not a delivery commitment. Advance by the roadmap's acceptance gates.
