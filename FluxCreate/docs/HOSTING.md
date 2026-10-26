# FluxCreate hosting

The complete suite is this monorepo. Install and build from its root; no maintainer-specific sibling folders are required. The legacy sibling-folder assembler refuses to create a nested release inside this workspace. Its copy filter excludes environment files, private configuration, runtime databases, generated bundles and artifacts; existing root documentation and ignore rules are preserved. Internal app IDs remain stable for native project compatibility.

Use Node 24 and the pinned pnpm version. Install with `pnpm install --frozen-lockfile`, then run `pnpm build`. The release build creates nine browser entry points, the bundled Node API and the FluxLab MCP App resource. Vercel serves the generated `dist` directory; one dispatcher routes `/api/<app>/<operation>`.

## Addresses

| Workspace | Hosted path | Local port |
|---|---|---|
| FluxCreate | `/` | 4325 |
| Fluxfoto | `/fluxoto/` | 4321 |
| FluxDesign | `/fluxidesign/` | 4322 |
| Fluximiére | `/fluximiere/` | 4323 |
| Flux3D | `/flux3d/` | 4324 |
| Fluxiffects | `/fluxiffects/` | 4320 |
| Fluxini | `/fluxini/` | 4318 |
| FluxLab | `/fluxlab/` | 4326 |
| FluxAgents | `/fluxagents/` | 4327 |

## Persistence and access

Projects and generated results are stored in this browser's IndexedDB. Recent document names use local browser metadata. Fluxini's hosted adapter preserves project revisions, history, undo/redo, fonts, preferences and exchange source snapshots; its local version continues to use SQLite. The cloud functions do not store project state in a temporary filesystem.

Localhost and deployed domains have separate browser storage. Export native project files to move existing work to the deployed site. The suite does not yet synchronize projects across devices.

Protect **all deployments** using Vercel Authentication before adding the server-only `AI_GATEWAY_API_KEY`. The shared connection can make billable model requests, so anonymous production access is inappropriate for this personal workspace. `FLUXINI_MODEL` optionally selects the editing model. FluxLab chooses models from the live Gateway catalog. Configured connection credentials stay server-side and are not fields in supported project/recipe exports or the MCP UI. This does not scrub secrets a user types into prompts or document content. Run the repository credential checks before publication.

FluxLab's external MCP App retains local stdio support with the official SDK. The floating helpers also use protected HTTP MCP routes at `/api/<app>/mcp`, with the same deployment authentication and personal connection isolation as the other AI routes. These browser routes require the workspace origin and MCP header; they are not an anonymous public MCP service. The release bundles the MCP App HTML resource so resource reads do not depend on a runtime source-directory layout. See [floating AI implementation](FLOATING-AI-IMPLEMENTATION.md).

General settings allows a personal Gateway connection scoped to the current browser. Configure the server-only `FLUXCREATE_CONNECTION_SECRET` to enable encrypted credential cookies; see [connection settings](CONNECTION_SETTINGS.md) for generation, rotation, expiry and isolation behavior. The suite's shared Gateway key remains unchanged when a visitor saves their own connection.

FluxAgents supports hosted workflow design and no-charge simulation. Its local runner persists live runs, approvals and outputs in SQLite, using an explicitly selected suite connection. Hosted unattended execution remains disabled until its durable cloud runtime, connection vault and application storage are configured. The hosted function never imports the local SQLite runner.

## Verification

`scripts/hosted-browser-smoke.mjs` checks all direct app URLs, same-origin navigation, browser recents, the Fluxini simulation worker, AE bridge/example downloads, and editable FluxLab handoffs in an isolated browser. API tests validate routing, cross-origin rejection, request bounds and rebuilding AI context from validated scene data. Paid model generation is not part of automated verification.

See [the suite audit](OPTIMIZATIONS.md) and each editor's README for supported import features and remaining work. Native AEP, INDD and BLEND require their documented bridges/exports; importing a filename does not imply full proprietary-format fidelity.


## Media jobs

FluxLab video jobs are held by AI Gateway; signed job references are saved in the browser and survive application restarts. No server filesystem or in-memory job store is required for recovery. Signed content requests stream MP4/WebM up to 64 MiB, while normal JSON results remain below 4 MiB. The Vercel dispatcher preserves query parameters, including the compact content ticket. Speech uses short synchronous requests with bounded MP3/WAV output.

Downloaded video and speech are saved as browser Blobs. They do not become cloud-synchronized assets. Job tickets last seven days, provider media can expire earlier, and changing the Gateway key invalidates existing job tickets. Export media needed on another device or origin.

The video route writes response chunks directly instead of buffering one JSON body. See [Vercel's response-size and streaming guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).


## Optional Cloudflare music and text fallback

General settings accepts a separate Cloudflare account ID, gateway ID and API token in an encrypted HttpOnly cookie. Saving marks it configured, not verified. Check token verifies only token activity; account scope, Workers AI Read permission, model access, stored BYOK keys and credits require separate verification. Enable Music and Text fallback independently. Existing Vercel personal credentials remain unchanged; missing/invalid personal settings never silently charge workspace Cloudflare.

Workspace configuration uses server-only `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_GATEWAY_ID` (default `default`), `CLOUDFLARE_API_TOKEN`, `FLUXCREATE_CLOUDFLARE_MUSIC=true` and/or `FLUXCREATE_CLOUDFLARE_FALLBACK=true`. Do not commit secrets. Automatic text fallback additionally requires `FLUX_CLOUDFLARE_TEXT_MODELS`, an explicit JSON object mapping approved identical model IDs, for example `{"anthropic/claude-sonnet-4":"anthropic/claude-sonnet-4"}`. This example is not an activation instruction: verify the model under the actual account first. There are no implicit defaults or dynamic routes.

Vercel remains primary. Only a definitive initial HTTP 429 with no output can make one Cloudflare attempt under the original deadline. Credential, credit, cancellation, timeout, partial-output and validation failures never auto-repeat. Proposal/result details show the gateway and actual model. Hosted Agents live execution remains disabled.

Music uses one bounded synchronous request and browser-owned recovery, not a cloud queue. An uncertain outcome never auto-resubmits; check Cloudflare history before explicitly starting another. Its server ledger is process-local for 24 hours and cannot guarantee exactly-once charges across instances. Music and text provider access are unverified until account activation is recorded.
