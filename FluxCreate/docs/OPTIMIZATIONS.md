# FluxCreate optimization audit

Updated 2026-10-09. **Building** identifies the first implementation round; **Next** is the prioritized backlog, not a shipped feature. **Verified** requires actual editing, undo, save/reopen and rendering checks. Each studio's `docs/OPTIMIZATIONS.md` records detailed findings and evidence.

## Shared foundation

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Atomic imports: malformed or excessive files leave the current document unchanged; unsupported content produces useful notices | Building |
| P0 | Reliable autosave: aborted IndexedDB transactions reject and handles close; Flux3D recovery pauses writes | Verified |
| P0 | Adobe interoperability: real supported PSD/PSB, IDML, PDF-compatible AI/PDF and Premiere/FCP XML decoding | Verified |
| P0 | Full-suite repository: all nine sibling dependencies versioned, with no credentials, user media caches or runtime data | Building |
| P0 | Hosted routing: direct app URLs, app switching, APIs, workers, fonts and downloads work on one Vercel origin | Verified |
| P0 | Durable Fluxini cloud storage: replace dependence on a local SQLite file; never present temporary function storage as persistence | Verified |
| P0 | Protected cloud AI: authenticate access before using the shared Gateway key; keep credentials server-side | Verified |
| P1 | AI preview performance: typing a prompt does not rehash large media or rebuild unchanged previews; stale proposals still reject | Verified |
| P1 | Progress/cancellation: lengthy imports and renders report progress and cannot commit partially after cancellation | Building in importers |
| P1 | Recovery quarantine for every editor: extend the explicit Flux3D recovery flow to remaining 2D studios | Next |
| P1 | Shared asset library: content-addressed assets, missing-media detection and explicit relink across editors | Next |
| P1 | Named documents and recovery checkpoints: multiple recent files, timestamps and storage-usage visibility | Next |
| P1 | Accessibility: keyboard workflows, focus-restoring dialogs, readable controls and consistent shortcuts | Next |
| P2 | Direct cross-app handoff: open related documents with conversion review and source recovery | Next |

## Fluxfoto — photographs and layered artwork

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Real-photo editing: JPEG/PNG/WebP originals survive transforms, adjustments, save and export | Verified |
| P0 | Nondestructive layer masks: hide/reveal painting, disable/remove, undo and reopening preserve original pixels | Verified |
| P0 | Photoshop layers: supported PSD/PSB offsets, order, visibility, opacity, common blends and masks import correctly | Verified |
| P1 | Rounded rectangles: visible radius control with matching canvas, saved model and export | Verified |
| P1 | Targeted brushes: selected content or mask is the explicit target; locked layers stay protected | Verified |
| P1 | Large-photo memory limits: inspect dimensions before decoding; bound aggregate layer pixels and reusable previews | Verified |
| P1 | Selection tools: rectangle/ellipse selections, inversion/feathering and selection-aware copy, fill and masks | Next |
| P1 | Adjustment layers: editable levels, curves and white balance with defined scope | Next |
| P2 | Retouching and smart objects: healing, clone tools and editable embedded content with explicit flattening limits | Next |
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
| P2 | Vector PDF output: searchable text, embedded fonts and retained vector shapes | Next |
| P2 | Print preflight: missing fonts/images, resolution, bleed and color-space checks | Next |

## Fluximiére — video editing

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Premiere project import: supported sequence timing, source offsets and offline references; clear feature limits | Verified |
| P0 | Premiere-exported Final Cut XML: preserve timebase, clip bounds and source references | Verified |
| P0 | Offline footage: editable placeholders and relinking without changing timing | Verified |
| P1 | Track conversion: support or report extra source tracks; never silently merge overlapping footage | Verified |
| P1 | Audio output: exported audio matches preview volume, source trims and fades | Next |
| P1 | Timeline tools: ripple, roll, slip and snapping with atomic undo | Next |
| P1 | Proxy media and thumbnails: responsive large-footage preview while originals remain export sources | Next |
| P1 | Audio waveforms/meters: source-aligned caches and visible clipping indicators | Next |
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
| P2 | Render queue/audio: queued compositions, cancellation, accurate sound and recoverable outputs | Next |
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
| P1 | Heavy-work cancellation: obsolete simulation or AI results cannot replace newer work | Next |
| P1 | Node graph usability: search, grouping, readable errors, frame selection and connection affordances | Next |
| P1 | Playback cache: deterministic cached playback with clear invalidation and memory controls | Next |
| P1 | Exchange fidelity: stable source snapshots and explicit 2D/3D approximations | Existing baseline; expand next |
| P2 | Reusable node assets: parameterized saved groups and per-project libraries | Next |
| P2 | Job queue: visible progress, cancellation and recoverable long-running render/simulation outputs | Next |

## FluxLab — shared AI content studio

| Priority | Optimization and acceptance condition | State |
|---|---|---|
| P0 | Shared Gateway credential remains server-only; live model discovery advertises actual text/image capabilities | Verified |
| P0 | Cancel, timeout and upstream failures preserve the previous result; bounded image/JSON memory | Verified |
| P0 | Durable result library commits before reporting saved; duplicate IDs cannot overwrite another result | Verified |
| P1 | Text/image handoffs preview before adding into Fluxfoto, FluxDesign, Fluximiére and Fluxiffects | Verified |
| P1 | Genuine MCP App with official tools, UI resource and external stdio transport | Verified |
| P1 | Reference image input, image variations and editable generation recipes | Next |
| P1 | Searchable model metadata and accurate per-request provider cost reporting | Next |
| P2 | Audio/video generation and background job recovery | Next |
| P2 | Remote authenticated MCP transport and multi-device asset library | Next |

## Release checks

Build every editor from the complete repository. Exercise actual supported import files, undo, native save/reopen and exports. Inspect light/dark rendering. Test every hosted app prefix, simulation worker and downloadable bridge/example. Record the exact remaining format limitations. Previous tests are regression evidence, not proof of new behavior.
