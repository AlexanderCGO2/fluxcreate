# Editing and workflow review release — 2026-10-11

Status: source reviewed and local release gates passed; production deployment and verification in progress.

## Delivered

- Fluxfoto: RGB and individual red, green and blue Levels, input/gamma/output ranges, source histograms, current/all-channel resets and explicit Apply. Old neutral documents retain identical pixels. Original photos remain intact; portable and PSD exports bake the correction once.
- Fluxiffects: copy selected keys and paste at the playhead, including compatible layers. Relative timing and outgoing easing remain intact. Invalid ranges, locks, collisions or incompatible properties reject the entire paste. Each paste is one undo/redo step; text selections and shared dialogs retain normal clipboard behavior.
- FluxAgents: compare an immutable saved workflow version with the current draft or latest saved version. Inspect prompts, models, limits, conditions, approvals and connection changes in a read-only panel. Changed drafts, late reads and unavailable storage require an explicit refresh; comparison never starts a run or replaces work.

## Verification

601 tests across ten packages pass. All nine browser entries, hosted server and MCP App build. The assembled suite passes 36 hosted browser checks and six hosted MCP checks.

Feature-specific browser evidence: 17 Fluxfoto channel/legacy Levels groups with source and PSD regressions; seven Fluxiffects clipboard groups with actual PNG and decoded WebM timing plus existing easing/selection checks; eight FluxAgents comparison groups plus ten library and five recovery groups. Independent reviews found no unresolved issues. Tests use fixtures and make no paid generation requests.

## Remaining scope

Photo Levels remain 8-bit browser operations; adjustment layers, Curves and managed color are separate work. Motion clipboard is single-property and session-local; multi-property editing, precompositions and track mattes remain open. Workflow comparison is a readable change list, not graph-overlay comparison, version branching or cloud execution.

Cloudflare music account activation and paid model verification remain separate; this release does not configure credentials or make paid calls. See [feature gaps](FEATURE-GAPS.md), [implementation plan](superpowers/plans/2026-10-11-editing-and-version-review.md) and the [Cloudflare release](RELEASE-CLOUDFLARE-2026-10-10.md).
