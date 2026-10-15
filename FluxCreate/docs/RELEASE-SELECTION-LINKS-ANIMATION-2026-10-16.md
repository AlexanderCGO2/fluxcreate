# Selection, linked editing and grouped animation — 2026-10-16

Release preparation in progress. Production still runs the preceding release until deployment evidence is recorded below.

## Delivered editor increments

- **Fluxfoto:** photo paint and erase respect rectangle, ellipse, lasso, compound, inverted and feathered selections. Each stroke keeps its own immutable selection and feather recipe, transformed into the photo's paint coordinates. Deselecting or changing the active selection does not alter earlier strokes; later photo transforms carry them together. Paint/erase affects only that photo and preserves its original bytes. PNG, PSD, portable copies and studio previews use the shared renderer.
- **Fluximiére:** separate a video's real soundtrack, or explicitly link one aligned video and audio clip. Move, trim, split, duplicate and delete from either member affect both in one Undo transaction. Existing source offsets and playback rates are preserved. Picture sound stays muted to prevent doubling. Measured source bounds, both locks, cancelled previews and stale imports guard edits. Native v2 and embedded native sources retain links; portable motion, Flux Exchange and EDL report loss of the link relationship.
- **Fluxiffects:** select keyframes across properties of one layer, then move, frame-nudge, drag, delete, copy or paste them together. Clipboard tracks share the earliest selected key as their anchor. Property identities, offsets, values and easing remain intact; pasted keys receive fresh IDs. Incompatible tracks, collisions, out-of-range times or project capacity failures reject the entire operation. Current-property controls coexist with total/per-property counts and Select all layer keys.

## Verification

Fluxfoto: **58 unit tests**, build and **135 browser groups** pass. Root independently reran the 16 new selection-paint groups. Actual pixels cover transformed and feathered selection edges, compound/inverted clips, erase alpha, later selection changes, PNG/PSD/studio rendering, native/autosave reopening, cancellation and one Undo. Exact-zero matrix canonicalization fixes native/IndexedDB equivalence without rounding nonzero geometry.

Fluximiére: **65 unit tests**, build and **77 browser groups** pass. Root independently reran the 19 new linked-editing groups and checked shared native envelopes/studio source retention. Before/after separation movies are byte-identical in the deterministic fixture. After move/trim/split at 1.5×, decoded stereo onsets are 1.5000625 and 2.1667083 seconds with correct sampled green/blue frames. Actual sources override intentionally inaccurate duration metadata. The unchanged ten-minute audio benchmark was not repeated.

Fluxiffects: **127 unit tests**, build and **16 new browser groups** pass, with independent review and rerun. Verification covers cross-property identity, atomic failure, global paste timing, capacity, locks, selection scope, gesture cancellation, committed exports and existing single-property/freeze behavior. Exact remaining regression evidence is recorded in the app's feature and workflow documents.

Frozen source hashes are checked before release assembly. Combined release gates pass: **680 unit/API/contract tests** across ten packages, strict app/fixture TypeScript checks, all nine app builds plus server/MCP App, **36 hosted browser checks** and **six packaged MCP checks**. No dependencies or lockfile changes. Publishing and protected production verification follow.

## Boundaries and next work

Photo paint remains bounded hard-round editing; soft/pressure brushes, retouch, richer layer hierarchy, adjustment layers and high-resolution performance work remain open. Linked timeline editing currently requires one video/audio pair with aligned extent and speed; J/L cuts, automatic synchronization, arbitrary groups and linked ripple/slip/rolling/slide remain open. Grouped animation stays within one layer; cross-layer selection, marquee/stretch, masks/mattes, precompositions, reverse/time remapping and durable render queues remain open. This release does not claim full Adobe parity.

Native linked timelines upgrade to v2 and stay v2 after unlinking. Older editors reject them instead of silently dropping links. Unlink keeps timing and mute state; moving/extending a pair may extend the sequence. Pair trim/split requires removal of fades. Original source media remains unchanged.

See the [gap tracker](FEATURE-GAPS.md), [ordered plan](superpowers/plans/2026-10-15-selection-links-animation.md), [photo selection-paint scope](../../Fluxoto/docs/PHOTO-PAINT-SELECTION.md), [linked-editing scope](../../Fluximiere/docs/LINKED-EDITING.md) and [animation gap plan](../../Fluxiffects/docs/FEATURE-GAPS.md).

No paid model requests, dependencies or payment activation are included. [Stripe credits](STRIPE-CREDITS-PLAN.md) remain planned after editor gap work, with BYOK and the agreed 50% contribution-margin target retained.
