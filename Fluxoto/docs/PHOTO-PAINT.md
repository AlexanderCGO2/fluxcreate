# Selected-photo paint and erase

Implemented and verified locally. Suite deployment status is recorded separately.

Select one image layer, choose Brush or Eraser, and set Brush target to Selected photo. The inspector's Paint selected photo button selects that mode directly. The toolbar names the target and offers hard-round brush size (2–512 photo-local pixels), drawing color and stroke opacity (1–100%). Pointer release commits one undo step. Clear photo paint removes all local strokes in one reversible edit.

Separate stroke layer remains an explicit alternative: it creates the existing independent vector stroke layer, and its eraser removes the composite below it. Layer-mask painting remains its own Hide/Reveal mode. Photo painting instead renders paint/erase into only the selected image's local raster surface. Erase reveals lower layers; it never erases their pixels. Photo painting requires a single visible, unlocked image with a decoded source. Start inside its frame. Active pixel selections are rejected with a visible Deselect instruction; selection-clipped brush editing is not implemented.

Sample color (I) reads the visible canvas RGB, including compositing and adjustments, then returns to Brush. It does not change the document or sample the unadjusted original. Fully transparent pixels are rejected; partial alpha supplies the displayed RGB and does not change brush opacity. The brush diameter is in the retained photo-local coordinate basis. Rotation and later uniform/nonuniform resizing transform edits with the image; a nonuniform resize can make round marks elliptical.

## Source preservation and rendering

The original image src and retained suite-source document remain unchanged. Native version 1 accepts an optional image-only paint object with width/height and ordered strokes. Each stroke records paint/erase mode, size, six-digit color, opacity and local points. It is an editable replay recipe rendered into an isolated raster surface, not a new composite stroke layer or a destructive replacement of source pixels. The native file and undo retain this recipe. No adjustment-layer or general retouch architecture is added.

Order: source image, local paint/erase, Levels, Curves, layer mask, then existing appearance filters/compositing. This same path supplies PNG/JPEG, PSD pixel layers/composite, portable exports, selected-pixel copy and studio-source snapshots. Portable baking clears paint/Levels/Curves/mask after applying them once. Direct model conversion warns if rendering is skipped. PSD retains rendered pixels, not the native editable stroke recipes. Empty/absent paint bypasses additional rasterization and retains legacy transformed PNG bytes.

Save original photo still downloads the original image bytes. Replacement/relink deliberately retains local strokes, just as it retains mask and frame: paint overlays the new source and previous erased regions remain erased. Clear photo paint or Undo removes those effects when desired. Studio snapshots retain the full original native document separately.

## Gesture safety and bounds

An unfinished photo stroke lives in isolated preview state. Autosave, Save project, portable export, AI and history see only committed artwork. Save during a stroke captures its pre-stroke document. Escape, blur, pointer cancellation/lost capture, tool/target/selection/mask changes, import, undo, or a committed edit discards the preview; stale releases cannot revive it. Only the owning pointer can finish or cancel it. Other legacy gesture modes were not rearchitected in this batch.

Photo painting supports frames/bases up to 8192 pixels per side and 16 megapixels, 256 strokes, 4096 points per stroke and 16384 points per image layer. Invalid/nonfinite/coerced data, unsupported modes/colors and out-of-bounds values are rejected on native load. If an in-progress gesture reaches a limit, that gesture is canceled with a message; committed artwork survives. Strokes clip to the image frame. The renderer retains its existing 8192-side / 32 MP temporary-surface bound for later transformed/export rendering. This is 8-bit main-thread rendering; large-photo performance remains unprofiled.

Paint geometry and original image bytes are excluded from ordinary AI planner context. Ordinary allowed AI edits retain paint; AI cannot create or rewrite photo paint.

## Local evidence

RED: four initial unit groups failed for missing native paint preservation/validation and target/coordinate operations; the browser failed because Brush target did not exist. Review added failing tests for nested paint geometry in AI context and committing after lost pointer capture. Both were fixed before final verification.

GREEN: 53 unit tests and build pass. The photo-paint script has 18 real Edge groups covering local RGB/alpha, target-only erase over a lower layer, opacity, sampling, rotated and nonuniformly resized coordinates, source downloads/replacement, one undo/redo and clear, lock/hidden/missing/multi-target rejection, active-selection rejection, long-preview autosave/native/portable isolation, cancellation/stale gestures/pointer ownership, native reopen/reload, PNG/independently decoded PSD, studio preview/original preservation, Levels/Curves/mask order, neutral PNG identity and the legacy separate-stroke mode. Independent review reran all 18 groups without runtime errors.

Existing regressions also pass: 13 Curves, 17 channel Levels, 5 photo-source, 11 PSD, 25 editor, 12 recovery, 4 gesture, 16 layer-order, 6 selection, 5 delayed-selection cancellation and 8 editing groups. The editing fixture previously read the initial demo layer count before asynchronous reload hydration completed; its final check now waits for the loading veil to disappear and asserts the restored title and exact four-layer count. No production behavior or expected result was weakened. No paid provider calls or new dependencies.

Run node --test tests/*.test.mjs, node scripts/build.mjs and node scripts/photo-paint-smoke.mjs (npm run test:photo-paint). Reports/screenshot are under artifacts/photo-paint. Selection/cancellation scripts require their local server on port 4321.

Still open: selection clipping, hardness, pressure/tilt, stroke flow, spacing, smoothing, brush footprint/presets, clone/healing/patch tools, painting text/shapes in place, color management/high bit depth, and large-photo performance profiling. This closes only the bounded selected-photo paint/erase target; the broader retouching and brush gaps remain partial.
