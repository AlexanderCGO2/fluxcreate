# FluxLab feature gaps and implementation plan

Source audit: 2026-10-09. This document compares FluxLab with the capabilities expected of a capable AI creation studio and generation hub. There is no single original application being cloned. A feature shown in a provider's catalog is not automatically an implemented FluxLab workflow.

**Working** means an implemented application path exists, with the important limitations stated. **Partial** means the useful core exists but does not cover the whole category. **Missing** means no usable path was found. **In progress** is separate from working and requires the acceptance checks below before release. Priorities describe the next work, not a claim that every advanced feature must be built.

## Implemented recipe and discovery subset — 2026-10-09

Named bounded recipes, exact new-result settings, explicit one-request prompt variations, result lineage and metadata type/model/order filters are implemented. Unavailable models/options remain visible and block submission until the user makes an explicit choice. Unknown per-request cost is disclosed; no price guarantee is fabricated. Recipe writes use version checks and preserve previous records after quota failures. Grid rendering starts at 48 metadata cards, with incremental loading.

Build, 69 unit checks, 12 studio browser groups, nine media/recovery browser groups and eight recipe/filter groups pass with injected services and no paid calls. Open limits: full-text indexing, thumbnails/folders/tags, bulk original-asset archive, shared cloud ownership, actual quotes/charge reconciliation and automatic batches.

## Current baseline

FluxLab already generates text, images, asynchronous video and speech through the configured Vercel AI Gateway connection. Its browser library retains original generated assets; videos and audio are saved as Blobs after media validation. It offers model discovery, light/dark appearances, playback, downloads and reviewed handoff to suitable creative editors. It also has a real external stdio MCP server/App and official-SDK HTTP MCP on protected same-origin application routes.

The shared floating assistant is implemented in Fluxfoto, Fluxiffects, Fluxini and Flux3D. Bounded reference-image editing is implemented through the editor MCP routes that expose image actions; it is not a new reference-upload workspace in the main FluxLab studio. The main gaps are mask-guided edits and actual upscale, paid provider smoke, bulk recipe/library archives, stronger asset organization/cloud ownership, reconciled cost visibility and additional audio workflows. Hosted generation does not make the browser library a cloud asset store.

## Feature inventory

