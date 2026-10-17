# Director image strategies — 17 October 2026

The director now proposes an explicit image strategy per unlocked shot: references, start frame, or start/end frames. It explains its choice and supplies prompts and continuity notes. Instructions account for shot length, movement, intentional endpoints and longer continuous scenes rather than selecting endpoints from duration alone. Beat timings remain unchanged.

The shared strict contract rejects unsupported modes, missing required prompts, contradictory hidden prompts and invalid continuity settings. Null legacy decisions are preserved. Recipe edits, field locks and stale-take invalidation use the existing revision machinery. The storyboard shows proposed strategies before application and provides editable, saved controls per shot.

Generation is still pending. This does not connect an image model, establish a Pruna capability, group generated footage automatically or claim a successful live Gemini direction pass. No paid calls were made.

Verification: recipe round-trip/stale-take tests, director response and pre-request validation, legacy locks, browser proposal application/manual override/save/reopen/locks and packaged workflow. Full release results follow after checks.

## Release evidence

Runtime commit: `5f67d5066228473a2e092e75da3b8005f09cf5f1`. Deployment: `dpl_J8GvfzMgL5XZxVqvPPQ2BYmMTMHo`, READY under Flux AI at 2026-10-17T00:07:16.912Z. [Open Fluximiére](https://fluxcreate.vercel.app/fluximiere/) and refresh existing tabs.

All 756 suite tests and both strict TypeScript checks passed. Nine browser apps, hosted server and MCP UI built. The local and packaged storyboard workflow passed with director proposal review/application, manual strategy override, save/reopen and locks. A final review caught an unrelated-shot-edit draft loss; its browser regression failed before the fix and passed afterward. No review findings remain deferred. Storage checks (17), hosted suite browser checks (36) and packaged MCP checks (6) passed. Live verification passed 32 suite checks plus three music route/worker checks. Exact browser bundles matched the tested release; authentication remains enabled for all deployments. No paid generations were run.
