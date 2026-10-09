# FluxCreate hosting

The complete suite lives in the sibling `FluxCreateSuite` release repository. `scripts/prepare-release.mjs` copies only source, documentation, public assets and package manifests from the nine working folders; it never copies `.data`, local environments, browser artifacts, dependencies or Git internals. Internal IDs and source folder names remain unchanged so existing files keep opening after the Fluxfoto, FluxDesign and Fluximiére display rename.

Use Node 24 and the pinned pnpm version. Install with `pnpm install --frozen-lockfile`, then run `pnpm build`. The release build creates eight browser entry points, the bundled Node API and the FluxLab MCP App resource. Vercel serves the generated `dist` directory; one dispatcher routes `/api/<app>/<operation>`.

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

## Persistence and access

Projects and generated results are stored in this browser's IndexedDB. Recent document names use local browser metadata. Fluxini's hosted adapter preserves project revisions, history, undo/redo, fonts, preferences and exchange source snapshots; its local version continues to use SQLite. The cloud functions do not store project state in a temporary filesystem.

Localhost and deployed domains have separate browser storage. Export native project files to move existing work to the deployed site. The suite does not yet synchronize projects across devices.

Protect **all deployments** using Vercel Authentication before adding the server-only `AI_GATEWAY_API_KEY`. The shared connection can make billable model requests, so anonymous production access is inappropriate for this personal workspace. `FLUXINI_MODEL` optionally selects the editing model. FluxLab chooses models from the live Gateway catalog. No key is embedded in a browser bundle, file export or MCP UI resource.

FluxLab's external MCP App uses local stdio with the official SDK; see its README for the client configuration. This release does not expose a public remote MCP endpoint.

## Verification

`scripts/hosted-browser-smoke.mjs` checks all direct app URLs, same-origin navigation, browser recents, the Fluxini simulation worker, AE bridge/example downloads, and editable FluxLab handoffs in an isolated browser. API tests validate routing, cross-origin rejection, request bounds and rebuilding AI context from validated scene data. Paid model generation is not part of automated verification.

See [the suite audit](OPTIMIZATIONS.md) and each editor's README for supported import features and remaining work. Native AEP, INDD and BLEND require their documented bridges/exports; importing a filename does not imply full proprietary-format fidelity.
