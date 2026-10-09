# FluxDesign versus Adobe InDesign: gaps and delivery plan

Source review: 2026-10-09. This is a planning document, not a parity claim or a new release announcement. **Working** means a real implementation exists for the stated scope; **Partial** means important restrictions remain; **Missing** means no complete workflow exists in the inspected source. Existing verification is recorded in [OPTIMIZATIONS.md](OPTIMIZATIONS.md); the review below did not rerun the full browser suite.

FluxDesign is presently a useful short-publication editor. InDesign-class editorial composition, long-document automation, accessible publishing and press production require substantial additional work. The first target should be a dependable 12–40-page editorial workflow, with clear output quality, before broad professional parity.

## Evidence and comparison scope

Inspected `src/main.jsx`, `model.mjs`, `render.mjs`, `import-idml.mjs`, `import-pdf.mjs`, the import/model fixtures, README and optimization backlog. The model has pages containing independent text, rectangle, ellipse and image frames; text is a single string with one style per frame. The renderer uses browser text measurement and Canvas/SVG; PDF pages currently embed rendered PNGs.

Adobe's current [InDesign help index](https://helpx.adobe.com/indesign/desktop.html) supplies the comparison categories. In particular, [threaded text](https://helpx.adobe.com/indesign/desktop/add-and-manage-text/add-and-import-text/thread-text-frames.html), [text styles](https://helpx.adobe.com/indesign/desktop/format-and-style-text/text-styles/create-and-edit-text-styles.html), [parent pages](https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/create-and-manage-parent-pages/about-parent-pages.html), and [document setup](https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/create-documents/change-document-setup.html) describe distinct capabilities that basic frame editing does not replace. Current accessibility and data-merge developments are documented in [Adobe's release overview](https://helpx.adobe.com/indesign/desktop/whats-new/whats-new.html). Beta or future Adobe features are not treated as a required baseline.

## Capability inventory

Priorities: **P0** protects work or prevents misleading deliverables; **P1** completes common publication jobs; **P2** broadens production use; **P3** covers specialist workflows. Priority belongs to the missing part, not to a claim that the existing feature is defective.

| Area | State today | Remaining gap and priority |
| --- | --- | --- |
| Multipage documents | Working: add, duplicate, delete, reorder; active-page navigation | P1: facing-page spreads, binding direction, page sections and page labels |
| Page setup | Working: presets/custom sizes, page background, margin/column/gutter guides in points | P1: independent edge margins, mm/in conversion, bleed/slug settings; guides currently do not provide a full snapping system |
| Precision placement | Partial: drag, one resize handle, inspector geometry, rotation, keyboard nudging | P1: multi-selection, marquee, proportional resize, alignment/distribution and smart snapping |
| Object organization | Partial: per-page frame stack, visibility, locks, duplicate, forward/backward | P1: groups, named document layers, cross-page layer visibility and predictable group selection |
| Reusable layout | Missing | P1: parent pages, reusable page templates, controlled overrides, automatic folios and running headers |
| Text editing | Partial: plain text in an inspector; font, size, weight, tracking, line height and alignment per frame | P1: in-canvas caret editing, styled character ranges and paragraphs, useful paste behavior |
| Text composition | Partial: basic word wrapping and an overflow notice | P1: stories threaded between frames/pages, reflow, columns/insets, overset inspector, keep-with-next/widow/orphan behavior |
| Styles | Missing | P1: reusable paragraph, character and object styles, inheritance, overrides and one-action global restyling |
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
| PDF export | Partial: real multipage PDF, physical page dimensions, raster RGB artwork up to 144 dpi | P0/P1: vector paths, selectable text and embedded fonts, correct image resolution; then tagged output and print features |
| SVG/PNG export | Working: current-page SVG with text/shapes/images; PNG at 2× | P1: page-range/batch export, resolution choices, embedded-font or outlined-text options with clear font limits |
| Print production | Missing | P2: bleed/trim boxes, crop marks, CMYK/ICC conversion, spot inks, overprint/separations and PDF/X validation. A color picker alone is not color management |
| Preflight/package | Missing comprehensive workflow | P1: report overset text, missing fonts/media and image resolution. P2: package document/media/fonts when permitted; production profiles and downloadable reports |
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

Start with D0, then implement multi-selection/alignment plus the initial preflight report. Design the story/style schema before broadening IDML fidelity or adding large amounts of AI functionality. Vector/text PDF output and text flow are the two largest practical gaps. The cross-app object work is paused/in progress and must not be reported as a finished FluxDesign feature.
