# FluxLab

FluxCreate's shared AI studio. Generate text, images, video and spoken audio with your existing Flux / Vercel AI Gateway connection, then save useful results or bring generated media into the other creative apps. Available models are discovered from the live Gateway catalog and filtered to supported generation adapters. No pretend generated results are shipped.

## Run locally

Use Node 24 or newer. Install the pinned dependencies with pnpm, run `pnpm build`, then `pnpm start`. FluxLab opens at `http://localhost:4326`. `pnpm build` builds the main studio and the separate MCP App UI.

Connect Fluxini to AI Gateway first, or set `AI_GATEWAY_API_KEY` in the server environment. FluxLab reuses `Haidini/server/connection.mjs` and the existing `FLUXINI_DATA_DIR` / `FLUXINI_FLUX_ENV` configuration. Keys are loaded on the server and never returned to the browser, MCP client or generated result. Connection status means that a key is configured; it is not a paid verification of model access or available credits.

Text generation uses Gateway Chat Completions. Dedicated image models use Image Generations. Image-capable language models use Chat Completions with image/text modalities. Model/provider restrictions still apply; a model may reject a selected size or require additional account access. Use Automatic image size for multimodal language models. Each generation can incur charges on the connected Gateway account. Catalog discovery is read-only.

## HTTP service contract

The local server exposes:

- `GET /api/session` → `{token}`. Send it as `x-flux-token` on generation requests.
- `GET /api/status` → `{available,provider,busy,reason?}`.
- `GET /api/models` → `{models,fetchedAt,stale,warning?}`. Each model includes `id`, `name`, `provider`, `type`, `capabilities`, `description`, `contextWindow`, `maxTokens` and available token `pricing` values. Pricing is reported as the Gateway provides it, per token; missing pricing is not free pricing. The catalog caches for five minutes and may fall back to a clearly labelled cached catalog for up to 24 hours.
- `POST /api/generate` accepts `{kind:'text'|'image',model,prompt,maxOutputTokens?,size?}`. Prompt limit: 12,000 characters. Text token limit: 128–4,096, default 2,048. Size: `auto`, `1024x1024`, `1536x1024` or `1024x1536`.
- A successful generation returns `{id,kind,model,prompt,createdAt,text,images,usage,warnings}`. Images contain `{id,mimeType,src,width?,height?}` with a PNG/JPEG/WebP data URI. Usage includes token counts when supplied by the provider. Costs are not invented from token counts.

`server/service.mjs` exports `createLabService({fetchImpl?,credential?,timeoutMs?,catalogTimeoutMs?,now?})`. It exposes `status()`, `models({signal?,refresh?})`, and `generate(body,{signal?})`. `server/index.mjs` exports `serve(port,{service?})` for the local server and injected browser tests. Production dispatchers can import the service directly, after enforcing their own authenticated access, origin rules and request limits.

Generation has a two-minute timeout and supports AbortSignal cancellation. Cancelling stops waiting and requests upstream cancellation; a provider may still charge for work already done. A service instance runs one generation at a time. This is local concurrency protection, not a distributed quota or billing limit. Set account budgets/access controls for hosted deployment.

The backend reads at most 8 MiB of an upstream JSON response and returns less than 4 MiB. Image payloads are capped at 3.5 million base64 characters, keeping results below Vercel's response limit. Oversized images fail with smaller-output guidance. PNG, JPEG and WebP dimensions are checked before transfer, with an 8192-pixel side limit and a 32-megapixel budget; browser decoding also validates usable assets before saving. Remote image URLs are not fetched: providers must return embedded image data. FluxLab currently generates one image per request, does not upload references or generate music/sound effects. Text may be truncated at the chosen output token limit, with a warning.

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

The MCP process resolves the sibling Fluxini connection or its server environment. No HTTP MCP endpoint is advertised or implemented in this release; the hosted web studio and local external MCP transport are separate entry points. Build the MCP UI before connecting an Apps-capable host.

## Verification

`pnpm test` runs injected-provider service tests, local HTTP origin/token/body-size tests, an official MCP client/server protocol round trip, and a real external stdio client handshake. The tests do not call paid models. `pnpm test:browser` runs the studio's real Edge workflow checks with an injected service. `pnpm test:mcp-browser` checks the built MCP UI in an Edge iframe, connected through the official AppBridge to the actual MCP server, including text and image results.

The free live model catalog was queried during implementation. Paid model generation was not exercised; provider behavior and account eligibility can vary. Main studio workflow details are documented in [the frontend notes](docs/FRONTEND.md).

Primary references: [Gateway model discovery](https://vercel.com/docs/ai-gateway/models-and-providers), [image generation API routing](https://vercel.com/docs/ai-gateway/modalities/image-generation/openai), and [official MCP Apps quickstart](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/quickstart.md).


## Video and audio

The studio has Text, Image, Video and Speech modes. Video offers text-to-video models identified by the live catalog's supported operations, with each model's supported duration/aspect ratio settings. Speech reads a script aloud, with documented voices and MP3/WAV output for the supported Google, Microsoft and OpenAI models present in the live catalog. Saved speech remains an Audio asset. A catalog entry does not guarantee account eligibility or available credits. Music, sound effects, voice cloning, reference uploads and transcription are not included.

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
