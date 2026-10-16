# Music Video Studio preview — 17 October 2026

Status: published and verified preview under Vercel Authentication. This is the first working increment of the music-video plan, not finished automated music-video production.

## Delivered

- Separate Fluximiére workspace with six stages, concept, one character identity, scene references, original song, format, editable shot ideas/reference selection and field locks. Light/dark styles and keyboard modal isolation.
- Bounded real audio decoding, worker-based onset/tempo analysis with uncertainty, and manual BPM/first-beat grid. 1–180-second mono/stereo sources; canonical browser decode at 48 kHz; bounded 8 kHz mono analysis/listening proxy.
- Beat-snapped frame timings at 24 fps, 2–5-second target shot lengths, section-relative 10-second cut-density reporting, invalid anchor/gap/overlap rejection. The 120 BPM test produces five two-second shots and four internal transitions in ten seconds. Final picture rounds up to the next frame while original audio retains its full measured duration.
- Local Blob storage separate from recipes, SHA256 checking, atomic compare-and-swap saves, cross-tab preflight guards, metadata-only Markdown export/import, original-byte relinking, and preserved old data on invalid imports/quota errors. This preview has a 64 MiB board limit, a 24 MiB song-file limit and eight-megabyte reference-file limit.
- One-Undo animatic replacement: editable stills/cards on V1 and the original song exactly once on A1. Legacy editor project schemas remain unchanged. Save the recipe separately for direction/beat metadata.
- Exact bounded PCM excerpt helper and float WAV tests. It is not yet exposed as a hosted director tool because canonical PCM retention/ownership has not been delivered.
- Gemini director adapter with actual audio/image content, validated paged proposals, creative field locks, cancellation, 12-round/128-tool budgets, bounded output, no retries or fallback. Inspection tools are analyze_music, get_beat_grid and preview_edit. Unapplied proposals are temporary, not durable background runs.

## Live capability boundary

The unauthenticated [Gateway catalog](https://ai-gateway.vercel.sh/v1/models) was checked at 2026-10-16T23:24:50.159Z (17 October, 01:24 Berlin): HTTP200, 473 entries. `google/gemini-4-argon` advertised text/image/PDF/video input, without audio. The adapter blocks before paid inference and gives a specific model-capability error. General [Gateway audio transport](https://vercel.com/docs/ai-gateway/inputs-and-tools/audio-input) is implemented and simulated; it is not evidence that this pinned model route accepts audio. No text-only substitution or another agent is used.

No paid model calls or video generations were made. The next connection step is provider confirmation or a separately approved bounded audio pilot. Pruna generation, paid quoting, durable jobs and owner-scoped hosted assets remain pending.

## Verification

Targeted tests were observed failing before implementation, followed by passing checks. Browser fixtures cover real WAV decoding, worker analysis, manual anchors, uploaded bytes/hash checks, recipe reopen/relink, invalid import preservation, concurrency/quota rejection, editable proposal application using a mocked route, and timeline Undo/Redo.

Independent review identified malformed imported analysis poisoning the saved board and model-capability errors being hidden by generic connection errors. Both were reproduced and corrected with regression tests. Analysis also must match the original song's canonical sample metadata.

Final suite/build/browser counts and deployment evidence are recorded after release qualification below.

## Remaining plan

Tasks 1–3 are partial. Not yet qualified: waveform-overlaid range editing, memory/latency measurements including worklet copies, multi-section director timing, retained canonical PCM/FFmpeg dispatch, durable partial proposals, paid multimodal quality and full-song export alignment. Tasks 4–9 cover Pruna, identity/storage, native v3/packages, durable orchestration/budgets, take review, final assembly and production acceptance. See the [implementation plan](superpowers/plans/2026-10-17-fluximiere-music-video-ai.md).

Rulings: reuse the established sibling-source/release-mirror workflow and authorized parallel work; keep the first animatic compatible with native v1/v2 and a separate recipe; expose only truthful inspection tools until canonical PCM is retained. These choices defer portable production lineage and unattended generation; they do not claim those gaps are closed.

## Qualified preview build

- 746 combined unit tests passed across all ten packages. Both strict TypeScript configurations passed.
- All nine browser applications, packaged MCP UI and hosted server built successfully.
- 36 existing hosted-suite browser checks and six packaged MCP checks passed.
- Music-video board workflow passed both local-server and assembled-hosted browser runs, including real worker loading, mocked Gemini proposal review/apply, cross-tab rejection and metadata recipe/song relink.
- 17 dedicated real-browser storage/media checks passed.
- Independent review fixes have regression coverage. No paid calls were made.

Production source commit: [fbffc6f](https://github.com/AlexanderCGO2/fluxcreate/commit/fbffc6f). Deployment: `dpl_4VyQaKYgQmtpw29mkLrxtma9R93Q`, READY in `flux-ai-inc`. [Open Fluximiére](https://fluxcreate.vercel.app/fluximiere/) and choose **Music video**.

35 protected live checks passed: exact bundles for all nine apps, five MCP discovery/UI resources, production readiness and authentication, anonymous app/MCP rejection, exact analysis worker, director route invalid-input/connection rejection and anonymous director rejection. Checked 2026-10-16T23:36:45.637Z; zero paid calls.

The evidence-document commit may follow the runtime commit; no runtime files changed after this deployment.
