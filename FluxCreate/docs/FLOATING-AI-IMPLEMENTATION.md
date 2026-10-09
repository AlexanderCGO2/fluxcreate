# Floating AI helper implementation

Implemented 2026-10-09 in the working source. This is a bounded Milestone 3 increment; no deployment or paid provider smoke test is implied.

## Connected editor workflow

Fluxfoto, Fluxiffects, Fluxini and Flux3D mount `shared/FloatingAIHelper.jsx`. Each adapter captures document identity, revision and selected object IDs, labels and kinds. The helper also tracks selection changes, including switching away and back. Source thumbnails remain local. Editable requests omit embedded sources and pixels.

The helper lists supported tools through FluxLab, prepares edits through the editor's existing planner, validates a local preview, and commits only on Apply. Revisions, selection, connection changes, recovery and pending operations can invalidate Apply. Each editor retains its existing command validator and history path. Explain returns no mutation. Generated text is reviewed before insertion; generated raster images must decode with their validated dimensions before insertion. Fluxini text nodes retain the existing 48-character limit; its generated images become textured planes with a complete Fluxfoto source retained for recovery.

The UI has cancel, a clear current selection, model selection for generated assets, light/dark styling, a narrow-screen layout, keyboard controls and Escape focus restoration. Existing AI side panels remain usable.

## MCP and connection boundaries

`FluxLab/src/mcp-client.mjs` uses the installed official `@modelcontextprotocol/client` 2.3.1 `Client` and `StreamableHTTPClientTransport`. `FluxLab/server/mcp-http.mjs` uses the matching official server SDK `createMcpHandler` and the real `createMcpServer` tool dispatcher. Modern discovery and legacy initialize/list/call are both tested. The original five-tool stdio MCP App surface remains intact; editor tools are optional additions on editor routes. See the [official SDK HTTP handler contract](https://ts.sdk.modelcontextprotocol.io/v2/api/@modelcontextprotocol/server/server/createMcpHandler.html).

Routes use `/api/mcp` locally and `/api/{appId}/mcp` in the hosted handler. Existing host/origin checks and hosted deployment authentication remain in place. MCP additionally requires the same-origin custom request header and rejects cross-origin requests. Gateway keys stay in existing HttpOnly connection cookies. Every call snapshots the resolved connection and propagates an AbortSignal into its service; invalid or expired personal connections never fall back to the suite key.

Paid calls require a UUID request ID. A bounded, connection-scoped in-process ledger reuses identical completed/in-flight requests and retains uncertain failures, rejecting changed arguments with the same ID. The UI sends no automatic paid retries. This cache lasts 30 minutes within the current server process; it is not durable provider idempotency across server restarts or separate hosted instances. Durable job records and cross-instance paid submission recovery remain unfinished work. Cancellation aborts the request but cannot guarantee that a provider has not already incurred charges.

## Reference-image editing and remaining capability limits

The reference-image path calls the documented Gateway `/v1/images/edits` endpoint with one embedded source image. It requires an explicitly integrated model AND live catalog image-input support. The integrated list follows the [Gateway image-edit documentation](https://vercel.com/docs/ai-gateway/modalities/image-generation/openai#editing-images): `openai/gpt-image-2`, `bfl/flux-kontext-pro`, `bfl/flux-pro-1.0-fill`, `google/gemini-3.1-flash-image`, and `spacexai/grok-imagine-image`. Unknown models are not enabled merely because their names mention editing.

Inputs accept one PNG/JPEG/WebP source up to 3.5 MB base64, bounded dimensions and approximately 32 megapixels. Output remains embedded raster media, header checked on the server and decoded in the browser. Remote output URLs are not followed. The selected original is shown beside the result, which is inserted as a separate layer or plane; the original is preserved. Gateway model availability, account restrictions and actual provider billing can still reject a request. Catalog prices are indicative; there is no claimed fixed edit price.

Mask editing, guaranteed region preservation, AI upscaling, fixed scale factors and batch image editing are not enabled. No provider smoke test has been run and no live charge has been incurred by the automated tests. Model/account success is therefore not certified by these mock tests.

## Verification

- `FluxLab/tests/mcp-http.test.mjs`: modern/legacy protocol, list/call, tool schemas, origin refusal, UUID deduplication, connection isolation, immutable snapshots and abort propagation.
- `FluxLab/tests/pixel-edit.test.mjs`: real provider request shape against a mocked Gateway, source bytes, unsupported models/fields, malformed media, personal-key failure without fallback.
- `FluxCreate/tests/ai-context.test.mjs` and `mcp-routes.test.mjs`: captured context, source-byte exclusion, unsafe media refusal, hosted encrypted-cookie isolation and expired personal connection.
- `Haidini/tests/floating-planner.test.mjs`: explain cannot return a patch, selected scope cannot modify unrelated nodes, invalid actions and personal connection failures.
- `FluxCreate/scripts/floating-ai-browser.mjs`: official SDK through a real local HTTP dispatcher with a mocked service; preview before Apply, single commit, selection/revision invalidation, cancellation, text/image insertion, original/result comparison, recovery blocking, dark/mobile layout and Escape focus.
- `FluxCreate/scripts/floating-apps-browser.mjs`: actual Fluxini and Fluxiffects builds with mocked MCP responses and isolated project data; validated edits, read-only explanation, text/image insertion and one-step undo.

Fluxini typechecking and the Fluxini/Fluxiffects release builds passed during this increment. Other concurrent suite changes require the normal final combined verification.
