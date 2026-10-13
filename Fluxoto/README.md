# Fluxfoto

A local layered image and graphic design studio in the FluxCreate suite. Start at **http://localhost:4321** after running `node scripts/build.mjs` and `node scripts/serve.mjs`. Keep the sibling `FluxCreate`, `FluxExchange`, and `Fluxiffects` projects beside this folder: they supply the suite shell, shared AI service, and portable scene model.

## Create and edit

- Editable demo poster with independent typography, shapes, and gradients.
- Canvas move and resize handles, numeric transforms, opacity, layer ordering, visibility, locks, duplication, and deletion.
- Selected-photo paint/erase: explicit photo target, hard round size/color/stroke opacity, canvas color sampling, isolated previews and one undo. Originals remain intact; native and exports retain the result. See [Photo painting scope and verification](docs/PHOTO-PAINT.md).
- Separate-stroke Brush and eraser mode stores strokes as editable layers. An eraser mask removes the composite below it; reorder or hide it to change its effect.
- Text, rectangle, ellipse, solid/gradient fill, blend modes, brightness, contrast, saturation, and blur. Rectangle corners have an explicit radius control.
- Nondestructive layer masks: add a mask in Properties, choose Edit mask, then Hide with brush or Reveal with brush. Disable, remove, undo, resize, save and reopen masks without changing original image pixels. The separate Eraser tool still removes the composition underneath its stroke.
- Photo Levels: combined RGB and independent Red/Green/Blue input, gamma and output controls, with a sampled source histogram, explicit Apply and one-step undo. Reset current or all channels; original image bytes remain editable. See [Levels details and verification](docs/LEVELS.md).
- Photo Curves: combined RGB and independent channel curves with a visible graph, 2–16 numeric control points, linear interpolation, reset/bypass and explicit Apply/one undo. Originals and alpha remain intact; see [Curves scope and verification](docs/CURVES.md).
- Crop by dragging a region; resize canvas with optional content scaling. Undo/redo keeps the last 40 edits.
- Local PNG, JPEG, WebP, GIF (first frame), and SVG import by file picker, drag/drop, or paste. Images stay embedded in the saved project.
- IndexedDB autosave on this device and origin. Save a project file for a portable backup.

## Compatible formats

- `.fluxoto` saves the full native project and a validated portable Fluxiffects scene inside a versioned FluxCreate envelope. Other suite studios can import the portable scene; reopening in Fluxfoto restores all native editing details.
- Open compatible FluxCreate projects, native Fluxiffects/AE bridge JSON, or `.flux.md` exchanges. Import reports unsupported motion, video, parenting, and other differences.
- `.flux.md` exchanges retain editable text, shapes, supported transforms and adjustments. Brush strokes travel as SVG image layers. Eraser masks stay native; export PNG for their exact composite appearance.
- Full-resolution PNG (including transparency) and JPEG export. Bounded layered-raster PSD export preserves rendered appearance; photo paint, masks and Levels/Curves are baked into pixel layers, while native files retain their controls.
- Layered Photoshop `.psd` and `.psb` import: 8-bit RGB or Grayscale documents, saved raster layers, positions, visibility, opacity, common blend modes, and editable pixel masks. Simple horizontal text becomes editable text with a hidden original raster backup when available. Nested groups flatten into named layers.
- Photoshop import limits:64 MB file,8192 px per canvas side,32 megapixel canvas,200 layers/groups,16 group levels,48 megapixels total canvas/layer/mask pixels. Ordinary photos are limited to45 MB and32 megapixels. Photoshop structure and dimension checks run before its bitmap decoding. Photo dimensions are checked after the browser decodes the source.
- Compatibility reports describe missing layer styles, smart-object source/filter controls, adjustment controls, vector paths, clipping relationships, color profiles, and group isolation/blending. Group opacity is distributed to children and may differ from isolated Photoshop groups. Text uses browser fonts and may reflow. Pixel-mask feathering is not retained. Original PSD/PSB files remain external; keep them for Photoshop-specific features. Converted native projects retain the imported photo pixels and editable masks, not the complete Photoshop source.
- Native and Markdown exports render painted, masked or actively Levels/Curves-adjusted layers into portable PNG layers for other suite editors while retaining fully editable masks in the native Fluxfoto project. PSB export, TIFF, camera RAW,16/32-bit, CMYK, Lab, Indexed and other Photoshop color modes are not included. Convert unsupported documents to8-bit RGB in Photoshop. Native After Effects projects require the Fluxiffects JSX bridge.
- Portable masked layers are rasterized at up to 8192 pixels per side and 32 megapixels. Larger native layer bounds keep their placement and dimensions, with a reduced-resolution portable image. The native source and editable mask remain unchanged. Imported pixel-mask density applies throughout the layer; fill opacity combines with ordinary layer opacity. Photoshop styles with independent fill opacity are reported as unsupported.

