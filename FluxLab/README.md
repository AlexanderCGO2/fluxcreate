# FluxLab

FluxCreate's shared AI studio. Generate text and images with your existing Flux / Vercel AI Gateway connection, then save useful results or bring images into the other creative apps. Models are discovered from the live Gateway catalog; no fixed model list or pretend generated results are shipped.

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

The backend reads at most 8 MiB of an upstream JSON response and returns less than 4 MiB. Image payloads are capped at 3.5 million base64 characters, keeping results below Vercel's response limit. Oversized images fail with smaller-output guidance. PNG, JPEG and WebP dimensions are checked before transfer, with an 8192-pixel side limit and a 32-megapixel budget; browser decoding also validates usable assets before saving. Remote image URLs are not fetched: providers must return embedded image data. FluxLab currently generates one image per request, does not upload reference images, and does not generate audio/video. Text may be truncated at the chosen output token limit, with a warning.

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

The free live model catalog was queried during implementation. Paid text/image generation was not exercised; provider behavior and account eligibility can vary. Main studio workflow details are documented in [the frontend notes](docs/FRONTEND.md).

Primary references: [Gateway model discovery](https://vercel.com/docs/ai-gateway/models-and-providers), [image generation API routing](https://vercel.com/docs/ai-gateway/modalities/image-generation/openai), and [official MCP Apps quickstart](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/quickstart.md).
