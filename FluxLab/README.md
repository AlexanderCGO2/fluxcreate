# FluxLab

FluxCreate's shared AI studio. Generate text, images, video and spoken audio with your existing Flux / Vercel AI Gateway connection, then save useful results or bring generated media into the other creative apps. Available models are discovered from the live Gateway catalog and filtered to supported generation adapters. No pretend generated results are shipped.

## Run locally

Use Node 24 or newer. Install the pinned dependencies with pnpm, run `pnpm build`, then `pnpm start`. FluxLab opens at `http://localhost:4326`. `pnpm build` builds the main studio and the separate MCP App UI.

Connect Fluxini to AI Gateway first, or set `AI_GATEWAY_API_KEY` in the server environment. FluxLab reuses `Haidini/server/connection.mjs` and the existing `FLUXINI_DATA_DIR` / `FLUXINI_FLUX_ENV` configuration. Keys are loaded on the server and never returned to the browser, MCP client or generated result. Connection status means that a key is configured; it is not a paid verification of model access or available credits.

Text generation uses Gateway Chat Completions. Dedicated image models use Image Generations. The optional editor reference-image tool uses the documented Image Edits endpoint for explicitly integrated models whose catalog metadata accepts images. Image-capable language models use Chat Completions with image/text modalities. Model/provider restrictions still apply; a model may reject a selected size or require additional account access. Use Automatic image size for multimodal language models. Each generation can incur charges on the connected Gateway account. Catalog discovery is read-only.

## HTTP service contract

The local server exposes:

- `GET /api/session` → `{token}`. Send it as `x-flux-token` on generation requests.
- `GET /api/status` → `{available,provider,busy,reason?}`.
- `GET /api/models` → `{models,fetchedAt,stale,warning?}`. Each model includes `id`, `name`, `provider`, `type`, `capabilities`, `description`, `contextWindow`, `maxTokens` and available token `pricing` values. Pricing is reported as the Gateway provides it, per token; missing pricing is not free pricing. The catalog caches for five minutes and may fall back to a clearly labelled cached catalog for up to 24 hours.
- `POST /api/generate` accepts `{kind:'text'|'image',model,prompt,maxOutputTokens?,size?}`. Prompt limit: 12,000 characters. Text token limit: 128–4,096, default 2,048. Size: `auto`, `1024x1024`, `1536x1024` or `1024x1536`.
- `POST /api/mcp` is the official-SDK same-origin MCP transport; hosted routes use `/api/{appId}/mcp`. The FluxLab route retains the five default tools and MCP App resource. Editor routes may expose their validated planner and reference-image tool. See the browser-helper contract below.
- A successful generation returns `{id,kind,model,prompt,createdAt,text,images,usage,warnings}`. Images contain `{id,mimeType,src,width?,height?}` with a PNG/JPEG/WebP data URI. Usage includes token counts when supplied by the provider. Costs are not invented from token counts.

`server/service.mjs` exports `createLabService({fetchImpl?,credential?,timeoutMs?,catalogTimeoutMs?,now?})`. It exposes `status(connection?)`, `models({signal?,refresh?})`, `generate(body,{signal?,connection?})` and `editImage({model,prompt,referenceImage},{signal?,connection?})`, alongside its video/speech methods. A supplied connection is snapshotted and never falls back silently when unavailable. Reference editing is exposed through optional editor MCP tools, not a new `/api/edit` REST route. `server/index.mjs` exports `serve(port,{service?})` for the local server and injected browser tests. Production dispatchers can import the service directly, after enforcing their own authenticated access, origin rules and request limits.

Generation has a two-minute timeout and supports AbortSignal cancellation. Cancelling stops waiting and requests upstream cancellation; a provider may still charge for work already done. A service instance bounds generation per immutable connection scope. This is local concurrency protection, not a distributed quota or billing limit. Set account budgets/access controls for hosted deployment.

