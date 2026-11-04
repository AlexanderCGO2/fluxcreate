# FluxCreate branding and hosted PDF import — 3 November 2026

## Delivered

- Display names: FluxFoto, FluxDesign, FluxVideo, FluxMotion, FluxEffects, Flux3D, FluxLab and FluxAgents.
- Updated home cards, app headers/titles, accessibility text, source-object and exchange notices, AI descriptions and active documentation.
- Existing IDs/routes/native formats/databases/source folders retained; legacy project contents remain readable without automatic rebranding.
- PDF worker, CMaps, standard fonts and WASM resolve beside the built FluxDesign entry point, covering standalone and hosted layouts.
- Existing Adobe import browser check gains a hosted mode. Linux CI installs Chromium and runs that mode after the suite build.
- Owner-approved AGPL-3.0-only app licensing and Apache-2.0 standalone FluxExchange licensing, with standard texts, manifest metadata and scope explanation.
- Community documents, README, branding map, release plan and rewritten LinkedIn article prepared for GitHub review.

## Verification

- 784 unit/API/contract tests pass across all workspaces.
- Both FluxEffects (Haidini) TypeScript configurations pass.
- All nine browser entry points, MCP UI and hosted API bundle build.
- 36 hosted suite browser checks pass, including current titles, navigation, text/image insertion and retained existing content.
- Real two-page PDF import and PDF-compatible Illustrator rendering pass in standalone and hosted layouts, with page dimensions/rotation, image pixels, cancellation and recovery checks.
- The hosted-mode import test was observed failing at the PDF review step before the URL fix.
- Production index, app bundle and PDF worker return HTTP 200 with correct MIME types and match the locally tested files by SHA-256.
- No paid provider generation was used.

The PDF import remains rasterized page artwork; this fix does not add individually editable PDF text/paths.

## Production

Project: flux-ai-inc/fluxcreate.
Deployment: dpl_CkYhVLc6PwFSVBGCBMjYB24ZYMFj.
URL: https://fluxcreate-d9do3xg2n-flux-ai-inc.vercel.app
Alias: https://fluxcreate.vercel.app
Status: READY.

Runtime changes were deployed before the final documentation/license-metadata commit. The tested production PDF artifacts match the current runtime build. Repository visibility remains PRIVATE; licensing and public release are separate.

## Remaining gates

Dependency and sample-asset rights review, final notices, reporting-mailbox qualification, independent conduct contact, backup maintainer and public-release approval remain open. Live provider capability qualification is separate from mocked service tests.
