# Fluxfoto: feature gaps against typical Photoshop workflows

Reviewed 2026-10-09. The application is branded **Fluxfoto**; its source folder and native extension remain `Fluxoto` and `.fluxoto`.

Fluxfoto currently supports useful layered photo composites, simple graphic layouts, nondestructive pixel masks, supported PSD/PSB import, bounded layered-raster PSD export, drag ordering, and reviewed AI commands. Geometric and lasso selections now create feathered/inverted layer masks. The biggest everyday gaps are **retouching, selected-layer pixel painting, layer groups, adjustment layers, richer transforms and advanced selection refinement**. It is not yet a general replacement for Photoshop's pixel editor, photographic processing, or production document pipeline.

This is a source-and-documentation audit, not a fresh performance benchmark or a claim that every Photoshop feature should be copied. Adobe references establish the comparison categories; Fluxfoto status comes from the inspected implementation. Release verification supplied by the implementing agent includes 16 layer-order browser checks, 11 PSD export/reopen checks and the existing 25-check editor regression. No paid provider generation was run for this audit. Existing regression evidence is also recorded in [OPTIMIZATIONS.md](OPTIMIZATIONS.md).

## Status and priority

- **Implemented:** the stated bounded capability exists in the model, renderer, and/or editor. This does not imply complete Photoshop equivalence.
- **Partial:** useful functionality exists, but a material part of the workflow is absent or simplified.
- **Missing:** no native model, renderer, or user workflow was found for the capability.
- **In progress:** assigned implementation is underway; do not count it as shipped until its editing, undo, save/reopen, and output checks pass.
- **P1:** everyday photo editing and compositing; highest practical feature priority.
- **P2:** advanced editing, compatibility, and professional output.
- **P3:** specialist workflows and ecosystem extensions.

Data preservation and accurate compatibility notices remain release gates for every priority. Existing import bounds and recovery protections should stay in place while features expand.

## What is already usable

| Capability | Status | Actual implementation boundary |
|---|---|---|
| Local photographs | Implemented | PNG/JPEG/WebP import through picker, file drop, and pasted image files. GIF/SVG also pass through the browser image decoder; there is no animation editor or editable SVG path import. Imported image source bytes remain embedded. |
| Basic layers | Implemented | Image, text, rectangle/ellipse, and brush-stroke layers; rename, visibility, lock, duplicate, delete, opacity, drag/touch ordering, Alt+Up/Down and up/down buttons. Ctrl/Cmd toggles multiple layers; Shift selects a range. Atomic move, drag ordering, duplicate and delete preserve internal order and reject a set containing locked layers. |
| Position and dimensions | Implemented | Move by dragging, numeric X/Y/width/height/rotation, one resize handle, and keyboard nudging. Raster source pixels are retained rather than rewritten for each transform. |
| Pixel layer masks | Implemented | Add a reveal-all mask; paint hard round hide/reveal strokes; enable/disable/remove; preserve source pixels, undo, native saving, and reopening. Image, text, and shape layers can have masks. |
| Basic appearance | Implemented | Nine blend modes; brightness, contrast, saturation, blur; solid fill and two-color linear gradients on shapes. These are per-layer properties. |
| Shapes and text | Implemented | Rounded rectangles with an exposed corner-radius control; ellipses; editable text content, font family and font size in the inspector. |
| Canvas operations | Implemented | New canvas presets, transparent/solid background, rectangular crop, resize with optional scaling of all content, fit and zoom. Explicit whole-document crop/scale also affects locked layers, as documented. |
| Native saving and recovery | Implemented | `.fluxoto` keeps native layer/mask data; IndexedDB autosave is local to this browser/origin; invalid or unreadable stored data pauses autosave until explicit recovery. Undo/redo retains 40 edits. |
| Image export | Implemented | Flattened PNG with transparency and JPEG with white underlay, at document pixel dimensions. Export waits for image/mask decoding. |
| Supported Photoshop import | Partial | PSD/PSB import handles supported 8-bit RGB/Grayscale saved pixels, placement, state, common blending, editable pixel masks, and some simple text. It is a conversion, not an intact Photoshop document roundtrip. |
| Photoshop export | Partial | RGB/8-bit PSD with separate raster layers, layer names, order, visibility, lock, opacity and supported blends. Text, shapes, masks and adjustments are rendered into layer pixels. Visible composite eraser strokes trigger an appearance layer plus hidden separate originals. Native `.fluxoto` retains full editing controls. |
| Suite exchange | Partial | Native envelope and `.flux.md` transfer overlapping text, shapes, images, transforms and adjustments. Masked portable layers are rendered to PNG; editable native masks remain in `.fluxoto`. Composite eraser behavior does not travel as an editable shared layer effect. |
| AI editing and generation | Partial | Ask Flux and the floating MCP helper propose bounded editable commands with preview/undo; generated text/images are reviewed before insertion. Ordinary planner context excludes photo pixels and masks. An explicit reference-image action can send the selected photo source through a documented, catalog-capable edit adapter, compare original/result and insert a new copy. Paid provider output, mask-guided retouch and AI upscale remain unverified/unavailable. |

