# Fluximiére Autoedit — 17 October 2026

Autoedit is a separate studio beside Music video. Upload original footage and a soundtrack, choose landscape/portrait and editing feel, build a local beat-aligned draft, then request an editorial proposal from Gemini. Review its reasons and source ranges before applying the result. Open the real video sequence in the normal editor in one Undo step.

## Included

- Up to 12 browser-decodable videos, 32 MiB each, 10 minutes per video and 128 MiB total original media. Six bounded timestamped JPEG frames per video include brightness/motion measurements. Footage cards show resolution, duration and audio presence; sources can be excluded or constrained to preferred ranges.
- Shared soundtrack analysis, manual beat-grid correction and musical dynamics. Songs over three minutes retain the original and use the existing first-three-minutes/five-second-fade derivative. Replacing music or source ranges clears the draft; locked cuts must be unlocked first.
- A local draft uses measured musical anchors, variable pacing, available source lengths, varied source selection and sampled brightness/motion. It is labeled automatic sequencing, not AI semantic comprehension. Insufficient footage or beat coverage produces an actionable error.
- Gemini 4 Argon receives the brief, timestamped footage samples, bounded music features and the existing cut list. Live catalog image/text capability is checked before generation. Shared server-side AI Gateway credentials/settings are reused. Timing remains deterministic; model proposals may select only validated source IDs and source in-points. Prior page choices inform later pages.
- Per-cut preview, source/range correction, editorial reasons and locks. Soundtrack remains continuous; source audio is optional at 35%, only for footage with a detected audio track. Landscape/portrait uses center-fill framing, adjustable afterward in the normal editor.
- Dedicated IndexedDB media/workspace storage with source hashes, immutable asset IDs and compare-and-swap saves. Completed AI pages survive reload and resume without resubmitting those pages. A failed/interrupted current page requires explicit retry acknowledgment; proposals do not mutate the draft until applied.
- Cancellation, bounded gateway input/output, per-connection concurrency protection, no automatic paid retries, model-output validation and local/hosted origin/body-size enforcement. Timeline handoff checks both saved Autoedit version and the editor's opening project reference.
- Closing during active work cancels the operation and keeps the brief visible. Failed saves keep the studio open with an explicit option to discard the unsaved brief; successful close saves it.

## Deliberate limits

This release provides sampled-frame visual direction and measured music features; it does not claim full video inspection, lyric listening, speech transcription or exhaustive scene detection. No paid live Gemini pilot was run; transport, rejection and recovery tests use a mock at the external gateway boundary while executing the real service, image validation and client flow.

There is no configured durable hosted job store. Closing the tab interrupts the in-flight page. Completed browser checkpoints resume; an interrupted provider request can have consumed credits and is never silently retried. Server restart recovery, background completion after tab closure, proxy media, dense scene analysis and native acceleration remain future work. Repeated source ranges are allowed when available footage is shorter than the song. Local browser codec support still determines which imports and exports are usable.

## Verification

Domain tests cover real source ranges, complete soundtrack coverage, locks, stale proposals, excluded/short footage, malformed plans and silent-video audio handling. Service tests cover unavailable visual capabilities, invalid personal credentials, provider failures, source-boundary rejection, connection concurrency and cancellation. Both HTTP routes enforce JSON size and origin before reaching the service.

Browser acceptance uses two actual encoded moving-image WebM fixtures and rhythmic PCM audio: sampling, worker analysis, draft, manual locks, Gemini image transport, second-page failure and resume without repeating the first page, cross-page continuity, reload of a completed proposal, unsafe-provider rejection, stable preview URLs, normal timeline Undo/Redo, exact rendered source frame, actual WebM export and cross-tab conflict handling. Release-wide and live verification are recorded below after execution.

Final review found and fixed loss of an unsaved brief on close during active work or failed saves. Browser regression reproduces the original failure and verifies retention after cancellation and save conflict, successful save on close, and explicit discard. No other concrete blocking findings were reported. Final local and packaged Autoedit acceptance and the existing packaged music reanalysis regression passed after the fix.

Release gates passed: **776 tests**, both strict TypeScript configurations, nine app builds plus hosted server/MCP packaging, 36 hosted browser checks and six MCP checks. No paid model calls were made.

## Provider contract references

Reviewed [Vercel Chat Completions REST API](https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions/rest-api), [live Gateway model catalog](https://ai-gateway.vercel.sh/v1/models), and [Google Gemini 4 Argon](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon). The catalog confirms text/image input for the selected model. Runtime checks enforce this instead of assuming availability. Audio listening is not used by Autoedit.