| Area | Current state | Missing or restricted behavior | Priority |
| --- | --- | --- | --- |
| Text generation | Working | A single prompt and result, with output-token control. No multi-turn conversation, streamed tokens, document attachments, citations or retrieval. | P1 |
| Image generation | Working / partial | One generated image per request. Editor helpers can submit one embedded PNG/JPEG/WebP reference through documented, catalog-capable image-edit adapters and review a separate result. Prompt-based one-request variations restore saved settings and record lineage; no main-studio reference workspace, automatic variation sets, masks, bounded-region inpainting/outpainting, dedicated relighting/background removal or genuine upscale. Paid model/account output remains unverified. | P1 |
| Video generation | Working / partial | Text-to-video with supported duration/aspect choices. No image-to-video, video references, extension, first/last frame, motion controls, video-to-video or storyboard sequencing. | P2 |
| Speech | Working / partial | Script-to-speech with catalogued voices and output formats. The mode is explicitly Speech. No transcription, translation/dubbing, voice cloning, pronunciation dictionary, speaker timeline or subtitle alignment. | P2 |
| Music and sound effects | Partial | Cloudflare Music v2 supports bounded 3–60 second MP3 generation, recipes, playback, download and audio handoff. Account access and paid output remain unverified. Sound effects, composition plans, stems, continuation and durable remote job recovery remain missing. | P2 |
| Live model catalog | Working / partial | Capability-filtered live catalog and stale-cache notices. No model search/ranking, favourites, side-by-side comparison, accessibility/performance filters or user-defined provider adapters. | P1 |
| Model-specific controls | Partial | Text token allowance, selected image sizes, video duration/aspect and speech voice/format. No general capability schema for seeds, negative prompts, reference limits or provider-specific advanced settings. | P1 |
| Prompt workspace | Partial | Starter prompts and reuse of a saved result's prompt/model/kind. A separately persisted unsent prompt/settings draft restores without generating. Malformed records and cross-tab changes require review; quota failures retain edits. No per-mode draft collection, variables or prompt history. | P1 |
| Generation recipe | Working / partial | Version-1 exact request settings persist with new results and resumable video jobs. Up to 40 named editable recipes support explicit save/update/delete and settings download with cross-tab version checks. Load never generates; Use prompt restores settings and new results retain parent lineage. Strict ≤64 KB JSON recipe imports require preview and explicit save as a new name; a separate unsent draft restores without generating. Bulk archives and older-result settings remain unavailable. | P1 |
| Result comparison and iteration | Partial | Editor reference edits show original/result before inserting a new copy. No general variant grid, ratings, pinned alternatives, persistent branch history or library-wide source/result lineage. | P1 |
| Video job recovery | Working / bounded | Request ID is saved before submission; signed tickets survive reload; pause/resume checks do not resubmit; failed downloads remain retryable. Ticket expiry, credential changes and provider retention still limit recovery. Pausing is not provider cancellation. | Preserve |
| Text/image/speech recovery | Partial | Cancellation and stale-result guards prevent accidental UI replacement. These are synchronous requests without durable provider job tickets. Editor MCP request IDs prevent duplicate calls only within the current connection-scoped server process; uncertain failures are retained and never automatically retried. Process loss or another hosted instance still requires explicit uncertainty handling. | P1 |
| Batch generation and queues | Missing | No batch prompt import, bounded batch queue, per-item retry policy, bulk variant requests or queue-wide spend preview. Video jobs are recoverable individual requests, not a general job system. | P2 |
| Library persistence | Working / partial | Atomic IndexedDB records, no silent overwrite, save-failure retry/download and result-specific saving state. Browser/origin scoped; clearing browser data can remove the library. No cloud backup or cross-device synchronization. | P1 |
| Library browsing | Partial | Metadata-only listing/search and on-demand full asset loading. No paged queries, generated thumbnails, folders, tags, favourites, bulk selection or asset usage tracking. | P1 |
| Library portability | Partial | Individual originals can be downloaded. No validated bulk archive export/import, conflict review or complete recipe/lineage backup. | P1 |
| Media preview and editing | Partial | Image viewing, video/audio playback and original downloads work. No waveform editing, trim/transcode, contact sheets, captions, playback quality variants or accessible transcript workflow. Editing belongs primarily in the suite editors. | P2 |
| Output formats | Partial | Current bounded text/image, MP4/WebM video and MP3/WAV speech paths. No universal transcoder, selectable image colour profiles, alpha-generation guarantees or production export presets. | P2 |
| Suite handoff | Working / partial | Text/image can be reviewed and added in four creative editors; audio/video go to the two motion editors. Bounded browser inbox/outbox/history and terminal receipts recover pending review across reload and guard duplicate cross-tab claims. Transfers remain origin-local snapshots; no live linked generation or distributed exactly-once destination transaction is claimed. | P1 |
| FluxAgents output to FluxLab | Working | The real-origin popup handshake delivers editable text for review as a prompt. Applying does not generate or bill; long output can be shortened in the review, and unsaved generated results block replacement. The new destination passed the five-target browser handoff checks. | Preserve |
| Floating context-aware assistant | Working / bounded | All four adapters support validated edit/explain with stale/cancel guards. Fluxfoto/Fluxiffects also support reviewed text/image insertion and selected image references; Fluxini supports text/image planes and references its selected studio-plane preview. Flux3D is edit/explain only. General conversation, arbitrary editor tools and durable remote jobs remain absent. | P1 |
| MCP | Working / bounded | Five-tool stdio App remains intact. Official-SDK same-origin HTTP supports modern discovery and legacy initialization, tools and the App resource; editor routes add validated planner and reference-edit tools. No public OAuth connector service, external connector browser, durable cross-instance replay ledger or asset-management tools. | P1 |
| Credentials | Working / partial | Shared settings support personal request-scoped Gateway credentials and explicit suite connection behavior. No account vault, team workspace, multiple named provider profiles or dedicated music-provider settings. | P1 |
| Cost and usage | Partial | Provider token usage and available catalog prices are exposed. No reliable all-modality preflight estimate, paid-run ledger, per-project budgets, actual charge reconciliation or batch spend approval. | P1 |
| Collaboration and governance | Missing | No shared cloud library, permissions, comments, approval assignments, organization quotas, usage audit export or asset retention policy. | P3 |
| Evaluation and provenance | Partial | Model/prompt/time are retained. No systematic model-quality comparisons, output checks, prompt test sets, license/provenance registry or content-credential workflow. | P2 |

## Important boundaries to preserve

