# Photo paint, slide and freeze-frame release — 2026-10-13

Release preparation in progress. Production still runs the preceding release until deployment evidence is recorded below.

## Delivered editor increments

- **Fluxfoto:** paint or erase directly on a selected photo while keeping its original file intact. Explicit target, hard round brush, opacity, RGB sampling and a separate gesture preview. Ordered paint data uses photo-local coordinates and follows later transforms. Shared rendering carries the result into PNG/JPEG, PSD, portable copies and studio previews. Erasing changes only the selected photo. One Undo per completed stroke; cancellation, locks and native reopening are covered.
- **Fluximiére:** slide a clip between two adjacent clips of the same media type and track. The selected clip keeps its duration and source content while both neighbours trim together; outside endpoints stay fixed. Source handles, playback speeds, decoded duration, locks, fades and overlaps validate before applying. Numeric, frame, keyboard and pointer controls share an isolated preview and one Undo.
- **Fluxiffects:** create a still copy from an embedded video's frame at the playhead. Capture happens before transforms/effects, using the video's source offset and playback rate. The ordinary image layer retains picture animation, parenting and effects for the whole original duration. The preserved original video is hidden and muted in the same edit; other audio remains unchanged. One Undo restores the original arrangement.

## Boundaries

Photo painting is bounded hard-round editing: selection clipping, pressure/flow, soft or textured tips, clone/healing and high-resolution performance work remain open. Slide currently handles three independent picture or audio clips; linked A/V and broader trim workflows remain open. Freeze-frame copies are whole-layer holds from embedded, browser-decodable video; reverse playback and general time remapping remain open. These increments do not claim full Photoshop, Premiere or After Effects parity.

See [current gaps](FEATURE-GAPS.md), [ordered batch plan](superpowers/plans/2026-10-13-ordered-editor-gaps.md), [photo paint](../../Fluxoto/docs/PHOTO-PAINT.md), [slide editing](../../Fluximiere/docs/SLIDE-EDITING.md) and [freeze-frame copies](../../Fluxiffects/docs/FREEZE-FRAME.md).

## Verification

Fluxfoto: 53 units, build and 18 new browser groups, independently rerun. Existing editor, source, correction, selection, mask, PSD, layer-order, gesture and recovery checks pass. Review reproduced and fixed lost-pointer-capture cancellation and removed paint geometry from the AI context. The existing reload fixture now waits for hydration before checking the restored document.

Fluximiére: 52 units, build and 12 new browser groups, independently rerun. Existing editor/import, ripple, slip and rolling checks pass. A decoded movie preserves neighbouring sound cues while moving selected sound by 0.4 seconds at 1.5×. Review reproduced and fixed playback-during-preview and a second pointer starting a conflicting legacy drag.

Fluxiffects: 118 units, build and 15 new browser groups, independently rerun; seven existing browser regressions pass. Actual offset/rate source pixels, animated parent/child placement and effects match before/after. Precise and real-time exported movies retain the still at later sample times, suppress the original video tone and retain separate stereo sound. Native/exchange source retention, reported Premiere conversion limits, ordinary still move/trim/split, Undo/Redo/reopen, cancellation, limits and recovery are covered.

Combined release gates pass: **653 unit/API/contract tests** across ten packages, strict app and fixture TypeScript checks, all nine app builds plus server/MCP App, **36 hosted browser checks** and **six packaged MCP checks**. No dependencies or lockfile changes. Publishing and protected production verification follow.

No paid model calls or payment activation are part of this release. [Stripe credits](STRIPE-CREDITS-PLAN.md) remain planned after the editor gap work, with BYOK and the confirmed 50% contribution-margin target retained.
