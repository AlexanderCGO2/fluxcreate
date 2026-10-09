# Fluxfoto optimization audit

Inspected the current layer model, Canvas renderer, file import, native exchange, AI context, history and editor lifecycle. Priorities below reflect those observed paths.

| Priority | Improvement | Status and evidence |
| --- | --- | --- |
| P0 | Real layered Photoshop import with truthful compatibility | Implemented: PSD/PSB decoding, original raster pixels, offsets/order/common blends, editable simple text and pixel masks. Unsupported features reported. Genuine PSD+PSB fixtures and browser import passed. |
| P0 | Prevent expensive bitmap allocations from oversized files | Implemented: header checks before PSD parse, raw-data parsing followed by layer/mask/count/depth/pixel checks before decoding. Photos constrained to45 MB/32 MP. Malformed, oversized and unsupported headers reject. |
| P0 | Preserve original photo pixels during masking | Implemented: separate validated mask bitmap+brush strokes; hide/reveal, disable/remove, resize, undo and save. Browser alpha checks and source-string identity prove original pixels stay intact. |
| P0 | Avoid asynchronous imports overwriting concurrent edits | Implemented: import guard, loading veil and keyboard guard; parse/validate before one history commit. Failed Photoshop import leaves the full prior project unchanged. |
| P1 | Preserve masks across suite handoffs | Implemented: render only masked layers to portable PNG assets while native source retains editable masks. |
| P0 | Bound portable exports of very large native layers | Implemented: at most 8192 px per side and 32 MP per portable mask surface, including the outer export canvas; temporary canvases released promptly. A real 16384-square layer exports correctly without any oversized allocation. Native layer dimensions and editable sources remain intact. |
| P1 | Preserve Photoshop mask density and fill opacity | Implemented: density also affects the area outside saved mask bounds; zero/partial fill opacity combines with layer and group opacity. Styles with independent fill opacity receive explicit notices. Genuine PSD regressions verify source pixels stay unchanged. |
| P1 | Bring reviewed FluxLab results into the document | Implemented: preview a generated image or editable text, then add as one undoable layer. Failed imports keep the review open. |
| P1 | Make rectangle rounding discoverable | Implemented: explicit Corner radius inspector with bounds and real pixel regression. |
| P1 | Avoid exporting unresolved image placeholders | Implemented: PNG/JPEG export awaits source+mask decoding and rejects failed image decoding. |
| P1 | Avoid re-rendering unchanged mask strokes | Implemented: weak cache keyed by immutable mask state. Original image cache supports the tested Photoshop layer budget. |
| P1 | Improve interactive painting on large photos | Next: decouple preview resolution from full-resolution export; incrementally update mask tiles or use OffscreenCanvas. Current preview renders full canvas dimensions and one mask surface. Profile32 MP photos first. |
| P1 | Reduce history/validation overhead for photo projects | Next: preserve immutable image/mask references and use revision comparisons instead of complete JSON serialization per edit. Current40-step history is correct but repeated validation and stringification grow with embedded photos. |
| P1 | Make long imports cancellable | Next: decode in a dedicated worker with progress, cancellation and generation checks. Current bounded import is atomic but parser work is synchronous. |
| P2 | Broaden photographic format support | Next: bounded TIFF decoder, then investigate camera RAW through a supported conversion pipeline. Do not claim these formats until real fixtures and pixels pass. |
| P2 | Improve Photoshop appearance fidelity | Next: clipping masks, isolated groups, vector paths, style rendering, ICC conversion, more text transforms. Existing notices explicitly identify these gaps. |
| P2 | Add mask ergonomics | Next: softness/density, invert, grayscale overlay, mask thumbnail, selection tools and pressure-sensitive strokes. Current masks support hard round hide/reveal strokes. |

Validation: 17 Node tests, 10 Photoshop/photo browser workflows, 3 portable mask browser checks and 25 existing editor browser checks. Reports and exported PNG/native files live in artifacts/photoshop and artifacts/browser.


## Recovery continuation — 2026-10-09

Invalid autosaves and read errors now pause autosave and show explicit recovery actions. Preview edits, malformed recovery files and FluxLab handoffs cannot overwrite the original stored data. When the raw record is readable, Download saved data preserves it for recovery. A successful native project open or explicit New resumes saving. Async imports capture document identity/revision and reject late results after edits.

Verified with 12 isolated browser recovery checks and the 25 existing editing/import/export browser checks. The actual user's browser data was not touched.

## Layer ordering and PSD export — 2026-10-09

Drag ordering now supports mouse/touch, insertion markers, keyboard alternatives, long-list scrolling, locked-layer protection, cancel, undo/redo and persistence. All 16 focused browser checks pass; the existing 25 editor browser checks also pass.

Layered PSD export writes RGB/8-bit rendered pixel layers with names/order, visibility, opacity, supported blending and lock metadata. Text, shapes, masks and filters are baked into each layer; source controls remain editable in native Fluxfoto files. Content outside the canvas is clipped. Canvas-wide erasers use a visible merged appearance plus a hidden group of original rendered layers. Exports are bounded to 200 layers, 48 megapixels of retained raster surfaces and 64 MB. All 11 PSD decode/reimport/pixel browser checks pass. This verifies the generated file with the installed PSD reader and Fluxfoto, not a manual Photoshop desktop opening.

See [the full Photoshop gap audit](PHOTOSHOP-FEATURE-GAPS.md) for remaining selections, painting, retouching, groups, adjustment layers, editable PSD fidelity and other tools.

### Parallel gap continuation (2026-10-09)

Combined selection algebra, source-preserving cut/hide, isolated copy/paste and separate fill now have actual pixel/undo checks. Flat multi-selection and atomic batch operations have lock/order/reload coverage. Detailed boundaries and evidence are in PHOTOSHOP-FEATURE-GAPS.md; the shared release record determines deployment status.