Evidence: [editor and controls](../src/main.jsx), [native schema and AI commands](../src/model.mjs), [drawing and exports](../src/renderer.mjs), [mask model](../src/masks.mjs), [Photoshop importer](../src/photoshop.mjs), [README](../README.md), and [model/import tests](../tests/).

## Recent verified work and remaining integration

| Priority | Feature | Status | Completion boundary |
|---|---|---|---|
| P1 | Drag layers to reorder them | Implemented and verified | Pointer/touch dragging, insertion markers, autoscroll, locked-source protection, Alt+Up/Down, cancel/outside drop, one-step undo/redo, native persistence and canvas order are covered by the browser regression. |
| P1 | Place retained-source objects from suite apps | Implemented bounded subset | Place rendered photo/page/frame/3D snapshots with page or frame choice, original native/Exchange source, preview, stale-document checks, refresh/replacement, source download, undo and reload. This is not a live link or universal editable conversion of selected layers. |
| P2 | Export supported layers to PSD | Implemented bounded subset | Separate rendered pixel layers and compatibility notices; actual PSD decode/reopen, metadata, mask appearance and eraser fallback are verified. Export is bounded to 200 counted layers, a 48-megapixel aggregate raster budget and 64 MiB output. PSB export and complete Photoshop roundtrip remain separate gaps. |

Universal live selected-object exchange remains open; retained-source snapshot placement is verified. The floating MCP helper is now implemented: editable proposals, explanations, reviewed text/image generation, and selected-source image editing through documented, catalog-capable Gateway adapters. Tests use mock providers; no paid model call was made. Results become new layers and original images remain intact. Actual AI upscale and mask-guided inpainting remain unavailable. Layer-order and PSD evidence: [layer-order browser checks](../scripts/layer-order-smoke.mjs), [PSD export/reopen checks](../scripts/psd-export-smoke.mjs).

## P1: everyday editing and compositing

### Selections, masks, and painting

