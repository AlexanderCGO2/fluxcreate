# FluxLab optimization review

| Priority | Area | Status | Result or next step |
| --- | --- | --- | --- |
| P0 | Persistence | Implemented | Atomic IndexedDB result and catalog inserts; duplicate IDs cannot overwrite saved work. Storage failures preserve unsaved output for download and retry. |
| P0 | Async generation | Implemented | Abort propagation, a generation identity guard, and retained prior results prevent cancelled or failed calls from replacing work. |
| P0 | Interoperability | Implemented | Validated text/image handoff with target confirmation uses the shared suite helper. |
| P1 | Library loading | Implemented | List and search use small metadata records; full image data loads only when selected. |
| P1 | Offline access | Implemented | Model connection failure leaves the saved library accessible. |
| P1 | Responsive UI | Implemented | Mobile navigation remains accessible and decorative artwork stays within the viewport; both appearances are verified. |
| P1 | Large libraries | Next | Add paged IndexedDB catalog queries once real collections approach thousands of entries. Current browsing reads metadata only. |
| P2 | Visual browsing | Next | Generate small thumbnails once per image to improve library recognition without repeatedly decoding originals. |
| P2 | Prompt workspace | Next | Persist in-progress prompts independently from generated results and offer named prompt collections. |
| P2 | Result portability | Next | Add a bulk library export/import package with per-record validation and conflict review. Individual text and image downloads already work. |

| Priority | Area | Status | Result or next step |
| --- | --- | --- | --- |
| P1 | Video and speech generation | Implemented | Live catalog controls, verified playback, bounded original downloads, permanent Blob assets, and motion-editor handoff. |
| P1 | Background video recovery | Implemented | Pre-submission request IDs, durable signed tickets, explicit pause/resume, reload/MCP recovery, safe recognition of already-saved clips, failed-download retry, atomic completed-job removal, and cross-tab removal protection. Provider/ticket availability still limits recovery. |
| P2 | Music generation | Planned, not implemented | Prefer Cloudflare AI Gateway Music v2 with an independent Cloudflare connection and Music mode; verify account access and actual provider behavior before enabling it. |

## Music research — checked 2026-10-09

The [live Vercel AI Gateway catalog](https://ai-gateway.vercel.sh/v1/models) contained 413 models, including 12 speech models, but no standalone music model or ElevenLabs entry. Matches for music or sound referred to audio accompanying generated video. The existing Gateway connection therefore does not currently expose the documented ElevenLabs Music route.

ElevenLabs directly supports `music_v2_5` through `POST /v1/music`, with a prompt or composition plan, instrumental or vocal music, and durations from 3 seconds to 10 minutes. Its Music API requires a paid ElevenLabs account and a separate server-side `ELEVENLABS_API_KEY`. See the official [compose API](https://elevenlabs.io/docs/api-reference/music/compose) and [Music quickstart](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music).

Planned integration: a dedicated Music mode with an instrumental/vocals choice, duration control, decoded audio preview, durable library storage, download and audio handoff to Fluximiére and Fluxiffects. Provider settings and output limits must be validated before submission. Background recovery must only be offered if a documented provider job/status mechanism supports it; stopping a local request must not imply that provider work or charges were cancelled. This is a proposal, not an available feature. No paid generation was performed for this research.

Additional candidates checked on the same date:

- Google documents `lyria-3.5` for full songs and `lyria-3-clip-preview` for 30-second clips through its paid Gemini API, using a separate Gemini key. See [music generation](https://ai.google.dev/gemini-api/docs/music-generation) and [pricing](https://ai.google.dev/gemini-api/docs/pricing). Direct API support does not imply Gateway availability.
- MiniMax documents `music-3.0`, `music-2.6` and `music-cover`, but its [Music API availability notice](https://platform.minimax.io/docs/api-reference/music-generation) says that paid Music/Lyrics access closed to new users on 2026-08-20; existing paying users retain access. Do not present it as generally available without confirming account eligibility.

Update 2026-10-10: prefer the documented Cloudflare `elevenlabs/music-v2` route using Cloudflare account billing. This does not require assuming access to the direct ElevenLabs API. See [Cloudflare research and implementation direction](../../FluxCreate/docs/CLOUDFLARE-AI-GATEWAY.md). No Cloudflare music connection or provider smoke is implemented yet.

## Completed recipe/filter subset — 2026-10-09

Exact normalized request recipes now accompany new result records and persisted video jobs. Bounded named recipe storage uses atomic transactions, a 40-item limit and optimistic version checks for update/delete. Loading only edits a draft; generated variations retain source-result identity. Missing models/settings block submission, and one synchronous submission guard prevents rapid duplicate approvals. Request schemas exclude credentials, tickets, arbitrary fields and automatic batch counts. Unknown total cost stays explicit.

Metadata-only library filters combine type/model/query/order and render 48 cards at a time. Search covers bounded saved previews/excerpts, not complete outputs. Build + 69 unit + 12 existing studio + nine media/recovery + eight recipe/filter browser groups pass with no paid calls. Full-text indexes, thumbnails, folders/tags, library archives, quote/reconciliation and cloud ownership remain open.

## Protected draft and recipe import increment — 2026-10-09

The unsent draft uses its own IndexedDB record, independent of outputs, video jobs and named recipes. Its bounded prompt and exact settings restore before editing or incoming prompt use; restoration never generates. Writes compare an immutable revision, and even deletion in another tab raises a conflict. Explicit Keep/Restore resolves it; unreadable records remain protected while a temporary draft can be edited. Explicit replacement stores the original under a recovery key. Quota errors retain the old record and visible text with a retry action; pending unsaved edits warn before leaving. Storage remains browser/origin-local.

Recipe JSON import accepts only a version-1 FluxLab export up to 64 KB and rejects unsupported fields, credentials and tickets. The preview shows prompt, model, settings and availability. Save creates a fresh named recipe; duplicate names require a new name. Import never changes the current prompt or starts a request. Explicit Load prepares the draft; Generate still approves one request. Late cancelled file reads cannot restore a preview.

Build, 69 unit checks, 12 studio browser groups, nine media/recovery groups, eight recipe/filter groups and nine new draft/import groups pass with injected services and no paid calls. New evidence: `node scripts/drafts-browser-smoke.mjs`, `artifacts/drafts-browser/report.json`. Bulk library archives, multi-draft history, cloud sync, provider reconciliation, full-text search, actual upscale, music and automatic batches remain open.


## Cloudflare Music v2 increment — 2026-10-10

A separate Music workspace supports a 2,000-character brief, instrumental preference, 3–60 seconds and one MP3 through Cloudflare. It works independently of Vercel catalog availability. Drafts and named recipes never generate automatically; request records are saved before submission. Completed bytes decode before preview/library save, with MP3 download and reviewed Fluximiére/Fluxiffects handoff. Interrupted requests remain uncertain across reload and require an explicit billing acknowledgment before clearing. Cross-tab revision checks prevent stale submissions. Failed completion storage retains the playable in-memory result and protects it from accidental reload. Music provenance and estimated billing source survive library persistence.

Server duplicate protection lasts 24 hours in one process, bounded to 512 records and a 32 MiB completed-result cache. It is not durable across serverless instances or devices. Download bounds are just under 3 MiB to fit the hosted 4 MiB base64 JSON response. No paid provider calls have been performed. Remaining: actual account/model verification, long/background music jobs, durable reconciliation, composition plans, stems, continuation, sound effects, Opus and precise charge reconciliation.
