# Music-led shot pacing — 17 October 2026

The studio now defaults to Follow the music. Analysis stores at most 180 one-second summaries of relative energy and onset activity. A local intensity window chooses a variable target, then cuts snap to actual accepted/manual beat anchors, favoring nearby change cues. Energetic/cinematic preferences shift the feel; the UI no longer sets one fixed target shot length. A quiet-to-loud test produces longer holds before the intensity rise and faster cuts afterward.

Complete picture coverage and a usable final hold are preserved. Missing beat coverage requires manual anchors rather than fabricated timing. Existing locked/reviewed shots remain protected. Older maps stay readable and use local beat density until reanalysis. Dynamics survive recipe save/open and manual beat correction, with bounded shape/range/coverage validation. Existing numeric timing callers retain their legacy behavior.

Limitations: audio-feature heuristics, not semantic music or lyric comprehension; consistent passages may keep similar lengths; final holds can exceed the preferred range to avoid tiny tail clips. Image/video generation and live Gemini audio qualification remain open. No paid AI calls were used.

Verification: actual PCM soft/loud analysis through timing and recipe round-trip; 1–180-second/fractional coverage; change-cue snapping; old maps; lock guards; browser upload/worker analysis/manual correction/adaptive storyboard/reopen/cinematic preference. Release checks follow after verification.

Review also identified the older global onset-strength threshold suppressing quiet passages. Local neighborhood thresholds/confidence now preserve regular quiet beats without equating volume with confidence; silence/ambiguity/manual-anchor behavior remains tested. A regression first failed on automatic soft/loud coverage, then passed after this change. Both automatic and manually corrected browser paths are verified.

## Release evidence

Runtime commit: `bca8d93cd1c742e25c4098c6cdfe083db4eb53d8`. Deployment: `dpl_Aym8CPQ62thsA7EMYL47rUBZLB6M`, READY under Flux AI at 2026-10-17T00:19:15.859Z. [Open Fluximiére](https://fluxcreate.vercel.app/fluximiere/). Refresh existing tabs, analyze the soundtrack again to populate dynamics, then rebuild with Follow the music. Locked or reviewed shots remain protected.

All 761 suite tests and both strict TypeScript checks passed. Nine browser apps, hosted server and MCP UI built. The packaged music-pacing and existing storyboard flows passed, including automatic soft/loud beat coverage, manual corrections, variable durations and save/reopen. Hosted browser checks (36) and packaged MCP checks (6) passed. Live verification passed 32 suite checks plus three music route/worker checks. Exact browser bundles and music-analysis worker matched the tested release; authentication remains enabled on all deployments. No paid generations were run.