Photoshop distinguishes pixel selections from layer selection, provides geometric/freehand/color-based selection tools, and uses selections to constrain pixel changes. Its masks can also be derived from selections or transferred between layers. [Adobe: selections](https://helpx.adobe.com/photoshop/using/making-selections.html), [Adobe: layer masks](https://helpx.adobe.com/photoshop/desktop/create-masks/layer-masks/add-layer-masks.html).

| Capability | Status | What remains |
|---|---|---|
| Rectangular/elliptical pixel selection | Partial, verified | Dedicated selection tool and visible boundary, inversion, feathering and selection-to-mask work; original pixels survive undo and native reload. Union/subtraction/intersection and pixel copy/cut/fill now work. Select-all/reselect, saved selections and advanced refinement remain open. |
| Lasso and polygonal selection | Partial, verified | Freehand lasso closes into a selection-to-mask path. Combining separate areas works; click-based polygon construction remains open. |
| Magic wand and color-range selection | Missing | Tolerance, contiguous/all matching pixels, anti-aliasing and sample-current/all-layers controls. |
| Selection editing and pixel clipboard | Partial | Invert, feather and selection-to-mask are implemented, including intersection with an existing enabled mask. Selected-layer copy/cut/paste, separate-layer fill and mask-based hiding now work. Copy includes isolated appearance/mask; cut preserves original pixels through a mask. The clipboard is in-memory inside Fluxfoto. Grow/shrink, move/transform selection, copy merged and OS pixel clipboard integration remain open. |
| Quick Selection / Select Subject / background removal | Missing | Actual image-aware segmentation and edge refinement; no subject detection or background-removal command is currently connected. |
| Mask refinement and visualization | Partial | Add feather/softness, adjustable density, invert, hide-all initialization, grayscale/red overlay, actual mask thumbnail, copy/move masks, and link/unlink mask transforms. Imported PSD density is incorporated into mask pixels; it is not retained as an editable density slider. |
| Paint into a selected pixel layer | Missing | A raster editing surface with source-preserving history and explicit target. Current Brush creates a new vector-stroke layer for every gesture; it does not paint the selected photograph. |
| Erase only selected-layer content | Partial | Masks provide selected-layer hiding. The separate Eraser creates a composite `destination-out` stroke layer affecting the content below it, not Photoshop-style erasing of only one raster layer. |
| Basic brush controls | Partial | Size and color exist. Add hardness, stroke opacity/flow, smoothing, spacing, pressure/tilt, visible brush footprint, straight-line strokes, and reusable presets. Layer opacity after drawing is not brush flow. |
| Eyedropper and color workflow | Partial | Browser color inputs exist. Add on-canvas sampling, foreground/background swatches, swap/reset, saved swatches and sampled color values. |
| Paint bucket and full gradient tool | Missing | Selection-aware flood fill with tolerance/contiguous controls; on-canvas gradient handles, multiple stops and radial/other gradient types. Shape-only two-stop linear gradients already work. |

Photoshop's brush controls include hardness, opacity, flow and tablet pressure; its painting toolset also includes sampling, flood fill and several gradient forms. [Adobe: brush controls](https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/brushes-presets/paint-with-brush-or-pencil-tool.html), [Adobe: painting tools](https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/fill-objects-selections-layers/painting-tools-overview.html).

### Layers, transforms, and workspace

| Capability | Status | What remains |
|---|---|---|
| Multiple layer selection and batch editing | Partial, verified | Ctrl/Cmd toggle, Shift range, canvas multi-pick and atomic move/duplicate/delete/order work. Batch rotation/scale, batch lock controls, alignment and distribution remain open. |
| Groups and linked layers | Missing | Hierarchical folders, group transforms/opacity/masks, correct isolated/pass-through compositing and linked movement. PSD groups currently flatten into named children. |
| Clipping masks | Missing | Clip upper content/adjustments to lower-layer alpha with explicit relationships and export parity. Imported Photoshop clipping relationships are reported as unsupported. |
| Layers panel organization | Partial | Add rendered image/text/stroke thumbnails, mask thumbnails, search/filter, color labels and solo visibility. Current rows mostly show type icons or fill swatches. Drag and keyboard reordering are implemented. |
| Merge and rasterize commands | Missing | Merge selected/visible, flatten, rasterize text/shape/stroke, with one undo step and clear loss of editability. Exporting a flattened PNG does not merge editable document layers. |
| Free Transform ergonomics | Partial | Add aspect-ratio lock, modifier-key constraints, all corner/edge handles, rotation handle, movable pivot, flip horizontal/vertical and commit/cancel preview. Current positive width/height and center rotation cannot represent mirrored content. |
| Alignment, guides, and snapping | Missing | Rulers, guides, grid, snapping to edges/centers/guides and layer alignment/distribution. Numeric positions alone do not provide these workflows. |
| Crop and resize controls | Partial | Add crop ratios, straighten, expandable/cancellable crop preview, resampling choices, anchor location and print resolution metadata. Current crop is an axis-aligned canvas rectangle; content is retained outside its bounds. |
| Comfortable high-zoom navigation | Partial | Fit and zoom exist. Add a hand/spacebar pan tool, cursor-centered wheel zoom, direct 100%/numeric zoom, canvas rotation and navigator overview. |
| Multiple documents and history UI | Partial | One active autosaved project and undo/redo exist. Add document tabs/library, named checkpoints, visible history, before/after comparison and recovery versions. |

These categories correspond to Photoshop layer/group management and continuous transforms with proportional scaling, pivot and warp controls. [Adobe: layers and groups](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/create-layers-and-layer-groups.html), [Adobe: clipping masks](https://helpx.adobe.com/photoshop/using/revealing-layers-clipping-masks.html), [Adobe: transforms](https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/transform-images-shapes-and-paths.html).

### Photo correction, retouching, and type

| Capability | Status | What remains |
|---|---|---|
| Levels and Curves | Missing | Histogram-backed black/white/midtone and curve controls, channel handling, reset/presets and undoable nondestructive output. |
| Core photographic color corrections | Partial | Brightness/contrast/saturation exist. Add exposure, white balance/temperature/tint, highlights/shadows, hue, vibrance, color balance, black-and-white controls and selective correction. |
| Adjustment layers | Missing | Separate masked, reorderable adjustments with defined lower-layer/group/clipping scope. The current CSS filters are attached to one layer and use a fixed rendering order. |
| Histogram and pixel/channel inspection | Missing | RGB/luminance histograms, sample readouts and visible clipping warnings for reliable tonal editing. |
| Clone Stamp, healing and patch repair | Missing | Sampled-source clone, spot/healing brush and patch operations on a separate editable retouch layer or reversible raster history. |
| Local dodge/burn/sharpen/blur/smudge | Missing | Selection-aware localized tools. The existing blur slider affects the entire selected layer. |
| Text formatting controls | Partial | Model/renderer support whole-layer font weight, alignment and line height, but the inspected inspector exposes only content/family/size plus general color/transforms. Add the missing controls first, then italic, underline, tracking, kerning and baseline shift. |
| Direct text editing and font handling | Partial | Text is edited in a side-panel textarea and wraps by words. Add on-canvas caret editing, text box overflow feedback, font discovery/import as appropriate, missing-font warnings and deliberate substitution. Imported font names may silently fall back in the browser. |

Adobe documents separate nondestructive adjustment layers for tonal/color edits, sampled and localized retouch tools, and character spacing controls. [Adobe: adjustment layers](https://helpx.adobe.com/ca/photoshop/desktop/create-manage-layers/color-adjustment-fill-layers/work-with-adjustment-and-fill-layers.html), [Adobe: retouch tools](https://helpx.adobe.com/photoshop/desktop/repair-retouch/remove-objects-fill-space/retouch-tools-overview.html), [Adobe: clone versus healing](https://www.adobe.com/learn/photoshop/web/remove-objects-from-your-photos), [Adobe: typography](https://helpx.adobe.com/photoshop/desktop/text-typography/characters-glyphs/adjust-line-and-character-spacing.html).

## P2: advanced editing and dependable interchange

| Capability | Status | What remains |
|---|---|---|
| Smart Objects and linked sources | Missing | Embedded editable subdocuments, replace/edit contents, linked-file relink/update, shared instances and independent transforms. Keeping an image data URI unchanged is useful source preservation, but does not implement Smart Objects. |
| Smart Filters and filter stack | Missing | Reorderable nondestructive effects, filter masks and per-effect blend/opacity; sharpening, noise reduction, lens correction and more than the current four scalar filters. |
| Layer styles and advanced blending | Partial | Nine basic blend modes exist. Add drop/inner shadow, glows, outlines, overlays and bevels; separate fill opacity, further blends, channel restrictions and Blend If. PSD styles currently produce warnings rather than equivalent rendering. |
| Pen paths and editable vector shapes | Partial | Rectangle/ellipse are native; add line/polygon/star/custom paths, Bézier handles, fill/stroke/dashes, boolean operations, vector masks and editable SVG conversion. Imported SVG is treated as an image source. |
| Advanced deformation | Missing | Skew, perspective/distort, mesh warp, Puppet Warp and Liquify; each needs an appropriate native representation and undo/export parity. |
| Rich typography | Missing | Mixed character styles within a layer, paragraph styles, justified paragraphs, text on paths, vertical/warped type and OpenType controls. Unsupported Photoshop text remains rasterized where saved pixels exist. |
| Better Photoshop appearance fidelity | Partial | Preserve group isolation, clipping, vector masks, adjustments, styles, complex text and color metadata. A converted document can differ visually despite retaining individual saved raster layers. |
| Layered PSD/PSB export | Partial for PSD; PSB missing | Bounded layered-raster PSD export and real decode/reopen checks work. Text, shapes, masks and adjustments are baked into pixel layers; visible composite erasers use a merged appearance with hidden originals. Editable Photoshop text, vector masks, effects, off-canvas content and ICC profiles are not retained by this export. PSB export is not implied. |
| Original-source attachment | Missing | Optional size-bounded storage/recovery of the original PSD/PSB, without sending its bytes to AI. Currently the user must keep the original externally. |
| TIFF and camera RAW workflows | Missing | Bounded TIFF import/export; a supported RAW/DNG decode and development pipeline with retained source and settings. RAW needs exposure/white balance/lens/noise controls, not just another image extension. |
| Broader file formats | Partial | No dedicated PDF/AI page import, HEIF/HEIC pipeline, or explicit BMP/TGA/EXR workflow. Browser-supported incidental decoding is not a verified format contract. FluxDesign's PDF/AI support is in a different app. |
| Export controls and assets | Partial | PNG/JPEG exist. Add adjustable JPEG quality, resize presets, metadata/profile policy, WebP output, selected-layer export, multiple output sizes and batch export. Quality is currently fixed in the renderer. |
| Color management and high bit depth | Missing | Explicit ICC assignment/conversion, working spaces, 16/32-bit image data, CMYK/Lab channels, gamut warnings, soft proof and profile-aware output. The RGB/8 label is not a managed-color pipeline. |
| Print setup | Missing | Physical units/PPI, profile-aware printing and appropriate production formats; no print proofing workflow is implemented. |
| Channels and reusable alpha selections | Missing | Channel panel, alpha-channel editing/saved selections, channel mixing/calculations and channel-aware operations. Layer masks alone do not cover these workflows. |
| Photo combination | Missing | Auto-align/auto-blend, panorama stitching, focus stacking and HDR merge/tone mapping. |
| Image-aware AI edits | Partial | Floating AI can submit a selected photo source to a documented, catalog-capable image-edit model, compare original/result, and insert a new copy. Live paid output remains unverified. Mask-guided inpainting, generative expansion, harmonization, segmentation and actual upscaling remain open. |

Photoshop supports editable embedded objects and Smart Filters as distinct concepts. [Adobe: Smart Objects](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/create-embedded-smart-objects.html), [Adobe: Smart Filters](https://helpx.adobe.com/photoshop/desktop/effects-filters/smart-filters/apply-and-manage-smart-filters.html). Its separate layer effects and path tools ground the style/vector gaps. [Adobe: styles](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/add-layer-styles.html), [Adobe: paths](https://helpx.adobe.com/photoshop/using/tool-techniques/pen-tool.html), [Adobe: shape tools](https://helpx.adobe.com/photoshop/desktop/draw-shapes-paths/create-shapes/drawing-tools-overview.html).

Format availability, RAW processing, and print color control are separate compatibility concerns. [Adobe: formats](https://helpx.adobe.com/photoshop/desktop/save-and-export/export-files-to-different-formats/supported-file-formats-in-photoshop.html), [Adobe: Camera Raw](https://helpx.adobe.com/camera-raw/desktop/get-started/overview-and-setup/introduction-camera-raw.html), [Adobe: commercial color workflows](https://helpx.adobe.com/photoshop/desktop/print/prepare-images-for-commercial-printing.html). Adobe's generative overview distinguishes image generation from fill, expansion, harmonization and upscale; Fluxfoto should make the same capability distinctions. [Adobe: generative features](https://helpx.adobe.com/photoshop/desktop/generative-ai/generative-ai-features-overview.html).

## P3: specialist and ecosystem workflows

| Capability | Status | What remains or recommended suite placement |
|---|---|---|
| Advanced brush engine | Missing | Textured/custom tips, brush preset import, scatter/dynamics, symmetry, pattern painting and wet/mixer behavior. Prioritize a reliable basic brush before this breadth. |
| Actions and batch automation | Missing | Recordable/reusable editing recipes, batch file operations and automation against validated editor commands. FluxAgents is a separate workflow app; its existence does not automate Fluxfoto pixels or Photoshop Actions. |
| Extension/plugin compatibility | Missing | No Photoshop plugin, JSX/UXP or action-file execution environment. Prefer a constrained native extension/command API over claiming compatibility with arbitrary Adobe plugins. |
| Artboards, variants and layer comps | Missing | Multiple artboards, saved visibility/position variants and per-artboard assets; one canvas and named project exist today. |
| Shared libraries and collaboration | Partial | Local native files, shared suite navigation and reviewed FluxLab handoff exist. Add cross-device document/asset libraries, review comments, versions and concurrent collaboration only with explicit ownership/persistence design. |
| Metadata and authenticity | Missing | EXIF/IPTC/XMP inspection/editing, intentional metadata export and content-credential workflow. Original image bytes may contain metadata, but there is no metadata editor or guaranteed preservation in flattened exports. |
| Animation/timeline editing | Missing in Fluxfoto | Prefer Fluxiffects/Fluximiére handoff. No frame animation, animated GIF export or video-layer timeline exists in this editor. |
| 3D editing | Outside the photo-editor priority | Use Flux3D/Fluxini and Fluxiffects; do not count old Photoshop 3D menus as a current parity requirement. |

Photoshop has richer brush mixing and action-based batch processing, but those require distinct engines rather than extra toolbar buttons. [Adobe: Mixer Brush](https://helpx.adobe.com/photoshop/desktop/apply-painting-techniques/create-fill-with-patterns/paint-with-mixer-brush.html), [Adobe: batch processing](https://helpx.adobe.com/photoshop/desktop/automate-tasks/process-a-batch-of-files/batch-process-files.html). The broader Photoshop guide identifies document, workspace, channels, artboards, metadata and collaboration workflows; this audit uses them as optional categories rather than a promise to duplicate the entire application. [Adobe: user guide categories](https://helpx.adobe.com/photoshop/using/making-selections.html).

## Performance and reliability work that makes these features practical

These are implementation priorities, separate from Photoshop feature parity:

| Priority | Current state | Next acceptance condition |
|---|---|---|
| P1 | Full document preview dimensions and per-edit rendering; hard limits mitigate some large allocations | Profile real 24/32 MP photos and multi-layer PSDs; add reduced-resolution interactive previews, incremental/tiled mask painting, then full-resolution final output. Record frame-time and peak-memory measurements. |
| P1 | 40-state history; full normalization, cloning in functional commits, and JSON comparisons include embedded sources | Share immutable media and unchanged masks; use revisions rather than repeated full serialization; verify undo, save/reopen and stale AI/import rejection. |
| P1 | Images are cached by source with an entry-count bound | Add a decoded-pixel/memory budget and project-aware pruning; show missing/broken-image diagnostics with a real replacement/relink workflow. The placeholder text “Relink image” is not itself a relink control. |
| P1 | PSD checks precede deferred bitmap decoding, but parsing is synchronous; ordinary photos check dimensions after browser decode | Move expensive parsing/decoding off the UI thread with progress/cancel; inspect ordinary-photo dimensions before large decoding where feasible; preserve existing bounds and source-generation guards. |
| P1 | Individual files commit after preparation; a multi-file selection is processed one file at a time | Decide and expose batch semantics. If the batch should be atomic, stage all candidates before one commit; if partial success is intended, present a complete result report rather than only transient per-file notices. |
| P1 | Basic focus outlines/shortcuts and responsive widths exist | Verify keyboard-only selection/editing/dialog return focus, touch/pen input and small-window layouts; provide accessible alternatives for every drag-only action. |

Source evidence: `commit`, `importFiles`, pointer handlers and autosave in [main.jsx](../src/main.jsx); `imageFor`, `drawProject` and `maskCanvas` in [renderer.mjs](../src/renderer.mjs); parser limits in [photoshop.mjs](../src/photoshop.mjs). These findings refine, rather than replace, the existing [optimization worklist](OPTIMIZATIONS.md).

## Recommended delivery order

1. Finish and verify selected-object transfer; keep the verified ordering/PSD regressions and make layer/mask targeting and thumbnails clear.
2. Add geometric pixel selections, selection-to-mask, pixel copy/paste/fill and mask inversion/feathering. This unlocks many later tools.
3. Add a source-preserving raster brush/eraser target, brush controls and eyedropper; then clone/healing on a separate retouch layer.
4. Build on multi-selection with groups, clipping, alignment/snapping and a complete basic transform interaction.
5. Add histogram, Levels/Curves and masked adjustment layers; expand photo color controls afterward.
6. Improve text controls, layer styles and vector paths; introduce an editable embedded-object model before promising Smart Object fidelity.
7. Expand PSD fidelity/export, TIFF/RAW and color-managed output with real application-produced fixtures and pixel comparisons.
8. Add pixel-aware AI actions only through supported model capabilities; retain originals and require review. Batch automation, collaboration and specialist painting follow the stable editing model.

For every new capability, check real rendered pixels, target/lock behavior, undo/redo, native save/reopen, portable/export appearance and failure/cancellation behavior. Do not relabel partial import as full Adobe compatibility or mark an assigned feature implemented before those checks exist.

## Verified implementation batch — 2026-10-09

- Geometric/lasso selection masks: six real browser pixel checks for rectangle, inverted ellipse, lasso, feather, rotated-layer coordinates, one-step undo, reload and byte-identical original source (`scripts/selections-smoke.mjs`). Mask previews are bounded to 4096 pixels per side; selection outlines are temporary workspace state, while applied masks are native document data. Existing masks can be intersected or explicitly replaced.
- Studio objects: native photo/publication/motion/3D rendering, original-source download, replacement, undo and reload are verified by the suite source-object smoke. Fluxini sources use Flux Exchange; arbitrary native procedural graphs are not rendered in Fluxfoto.
- Floating helper: actual editor + official MCP client/server with mocked providers verifies review, validated apply, one-step undo, stale proposal rejection, generated text/image insertion and original/result comparison.

## Parallel continuation — 2026-10-09

Combined rectangle/ellipse/lasso areas support replace/add/subtract/intersect and inversion, bounded to 32 operations. Copy reads one isolated selected layer including its appearance/mask; cut/hide preserve originals through a mask, while fill/paste create separate movable image layers. The internal clipboard stays in memory and supports Ctrl/Cmd+C/X/V without overwriting the OS clipboard. Pixel operations reject empty content and documents above 32 MP. Native selection outlines are temporary; applied pixels/masks persist.

Flat multi-selection supports Ctrl/Cmd toggle, Shift range and atomic movement, duplication, deletion and ordering. A locked member blocks the complete mutation. Nested groups, aggregate rotation/scaling and Photoshop Smart Objects remain open.

Evidence: 8 new end-to-end groups in `scripts/editing-smoke.mjs`, layer-operation and selection-validation unit tests, existing 6 selection groups, expanded delayed-image cancellation checks, 16 drag-order checks and 11 PSD export/reopen checks. Final hosted release status is tracked centrally.
