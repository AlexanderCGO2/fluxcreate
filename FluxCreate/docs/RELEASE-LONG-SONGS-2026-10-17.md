# Longer Music Video Studio songs — 17 October 2026

Songs longer than three minutes now import as the first 180 seconds with a five-second linear fade-out (2:55–3:00). The full original is kept separately and can be downloaded byte-for-byte. Songs of up to 180 seconds remain unchanged. This supersedes the preview's old rejection of longer uploads.

The prepared soundtrack is exactly 8,640,000 samples at 48 kHz. Playback, beat analysis, Gemini listening and the editable timeline use the same faded derivative. Mono/stereo PCM16 preparation decodes only the selected range using the existing Mediabunny dependency. Conversion cancellation leaves the saved board untouched. Stored recipes retain original identity/duration and fade metadata; the original audio is excluded from visual-reference selectors and director image uploads.

Limits: 64 MiB per song upload; 128 MiB total local board media; supported browser codecs and mono/stereo sources. Full-song film generation beyond three minutes remains outside this preview. Existing Gemini capability checks, paid generation restrictions and open milestones are unchanged.

Verified locally: 16 browser audio assertions including a ten-minute upload, a >24 MiB stereo upload, exact duration, measured fade amplitudes, save/reopen, unchanged three-minute audio and cancellation; 17 storage assertions; recipe/source validation and relinking unit tests; full long-song UI upload/download/reopen/storyboard/timeline flow; existing short-song board flow.

Release checks and deployment evidence are recorded after verification below.

## Release evidence

Runtime commit: `a4bafe84cbb06546545b0cfc299722c1d9f78498`. Deployment: `dpl_8xJGRJpwHzpRCAXCWWjBv2UJuRtL`, READY under Flux AI at 2026-10-16T23:55:15.086Z. [Open Fluximiére](https://fluxcreate.vercel.app/fluximiere/) and refresh an already-open tab to load the updated importer.

All 749 suite tests and both strict TypeScript checks passed. Nine browser apps, the hosted server and MCP UI built. The packaged long-song UI flow passed, along with 36 hosted browser checks and six packaged MCP checks. Live verification passed 32 suite checks plus three music-worker/director checks. Browser bundles exactly matched the locally tested release; Vercel Authentication remains enabled for all deployments and anonymous routes remain protected. No paid generation calls were made.