- A model catalogue entry does not prove account access, a supported endpoint, reference-image compatibility or a particular output format. Controls must come from verified adapters and fail before billing when unsupported.
- Text/image/speech cancellation stops local waiting and propagates an abort; it cannot promise cancellation or refund of accepted provider work. Video pause stops checking while retaining the existing job.
- Saved media must contain validated permanent bytes, not only a provider URL that expires. Current video download and job retention behavior already follows this rule.
- Reusing a result must never silently replace unsaved work. New editing features must preserve original assets and distinguish a proposed result from an applied change.
- Speech reads the submitted script. Music, sound effects, transcription and voice cloning are separate capabilities, each requiring its own supported provider path.
- Local 2× resampling, if introduced, must be labelled a local resize. Do not present it as AI detail reconstruction.

## Detailed implementation plan

### Phase 0 — finish the current integration safely

The reviewed FluxAgents-to-FluxLab handoff and local-origin correction are implemented and verified. Preserve this path, the existing media job invariants and the five default external MCP tools alongside the implemented optional editor tools.

Regression gate: the real local separate-port, five-target browser handoff test already verifies review and insertion, including FluxLab prompt use without generation. Retain broader shared handoff tests and add hosted same-origin, rejected-origin, cancellation, unsaved-work and stale-destination coverage as new paths are introduced. Existing MCP tests use injected services without paid calls. The editor HTTP routes now pass official-client protocol, connection-isolation, schema, cancellation and actual-adapter browser tests. Their request cache is process-local, not durable across server instances.

### Phase 1 — make every creation repeatable and portable

Implemented: versioned normalized request recipes, bounded named saves and prompt-based variation lineage. Named recipes require explicit saves. A separate versioned unsent draft restores before incoming reviewed prompts can be applied; quota, malformed records and cross-tab conflicts preserve existing data. Validated single-recipe JSON import adds a new named record only after review. Introduce a library archive containing validated records, recipes and original bytes with a manifest and explicit duplicate handling.

Acceptance: a result reopens with all settings intact; switching modes preserves appropriate drafts; reload and quota failures retain work; an imported archive cannot overwrite an existing identifier silently; malformed, excessive and partially missing assets produce a recoverable report. No credentials or signed provider job tickets belong in a shareable recipe archive.

### Phase 2 — implemented assistant slice; remaining image work

The shared adapters and real MCP dispatcher are implemented. Requests capture document and selection revision, validated planner previews require explicit Apply, and supported generated assets are reviewed before insertion. Source bytes remain intact; pixel bytes are included only for an explicit reference edit. Flux3D currently exposes only edit/explain. See [implementation evidence and limits](../../FluxCreate/docs/FLOATING-AI-IMPLEMENTATION.md). Next steps are paid provider/account verification, region/mask contracts, genuine upscale integration, durable remote jobs and clearer reconciled costs; missing capabilities remain unavailable.

Acceptance: Fluxfoto, Fluxiffects, Fluxini and Flux3D each demonstrate one supported selected-object operation; locked selections, selection changes, document changes, cancellation and two concurrent personal connections cannot apply a stale/wrong result. Image edits validate input/output dimensions and bytes, preserve the original and show before/after. Actual AI upscale is enabled only after an appropriate endpoint and account capability are verified.

### Phase 3 — improve discovery, cost clarity and library scale

Add searchable model choices with capability details and a normalized adapter registry. Persist an honest per-request estimate when meaningful, together with assumptions, currency and whether actual provider usage is available. Add thumbnails and indexed/paged library queries, then folders/tags and comparison views. Keep full originals out of list rendering.

Acceptance: large fixture libraries browse without decoding all assets; changing a model removes incompatible settings; unknown pricing is labelled unknown; estimates are never called a guaranteed bill cap. Cancelling or retrying an uncertain request explains whether another paid call may occur. Cost controls are enforced before a submission, not merely displayed afterward.

### Phase 4 — expand media deliberately

Implement reference-conditioned video and richer speech controls only for documented account-supported models. Treat music as a separate connection and mode; begin with the [Cloudflare integration plan](../../FluxCreate/docs/CLOUDFLARE-AI-GATEWAY.md) and verify the account/provider before enabling it. Add batch work only after idempotency, per-item persistence and spend policies exist. Reuse Fluximiére/Fluxiffects for detailed timeline editing rather than duplicating their editors inside FluxLab.

Acceptance: fixtures cover successful output, unsupported settings, expired assets, oversized/invalid media, uncertain submission, interrupted download and reload. Provider-dependent background recovery is offered only where a real status mechanism exists. Tests never substitute generated-looking sample output for an actual generation.

### Phase 5 — optional cloud/team foundation

Add authenticated accounts, a durable application database and private object storage before claiming shared or multi-device libraries. The current HTTP MCP endpoint is restricted to the authenticated same-origin suite. Define ownership, quotas, deletion/export and connector permissions before offering public/OAuth remote connectors or shared asset-management tools. Keep browser-only mode usable.

