# Photo, timeline and rendering release — 2026-10-13

Published runtime: [8fdce80](https://github.com/AlexanderCGO2/fluxcreate/commit/8fdce80). Standalone Fluxini: [1157ab3](https://github.com/AlexanderCGO2/fluxini/commit/1157ab3). Production: https://fluxcreate.vercel.app. Deployment: dpl_128taPb5xDEEXVwWPRodvKzVgwgF in flux-ai-inc, verified 2026-10-13T19:50:23.096Z. All deployments retain Vercel Authentication.

## Delivered subsets

- Fluxfoto: combined RGB and separate channel Curves, with 2–16 ordered numeric points, a visible graph, piecewise-linear interpolation, resets/bypass and explicit Apply. One undo; source bytes and alpha remain intact. Native, PNG, portable, PSD and studio output share the correction, and neutral legacy output remains unchanged. Smooth/freehand curves and separate adjustment layers remain open.
- Fluximiére: rolling trim across one unambiguous adjacent video or audio pair on the same track. Numeric/frame controls and a drag preview move the cut while keeping outer endpoints, source placement and other tracks fixed. Source handles, speed, locks, fades, overlap and minimum durations validate atomically. Linked A/V and slide edits remain open.
- Fluxiffects: bounded timestamped WebCodecs WebM with synchronized stereo audio, committed composition/media snapshots, awaited source frames, progress and cancellation. An explicit real-time compatibility mode remains. Reuses the suite's pinned mediabunny 1.61.3 muxer. Container timestamps have millisecond precision; final video may extend to the next frame boundary and Opus has a bounded packet tail. This is not a durable remote render queue.
- Fluxini: restores the nearest retained paint checkpoint in both seek directions. An exact cached frame now restores with zero solver steps; derived velocity/surface refresh before readiness. Memory budget and shader arithmetic remain unchanged.

## Verification

Feature evidence: 13 Curves browser groups; six rolling workflows with independently decoded picture/stereo output; precise export tests covering actual frames, sample timing, native stability, cancellation and explicit fallback; four GPU checkpoint groups. Relevant existing editor/export/recovery suites pass. Independent cross-reviews have no unresolved production findings. Combined release results are recorded below after assembly. Tests use local fixtures; no paid model requests or payment changes are part of this release.

The paint unit contract and actual GPU workflow failed before implementation: a cached 3→6 second seek took 180 steps. It now takes zero and restores identical pigment/wave/derived fields. A 3→5.5 seek computes only 90 residual steps. The original rewind check passes its unchanged 0.001 threshold; recorded pigment/velocity errors are 0.000228/0.000343. Twelve-color 60-second simulation, palette normalization, GLB, liquid conservation/forcing and bounded eviction recovery pass. Exact recomputation after arbitrary eviction or across GPU drivers is not claimed. See [checkpoint details](../../Haidini/docs/PAINT-CHECKPOINT-SEEK.md).

See [feature gaps](FEATURE-GAPS.md), [batch plan](superpowers/plans/2026-10-13-photo-timeline-and-rendering.md), [Curves](../../Fluxoto/docs/CURVES.md), [rolling trim](../../Fluximiere/docs/ROLLING-EDITING.md) and [motion export](../../Fluxiffects/docs/AUDIO-EXPORT.md). The [Stripe plan](STRIPE-CREDITS-PLAN.md) remains queued after gap work, with the confirmed 50% contribution-margin target.

Combined release gates pass: 633 unit/API/contract tests across ten packages, strict app and fixture TypeScript checks, all nine browser builds plus server and MCP App, 36 hosted browser checks and six hosted MCP checks. Frozen dependency installation passed supply-chain policy; the only lockfile change adds the already-pinned mediabunny 1.61.3 to Fluxiffects. Production verification follows.

## Production evidence

62 protected live checks pass: 32 exact browser bundle/MCP resource, deployment readiness and anonymous-access checks; 15 Gateway/settings and no-charge Agents simulation checks; 15 Cloudflare settings/music status and authentication checks. All nine deployed browser bundles and the MCP App match the reviewed local build. No paid inference or payment activation was performed. Cloudflare music account availability remains false; hosted live Agents execution remains disabled pending its documented durable-execution work.
