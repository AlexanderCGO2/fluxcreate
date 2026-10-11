# Keyframe selection and retiming

Implemented in the source app on 9 October 2026. Selection is deliberately limited to one property on one layer in the active composition.

## Editing workflow

In Animate, select keyframe checkboxes or use **Select all keys**. Shift-click, Ctrl-click or Command-click timeline diamonds toggles keys in that same property. A plain drag on an already selected diamond moves the selected group; a plain click on another diamond selects that key. The inspector names the property and selection count. **Clear keys** or Escape clears selection outside a gesture.

Enter a signed change in seconds and choose **Move keys**, or use **−1 frame / +1 frame**. Each key receives the same delta, including pre-existing subframe offsets. Dragging rounds the delta to the composition frame rate. **Delete keys** and the Delete/Backspace key remove selected keys rather than the layer. Removing the final key in a property restores its existing base value. Other tracks and layers remain unchanged.

## Atomic edits and preservation

- A locked layer rejects moves and deletion. All selected IDs must still exist and be unambiguous.
- Every moved key must finish between zero and the composition duration. A collision within one microsecond of an unselected key rejects the whole move; no key is overwritten or silently removed.
- Moves retain each key's ID, value, easing and four custom Bézier controls. Outgoing easing follows its key. Native saved projects and recovery use the same existing keyframe schema; no new interchange format is introduced.
- Each accepted move or deletion is one undo entry. A zero delta or rejected operation makes no edit.
- Drag previews are local. Pointer cancellation, window blur, Escape, a changed project or a changed layer/property cancels them. Secondary buttons and foreign pointer IDs cannot start, alter or finish another pointer's gesture.
- Mutation commands and exported files use committed project state. Duplication or splitting during a drag can create a normal duplicate or split, but uncommitted preview times never enter the resulting layers, native copies, PNG/WebM exports or autosave. Canvas, timeline and value graph render the separate preview.
- Audio volume keyframes use the same evaluator as picture properties. Source media bytes, source offsets, speed, fades and mute are not changed by keyframe retiming.

The group operation does not include cross-property/layer selection, marquee selection, multi-property copy/paste, scale/stretch, velocity editing or spatial motion paths. These remain gaps. Existing bounded custom-curve and real-time WebM limits remain as documented in [CUSTOM-EASING.md](CUSTOM-EASING.md) and [AUDIO-EXPORT.md](AUDIO-EXPORT.md).

## Verification

`tests/keyframe-selection.test.mjs` checks immutable group moves/deletions, locks, stale and duplicate IDs, collisions, bounds, fractional frame deltas, native roundtrip and audio evaluation. `scripts/keyframe-selection-smoke.mjs` drives the actual editor through selection, group moves, deletion, undo/redo, locks, rejected operations, drag cancellation, pointer isolation, native save and reopen. It also checks duplication, splitting, native save and actual PNG/WebM export during an active preview against committed key times and geometry.

Final source verification on 9–10 October: the build, all 100 Node tests, 14 existing editor browser checks, the existing custom-curve browser/export test, and all eight new selection browser groups pass. No paid provider calls are involved. The active-preview PNG check uses exact pixel bounds; its WebM check separates committed and pending positions sufficiently to accommodate the documented real-time recorder's frame cadence. This does not claim deterministic frame timestamps.

The generated fixture shifts a quadratic custom position/volume curve by 0.2 seconds. The exported PNG at 0.7 seconds places the red box at pixels 90–109 (center 100), matching the source curve at 0.5 seconds. Independent WebM audio decode checks two channels, duration within 0.1 seconds of the 1.6-second composition, and gain within 0.015 RMS of the exact offline mix at 0.45 and 0.7 seconds. Native save/reload retains original WAV bytes and Bézier metadata. Results and a real editor screenshot are written under `artifacts/key-selection/`.


## Single-property clipboard — 11 October 2026

Select keys and choose **Copy keys**, select a destination layer and the same property, position the playhead, then choose **Paste keys at playhead**. Ctrl/Command+C and Ctrl/Command+V perform these actions outside text fields and dialogs. Copy also respects selected page text. The clipboard stays inside this editor tab and expires on reload; it never writes to the operating-system clipboard. Copying a locked layer is allowed because it does not change that layer. Paste requires an unlocked destination.

The earliest copied key lands at the playhead. Other keys retain their relative offsets **in seconds**, including subframe timing across compositions with different frame rates. Values and outgoing named/custom easing are copied; every pasted key gets a fresh ID. The source keys, source assets, clip selection, layer timing, playback speed and source offsets remain unchanged. A copied snapshot remains available if its source is later edited or removed.

The whole paste is rejected for a mismatched or unsupported property, invalid value or curve, locked destination, any key outside the composition duration, a collision within one microsecond, or the native limits of 10,000 keys per property / 100,000 per project. Existing keys are never replaced. Each accepted paste is one undo step; rejected attempts and Copy create no history entry. Copy/Paste cancels any pending key drag and reads committed keys; stale Undo and scope changes also discard the preview.

Compatibility is exact-property based. 3D model/camera keys remain supported between scene3d layers; volume is supported on audio/video layers; font size/tracking require text; fill/stroke require text or shapes; corner radius requires a layer whose renderer supports rounded bounds. Pasting transfers animation values, not a 3D source scene or a source clip. The current Animate property menu exposes numeric transform/media/3D properties; imported color/style tracks can be selected in their timeline tracks, but this increment does not add a color graph or new style-property menu.

Verification: the six clipboard model tests first failed on the missing API and then on missing capacity rejection, and now pass. The complete Node suite passes **106 tests** and the app build passes. The new **seven browser groups** exercise cross-layer copy/paste, one-step undo/redo, lock/property/collision/range rejection, native text/selected-page-text and shared settings/AI-dialog handling, committed copy during drag, accepted paste during drag, stale Undo, reload/native reopen and actual PNG/WebM output. Existing custom-easing and eight-group key-selection browser/export regressions also pass.

The copied quadratic position curve starts at 0.5 seconds and ends at 1.5 seconds. PNG output places the red rectangle at horizontal bounds 30–49, 90–109 and 270–289 at 0.5, 1.0 and 1.5 seconds. Decoded WebM samples check the same shifted motion with a bounded recorder-cadence tolerance; this remains real-time recording, not deterministic frame encoding. Evidence is in `artifacts/key-clipboard/results.json`, with a native reopened fixture and an editor screenshot alongside it. Run `npm run test:key-clipboard` after building. No paid provider calls, shared interchange changes, or deployment are part of this increment.
