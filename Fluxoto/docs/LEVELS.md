# Photo Levels and source histogram

Implemented and verified locally. Deployment status is tracked in the suite release record.

Select one photo layer and expand Photo Levels. Choose RGB, Red, Green or Blue to inspect and edit its Levels. The histogram follows that choice and samples the decoded original image at up to 512 pixels per side, before Levels, other adjustments or masks. Counts are alpha-weighted; fully transparent pixels are excluded. Switching channels reuses the sampled histogram. This is not a full-resolution document histogram or managed-color measurement.

Each choice has black and white input points (0–255, black strictly below white), gamma (0.1–10), and output black/white (0–255, black no greater than white). Equal output endpoints produce a flat channel. RGB affects all three channels first; Red, Green and Blue then independently affect their corresponding channel. Each stage clamps the input range, applies gamma with exponent 1/gamma, scales to its output endpoints and rounds to 8-bit values. Alpha is unchanged by Levels.

Draft numeric edits and channel switches do not alter artwork. Apply Levels commits all channel changes together in one undo step. Reset current prepares neutral input/output values for the chosen channel; Reset values prepares neutral values for RGB and all three channels. Both need Apply and preserve the enabled checkbox. Enable Levels bypasses the operation without erasing saved parameters. Locked/recovery/importing states disable edits. Changing selection or committing a document edit discards stale drafts. The histogram remains mounted through unrelated edits to avoid repeated image decoding.

## Native compatibility and rendering

The existing native version and top-level enabled/black/white/gamma fields remain unchanged. Old objects normalize to their previous shape and render byte-for-byte identically. New optional outputBlack/outputWhite default to 0/255. New optional channels accepts red, green and blue objects, each with black/white/gamma (defaults 0/255/1) and optional outputBlack/outputWhite (defaults 0/255). Malformed channel objects, unknown channel names, nonfinite/coerced numeric values and invalid ranges are rejected. A channel has no independent enabled state; the existing global enabled flag controls the whole operation.

Native files preserve original source bytes and editable Levels. Rendering applies the combined RGB lookup, then independent channel lookups, then the mask and existing appearance filters/compositing. PNG/JPEG and separate PSD pixel layers use the rendered result. Portable motion/Exchange rasterizes adjusted layers once and clears baked controls; native originals retain the controls. Direct model conversion emits a warning when callers omit portable rendering. Embedded studio snapshots use the same photo renderer, retaining the original native source document separately.

Neutral combined, output and channel values bypass extra rasterization. Fresh PNG exports of a fractional-size, rotated photo are byte-identical before and after applying explicit neutral values; portable output retains the exact original source. Tests use fresh export canvases because repeated reads of Chromium’s interactive canvas can switch rendering backends and change antialiased edge rounding even for unchanged artwork.

Temporary surfaces stay within the existing 8192-side / 32 MP limits and are released after drawing. Levels uses 8-bit main-thread raster surfaces. At partial alpha, browser premultiplication can round displayed RGB by a unit; this does not change the alpha value or stored source bytes.

## Verification

- Full unit suite: 44 passing tests, including five new channel/output groups for native validation, bounded controls, independent RGB mapping, all 256 legacy input values, alpha, neutral bypass, and atomic AI scope/lock checks.
- Build passed. Channel browser script: 17 passing groups including the nine existing Levels groups, actual RGB pixels, source histogram, explicit Apply/one undo, invalid output ranges, current/all reset, enabled bypass, native/autosave reload, portable baking, independently decoded PSD composite and pixel layers, studio-object preview, stale selections/document edits and locks.
- Rotated grayscale input with partial alpha is independently toned; explicit neutral channel/output values retain byte-identical transformed PNG output.
- Existing photo-source browser regression: five groups, now with channel controls in the source replacement fixture; original source downloads remain byte-identical. Existing layered PSD regression: 11 checks. No browser runtime errors in these runs. No paid model calls.

Run node --test tests/*.test.mjs, node scripts/build.mjs, node scripts/levels-channels-smoke.mjs, node scripts/photo-source-smoke.mjs and node scripts/psd-export-smoke.mjs. Browser reports and screenshots are under artifacts/levels-channels, artifacts/photo-source and artifacts/psd-export.

Still missing: separate adjustment layers, Curves, live preview before Apply, presets, color-managed/high-bit-depth processing, full-document histogram, pixel readout/clipping warnings and large-photo performance profiling. The bounded renderer does not resolve the 32 MP performance backlog.