Acceptance: account isolation, revoked access, concurrent edits, interrupted uploads, export/delete and signed asset expiry are tested end-to-end. Cloud storage and generation costs are reported separately. This phase is not required to make the current single-user studio useful.

## Evidence and verification scope

This is a source audit, not a claim that every provider or paid generation was tested. Primary local evidence: [main UI](../src/main.jsx), [client](../src/client.mjs), [library](../src/library.mjs), [video jobs](../src/VideoJobs.jsx), [generation service](../server/service.mjs), [video service](../server/video.mjs), [speech service](../server/audio.mjs), [MCP server](../server/mcp.mjs), [official HTTP dispatcher](../server/mcp-http.mjs), [browser MCP client](../src/mcp-client.mjs), [image-edit capability registry](../server/pixel-capabilities.mjs), [frontend behavior](FRONTEND.md) and [optimization review](OPTIMIZATIONS.md). Existing test coverage is in [tests](../tests), with real-browser library, media, jobs and MCP harnesses in [scripts](../scripts).

For provider/protocol scope, consult the official [Gateway model catalog documentation](https://vercel.com/docs/ai-gateway/models-and-providers), [video generation documentation](https://vercel.com/docs/ai-gateway/modalities/video-generation), [speech documentation](https://vercel.com/docs/ai-gateway/modalities/text-to-speech) and [MCP Apps project](https://github.com/modelcontextprotocol/ext-apps). These describe available building blocks; they do not establish that every feature is wired into FluxLab. Music-provider research and its date are recorded in [OPTIMIZATIONS.md](OPTIMIZATIONS.md).


Current focused verification uses injected providers, never paid models: modern/legacy MCP initialize/list/call, immutable personal-key isolation and expiry, request-ID reuse, cancellation, reference-image request shape/bytes/limits, rejected unsupported settings, and actual Fluxfoto/Fluxiffects/Fluxini/Flux3D helper adapters. Packaged hosted routes retain deployment authentication and the MCP App resource. These checks certify application/protocol behavior, not provider quality, account access or exactly-once paid effects across instances.

## Protected draft and recipe import increment — 2026-10-09

The unsent draft uses its own IndexedDB record, independent of outputs, video jobs and named recipes. Its bounded prompt and exact settings restore before editing or incoming prompt use; restoration never generates. Writes compare an immutable revision, and even deletion in another tab raises a conflict. Explicit Keep/Restore resolves it; unreadable records remain protected while a temporary draft can be edited. Explicit replacement stores the original under a recovery key. Quota errors retain the old record and visible text with a retry action; pending unsaved edits warn before leaving. Storage remains browser/origin-local.

Recipe JSON import accepts only a version-1 FluxLab export up to 64 KB and rejects unsupported fields, credentials and tickets. The preview shows prompt, model, settings and availability. Save creates a fresh named recipe; duplicate names require a new name. Import never changes the current prompt or starts a request. Explicit Load prepares the draft; Generate still approves one request. Late cancelled file reads cannot restore a preview.

Build, 69 unit checks, 12 studio browser groups, nine media/recovery groups, eight recipe/filter groups and nine new draft/import groups pass with injected services and no paid calls. New evidence: `node scripts/drafts-browser-smoke.mjs`, `artifacts/drafts-browser/report.json`. Bulk library archives, multi-draft history, cloud sync, provider reconciliation, full-text search, actual upscale, advanced music controls and automatic batches remain open.


## Cloudflare Music v2 increment — 2026-10-10

A separate Music workspace supports a 2,000-character brief, instrumental preference, 3–60 seconds and one MP3 through Cloudflare. It works independently of Vercel catalog availability. Drafts and named recipes never generate automatically; request records are saved before submission. Completed bytes decode before preview/library save, with MP3 download and reviewed Fluximiére/Fluxiffects handoff. Interrupted requests remain uncertain across reload and require an explicit billing acknowledgment before clearing. Cross-tab revision checks prevent stale submissions. Failed completion storage retains the playable in-memory result and protects it from accidental reload. Music provenance and estimated billing source survive library persistence.

Server duplicate protection lasts 24 hours in one process, bounded to 512 records and a 32 MiB completed-result cache. It is not durable across serverless instances or devices. Download bounds are just under 3 MiB to fit the hosted 4 MiB base64 JSON response. No paid provider calls have been performed. Remaining: actual account/model verification, long/background music jobs, durable reconciliation, composition plans, stems, continuation, sound effects, Opus and precise charge reconciliation.
