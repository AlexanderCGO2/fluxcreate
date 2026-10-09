# FluxCreate: what is still missing

Source audit and implemented-subset update dated 2026-10-09. This is a practical comparison with the reference workflows, not an exhaustive list of every feature in the original products. Working means the inspected app implements the stated subset; partial means important behavior or fidelity remains absent; planned means not delivered. Detailed reports include source evidence, priorities and acceptance criteria. The current implementation batch is locally verified; historical deployment records do not imply this new source has been published.

| App | Reference | Working foundation | Largest remaining gaps | Detailed audit |
|---|---|---|---|---|
| Fluxfoto | Photoshop | Photos/layers, painted masks, rectangle/ellipse/lasso selections with invert/feather and selection-to-mask, bounded PSD/PSB import, drag ordering/layered raster PSD output, source objects and floating AI | Selection combination/pixel copy/fill, pixel painting/retouch, groups/clipping, adjustment layers/curves, Photoshop Smart Object fidelity, paths/styles, typography, RAW/color management and high-resolution performance | [Photoshop comparison](../../Fluxoto/docs/PHOTOSHOP-FEATURE-GAPS.md) |
| FluxDesign | InDesign | Pages/frames, bounded IDML/PDF import, vector shapes and searchable standard-font PDF text, original compatible images, explicit font/glyph fallback and export reports | Threaded rich text, overset handling, styles/master pages, grids, embedded fonts and broader shaping, print preflight, long-document performance | [InDesign comparison](../../Fluxidesign/docs/FEATURE-GAPS.md) |
| Fluximiére | Premiere Pro | Timeline, supported Premiere/XML imports, relink, PCM playback/scrub/scratch, real waveforms/meters, stereo audio and deterministic WebCodecs WebM export with an explicit real-time fallback | Ripple/roll/slip, proxies/long-source decoding, professional routing/loudness, hardware latency/listening verification, pitch-preserving stretch, captions/transitions, scopes/LUTs and improved exchange | [Premiere comparison](../../Fluximiere/docs/FEATURE-GAPS.md) |
| Fluxiffects | After Effects | Layers/keyframes/effects, supported 3D scenes/motion, source objects, floating AI, bridge/exchange and bounded real-time WebM with stereo audio, gain animation and fades | Mask paths/mattes, precompositions, curve editing, deterministic audio/video export, waveform/mix tools, recoverable render queue, advanced effects/expressions/tracking, broader AE fidelity and media lifetime | [After Effects comparison](../../Fluxiffects/docs/FEATURE-GAPS.md) |
| Fluxini | Houdini | Procedural graph, bounded simulations, supported exchange, local/hosted recovery, shared header/light-dark design, resizable readable graph dock, source objects and floating AI | Richer graph authoring/groups, production simulation caches/budgets, broader heavy-work cancellation, full procedural interchange and recoverable rendering | [Houdini comparison](../../Haidini/docs/FEATURE-GAPS.md) |
| Flux3D | Blender | Scene objects, transforms/material basics, supported geometry import/export, viewport/motion bridge, recoverable source-preview objects and floating AI | Mesh edit mode, modifiers, UV/texture editing, hierarchy, rigging/animation authoring, lighting/render tools and large-scene efficiency | [Blender comparison](../../Flux3D/docs/FEATURE-GAPS.md) |
| FluxLab | AI creation studio + MCP hub | Gateway catalog, text/image/video/speech generation, local library/video recovery, stdio MCP App, authenticated same-origin browser MCP and bounded reference-image editing | Paid reference-edit provider smoke, mask-guided editing, actual AI upscaling, music, recipes/variations, richer costs, durable cross-instance paid jobs and multi-device assets | [AI studio comparison](../../FluxLab/docs/FEATURE-GAPS.md) |
| FluxAgents | Visual automation and durable agent workflows | Workflow designer, version-2 text/boolean conditions, branch guards, ordered joins, simulation, local persisted decisions/artifacts/approvals/delays/recovery and text handoffs | Hosted live execution, schedules/webhooks, richer typed mappings, parallel execution, media tools, cloud artifact ownership, connectors, bounded autonomous agents and actual-cost reconciliation | [Workflow comparison](../../FluxAgents/docs/FEATURE-GAPS.md) |

## FluxCreate home versus a complete creative-suite workspace

The home app already launches the studios, shows local recent-document metadata, shares appearance/settings and exposes the authenticated deployment. Missing suite-level capabilities are substantial:

