# FluxCreate hosting

The complete suite lives in the sibling `FluxCreateSuite` release repository. `scripts/prepare-release.mjs` copies only source, documentation, public assets and package manifests from the ten working folders; it never copies `.data`, local environments, browser artifacts, dependencies or Git internals. Internal IDs and source folder names remain unchanged so existing files keep opening after the Fluxfoto, FluxDesign and Fluximiére display rename.

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

Protect **all deployments** using Vercel Authentication before adding the server-only `AI_GATEWAY_API_KEY`. The shared connection can make billable model requests, so anonymous production access is inappropriate for this personal workspace. `FLUXINI_MODEL` optionally selects the editing model. FluxLab chooses models from the live Gateway catalog. No key is embedded in a browser bundle, file export or MCP UI resource.

FluxLab's external MCP App uses local stdio with the official SDK; see its README for the client configuration. This release does not expose a public remote MCP endpoint.

General settings allows a personal Gateway connection scoped to the current browser. Configure the server-only `FLUXCREATE_CONNECTION_SECRET` to enable encrypted credential cookies; see [connection settings](CONNECTION_SETTINGS.md) for generation, rotation, expiry and isolation behavior. The suite's shared Gateway key remains unchanged when a visitor saves their own connection.

FluxAgents supports hosted workflow design and no-charge simulation. Its local runner persists live runs, approvals and outputs in SQLite, using an explicitly selected suite connection. Hosted unattended execution remains disabled until its durable cloud runtime, connection vault and application storage are configured. The hosted function never imports the local SQLite runner.

## Verification

`scripts/hosted-browser-smoke.mjs` checks all direct app URLs, same-origin navigation, browser recents, the Fluxini simulation worker, AE bridge/example downloads, and editable FluxLab handoffs in an isolated browser. API tests validate routing, cross-origin rejection, request bounds and rebuilding AI context from validated scene data. Paid model generation is not part of automated verification.

See [the suite audit](OPTIMIZATIONS.md) and each editor's README for supported import features and remaining work. Native AEP, INDD and BLEND require their documented bridges/exports; importing a filename does not imply full proprietary-format fidelity.


## Media jobs

FluxLab video jobs are held by AI Gateway; signed job references are saved in the browser and survive application restarts. No server filesystem or in-memory job store is required for recovery. Signed content requests stream MP4/WebM up to 64 MiB, while normal JSON results remain below 4 MiB. The Vercel dispatcher preserves query parameters, including the compact content ticket. Speech uses short synchronous requests with bounded MP3/WAV output.

Downloaded video and speech are saved as browser Blobs. They do not become cloud-synchronized assets. Job tickets last seven days, provider media can expire earlier, and changing the Gateway key invalidates existing job tickets. Export media needed on another device or origin.

The video route writes response chunks directly instead of buffering one JSON body. See [Vercel's response-size and streaming guidance](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions).
