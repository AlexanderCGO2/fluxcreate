# Multi-selection and arrangement release — 2026-10-12

Status: implemented and assembled; production verification pending.

## Delivered scope

- FluxDesign: page-local multi-frame selection, shared drag/nudge/numeric moves, rotated-bounds alignment and equal-gap distribution, atomic duplicate/delete and one-step undo. Locked/hidden/missing selections reject together. Exports and autosave use committed documents during gestures.
- Flux3D: numeric world rotation and uniform scale around the combined rendered geometry bounds center, with explicit Preview/Apply/Cancel. Per-object proportions, meshes, UVs and retained sources survive. Native, GLB and PNG exports use committed scenes during previews. Indexed mesh bounds ignore unreferenced vertices; the regression includes an unused distant outlier. Shared rotation/scale gizmos and hierarchy remain open.
- Fluxini: Shift-drag or explicit Box select, additive click selection and direct multi-node/selection-box dragging. One validated layout transaction preserves relative offsets. Cancellation, changed selection/project/revision and disabled editing discard previews and ignore late native callbacks. Graph layout changes leave evaluated scenes and exported PNG pixels unchanged.
- Maintenance: strict types for the paint/GPU developer browser fixtures and graph boundary harness, with application and fixture type checks in the release matrix.

## Verification and remaining issue

Feature browser evidence includes 11 FluxDesign multi-frame groups, six Flux3D group-transform groups, ten Fluxini direct-selection groups and five actual-component cancellation boundary groups. Existing editor regressions and independent reviews supplement those checks. The full assembled matrix passes 618 unit/API/contract tests across ten packages, with no failures or skips, plus application and developer-fixture TypeScript checks. All nine browser entries, hosted server and MCP App build. The hosted suite passes 36 browser checks and six MCP discovery/resource/origin checks. No paid requests were made.

The seven-group GPU particle fixture and liquid-physics checks pass. The existing paint rewind check remains intermittently above its pigment tolerance: the unchanged baseline reproduced about 0.00204 error against a 0.001 limit, and the typed fixture about 0.00210. Frame samples match between baseline and typed fixtures. Further probes found exact checkpoint copies and sampled trajectories; added GPU readbacks may suppress the intermittent difference, so no solver cause is established. The threshold is unchanged. This is a retained simulation reliability gap, not a regression claimed fixed by fixture typing. No production paint solver was changed.

## Next work

Persistent frame/scene groups, shared transform gizmos, rich threaded text, topology modeling, production simulation and durable cloud jobs remain open. See [feature gaps](FEATURE-GAPS.md) and the [batch plan](superpowers/plans/2026-10-12-multi-selection-and-arrangement.md).

The [Stripe credit plan](STRIPE-CREDITS-PLAN.md) records the user's confirmed 50% contribution-margin target after attributed costs and payment fees. It proposes explicit BYOK/managed funding, prepaid Checkout, a durable credit ledger, bounded quotes and verified settlement. It is planning only, sequenced after gap work; this release creates no payment products or charges.
