# FluxDesign

A local, editable publication studio in the FluxCreate suite. Start it with `Start-Fluxidesign.cmd`, then open http://localhost:4322. Keep this folder beside `FluxCreate`, `FluxExchange`, `Fluxiffects`, and `Haidini`; the suite shares its file adapters and existing AI connection.

## A page with purpose

- A three-page original Field Notes publication, with editable typography, vector shapes, and an illustrated landscape.
- Add, duplicate, remove, and reorder pages. A4, Letter, square, landscape, and custom dimensions use points (72 points per inch).
- Text frames with font family, size, weight, tracking, line height, alignment, and visible overflow notices. Shapes have fill, stroke, and rounded corners.
- Import PNG, JPEG, WebP, or SVG images. Imported images are decoded locally and embedded as PNG, with a maximum side of 4,096 pixels. Select an image frame to replace its contents. Fill or fit images inside a frame.
- Drag frames and resize from the lower-right handle. Rotate and edit precise geometry in the inspector. Arrange, hide, and lock frames in Layers.
- Undo and redo, editable native project files, and local recovery through IndexedDB. Save an external project copy for a separate backup.
- Light and dark appearance, editable project names, and the shared FluxCreate app switcher.

Keyboard shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+S save, Ctrl/Cmd+D duplicate the selected frame, Delete remove an unlocked frame, arrow keys nudge by one point, Shift+arrow by ten points. Double-click a text frame to focus its text editor.

## Compatible formats

`.fluxidesign` files use the `fluxcreate-project` version 1 envelope, containing the complete native publication and a portable Fluxiffects scene. Each page becomes a composition. Open that file in Fluxfoto or Fluximiére through their project importer; text, shapes, and image frames remain editable where the destination supports them. Reopen in FluxDesign for its native page guides and typography settings.

The Open action also accepts FluxCreate files from the other editors, native Fluxiffects projects, After Effects bridge JSON, and `.flux.md` exchange files. Conversion previews report limitations before replacing the current document, and Undo recovers the previous document. Flux Exchange Markdown exports all pages for Fluxini and Fluxiffects as well as the other suite apps. Do not use Markdown as the only backup: the full native project is the fidelity-preserving copy for this editor.

Exports:

- **PDF:** a real multipage PDF at the document's physical dimensions. Each page contains rasterized RGB artwork at up to 144 dpi. Text is not selectable in this PDF. It is intended for sharing and proofs; CMYK conversion, bleed boxes, press profiles, and print preflight are not included.
- **SVG:** the current page, with vector text and shapes and embedded images. Fonts must be available on the recipient's device.
- **PNG:** the current page at 2× resolution.
- **Flux Exchange:** editable portable pages in a human-readable `.flux.md` wrapper with structured JSON.

### Adobe documents

Open or drop **IDML**, **PDF**, or **PDF-compatible Illustrator (.ai)** files. An import report appears before your publication is replaced; opening the result is one undo step. Imports remain on this device and never follow linked file paths or external resource URLs. PDF import shows progress and can be cancelled.

| Format | Result | Important limits |
| --- | --- | --- |
| IDML | Editable document pages, text frames, rectangles, ellipses and image-frame references | Page/spread/group transforms and ordinary rotation/scale are converted into page coordinates. Groups become independent frames. Story text uses the first run’s paragraph/character styling; installed fonts substitute when needed. |
| PDF | One rendered image per page at the original physical dimensions and page rotation | Up to 144 dpi, reduced for very large documents; RGB. Text, paths, layers, annotations and forms are not individually editable. New editable frames can be added above the artwork. |
| Illustrator `.ai` with PDF compatibility | Its embedded PDF pages, rendered as above | Enable **Create PDF Compatible File** in Illustrator when saving, or export PDF. Native Illustrator object data is not decoded. |
| INDD, INDT, INDB | Export guidance | Open in InDesign and export IDML for editable frames or PDF for page appearance. |
| EPS, PostScript, older non-PDF AI | Export guidance | Export PDF from the source application first. |

IDML import retains each threaded story once, in its first encountered frame; continuation frames stay empty and need manual reflow. Master-page artwork, tables, arbitrary paths, text-frame insets/columns, text wrap, mixed rich text, gradients, effects and print profiles are not reconstructed. Skew/mirror transforms are approximated with explicit notices. Missing image links stay as image frames; select the frame and import the original image to relink it. Raster files included under `Links/` or `Resources/` inside the IDML ZIP can be embedded, using centered cover fitting; check original crops. CMYK/spot color conversion is an RGB approximation. Keep the original Adobe file; use PDF import when visual fidelity matters more than frame editability.

Import limits: 64 MB Adobe files, 100 pages, 5,000 supported IDML items, 20 MB per ZIP entry / 80 MB expanded archive, and pages between 72 and 4,096 points on each side. Imported encoded image data is capped at 35 MB so the native project plus its portable scene can be saved and reopened within the project-file limit. ZIP names, offsets, sizes and checksums are validated before XML conversion; decompression is streamed with output bounds. XML element/nesting budgets are checked before DOM allocation; external entities and DTDs are rejected. PDF scripts, attachments and interactive actions are never executed. PDF rendering uses a local bundled [Mozilla PDF.js](https://mozilla.github.io/pdf.js/) worker; IDML geometry follows Adobe’s [coordinate model](https://developer.adobe.com/indesign/uxp/resources/fundamentals/measurements-and-positioning/).

Animation imported from a motion document is sampled at time zero. Unsupported procedural work or effects need a rendered PNG for matching appearance.

## AI Studio

Ask Flux uses the already configured Fluxini / AI Gateway connection through the shared local server. It can refine the current page, work only on selected frames, create editable text or shapes, and add new pages. An explain mode returns suggestions without changing the document. Each proposal is previewed before applying and becomes one undo step.

Only the chosen page's editable properties, the explicit request, and the creative brief are sent to the provider. Embedded media and file paths are removed; other pages are excluded. Locked frames and selection scope are enforced locally. AI cannot execute code or write image sources. Unavailable gateway credits or configuration are reported; there is no fake generated fallback.

## Verification

Run `node --test tests/*.test.mjs`, `node scripts/build.mjs`, `node scripts/browser-smoke.mjs`, and `node scripts/adobe-import-smoke.mjs`. These use isolated Edge contexts and temporary local servers; AI uses an injected planner, with no AI credits or normal local workspace changes. Adobe checks use generated standards-based IDML ZIP/XML and real PDF files, verify affine placement, story editability, rendered pixels, multipage sizes/rotation, Illustrator compatibility, undo, cancellation, recovery, and no external requests. They are not a certification against every InDesign/Illustrator version. Reports and fixtures are in `artifacts/adobe-import`; existing editor checks are in `artifacts/browser`.

See [the prioritized optimization worklist](docs/OPTIMIZATIONS.md) for completed reliability/performance improvements and remaining work.

## Recovery and interrupted imports

If browser storage cannot be read or the saved publication fails validation, autosave pauses and the preview cannot replace the original record. The recovery banner lets you download the original saved data when available, open a project copy, or deliberately start a new publication. Adding an image or a FluxLab result does not resolve recovery. Successful project opening or New resumes saving; save a separate file for long-term backups.

Native, IDML, PDF and exchange imports are prepared before one complete replacement. Canceling, switching pages, opening another document, or using New/Undo invalidates an older pending import. Image replacement also checks the current frame and lock after decoding.

`node ../FluxCreate/scripts/editor-recovery-smoke.mjs` verifies both FluxDesign and Fluximiére recovery, original-data downloads, failed reads, media additions during recovery, delayed import races and atomic batches in isolated Edge sessions.
