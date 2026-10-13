# Photo Curves

Implemented and verified locally. Hosted deployment is tracked by the suite release record.

Select one photo layer and open Photo Curves. Choose combined RGB, Red, Green or Blue. The graph shows the selected draft curve; edit its numbered input/output fields, add a point, or remove an interior point. Add inserts into the largest input gap. Each curve allows 2–16 points with whole-number coordinates from 0 to 255. Input positions must increase strictly; first and last inputs remain 0 and 255. Endpoint outputs are editable and curves may slope downward. Endpoints cannot be removed. There is no drag-only interaction: all editing uses keyboard-accessible numeric controls and buttons.

Interpolation is deliberately piecewise linear between adjacent points, with no spline overshoot. Each stage rounds to the nearest 8-bit value. The render order is Levels (combined then channels), Curves (combined RGB then each separate channel), mask, and existing appearance filters/compositing. Curves never changes alpha or stored source bytes. At partial alpha the browser's premultiplied color conversion can round displayed RGB by one unit.

Edits and channel switches affect only the draft graph. Apply Curves commits every curve together as one undo step; there is no live artwork preview before Apply. Reset current curve and Reset all curves prepare identity values and require Apply. Reset retains the enabled setting. Enable Curves bypasses rendering without discarding saved points. Invalid inputs cannot apply. Changing selection, undo/redo, replacement, or any committed document edit discards stale drafts. Locked, recovery and importing states disable controls.

## Native and output compatibility

Native version 1 gains an optional per-image curves object: enabled defaults true, points defaults [[0,0],[255,255]], and optional channels maps red/green/blue to their own point arrays. Unknown curve properties/channel names, invalid arrays, noninteger/nonfinite/coerced coordinates, invalid endpoints, unordered or overlapping inputs, and more than 16 points are rejected. Existing projects without curves keep that field absent. Curves is not supported on shape/text/stroke layers and is not added to the AI command allowlist.

Original photos, native editable curves and retained studio source documents remain intact. Photo replacement/relink preserves curves, mask and frame. PNG/JPEG, PSD raster layers/composite, portable scenes and studio snapshots share the renderer. Portable exports bake active adjustments and masks once and clear baked controls; native originals retain them. Direct model conversion warns if a caller omits portable rendering. A PSD contains rendered pixels, not Photoshop editable Curves adjustment layers.

Identity curves, including extra points along the diagonal and neutral separate channels, bypass extra rasterization. This preserves legacy transformed-image rendering. Temporary canvases use the existing 8192-side / 32 MP bound and are released. Processing remains 8-bit and runs on the main thread; this is not a large-photo performance improvement or managed-color workflow.

## Local verification

- RED: four new unit groups first failed for missing native retention/validation and pixel mapping. The browser test failed because Photo Curves did not exist. An expanded browser run then exposed duplicate inspector identities; a unique Curves identity fixed that state collision.
- GREEN: all 48 unit tests pass, including strict validation, all 256 identity inputs, RGB/channel mapping, Levels ordering, alpha and legacy absent-field compatibility. Build passes.
- Curves browser: 13 groups pass against real Edge pixels: explicit Apply, one undo/redo, editable endpoints and bounded insertion/removal, invalid drafts, current/all reset, bypass, locks, stale selections/edits, source replacement/relink and original downloads, native/autosave reload, PNG, portable and independently decoded PSD composite/layer pixels, studio source preservation, grayscale/partial alpha and byte-identical neutral transformed PNG.
- Existing regressions pass: 17 channel Levels, 5 photo source, 11 PSD, 25 editor, 8 editing, 6 selections 16 layer ordering, 12 recovery, 4 gesture and 5 delayed-selection cancellation checks. The selections script requires a local server on port 4321. No paid provider calls or new dependencies.

Run node --test tests/*.test.mjs, node scripts/build.mjs and node scripts/curves-smoke.mjs (or npm run test:curves). Curves evidence is under artifacts/curves.

Still open: smooth spline/freehand curves, curve presets, graph dragging, live photo preview, adjustment layers, Photoshop editable adjustment import/export, high bit depth/color management, clipping readouts and large-photo profiling.
