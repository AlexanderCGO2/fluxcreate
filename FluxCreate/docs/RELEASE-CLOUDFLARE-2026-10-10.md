# Cloudflare and music release — 2026-10-10

Runtime source: [b4def79](https://github.com/AlexanderCGO2/fluxcreate/commit/b4def79). Standalone Fluxini adapter: [8415ada](https://github.com/AlexanderCGO2/fluxini/commit/8415ada).

Production: https://fluxcreate.vercel.app. Deployment: dpl_DnF1s8gLpp9qQFVykF9vbTrvA8Do in flux-ai-inc. Inspector: https://vercel.com/flux-ai-inc/fluxcreate/DnF1s8gLpp9qQFVykF9vbTrvA8Do. All deployments remain protected by Vercel Authentication.

## Delivered

- Independent encrypted Cloudflare settings and separate music/fallback consent. Token checks do not claim model/account access or credits. Request snapshots preserve personal/workspace billing isolation.
- Vercel remains primary. Explicit identical-model approval permits at most one Cloudflare fallback after a definitive initial text HTTP 429. Actual gateway/model/attempts are visible and preserved. No timeout, partial-output, cancellation, authentication/credit or validation retry.
- FluxLab Music: ElevenLabs Music v2, 3–60 seconds, instrumental preference, published cost estimate, one MP3, decoded playback/download, named recipes, explicit draft saving and local library provenance.
- Atomic pre-submission request records; uncertain recovery never auto-resubmits. Cross-tab and quota checks prevent accidental calls. Storage failures after completion retain the playable in-memory result and protect against navigation loss.
- Read-only music status and explicit generation MCP tools; exact audio handoff to Fluximiére/Fluxiffects with prior content, undo, redo and reload verified.

## Verification

586 tests across ten packages pass. All nine browser entries, hosted API and MCP App build. Browser evidence: 36 hosted suite checks, 11 music groups, 10 actual-audio handoff checks, 12 existing studio groups, eight recipes, nine drafts, Cloudflare settings and six hosted MCP checks. Fixtures exercise real decoding/playback, without contacting paid models.

Live checks match all nine deployed browser bundles and the MCP App resource to the local build. New Cloudflare settings and music status/tool discovery return sanitized data; read-only MCP music status does not require a billable request identifier. Anonymous routes remain blocked. Existing Gateway connection checks and hosted Agents no-charge simulation pass. Live checks make zero paid generation requests.

The Vercel build still reports previously documented TypeScript diagnostics in developer-only paint-check.ts/gpu-particle-check.ts during broad tracing. Application builds/typecheck and deployed bundle verification pass; developer script typing remains maintenance work.

## Still open

Production music status is unavailable until a Cloudflare connection is configured. Add a scoped token in General settings; verify Workers AI Read account permission, the selected gateway, billing source and credits. A successful token check alone is not that verification. No paid music or live Cloudflare structured-output call has been tested.

Music request protection is process-local for 24 hours (512 records, 32 MiB result cache), with browser-owned state. It does not provide durable cross-instance/cloud recovery or exactly-once billing. Longer/background music, composition plans, stems, continuation, Opus, sound effects and reconciled charges remain open. Other applications retain the feature gaps listed in FEATURE-GAPS.md; this release does not claim full Adobe/Houdini/Blender parity.