The backend reads at most 8 MiB of an upstream JSON response and returns less than 4 MiB. Image payloads are capped at 3.5 million base64 characters, keeping results below Vercel's response limit. Oversized images fail with smaller-output guidance. PNG, JPEG and WebP dimensions are checked before transfer, with an 8192-pixel side limit and a 32-megapixel budget; browser decoding also validates usable assets before saving. Remote image URLs are not fetched: providers must return embedded image data. FluxLab generates one image per request. Optional editor image-edit tools accept one explicit embedded reference with the same format/size/dimension checks; the main FluxLab studio has no reference-upload mode. Music and sound effects remain unavailable. Text may be truncated at the chosen output token limit, with a warning.

## External MCP App

FluxLab is a genuine MCP App built with official, pinned SDK packages: MCP core/server/client `2.3.1` and MCP Apps `2.0.3`.

- Transport: stdio, started by `node /absolute/path/to/FluxLab/server/mcp-stdio.mjs`.
- Tool `fluxlab_catalog`: read-only live model catalog and connection status, linked to the interactive UI.
- Tool `fluxlab_generate`: the same validated generation service, linked to the UI. This tool can incur generation charges; its description and annotations make that explicit.
- UI resource: `ui://fluxlab/studio.html`, MIME `text/html;profile=mcp-app`. The self-contained UI uses the official App bridge to call tools through its host. It makes no direct provider requests.
- Image results use standard MCP image content blocks; structured results carry metadata without duplicating the base64 bytes. Hosts without MCP Apps support can still use the tools and their results.

Example client configuration (replace the absolute path):

```json
{
  "mcpServers": {
    "fluxlab": {
      "command": "node",
      "args": ["C:/Users/you/Projects/FluxCreate/FluxLab/server/mcp-stdio.mjs"]
    }
  }
}
```

The stdio process resolves the sibling Fluxini connection or its server environment. The same dispatcher also serves the official-SDK HTTP transport described below. Default stdio tools remain unchanged; optional editor-aware tools are added only to editor routes. Build the MCP UI before connecting an Apps-capable host.

## Same-origin browser MCP and floating helpers

`src/mcp-client.mjs` uses the official `Client` and `StreamableHTTPClientTransport`; `server/mcp-http.mjs` uses the official `createMcpHandler` and the actual FluxLab tool dispatcher. Modern discovery and legacy initialize/list/call are supported. Local routes use `/api/mcp`; hosted routes use `/api/{appId}/mcp`, including `fluxlab`, `fluxoto`, `fluxiffects`, `fluxini` and `flux3d`.

Requests remain on the app origin, include `x-fluxcreate-mcp: 1`, use JSON POSTs and retain the existing host/origin and hosted deployment-authentication checks. Encrypted HttpOnly browser connection cookies are resolved server-side into immutable request snapshots. Expired or removed personal credentials are rejected without suite-key fallback. This is a suite browser connection, not a public OAuth MCP connector or background credential vault.

The shared helper captures document/selection revision, shows the current object, validates a preview and requires Apply. Context or connection changes invalidate the review; cancellation propagates to the service. Editor capabilities are deliberately different:

| Editor | Implemented helper actions |
|---|---|
| Fluxfoto | Edit/explain, reviewed text/image insertion, reference edit of a selected photo source |
| Fluxiffects | Edit/explain, reviewed text/image insertion, reference edit of a selected embedded image layer |
| Fluxini | Edit/explain, reviewed text and image-plane insertion, reference edit of a selected studio-plane preview |
| Flux3D | Validated editable proposals and explanation |

Editor routes expose `fluxcreate_edit` and, when the service supports it, `fluxlab_image_edit`. The latter accepts `{model,prompt,referenceImage}` with one PNG/JPEG/WebP data URL and calls Gateway `/v1/images/edits`. An explicit documented adapter and image-input catalog metadata are both required. Results are header-validated and decoded before comparison/insertion as a separate copy. Fluxini retains its 48-character text-node limit. Masks, guaranteed region preservation, fixed upscale factors and actual AI upscaling are not supported. Paid provider/account output has not been smoke-tested.

