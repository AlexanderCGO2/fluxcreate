# FluxDesign versus Adobe InDesign: gaps and delivery plan

Source review: 2026-10-09. This is a planning document, not a parity claim or a new release announcement. **Working** means a real implementation exists for the stated scope; **Partial** means important restrictions remain; **Missing** means no complete workflow exists in the inspected source. Existing verification is recorded in [OPTIMIZATIONS.md](OPTIMIZATIONS.md); the review below did not rerun the full browser suite.

FluxDesign is presently a useful short-publication editor. InDesign-class editorial composition, long-document automation, accessible publishing and press production require substantial additional work. The first target should be a dependable 12–40-page editorial workflow, with clear output quality, before broad professional parity.

## Implemented PDF increment — 2026-10-09

The first bounded D3 output milestone is implemented and locally verified. `src/pdf-export.mjs` emits native rectangle/rounded-rectangle/ellipse paths and separately embedded PNG/JPEG images. Compatible Arial, Times New Roman and Courier New text remains searchable through standard PDF Helvetica, Times and Courier faces; browser wrapping, alignment, tracking, frame clipping, center rotation and opacity are preserved. This is explicit standard-font substitution, not embedded-font parity.

Unsupported font families, unencodable glyphs (including tested Japanese and emoji), extreme negative tracking, or an image that cannot be decoded/embedded trigger a whole-page image at the existing proof resolution. The report names each page/frame and the reason; glyphs are preserved through the browser renderer. SVG filters and other SVG artwork are rendered locally into PNG at up to 2× placed dimensions, within 24 MP / 8,192-side bounds. WebP, EXIF-oriented JPEG and profiled/CMYK JPEG use browser-rendered RGB PNG conversion with notices. Discretionary soft hyphens also use a page fallback to preserve browser text layout. A separate all-image proof remains available. No source document mutations occur.

Evidence: build passed; all 22 current unit/import/PDF tests passed; the 19-check editor browser suite passed; the new six-group PDF browser check passed. `artifacts/pdf-export/report.json` records independent PDF.js text extraction and rendering using bundled font substitutes. The vector reference measured mean pixel-channel delta 1.90/255, with 1.23% of pixels differing by more than 32; the unsupported-font and Unicode fallback pages matched their 2× canvas references exactly. Original JPEG compressed bytes, image counts, page dimensions, EXIF mirroring, SVG effects, transparency, native save equality, and light 1600×1000/dark 1280×800 reports were checked. Actual PDFs and reference/render PNGs are retained in the same folder.

Remaining: PDF export cancellation; font embedding/subsetting and broader font/shaping coverage; fine glyph-rendering differences between standard PDF faces and installed fonts; editable vector SVG import/export conversion; reading order/tagging; page ranges, resolution choices, preflight/package, bleed, CMYK/ICC, spot colors and PDF/X. This increment is not press-ready or full D3 completion.

## Implemented typography increment — 2026-10-09

A bounded D2 slice is implemented: named reusable whole-text-frame styles for the existing seven typography/fill properties, explicit local overrides, reset/detach/delete, and one-action global restyling across pages with lock protection. Native version-1 documents retain optional style definitions and links; older style-free files remain unchanged. Portable exchange snapshots resolved appearance. The all-page text-fit review reports line/glyph clipping, includes hidden frames, navigates to each issue and downloads its report. Empty text is not falsely marked as clipped. Browser font loading invalidates wrap measurements.

Verified: 27 unit checks, the existing 19-check editor suite, six independent PDF groups and six new typography browser groups. This is not rich text, paragraph ranges, threading, missing-font analysis or production preflight; those D2/D3 gaps remain.

## Evidence and comparison scope

Inspected `src/main.jsx`, `model.mjs`, `render.mjs`, `import-idml.mjs`, `import-pdf.mjs`, the import/model fixtures, README and optimization backlog. The model has pages containing independent text, rectangle, ellipse and image frames; text is a single string with one style per frame. The renderer uses browser text measurement and Canvas/SVG; the PDF exporter now preserves supported shapes/text/images with explicit per-page visual fallback.

