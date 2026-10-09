# FluxCreate: what is still missing

Source audit dated 2026-10-09. This is a practical comparison with the reference workflows, not an exhaustive list of every feature in the original products. Working means the inspected app implements the stated subset; partial means important behavior or fidelity remains absent; planned means not delivered. Detailed reports include source evidence, priorities and acceptance criteria.

| App | Reference | Working foundation | Largest remaining gaps | Detailed audit |
|---|---|---|---|---|
| Fluxfoto | Photoshop | Photos, separate layers, painted masks, basic shapes/text/filters, rounded corners, bounded PSD/PSB import, drag ordering and layered raster PSD export | Pixel selections, pixel painting/retouch, groups and clipping, adjustment layers/curves, Smart Objects, paths/styles, typography, RAW/color management and high-resolution performance | [Photoshop comparison](../../Fluxoto/docs/PHOTOSHOP-FEATURE-GAPS.md) |
| FluxDesign | InDesign | Pages, frames, basic text, images, bounded IDML/PDF artwork import and PDF output | Threaded rich text, overset handling, paragraph/character styles, master pages, grids, vector/searchable PDF, fonts and print preflight, long-document performance | [InDesign comparison](../../Fluxidesign/docs/FEATURE-GAPS.md) |
| Fluximiére | Premiere Pro | Timeline, media/track editing, supported Premiere/XML imports, preview, relink and video export | **Audio in exported video**, frame-accurate export, ripple/roll/slip, proxies, real waveforms/meters, captions/transitions, scopes/LUTs and improved project exchange | [Premiere comparison](../../Fluximiere/docs/FEATURE-GAPS.md) |
| Fluxiffects | After Effects | Layers, properties/keyframes, effects, supported 3D scenes and motion, bridge/exchange and rendering | Mask paths/mattes, precompositions, curve editing, advanced effects/expressions/tracking, render queue/audio, broader AE bridge fidelity and media lifetime | [After Effects comparison](../../Fluxiffects/docs/FEATURE-GAPS.md) |
| Fluxini | Houdini | Procedural graph, bounded simulation systems, viewport, supported scene exchange and local/hosted recovery | Richer graph UX, reusable groups, production simulation caches/budgets, cancellation, full procedural interchange and recoverable rendering | [Houdini comparison](../../Haidini/docs/FEATURE-GAPS.md) |
| Flux3D | Blender | Scene objects, transforms/material basics, supported geometry import/export, viewport and motion bridge | Mesh edit mode, modifiers, UV/texture editing, hierarchy, rigging/animation authoring, lighting/render tools and large-scene efficiency | [Blender comparison](../../Flux3D/docs/FEATURE-GAPS.md) |
| FluxLab | AI creation studio + MCP hub | Gateway catalog, text/image/video/speech generation, local library, video recovery and stdio MCP App | Reference-image editing, actual AI upscaling, music, recipes/variations, richer cost metadata, browser/remote MCP and shared asset library | [AI studio comparison](../../FluxLab/docs/FEATURE-GAPS.md) |
| FluxAgents | Visual automation and durable agent workflows | Typed workflow designer, templates, simulation, local persisted runs/approvals/delays/recovery and text handoffs | Hosted live execution, schedules/webhooks, branching/multi-input nodes, media tools, artifact storage, connectors, bounded autonomous agents and actual-cost reconciliation | [Workflow comparison](../../FluxAgents/docs/FEATURE-GAPS.md) |

## FluxCreate home versus a complete creative-suite workspace

The home app already launches the studios, shows local recent-document metadata, shares appearance/settings and exposes the authenticated deployment. Missing suite-level capabilities are substantial:

| Area | Missing or partial | Next acceptance condition |
|---|---|---|
| Documents | Several named documents, searchable recent files, checkpoints, conflict recovery and storage usage | Save/open two named documents per studio without overwriting either; recover prior revisions |
| Assets | Shared libraries, folders/tags, deduplication, missing-media/relink and provenance | One photo reused across apps without multiplying storage; missing assets visibly repairable |
| Accounts | App identities, workspaces, per-project sharing and roles | Users and background jobs have explicit, revocable ownership; deployment auth remains separate |
| Sync | Cross-device project/media sync, offline conflict handling | Restart/offline edits preserve both versions and expose a deliberate merge choice |
| Connections | Account-synced personal credentials and revocable background connections | No key enters project files or transfer records; expiry never falls back silently |
| Integration | Universal Place/Send/Update source, supported-type discovery and durable handoff receipts | Every enabled destination demonstrates actual content insertion, source retention and undo |
| AI | Shared floating selection-aware helper and provider-verified pixel actions | Preview before apply, stale-selection protection, clear costs/cancel and genuine model capability |
| Operations | Common progress/job queue, retry/diagnostics and comprehensive contract checks | Interrupted imports/renders recover without corrupting a document or duplicating a paid request |
| Accessibility | Consistent focus, shortcuts, contrast, reduced motion and touch behavior | Keyboard-only completion of key workflows in each workspace |

## Important corrections to the previous optimization list

- Photo masks, real image imports, rounded rectangles, core recovery guards, personal Gateway settings, authenticated hosting, video/speech generation and local FluxAgents persistence are already implemented. They must not be counted as entirely missing.
- Fluxfoto drag ordering and bounded layered PSD output are included in this continuation. PSD text/shapes/masks are pixel layers, not native Photoshop text, paths or editable mask controls. A visible canvas eraser requires an appearance layer plus a hidden group of originals.
- Atomic imports are implemented in several editors; the shared Building label means the suite-wide contract still needs work. It is not proof that every editor is unsafe.
- FluxDesign PDF cancellation exists; IDML parsing in a cancellable worker is still missing.
- Fluxiffects recovery has been verified; an older app note marking it Next is stale.
- Fluximiére's audio export is still open despite conflicting P0/P1 labels. Current movie export is silent.
- Browser IndexedDB persistence is not cloud sync. Vercel authentication is not application accounts. Local background recovery is not hosted durable execution.
- Embedded source metadata and optional MCP tool hooks are foundations, not completed cross-app objects or a floating helper.

Follow the [integration review](INTEGRATION-REVIEW.md) and [detailed implementation plan](IMPLEMENTATION-PLAN.md) for the next work. The historical [optimization audit](OPTIMIZATIONS.md) remains the record of previous deliveries.

## Fluxini design alignment

The [actual-render design review](../../Haidini/docs/DESIGN-CONSISTENCY.md) compares Fluxini with the shared studios. The next visual pass should adopt the shared header/app switcher and neutral light/dark tokens, align typography/fields/dialogs, then improve the graph dock. The node workspace and server-backed scene management stay intact. This is a reviewed plan, not an already-applied redesign.
