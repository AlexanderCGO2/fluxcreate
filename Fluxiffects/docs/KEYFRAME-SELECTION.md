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

The group operation does not include cross-property/layer selection, marquee selection, copy/paste of keyframes, scale/stretch, velocity editing or spatial motion paths. These remain gaps. Existing bounded custom-curve and real-time WebM limits remain as documented in [CUSTOM-EASING.md](CUSTOM-EASING.md) and [AUDIO-EXPORT.md](AUDIO-EXPORT.md).

## Verification

`tests/keyframe-selection.test.mjs` checks immutable group moves/deletions, locks, stale and duplicate IDs, collisions, bounds, fractional frame deltas, native roundtrip and audio evaluation. `scripts/keyframe-selection-smoke.mjs` drives the actual editor through selection, group moves, deletion, undo/redo, locks, rejected operations, drag cancellation, pointer isolation, native save and reopen. It also checks duplication, splitting, native save and actual PNG/WebM export during an active preview against committed key times and geometry.

Final source verification on 9–10 October: the build, all 100 Node tests, 14 existing editor browser checks, the existing custom-curve browser/export test, and all eight new selection browser groups pass. No paid provider calls are involved. The active-preview PNG check uses exact pixel bounds; its WebM check separates committed and pending positions sufficiently to accommodate the documented real-time recorder's frame cadence. This does not claim deterministic frame timestamps.

The generated fixture shifts a quadratic custom position/volume curve by 0.2 seconds. The exported PNG at 0.7 seconds places the red box at pixels 90–109 (center 100), matching the source curve at 0.5 seconds. Independent WebM audio decode checks two channels, duration within 0.1 seconds of the 1.6-second composition, and gain within 0.015 RMS of the exact offline mix at 0.45 and 0.7 seconds. Native save/reload retains original WAV bytes and Bézier metadata. Results and a real editor screenshot are written under `artifacts/key-selection/`.