Adobe's current [InDesign help index](https://helpx.adobe.com/indesign/desktop.html) supplies the comparison categories. In particular, [threaded text](https://helpx.adobe.com/indesign/desktop/add-and-manage-text/add-and-import-text/thread-text-frames.html), [text styles](https://helpx.adobe.com/indesign/desktop/format-and-style-text/text-styles/create-and-edit-text-styles.html), [parent pages](https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/create-and-manage-parent-pages/about-parent-pages.html), and [document setup](https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/create-documents/change-document-setup.html) describe distinct capabilities that basic frame editing does not replace. Current accessibility and data-merge developments are documented in [Adobe's release overview](https://helpx.adobe.com/indesign/desktop/whats-new/whats-new.html). Beta or future Adobe features are not treated as a required baseline.

## Capability inventory

Priorities: **P0** protects work or prevents misleading deliverables; **P1** completes common publication jobs; **P2** broadens production use; **P3** covers specialist workflows. Priority belongs to the missing part, not to a claim that the existing feature is defective.

| Area | State today | Remaining gap and priority |
| --- | --- | --- |
| Multipage documents | Working: add, duplicate, delete, reorder; active-page navigation | P1: facing-page spreads, binding direction, page sections and page labels |
| Page setup | Working: presets/custom sizes, page background, margin/column/gutter guides in points | Independent edge margins and column/gutter guides now work. P1: mm/in conversion, bleed/slug settings and facing-page binding |
| Precision placement | Partial: drag/resize, inspector geometry, rotated-bound alignment to margins/columns, visible page/column/frame snapping with Alt bypass, keyboard nudging | P1: multi-selection, marquee, proportional resize, distribution and richer snapping policies |
| Object organization | Partial: per-page frame stack, visibility, locks, duplicate, forward/backward | P1: groups, named document layers, cross-page layer visibility and predictable group selection |
| Reusable layout | Missing | P1: parent pages, reusable page templates, controlled overrides, automatic folios and running headers |
| Text editing | Partial: plain text in an inspector; font, size, weight, tracking, line height and alignment per frame | P1: in-canvas caret editing, styled character ranges and paragraphs, useful paste behavior |
| Text composition | Partial: basic word wrapping plus all-page text-fit review, hidden-frame reporting, navigation and downloadable report | P1: stories threaded between frames/pages, reflow, columns/insets, keep-with-next/widow/orphan behavior |
| Styles | Partial: named whole-frame text styles with links, local overrides, reset/detach and one-action global restyling; locked inherited frames are protected | P1: paragraph/character ranges, based-on style inheritance and object styles |
| Typographic detail | Missing beyond current basic controls | P2: tabs/indents, justified text, hyphenation, baseline grid, kerning controls, drop caps, lists and paragraph rules |
| Fonts | Partial: browser/installed fonts; no packaged font management | P1: missing-font report and explicit substitutions. P2: local font import/embedding where licensing permits, fallback consistency and OpenType controls |
| International typography | Partial: browser glyph rendering only | P2: explicit language/direction model and tested RTL/CJK shaping, punctuation and line-breaking. No professional language-composition parity claim |
| Tables | Missing | P1/P2: editable rows/cells, header rows, spanning cells, text flow and table/cell styles |
| Images | Working: local PNG/JPEG/WebP/SVG import, embedded raster, replace frame content, cover/contain | P1: crop-position/focal-point controls and image orientation checks. Imported SVG is rasterized rather than edited as vector paths |
| Links and asset management | Partial: assets embedded; missing IDML links become frames to relink manually | P1: links panel, dimensions/effective resolution, missing-source status, batch relink and duplicate-name review |
| Paths and drawing | Partial: rectangles, ellipses, radius, fill and stroke | P2: pen/path nodes, compound paths, clipping paths, affine skew/mirror and editable imported paths |
| Object effects | Partial: opacity/basic fills and strokes | P2: gradients, shadows, blend modes, feathering and effect ordering; preserve native effects on exchange only when supported |
| Text/object interaction | Missing | P1: text wrap around frames; P2: anchored/inline objects and text on a path |
| Long-document structure | Missing | P2: table of contents, cross-references, footnotes/endnotes, indexes, chapters and book synchronization |
| Editorial tools | Missing | P2: find/replace across stories, spelling/language tools, conditional text, variables, tracked editorial changes |
| Data publishing | Missing | P2: CSV data merge, repeated records, preview/validation and batch export. P3: XML-oriented publishing and structured catalog automation |
| Native files and recovery | Working: complete native JSON, undo/redo, IndexedDB autosave, quarantined invalid recovery, raw backup download when available | P0: retain all existing recovery guarantees through schema migrations; add storage usage and large-document save feedback |
| IDML import | Partial: real ZIP/XML parser creates editable supported pages/frames/text/references | P1: mixed text styles, threaded story flow, parent content, text wrap and crops; P2: paths/tables/advanced transforms. See exact limits below |
| INDD/INDT/INDB | Missing native decoding | P2: improve export guidance and compatibility reports. Do not promise proprietary binary fidelity or use extension renaming as conversion |
| PDF/Illustrator import | Partial: PDF and PDF-compatible AI are rendered page images at physical dimensions | P2: optional editable PDF extraction with confidence reports; native Illustrator editing remains separate work |
| Native/exchange interoperability | Partial: all native pages become portable compositions; destination-supported text/shapes/images can remain editable | P1: a capability report tied to individual objects, transform/crop fidelity fixtures, original-source retention and explicit conversion mode |
| Embedded objects from other apps | In progress at suite level; no complete FluxDesign placement workflow | P1: source-preserving snapshot placement, source download, refresh/replace and cancellation. A flattened preview is not a live linked document |
| PDF export | Partial: native vector shapes, searchable Latin text using standard PDF faces, original PNG/JPEG detail, physical page dimensions, clipping/rotation/transparency/alignment, explicit unsupported-font/glyph page fallback and report | P1: embedded/subset fonts with licensing, broader shaping/glyph coverage and page-range/resolution options. P2: tagged output and print features |
| SVG/PNG export | Working: current-page SVG with text/shapes/images; PNG at 2× | P1: page-range/batch export, resolution choices, embedded-font or outlined-text options with clear font limits |
| Print production | Missing | P2: bleed/trim boxes, crop marks, CMYK/ICC conversion, spot inks, overprint/separations and PDF/X validation. A color picker alone is not color management |
| Preflight/package | Partial: document-wide text-fit report with jump-to-frame and download | P1: missing fonts/media and image resolution. P2: package document/media/fonts when permitted; production profiles and downloadable reports |
| Digital publications | Missing | P2: reflowable/fixed EPUB, HTML export, hyperlinks/bookmarks and reading order; P3: interactive forms/media and hosted publication workflows |
| Accessibility | Partial: many editor controls are labelled; this is not an accessibility audit | P1: keyboard-only editing and dialog focus tests. P2: semantic document structure, alt text, language, tagged PDF/EPUB and screen-reader validation |
| Collaboration | Missing shared document editing/version service | P2: explicit share/review snapshots and comments; P3: permissions, concurrent edits and conflict resolution. Hosted access protection is not document collaboration |
| AI layout assistance | Working: reviewed typed commands for current page/selection, editable text/shapes/pages, one-step undo, lock enforcement | P1: typography/overflow-aware plans and style-aware commands once those models exist; no hidden automatic rewriting |
| AI media and automation | Partial: FluxLab image/text handoff and shared AI connection | P2: request-scoped visual analysis, alt-text suggestions and bounded multi-page plans. No autonomous press-ready output or native Adobe AI equivalence is claimed |
| Performance | Partial: bounded image cache, cached wrapping and released PDF canvases | P1: thumbnail virtualization and metadata-only history. P2: worker parsing and large-document benchmark gates |
| Extensions | Missing plugin/script API | P3: versioned typed document operations, sandboxing and compatibility policy before third-party extensions |

## Import fidelity: what users can depend on

| Input | Reliable contract | Not preserved as native editable content |
| --- | --- | --- |
| FluxDesign native envelope | Complete current native page/frame model and embedded images | Features not represented in the model cannot be recovered from a prior conversion |
| IDML | Bounded ZIP/XML import; supported frame coordinates and ordinary rotation/scale; first-run text style; local packaged raster sources where present | Parent artwork, tables, arbitrary paths, mixed formatting, story continuation layout, frame columns/insets, wrap, gradients/effects, exact crop and print color profiles |
| PDF / compatible AI | One rendered image per page, original page size/rotation; editable overlays can be added | Individual text, vectors, layers, annotations, forms and Illustrator native object data |
| FluxExchange / other suite native | Supported portable compositions; warnings for unsupported content | Exact procedural output, live animation, all app-specific typography/effects and production metadata |
| INDD / EPS / non-PDF AI | Clear conversion guidance | No decoding and no lossless round-trip |

Current Adobe import bounds are documented in the README: 64 MB file, 100 pages, 5,000 supported IDML items, bounded expanded ZIP/XML and encoded images. Missing external links are never fetched automatically. IDML stories are currently retained once in their first encountered frame; empty continuation frames are not working text threading. Native FluxDesign backups must remain distinct from portable exchange exports.

## Ordered implementation plan

### D0 — Establish fidelity and safety gates (P0)

1. Build a small legally shareable reference corpus: 1-page flyer, 12-page magazine, 40-page report, mixed-font text, table, missing link, parent-page override and rotated/cropped image. Keep native originals, PDF references and expected conversion notices.
2. Record source and output feature support by object, not just by extension. Make the full import report downloadable; the current UI shows only the first 20 notices.
3. Define native schema migrations before adding rich text/stories/styles. Preserve original invalid storage and keep every import atomic and undoable.
4. Add preflight for currently detectable failures, without describing an RGB raster proof as press-ready.

Acceptance: an unsupported item has a visible location/reason; failure or cancellation never changes the document; existing backups reopen; every export declares raster/vector, font and color constraints. Tests include storage failure, malformed input and missing source assets.

### D1 — Complete everyday page editing (P1)

Add multi-select/groups, alignment/distribution, snapping, proportional handles and a links panel. Introduce reusable parent pages with explicit override semantics. Improve keyboard navigation and avoid hidden disabled controls.

Acceptance: a user can build and restyle a 12-page magazine with repeated headers without copying each header manually; group moves preserve member geometry; locked frames remain unchanged; undo restores the complete operation; keyboard-only selection/arrangement works.

### D2 — Build the text foundation (P1, before advanced IDML expansion)

Add document stories, styled runs, paragraph properties, style IDs and deterministic layout results. Separate source text from positioned glyph/layout caches. Implement threaded frames, overset reporting, insets, columns and reflow; then table and text-wrap models. Map IDML stories/styles into this representation instead of applying more heuristics to the current flat strings.

Acceptance: editing the opening paragraph reflows later frames without loss/duplication; style changes update all inheriting paragraphs while preserving explicit overrides; copy/paste retains supported styles; selected text, font substitution and exported line breaks have golden fixtures. Test multilingual strings and font-loading changes.

### D3 — Deliver trustworthy PDFs (P0/P1 output, P2 press features)

Create vector/text PDF export with shared layout metrics and deliberate font embedding/subsetting. Add page-range/resolution options and preflight. Introduce bleed/trim/crop semantics next; only then adopt a color-managed CMYK/spot/PDF/X pipeline with independent validation. Keep current raster export available as a labelled proof option.

Acceptance: PDF text extraction matches source; fonts and page/trim boxes are inspectable; images meet chosen effective resolution; vector shapes stay vector; exported samples visually match reference layout. Tagged reading order and PDF/X compliance require separate validators, not a filename or checkbox.

### D4 — Extend editorial and digital workflows (P2)

Build tables, automatic numbering/TOC/references, data merge and accessible semantic structure. Add EPUB/HTML after stories/styles and reading order are stable. Add review comments before multiuser concurrent editing.

Acceptance: a 40-page report renumbers and refreshes its TOC after page moves; table headers repeat correctly; a merge reports invalid records before export; accessible output is checked with real reading software and an appropriate validator.

### D5 — Complete suite objects and AI-assisted production (P1/P2)

Finish the shared source-preserving object adapter only after its explicit render contract exists. Offer editable conversion, embedded snapshot and source export as distinct actions. Use page/style/overset models in AI proposals, preserve review/undo and exclude attached source bytes from provider context. AI media generation must retain its pricing/connection scope and cancellation behavior.

Acceptance: a placed source preview contains actual rendered artwork, source download is byte-equivalent, replacement cannot overwrite newer edits, and unsupported effects generate notices. No live-link claim until refresh, source identity and stale states are implemented and tested.

### D6 — Scale and specialist production (P2/P3)

Virtualize page thumbnails, move parsing to workers and separate immutable media from history. Establish memory/frame-time baselines for the corpus before setting supported large-document limits. Book synchronization, advanced language typography, scripting and specialized print work follow their foundations.

Acceptance: benchmark reports include machine/browser, document size, timings, memory and cancellation latency; no unmeasured performance claim. All earlier fidelity and recovery checks remain green.

## Immediate recommended batch

Start with D0, then implement multi-selection/alignment plus the initial preflight report. Design the story/style schema before broadening IDML fidelity or adding large amounts of AI functionality. PDF font embedding/coverage and text flow remain large practical gaps after the bounded vector/searchable PDF increment. The cross-app object work is paused/in progress and must not be reported as a finished FluxDesign feature.

PDF color fidelity: PNG files carrying ICC, gamma/chromaticity, orientation or animation metadata are normalized through the browser to RGB PNG with an explicit conversion notice; ordinary profile-free/sRGB PNG stays directly embedded. An independent Adobe RGB PNG fixture exposed and verified this correction.

## Completed layout-guides increment — 2026-10-09

Optional native per-edge margins, validated usable column guides, selected-frame margin/column alignment and visible six-screen-pixel snapping are implemented. Moving rotated frames uses their visible frame bounds; resize snapping is limited to unrotated frames. Rotated resizing now retains its fixed world corner. Locks, one-gesture undo, Escape/pointer-cancel rollback and nonprinting export behavior are tested. Build + 33 unit + five new layout browser groups + 19 existing editor + six PDF groups pass. No print preflight, bleed or facing-page parity is claimed.
