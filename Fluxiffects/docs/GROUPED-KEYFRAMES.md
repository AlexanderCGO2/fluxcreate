# Keyframes across properties of one layer

Delivered locally on 16 October 2026 (15 October implementation plan). Select animation keys across multiple properties of the selected layer, then move, nudge, drag, delete or copy the selection as one operation. This extends the existing keyframe workflow without changing the native document or renderer.

## Selection and editing

In Animate, check keys in one property and switch to another property to add more. Shift/Ctrl/Command-click timeline diamonds also toggles keys. **Select all keys** keeps its previous meaning: replace selection with all keys in the current property. **Select all layer keys** selects all existing tracks on this layer. The inspector shows total keys, property count and readable per-property counts. A plain click on an unselected diamond starts a new single-key selection; dragging an already selected diamond moves the entire selected group.

Property changes retain the selection. Leaving the project, composition or layer clears it permanently. Deleted keys are excluded from live selection; within the same scope, Undo restores their previous selection so a subsequent Delete still acts on keys rather than unexpectedly deleting the layer. Clear keys or Escape clears selection explicitly.

Move by seconds, ±1 frame, drag and Delete apply one common time change or deletion to every selected property. Drag snaps the delta to the composition frame grid; existing relative/subframe offsets are retained. Keys keep IDs, values and outgoing named/custom cubic easing. Removing a property's last key restores its base value. Every accepted edit is one Undo; zero moves and failures create no entry.

All selected tracks must be compatible with the layer. Imported inert unsupported tracks cause the whole grouped operation to fail; they are never silently skipped. A locked layer blocks move/delete/paste, while Copy remains read-only. All moved keys must finish inside the composition, and a collision within one microsecond of an unselected key rejects the whole group. Source bytes, layer start/end, source in, playback speed, fades and mute remain unchanged.

## Clipboard and compatibility

Copy is an internal, detached snapshot that expires on reload and never writes the operating-system clipboard. A multi-property paste targets the original property names on one compatible layer, regardless of the current inspector property. A single-property packet retains its existing rule: select that same property before pasting. No property is remapped to a different type.

The earliest selected key across all tracks lands at the playhead. Each track carries its separate offset from that global anchor; its own keys remain relative to its first key. For example, position at 0.2 s and volume at 0.4 s pasted at 2 s begin at 2 s and 2.2 s. Offsets stay in seconds across differing composition frame rates. Pasted keys get fresh IDs and preserve values, easing and Bézier controls. Asset and media settings do not transfer.

Paste rejects every track together if any track has a collision, unsupported property, malformed offset/value/curve, invalid time or locked destination. Capacity is summed across the bundle before any result: existing native limits remain 10,000 keys per property and 100,000 per project. A frozen PNG image accepts picture-property bundles; a bundle containing volume requires an audio/video destination. Font properties require text, and scene/model properties require scene3d layers. Existing compatibility rules also apply to style/color tracks.

## Drafts, shortcuts and exports

The canvas, graph and timeline render a separate drag draft. Autosave, native/PNG/WebM export, Copy, Duplicate and Split read committed state. Copy/Paste cancels pending key gestures. Escape, pointercancel, blur, property/layer/composition change or a stale document discards the draft. A second pointer cannot replace the active key gesture or start legacy clip dragging through it.

Delete/Backspace and Ctrl/Command+C use the total selection, including keys outside the active property. Ctrl/Command+V pastes the clipboard as above. Text inputs, selected page text and open dialogs retain the existing clipboard behavior. Freeze-frame capture continues to reject held/moving key gestures. Timeline volume labels now show fractional gain with two decimals, consistent with opacity.

## Verification and limits

Nine pure-helper groups were RED before the grouped API existed and now pass. Browser RED checks reproduced discarded cross-property selection, foreign pointerdown stealing a gesture, foreign clip dragging mutating the document, and fractional gain displayed as zero. Existing selection regression also caught deletion followed by Undo losing key selection; the final implementation preserves that behavior.

The sixteen grouped browser groups verify UI counts, numeric/frame/drag operations, one Undo/Redo, scope changes, foreign pointers and cancellation, global-anchor paste, 24 fps destination offsets, second-track collision atomicity, frozen-image compatibility, duplicate/split, native save/reopen and exchange. A real video fixture has position/opacity/volume curves with different start times. During a held grouped preview, actual PNG and independently decoded precise WebM still use committed keys. The 4-second/10 fps movie has 40 frames. After a 0.3-second grouped move, sampled picture pixels match the earlier frame exactly, and decoded stereo gain retains the same timing and right/left ratio.

The final build and all 127 Node tests pass. Existing browser suites pass: single-property clipboard 7 groups, selection 8, freeze 15, precise export 1, audio 2, editor 14, easing 1 and recovery 6—54 existing groups plus 16 new grouped groups (70 total). Root independently reviewed the source and reran all 16 new groups with no runtime errors. The small fractional-gain display fix has an additional focused RED/GREEN browser check and is asserted in the final grouped fixture.

Run pnpm test:grouped-keys or node scripts/grouped-keyframes-smoke.mjs. Ignored artifacts/grouped-keys/ contains exact results, native fixture, screenshot, committed/moved movies and existing regression logs. No new dependency, paid call, shared file, native schema, renderer or audio-engine change was needed.

Remaining: cross-layer selection, marquee selection, stretch/scale timing, spatial paths, velocity editing and broader After Effects animation parity. This release does not add those features.
