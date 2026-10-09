# FluxDesign optimization worklist

Updated 2026-10-09. This is an observed implementation worklist, not a claim that every item is already supported.

| Priority | Area / observed issue | Status and concrete next step | Verification |
| --- | --- | --- | --- |
| P0 | Invalid or unreadable autosave was followed by saving the demo over the original | **Done:** persistent recovery quarantine pauses all autosave; optional original-data download; explicit valid project Open or New resumes; ordinary media and FluxLab additions do not clear recovery | 9 focused Edge recovery/race groups plus 19 baseline editor groups |
| P0 | An image read could finish after New/Undo returned to the same document or a frame was locked | **Done:** generation and document-reference guards, post-decode frame/lock check, decode timeout, temporary canvas release | Delayed image/New/Undo regression and existing image undo checks |
| P0 | Adobe formats were rejected together, including open IDML and PDF | **Done:** separate IDML ZIP/XML conversion and local PDF/PDF-compatible AI rendering, with accurate editability labels and format-specific guidance | Model tests plus real Edge file-import tests |
| P0 | An asynchronous import could replace newer work or commit partially | **Done:** prepare complete candidate first, revision/reference guard during loading and review, one undo commit; cancellable PDF rendering | Preview/cancel/undo and original-document equality checks |
| P0 | ZIP/XML input could allocate uncontrolled output or follow external paths | **Done:** bounded central/local ZIP headers, streamed bounded inflate, checksums, safe names, entry/total/XML nesting limits; reject DTD/entities; never resolve outside package | Malformed archive/XML/path/size tests |
| P0 | PDF pages can be huge or numerous | **Done:** per-file/page/pixel/encoded-size budgets, adaptive resolution, sequential page rendering, released page/canvas/worker resources | Actual PDF dimensions/pixels, cancellation, no network checks |
| P1 | Repeated previews and exports retained every decoded image forever | **Done:** image LRU bounded to 12 entries / 24 million decoded pixels; deleted-project sources are purged | Existing PNG/PDF export regression smoke |
| P1 | Thumbnail, artboard and overflow checks remeasured the same text repeatedly | **Done:** weakly referenced wrapping cache keyed by text/font/width/tracking; font-loading invalidation | Cache reuse and edit/width/font invalidation regression |
| P1 | PDF export retained large completed page canvases until garbage collection | **Done:** clear each canvas after embedding its PNG | Actual multipage PDF smoke |
| P1 | IDML rich text and thread layout can differ materially | **Next:** run-level text model, linked flow engine, insets/column handling, overset-text inspector. Preserve current explicit warnings until implemented | Golden documents exported from multiple real InDesign versions |
| P1 | Master-page objects and arbitrary vector paths are omitted | **Next:** master-page placement with override resolution, then native path primitives and clipped groups | Facing-page/master/group fixtures and rendered comparisons |
| P1 | Long publications render all page thumbnails and frames eagerly | **Next:** virtualize thumbnail list; memoize PageArt/MiniPage; render only visible thumbnails. Measure a 100-page document before/after | Frame timing, DOM node count, keyboard selection tests |
| P1 | Native commits clone/validate/stringify the whole project, including image strings | **Next:** structural sharing and trusted immutable media records; keep full validation at import/storage/AI boundaries | Undo/redo and AI atomicity regression; memory benchmark with PDF imports |
| P2 | Large IDML conversion currently runs on the UI thread | **Next:** move ZIP/XML conversion into an app worker with transferables, progress and true mid-parse cancellation | Cancel during a large archive; no main-thread long tasks |
| P2 | IDML missing images require manual frame selection | **Next:** missing-media panel and multi-file basename matching with explicit resolution preview; preserve no-network rule | Duplicate-name, missing, lock and relink tests |
| P2 | Import diagnostics currently show the first 20 notices | **Next:** grouped counts plus a downloadable complete compatibility report | Large mixed-content fixture with all warnings recoverable |
| P2 | Frame transforms are limited to rotation and size | **Next:** support skew/mirror or an affine matrix in the native schema and every exporter | World-corner roundtrips across suite adapters |
| P2 | Professional print work needs more than raster RGB PDFs | **Next:** vector/text PDF export, explicit font embedding, bleeds/crop boxes, separate color-managed production workflow | PDF text extraction, font licensing checks, print proof comparison |
| P2 | Existing controls assume desktop mouse use | **Next:** keyboard frame navigation, focus management in dialogs, better small-window inspectors, touch hit targets | Keyboard-only workflows, accessibility tree, 1280×800 layout |
| P2 | Text rendering depends on installed fonts | **Next:** font availability warnings and deliberate replacement preview; avoid silent remote font loading | Missing-font fixture and line-break comparison |
| P3 | Source provenance is limited after IDML conversion | **Next:** optional original-source attachment with explicit file-size budget and download recovery; keep it out of AI context | Source hash roundtrip and provider-context privacy tests |

Current quality boundary: IDML creates useful editable structures; PDF/compatible AI preserve rendered artwork. Neither claims native INDD, full Illustrator editing, exact InDesign typography, press preflight, or arbitrary Adobe plugin compatibility.

## Completed typography subset — 2026-10-09

Whole-frame reusable text styles materialize their resolved values, retaining version-1 native compatibility and portable appearance. Local direct and AI typography changes become explicit overrides. Global updates reject affected locked inherited frames before any mutation; style operations are one undo step. An all-page text-fit review includes hidden frames and downloads measurements with browser-layout limits. Reused wrapping metrics are invalidated when fonts load; empty frames do not produce false clipping.

Validation: build, 27 unit checks, 19 editor browser checks, six typography browser groups, and six independent PDF groups pass. Rich character/paragraph ranges, threaded stories, broader font/glyph support, missing-font/media preflight, parent pages and professional print production remain open.