## AI

Ask Flux uses the existing Fluxini gateway connection configured by the suite. It receives an explicit prompt and the chosen scene or selection, without local image bytes, paths, or executable data. Results are editable text, shape, layout, and adjustment commands. Review the actual local preview before applying; one undo restores the previous canvas. Locked layers and selection scope are enforced in the command engine. Provider billing or connection errors are surfaced; local editing does not require AI.

FluxLab results arrive in a review dialog. Add a generated image or refine and add the text as an editable layer; one undo removes the addition.

## Shortcuts

I sample canvas color · V move · B brush · E eraser · T text · R rectangle · O ellipse · C crop. Delete removes an unlocked selected layer. Arrow keys nudge; Shift nudges by 10 px. Ctrl/Cmd Z undo, Shift Z or Ctrl Y redo, S save, O open, D duplicate. Escape cancels a crop or dialog.

## Checks

`node --test tests/model.test.mjs` validates model boundaries, atomic AI edits, locks and selection, media-free AI context, compatible scene conversion, and crop/resize geometry. `node scripts/browser-smoke.mjs` exercises the real Edge canvas, pixels, undo/redo, autosave, brush/import, native and PNG downloads, resize, and light/dark layouts. Screenshots and reports are written to `artifacts/browser`.

Explicit document crop and “Scale layers with canvas” operations affect every layer, including locked layers, so the composition keeps its appearance. Layer tools and AI preserve individual locks; AI canvas edits never rescale layer contents.

## Photoshop parser and verification

Uses pinned `ag-psd`31.0.2. The upstream README limitation list is stale about PSB: the [reader source](https://github.com/Agamnentzar/ag-psd/blob/master/src/psdReader.ts) accepts PSD version1 and PSB version2, and its writer exposes `psb:true`. Fluxfoto tests both formats using genuine writer-generated files. The importer follows the upstream [deferred image decoding guidance](https://github.com/Agamnentzar/ag-psd#use-in-production-environments-and-handling-unsafe-user-provided-data), inspects every layer/mask bound, and only then decodes pixels.

`node --test tests/*.test.mjs` runs the complete unit regression suite. `node scripts/photoshop-smoke.mjs` runs 10 real Edge Photoshop/photo workflows: PSD, PSB, editable text/masks, reveal/hide, disable/remove, undo/redo, native save/reopen, portable rendering, transparent PNG pixels, JPEG/PNG/WebP, rectangle corners, and failed-import atomicity. Run the tests first to generate the fixture files under `artifacts/photoshop`. `node scripts/portable-mask-smoke.mjs` checks allocation limits on a real 16384-square layer and verifies exported PNG pixels and original geometry. The existing 25-check browser suite remains passing.

### Pixel editing and multiple layers

Use Selection or Lasso, then New/Add/Subtract/Intersect to combine areas. Copy/Cut operates on one selected layer; Paste inserts a separate image at its original position. Fill creates a new image layer, and Hide/Cut masks the original. This clipboard is local to the open Fluxfoto workspace, not the operating-system clipboard. Ctrl/⌘ toggles layer selection, Shift selects a range; drag, arrow keys, duplicate/delete and ordering work on the selected set. Unlock every selected layer before a batch edit. Nested layer groups and pixel retouching remain separate work.
