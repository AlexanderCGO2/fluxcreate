# Parallel feature-gap delivery

Started 2026-10-09, from published suite baseline `d30692b`. The user requested parallel work across the gap plans. This is a coordinated delivery batch, not a promise of complete Adobe, Blender or Houdini parity.

| Workstream | Current acceptance slice | Next / explicitly still open | Owner |
|---|---|---|---|
| Fluxfoto | Combined selections; isolated-layer copy/cut/paste; separate fill; atomic multi-layer move/order/duplicate/delete | Nested groups, clipping/adjustment layers, retouching, RAW/color, mesh-like paths | Root |
| Fluximiére | Ripple delete and trim at playhead, explicit selected/all-track scope, lock guards, source/audio timing and undo | Roll/slip, proxies, long-source decoding, captions, professional mixing | Audio/editor agent |
| Fluxiffects | Editable cubic Bézier easing with consistent preview/export/audio evaluation | Masks/mattes, precomps, deterministic export and render recovery | Audio/editor agent, after Miére |
| FluxDesign | Reusable whole-frame text styles and all-page overset review, lock-safe restyling | Rich ranges, threaded stories, master pages, font embedding, print preflight | Design/AI agent |
| FluxLab | Library filters and named editable recipes; one explicitly requested variation with source lineage | Paid provider verification, actual upscaling/mask edits, music, durable paid jobs | Design/AI agent, after Design |
| FluxAgents | Persist unresolved starts before POST, pin request/graph/local-runner identity, recover via read-only lookup, explicitly review any retry | Hosted execution, schedules/webhooks, concurrent jobs, cloud ownership and cost reconciliation | Design/AI agent |
| Flux3D | Multiple-object selection and atomic translate/duplicate/delete with shared gizmo and lock guards | Hierarchies, mesh mode, modifiers, UVs, rigs and rendering | 3D/procedural agent |
| Fluxini | Graph navigator: name/type/parameter search, input/runtime/unused diagnostics, focus and validated connection suggestions | Graph groups, production simulation caching, heavy-work cancellation and rendering | 3D/procedural agent |
| Shared suite | Compatibility review, regression checks, release records and protected deployment | Accounts/workspaces, shared asset identity, remote persistence, collaboration and job infrastructure | Root |

Three independent app streams run concurrently with the root's Fluxfoto/shared work. Within a stream, dependent app slices run sequentially. Shared schemas, routes and connection semantics remain centrally owned; agents do not edit the release checkout or deploy independently.

Each slice must include the user interaction, validated model behavior, undo/reload where applicable, failure/lock handling and meaningful browser or output checks. Model tests alone do not establish export or playback fidelity. No paid generation runs automatically during testing. No experimental feature is marked delivered before its checks pass.

Integration sequence: finish source work → freeze app changes → review new contracts and app tests → assemble release checkout → run the complete suite and hosted browser checks → commit/push → deploy under Flux AI → verify actual bundles, authentication and MCP endpoints. Unfinished work stays named in the gap documents.

The LinkedIn draft and monetization proposal are parallel documentation deliverables. Their public claims use the previously verified baseline until this batch is released. Open-source licensing and paid plans remain proposals; no license, billing flow or public post is installed/published by this plan.

See [feature gaps](FEATURE-GAPS.md), [implementation roadmap](IMPLEMENTATION-PLAN.md), [Fluxfoto slice](FOTO-CONTINUATION.md), [article draft](LINKEDIN-ARTICLE.md) and [business proposal](MONETIZATION-PLAN.md).

Source slices above are implemented and locally verified. Independent reviews addressed stale drags and recovery approval state. See [parallel release evidence](RELEASE-PARALLEL-2026-10-09.md) for final assembly/deployment status; later specialist and infrastructure gaps remain open.
