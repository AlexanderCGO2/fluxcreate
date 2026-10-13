# Freeze-frame copies

Delivered locally on 2026-10-13. Select a visible, unlocked video layer, move the playhead inside it, and choose **Create freeze-frame copy** in the inspector. The chosen frame becomes an ordinary PNG image layer directly above the video, holding for the original layer's **whole start/end interval**. This does not insert a hold from the playhead onward or reverse the movie.

The action hides and mutes the original video and selects the still in one Undo transaction. Original embedded video bytes, source in, rate, audio settings and keys remain on the original layer. Separate audio is unchanged. Undo restores the video; showing/unmuting it later is an explicit normal layer edit. The still has no audio or media-retiming fields.

Capture uses the committed playhead and sourceIn + (playhead - layer.start) * playbackRate. A separate muted, paused video element waits for source loading and exact seeking before its decoded pixels are drawn. It never seeks, plays or disposes preview media. Raw source pixels are captured before any layer processing. The new image keeps width/height, anchors, placement, parent, blend, effects and picture keys, with fresh layer/effect/key IDs, so picture processing happens once. Existing children keep their original parent references. The still can be moved, trimmed, split and animated through ordinary image controls.

## Bounds and failure behavior

- Embedded base 64 video sources only. Missing, external and temporary blob sources require importing/relinking an embedded video first. Browser codec support still determines decodability.
- Playhead must be inside both composition and layer, including start and excluding end. Finite source in is 0–86400 s; constant rate is 0.1–16×. Actual decoded duration must be positive, finite and at most 24 hours, with source time in[0,duration). Source frame zero is supported; no silent clamp to the final frame. Saved asset metadata does not override decoded duration/dimensions.
- Source dimensions at most 4096 per side and 8,847,360 pixels; no automatic downscale. PNG at most 32 MiB. Total embedded source strings at most 140,000,000 characters (about 100 MB). Existing native limits remain:2000 assets,2000 layers per composition,5000 project layers,100,000 keys, plus the native 200,000,000-character JSON budget and all native model validation before commit.
- Loading and seeking each time out after 15 seconds. Cancel releases the owned video/canvas; no partial PNG asset, layer or history entry is exposed. The browser can use temporary codec/PNG allocations before the post-encode PNG byte check; a streaming decoder or strict process-memory cap is not claimed.
- Requests are single-flight. Changing project/source/selection/playhead, starting an import, opening another workflow, or restarting playback cancels an in-flight capture. Recovery, export, imports, open dialogs and held/moving keyframe gestures block new captures. Failed decoding or stale completion changes nothing.

## Saved projects and other studios

No new native time-mapping schema was added. Native save/reopen retains the PNG and original video. Flux exchange retains both through its existing source snapshot and 16 MB envelope limit. Premiere's current motion importer receives a visible image and an opacity-zero/muted original video. Its existing conversion warning for animation/effects/parenting still applies; matching editable rendering in other apps is not claimed. Fluxini's existing unsupported-media warnings remain. Export a movie from Effects when the exact composition appearance is required.

## Verification

Eight Node groups cover source timing, picture-only key copying, fresh IDs, no mutation, stale sources, invalid selection, native counts and media/PNG byte caps, and complete native validation. The API and inspector action were absent in the RED baseline. The final-native-validation test separately reproduced missing validation before the fix.

The browser fixture generates a real 8-color video with 440 Hz audio. Source in 0.5 s and 2× speed at composition 0.5 s capture the magenta frame at source 1 s. Decoded raw PNG is magenta; animated parent/child placement and 50%brightness give the same rendered pixels before and after capture, once. Frame zero, last frame, beyond-source time, undecodable bytes, actual dimension limits and spoofed metadata are exercised.

Fifteen browser groups also cover one-step Undo/Redo, save/autosave/reopen, ordinary image move/trim/split, native/exchange/Premiere import, cancellation during PNG encoding, selection/playback/import/export/edit races, held and moving key gestures, lock/hide and recovery. Real precise output has 10 frames for 1.25 s at 8 fps; several later frames hold the still. Both precise and explicit real-time exports are independently decoded, retaining separate 880 Hz stereo audio while the original 440 Hz movie tone is absent. Real-time frame cadence retains its documented limitations.

Run node scripts/freeze-frame-smoke.mjs (or pnpm test:freeze). Ignored artifacts/freeze/ contains the native fixture, screenshot, both movies and measured results. Build and all 118 Node tests pass. Existing precise export, audio, editor, easing, key clipboard, key selection and recovery browser suites pass. Root performs independent review and browser verification before release.

Remaining retiming scope: reverse playback, animated time remapping, freeze-at-playhead insertion/ripple, pitch-preserving stretch, frame blending/optical flow and broader codec qualification.

Independent root review found no unresolved production issue. Its separate final browser rerun passed all 15 freeze groups with no runtime errors, confirming precise frame count/held pixels, stereo frequency evidence, native consistency and cancellation/recovery checks.