Non-catalog MCP tool calls carry a UUID in `_meta["fluxcreate/requestId"]`. A bounded, connection-scoped process ledger reuses identical in-flight/completed requests and retains uncertain failures; it rejects reuse with changed arguments. The helper never automatically retries paid work. The ledger lasts 30 minutes in the current process and does not survive a restart or coordinate separate hosted instances. Cancellation cannot guarantee provider cancellation or refunds. Durable paid-job recovery and cloud artifacts remain future work. See [the complete helper evidence and limits](../FluxCreate/docs/FLOATING-AI-IMPLEMENTATION.md).

## Verification

`pnpm test` runs injected-provider service tests, local HTTP origin/token/body-size tests, an official MCP client/server protocol round trip, a real external stdio client handshake, official HTTP discovery/initialize/list/call, request-ID behavior, personal credential isolation/expiry, abort propagation and reference-image request validation against mocked providers. The tests do not call paid models. `pnpm test:browser` runs the studio's real Edge workflow checks with an injected service. `pnpm test:mcp-browser` checks the built MCP UI in an Edge iframe, connected through the official AppBridge to the actual MCP server, including text and image results.

The free live model catalog was queried during implementation. Paid model generation was not exercised; provider behavior and account eligibility can vary. Main studio workflow details are documented in [the frontend notes](docs/FRONTEND.md).

