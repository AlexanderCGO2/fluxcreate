# Larger originals in Fluximiére — 17 October 2026

Autoedit now supports 48 unique videos, up to 512 MiB each, with a 2 GiB source-media budget per board. The normal timeline video importer also accepts 512 MiB originals. Available browser storage and codec support still apply; this is not an unlimited cloud-storage service.

## What changed

- Original media remains binary in IndexedDB, timeline history and project files. Video preview and rendering use temporary browser URLs, released when the media decoder is discarded. Large originals are not converted into base64 text for editing, and their quality is not reduced.
- New footage uses a versioned SHA-256 chunk fingerprint, computed from fixed 2 MiB chunks and a size-bound root descriptor. Existing SHA-256 fingerprints remain readable. This avoids whole-file allocations for large-media integrity checks. Duplicate downloads do not consume new source slots; legacy fingerprints are compared when needed.
- Autoedit saves check available browser quota before adding originals. Failed uploads preserve saved sources and the brief. The discard-brief control appears only after an unsuccessful attempt to close with an unsaved brief, not after ordinary import errors.
- AI input remains small: a 3 MiB request budget distributes representative frames across all enabled sources, then adds more samples while space remains. All footage stays selectable. Source videos and the song are not uploaded to Gemini; Autoedit uses sampled images and measured music features.
- Native `.fluximiere` exports containing binary media use a versioned binary container with bounded JSON metadata followed by original media bytes. Reopening reads slices instead of a huge JSON string. Older JSON projects still open. The new container opens in Fluximiére; other apps do not yet read it directly.
- Small projects can still export `.flux.md` with embedded media, up to a 90 MiB source budget. Larger originals should use native Fluximiére export or an edit decision list with relinking. Rendered video can be imported across the suite.
- Precise video export decodes consecutive source timestamps through a bounded iterator per active cut, avoiding repeated HTML video seeks. The original HTML path remains for browser-supported codecs unavailable to WebCodecs. Iterators, decoders and temporary URLs are released on completion/cancellation. The existing [Mediabunny timestamp iterator contract](https://mediabunny.dev/guide/media-sinks) supplies packet reuse; its prebuilt browser bundle avoids an observed upstream ESM initialization cycle when readers and writers are bundled together.

## Verification and limitations

Regression tests cover binary validation/history, 48-source metadata with a 500 MiB source, chunk integrity/cancellation, native media round trips and truncated files, small text exchange, and bounded AI requests retaining every source.

Browser testing uses 16 distinct local videos totaling 601,598,011 bytes (about 574 MiB), including a 124,409,761-byte original (about 119 MiB), plus a repeated file. Import, duplicate skipping, Autoedit reload, timeline reload, native project export/import and actual picture/sound export passed. The user's originals were read only and are not included in the repository. The 512 MiB ceiling is validated in code; the largest real source in this test was 119 MiB.

Existing audio playback, scratching, precise export and linked picture/sound browser regressions passed. Final release gates passed: 782 unit tests, both strict TypeScript configurations, all nine app builds, packaged Autoedit acceptance, 36 hosted browser checks and six MCP checks. Audio synchronization/cancellation and ten-minute fractional-frame-rate export passed after the iterator change. The completed live song-test results are recorded below.

Remaining constraints: ten minutes per imported Autoedit video; soundtrack edits up to three minutes with the existing fade behavior; 96 MiB decoded sound budget; browser codecs; no background completion after closing the tab; no proxy/offline-native acceleration yet. Use current Chrome or Edge for the tested path. Binary originals improve storage and memory behavior but do not make full-resolution decoding free.

## Authorized live Autoedit pilot

The user requested a full test with their downloaded footage and **That Feather.mp3**. The final pass used 16 unique original videos and produced **64 editable cuts across all 16 sources**, covering 180 seconds at 24 fps. The source song measured 180.408 seconds; the existing three-minute derivative/fade policy applied. A 636,195,962-byte native project was exported and reopened successfully.

The corrected live pass completed in four Gemini requests. An earlier four-request pass used regression-test text as its brief; it was corrected before delivering the result. Its slow HTML-seek render was stopped, leading to the sequential decoding improvement. Total live generation requests across both passes: **eight**, without automatic retries.

The final full-length 640×360 preview is 42,620,036 bytes, with VP9 video and stereo Opus audio. Independent container inspection reports 180-second picture and sound tracks. Browser playback/decode reports 180.02 seconds of container duration and 180.0135 seconds of decoded sound (codec padding under one frame); non-silent sound and the ending fade were measured. Rendered frames at 12, 90 and 165 seconds were visually inspected. No user media or generated project/preview files are committed to Git.

Reopening the binary project exposed a source-duration hook still assuming text media. It was fixed; a browser regression now verifies manual slip editing and Undo on the actual large original after native-file import. The same hook supplies source measurements for rolling/slide controls.

## Deployment evidence

- Runtime commit: `34cb7e21ef0ba558accd35980f47b1c1286c4612`.
- Vercel deployment: `dpl_57mRcnFjaY5hDzr9nzZfuQ6XmG7K`, READY in `flux-ai-inc`.
- Production: [Fluximiére](https://fluxcreate.vercel.app/fluximiere/).
- Verified 2026-10-17T13:21:04.073Z: 32 live checks passed, including exact browser bundles for all nine apps, five MCP discovery/resource checks, Flux AI deployment readiness and authentication on all deployments.
- Three additional Autoedit checks passed: exact shared music worker; authenticated route rejects missing inputs before inference; anonymous Autoedit access is blocked. These deployment checks used no paid inference; the authorized pilot above used eight requests.
- This documentation-only follow-up records the results; the deployed runtime is the commit above.
