# Freeze-frame copy implementation plan

> Use test-driven development and verification before completion. Root approved this bounded implementation after Foto and Premiere; no shared changes, new dependencies, commits or paid calls.

Create a still for the selected visible, unlocked video at the committed playhead. Decode raw source pixels in an isolated muted element at sourceIn + (time-start)*playbackRate. Add a normal embedded PNG image above the original, preserve the complete layer interval and picture transforms, parent, effects and picture keys, with new IDs. Hide and mute the unchanged original in the same single Undo transaction. Children keep their existing parents. No reverse playback or audio retiming is introduced.

1. RED: model tests for timing, atomic copies, budgets, unsupported selection/source and native/exchange compatibility; browser assertion for the missing action.
2. Implement pure capture preparation and atomic copy helper, bounded isolated decoder and cancellation cleanup. Limits: embedded video only; finite decoded duration <=86400 s; target in [0,duration); maximum 4096 per side and 8847360 pixels; PNG <=32 MiB; embedded project sources <=140000000 characters; existing 2000 assets/2000 layers per composition/5000 total layers/100000 keys limits.
3. Integrate action and cancel state. Reject/cancel stale project, selection, time, import, recovery, export, modal and key gestures. Never add partial assets/history. Explain whole-layer hold and original hidden/muted.
4. Verify real encoded footage with offset/nonunit speed; frame 0/end; raw pixels with animated parent/transforms/effects applied once; native reopen/Undo and portable/Premiere import; original silent and separate audio retained in decoded precise and explicit realtime export; cancellation/failure/busy guards. Run build, all unit tests and existing browser regressions.
5. Update bounds, gap status and historical integration pause documentation. Root independently reviews and reruns before release.

## Completion evidence

All planned product changes are implemented. Eight freeze unit groups and 15 browser groups pass; the full 118-unit suite and seven existing browser regressions pass. No dependency or shared-product changes were needed. Exact delivered scope and remaining retiming work are in FREEZE-FRAME.md. Root independently reviews/reruns before release.

Independent root review found no unresolved production issue. Its separate final browser rerun passed all 15 freeze groups with no runtime errors, confirming precise frame count/held pixels, stereo frequency evidence, native consistency and cancellation/recovery checks.