Primary references: [Gateway model discovery](https://vercel.com/docs/ai-gateway/models-and-providers), [image generation API routing](https://vercel.com/docs/ai-gateway/modalities/image-generation/openai), and [official MCP Apps quickstart](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/quickstart.md).


## Video and audio

The studio has Text, Image, Video and Speech modes. Video offers text-to-video models identified by the live catalog's supported operations, with each model's supported duration/aspect ratio settings. Speech reads a script aloud, with documented voices and MP3/WAV output for the supported Google, Microsoft and OpenAI models present in the live catalog. Saved speech remains an Audio asset. A catalog entry does not guarantee account eligibility or available credits. Music, sound effects, voice cloning, video/audio reference inputs and transcription are not included. The separate editor image-reference path is described above.

Video uses Gateway's asynchronous start/status protocol. A request ID is saved before submission and reused after an uncertain response; Gateway idempotency prevents a retry of that submission from creating another paid job. Signed job tickets can be checked after a page reload or server restart. Pause stops checking, not the provider render. Ticket recovery lasts seven days and requires the same Gateway connection; rotating its key invalidates earlier tickets. Provider media may expire sooner. Download completed media promptly.

Completed video is downloaded through a bounded same-origin stream, validated by the browser, and stored as an IndexedDB Blob. A saved library item retains the actual file, not an expiring provider URL. Video has a 64 MiB file limit. Download failures keep the job available to check again without regenerating. Speech uses Gateway's synchronous speech endpoint: it supports cancellation of waiting, but has no recoverable provider background job. Scripts are limited to 1,500 characters for MP3 or 400 for WAV, audio to three minutes and 3.5 million base64 characters. Unsupported settings fail before a paid call. Actual provider size or format failures remain possible.

HTTP additions (prefix with `/api/fluxlab` when hosted):

- `POST /api/video/start`: `{kind:'video',model,prompt,requestId,duration?,aspectRatio?}` → `{status:'pending',ticket,...}`.
- `POST /api/video/status`: `{ticket}` → pending, error, or completed with a video result and compact signed content ticket.
- `GET /api/video/content?ticket=...`: bounded MP4/WebM stream. The server accepts signed provider job references, never an arbitrary client URL; public HTTPS/DNS checks apply to provider media downloads.
- `POST /api/audio/generate`: `{kind:'audio',model,prompt,voice?,outputFormat?}` → audio result with a validated MP3/WAV data URI. Browser decoding precedes Blob storage.

Fluximiére receives video and audio in its source bin; Fluxiffects receives video and audio layers. The destination shows a decoded preview before Add. Original media files travel as Blobs and remain available after the destination reloads. Existing editor export/audio limits still apply.

MCP adds `fluxlab_video_start`, `fluxlab_video_status`, and `fluxlab_audio_generate`. Speech is returned as standard MCP audio content, playable in the MCP App. Video tools return compact job metadata and a studio link for playback, library saving, download and handoff. Start FluxLab locally to open that link; optionally configure `FLUXLAB_PUBLIC_URL=https://your-deployment/fluxlab/` when that studio uses the same Gateway key. The App retains its strict host bridge/CSP and does not fetch arbitrary provider media. Keep the video ticket or studio link if closing the MCP view.

References: [Gateway video and background jobs](https://vercel.com/docs/ai-gateway/modalities/video-generation), [Gateway speech REST API](https://vercel.com/docs/ai-gateway/modalities/text-to-speech). The new features are verified with protocol fixtures and real browser media decoding, without paid generation calls.

## Saved recipes, variations and library filters

Save up to 40 named recipes in this browser. Each version-1 recipe contains the exact normalized request: prompt, model, generation kind and its supported text-token/image-size/video-duration/aspect/speech-voice/format settings. Loading prepares an editable draft and never starts generation. Save named recipe edits explicitly. The unsent prompt and exact settings now autosave independently and restore without sending a request. Updates and deletion check the selected saved version to prevent overwriting a recipe changed in another tab. Download recipe exports only its settings, name and optional source-result identifier; no credentials, provider tickets or media bytes. Existing results and recipes survive failed writes.

New results retain their request recipe; video jobs carry it through pause/reload and completion. **Use prompt** restores the saved settings and prepares one prompt-based variation, with parent-result lineage stored on completion. Original media is not sent by this action. Older results without a recipe show a defaults notice instead of claiming exact restoration. A removed model or unsupported setting stays visible and blocks submission until explicitly corrected. Every **Generate** approves one request; no automatic paid batches are implemented. Model catalog presence is not an account-access guarantee. No per-request price quote is available: total cost is unknown and token limits are not a price cap. Paid provider smoke remains unperformed.

My library combines kind/model filters, newest/oldest/model ordering and metadata search. Search covers saved prompt previews, model names and text excerpts; it is not full original prompt/output search. The grid displays 48 cards initially and loads another 48 on request. Original media is loaded only when opened. This remains a local browser library without folders, tagging, media thumbnails, bulk archives or cloud ownership.

Verification: 69 current unit checks, 12 studio browser groups, nine media/recovery browser groups and eight new recipe/filter browser groups pass using local injected services. Run `node scripts/recipes-browser-smoke.mjs`; evidence is in `artifacts/recipes-browser`. The added checks cover exact settings, no calls on load/save, one approval despite duplicate clicks, lineage, cross-tab update conflicts, storage quota failure, removed models, unknown cost and bounded metadata browsing.

## Protected draft and recipe import increment — 2026-10-09

The unsent draft uses its own IndexedDB record, independent of outputs, video jobs and named recipes. Its bounded prompt and exact settings restore before editing or incoming prompt use; restoration never generates. Writes compare an immutable revision, and even deletion in another tab raises a conflict. Explicit Keep/Restore resolves it; unreadable records remain protected while a temporary draft can be edited. Explicit replacement stores the original under a recovery key. Quota errors retain the old record and visible text with a retry action; pending unsaved edits warn before leaving. Storage remains browser/origin-local.

Recipe JSON import accepts only a version-1 FluxLab export up to 64 KB and rejects unsupported fields, credentials and tickets. The preview shows prompt, model, settings and availability. Save creates a fresh named recipe; duplicate names require a new name. Import never changes the current prompt or starts a request. Explicit Load prepares the draft; Generate still approves one request. Late cancelled file reads cannot restore a preview.

Build, 69 unit checks, 12 studio browser groups, nine media/recovery groups, eight recipe/filter groups and nine new draft/import groups pass with injected services and no paid calls. New evidence: `node scripts/drafts-browser-smoke.mjs`, `artifacts/drafts-browser/report.json`. Bulk library archives, multi-draft history, cloud sync, provider reconciliation, full-text search, actual upscale, music and automatic batches remain open.
