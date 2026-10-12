# Multi-selection and arrangement continuation — 2026-10-12

Baseline: suite runtime 4beb565, documentation a7b652f. The user authorizes continued gap implementation, parallel work and release. Existing FEATURE-GAPS.md milestones define the intended workflows; this batch extends existing editors without introducing new document hierarchies.

## Scope and acceptance

- [x] FluxDesign D1: page-local frame selection, rotated-bound alignment/distribution, shared moves, duplicate/delete. One atomic undo; locked selections reject, text editing and single-frame resize remain intact. Exports and autosave never capture a drag preview. Owner: design_multi_frames; app-local plan and evidence.
- [x] Flux3D B1: explicit shared geometry-bounds pivot, numeric group world rotation and uniform scale with preview/Apply/Cancel. Preserve nonuniform member scale, immutable meshes/retained sources, locks and one undo. Native/GLB/PNG use committed scenes during preview. Owner: three_group_transform; app-local plan and evidence. Shared rotation/scale gizmos remain separate if unsafe within existing TRS design.
- [x] Fluxini: box selection and direct multi-node dragging; one validated relative move within existing 32-command bounds. Cancel stale/cancelled gestures without resurrection. Parameter locks keep existing semantics (graph layout may move without changing protected values). Native scene/evaluation remains unchanged except node layout. Owner: graph_direct_selection; app-local plan and evidence.
- [x] Release maintenance: type the existing paint/GPU developer browser fixtures so broad deployment tracing stops reporting their known errors. Add a targeted strict check, prove it fails before the correction, and run the existing browser fixtures. No solver behavior changes. Owner: root.
- [x] Independent reviews, app-specific browser/native/export evidence and full regression matrix.
- [x] Assemble source, build all apps and server/MCP, verify hosted integration, commit/push/deploy to protected Flux AI project, verify exact live bundles and authentication, update truthful remaining-gap inventory.

## Boundaries

Each agent owns one app and its app docs. Root owns shared release docs, tooling and the two developer fixtures; no overlapping product files. No new dependencies, credentials or paid inference. All gaps listed in the broad Adobe/Houdini/Blender comparison are not equivalent to this bounded batch: threading, hierarchy, topology, production simulation, shared cloud ownership and durable paid jobs retain independent milestones.

## Verification log

Targeted strict fixture check reproduced the existing paint/GPU diagnostics before implementation (exit 2). No product implementation has been changed by root at this point.

Implemented source passes scoped browser/export reviews. Root independently reran the 11 Design, five 3D, ten direct-graph and five graph-boundary groups. Developer strict check is GREEN after the reproduced RED. GPU particle (seven groups) and liquid invariants pass; the paint rewind check also fails on the unchanged baseline and remains an explicit open simulation reliability gap with its threshold retained. See [release record](../../RELEASE-ARRANGEMENT-2026-10-12.md).

Combined assembled verification: 618 unit/API/contract tests, both TypeScript configurations, all nine browser entries plus hosted server/MCP, 36 hosted browser checks and six MCP checks pass. An independent indexed-mesh pivot finding was fixed and covered by a sixth 3D browser group and dedicated unit regression. No paid generation. Production verification completed: 62 protected checks pass for 4cd4dc7 on dpl_FdLK8YsPYNFBfNT3kxiaojygqvWx. No paid inference. The known baseline paint rewind issue remains open separately.