| Area | Missing or partial | Next acceptance condition |
|---|---|---|
| Documents | Several named documents, searchable recent files, checkpoints, conflict recovery and storage usage | Save/open two named documents per studio without overwriting either; recover prior revisions |
| Assets | Shared libraries, folders/tags, deduplication, missing-media/relink and provenance | One photo reused across apps without multiplying storage; missing assets visibly repairable |
| Accounts | App identities, workspaces, per-project sharing and roles | Users and background jobs have explicit, revocable ownership; deployment auth remains separate |
| Sync | Cross-device project/media sync, offline conflict handling | Restart/offline edits preserve both versions and expose a deliberate merge choice |
| Connections | Account-synced personal credentials and revocable background connections | No key enters project files or transfer records; expiry never falls back silently |
| Integration | Shared source controls now work in Fluxfoto/Fluxiffects/Fluxini/Flux3D; browser inbox/outbox/history, review and duplicate claims persist. Live source sync, shared asset identity and distributed exactly-once insertion remain absent | Expand supported renderers/types while preserving source, stale guards and undo; reconcile interrupted application explicitly |
| AI | Four-editor floating MCP helper, review/apply, stale guards, isolated personal connections and bounded reference edits work. Paid provider smoke, mask editing, upscale and durable remote jobs remain open | Verify actual account/provider output separately; preserve originals and never downgrade missing personal credentials |
| Operations | Common progress/job queue, retry/diagnostics and comprehensive contract checks | Interrupted imports/renders recover without corrupting a document or duplicating a paid request |
| Accessibility | Consistent focus, shortcuts, contrast, reduced motion and touch behavior | Keyboard-only completion of key workflows in each workspace |

## Important corrections to the previous optimization list

- Photo masks, real image imports, rounded rectangles, core recovery guards, personal Gateway settings, authenticated hosting, video/speech generation and local FluxAgents persistence are already implemented. They must not be counted as entirely missing.
- Fluxfoto drag ordering and bounded layered PSD output are included in this continuation. PSD text/shapes/masks are pixel layers, not native Photoshop text, paths or editable mask controls. A visible canvas eraser requires an appearance layer plus a hidden group of originals.
- Atomic imports are implemented in several editors; the shared Building label means the suite-wide contract still needs work. It is not proof that every editor is unsafe.
- FluxDesign PDF import cancellation exists; PDF export cancellation and IDML parsing in a cancellable worker remain missing.
- Fluxiffects recovery has been verified; an older app note marking it Next is stale.
- Fluximiére now exports synchronized stereo sound with timestamped WebCodecs video; real-time capture is a separate compatibility choice. Fluxiffects now includes stereo sound in its bounded real-time export, but does not inherit Fluximiére’s deterministic encoder. See [Fluximiére audio](../../Fluximiere/docs/AUDIO-ENGINE.md) and [Fluxiffects audio](../../Fluxiffects/docs/AUDIO-EXPORT.md).
- Browser IndexedDB persistence is not cloud sync. Vercel authentication is not application accounts. Local background recovery is not hosted durable execution.
- Source objects now have real rendering/review/placement/replacement/refresh controls in the four requested editors. They remain rendered snapshots with recoverable source, not live-linked native objects. Fluxini source import uses Flux Exchange rather than arbitrary native procedural graph rendering.
- The four-editor floating helper now uses the official MCP client/server and existing validated planners. Reference editing is restricted by documented integration plus live image-input capability; paid provider output was not tested and AI upscale remains unavailable.
- Browser transfer storage retains bounded pending work and receipts across reload, with cross-tab claim protection. It is origin-local storage, not a distributed exactly-once protocol or cloud artifact store.
- Fluxfoto’s rectangle, ellipse and lasso selections now support invert/feather and undoable masks with stale/cancel guards; pixel clipboard, fill and broader selection algebra remain open.

Follow the [integration review](INTEGRATION-REVIEW.md) and [detailed implementation plan](IMPLEMENTATION-PLAN.md) for the next work. The historical [optimization audit](OPTIMIZATIONS.md) remains the record of previous deliveries.

## Fluxini design alignment

The [actual-render design review and implementation record](../../Haidini/docs/DESIGN-CONSISTENCY.md) now documents the implemented shared header/app switcher, preserved scene picker, persisted neutral light/dark themes, consistent fields/dialogs and keyboard/pointer-resizable graph dock with readable focus/fit controls. Appearance checks preserve complete scene data and revision. The supported minimum desktop is 1000 × 720; mobile certification, deeper inspector grouping and broader graph authoring remain open.
