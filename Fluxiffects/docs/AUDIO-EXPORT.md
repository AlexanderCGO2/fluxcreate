# Composition video and audio export

Updated and verified locally on 2026-10-13. The default Video action is precise timestamped WebM. Explicit real-time capture and picture-only choices remain available. This is a bounded delivery subset, not After Effects parity.

## Precise path

The Effects-owned src/video-export.mjs helper uses the suite's existing pinned **mediabunny 1.61.3** WebM muxer and WebCodecs encoder. It probes VP9, then VP8, plus stereo Opus when sound is requested. An unavailable encoder gives an actionable error and invites the **Real-time WebM fallback** buttons; it never silently switches modes.

Before the first asynchronous operation, the renderer clones the committed composition, layers, keyframes and assets. Each export owns separate media and native-3D instances and asset-cache entries. Preview cache pruning cannot dispose active export templates. Mid-export selection, key, source or layer changes do not alter the movie or native project. Every video source seek completes before its requested composition frame is drawn and submitted; source start, offset and constant playback rate are respected. Unreadable/missing footage and out-of-range source time fail without returning a downloadable partial result.

Video frames start at index/fps for all indices below duration*fps; the count is ceil(duration*fps). Rendering speed never changes timestamps. The pinned WebM muxer uses **1 ms timecodes** (up to 0.5 ms rounding). Its fixed-rate DefaultDuration retains a whole final video frame when the composition ends between frames. Opus has a final packet tail of less than 20 ms; sample-exact container trimming is not claimed. Source VFR normalization, reverse/time-remapped footage and frame interpolation are not added.

The native mixer renders **48 kHz stereo**, evaluating volume/easing at each output sample with independent audio fades, mute/visibility, layer timing, source in and constant playback speed. Mono sources duplicate into stereo. Picture opacity does not reduce sound. Speed changes also change pitch. Levels above full scale fail instead of silently clipping. Mix samples are submitted alongside each video frame; codec latency is represented by Opus metadata.

## Bounds and cleanup

- Both modes: greater than zero and at most **60 seconds**, **1–60 fps**; invalid rates are rejected instead of silently clamped.
- Precise picture: at most **4096 pixels per side / 8,847,360 pixels** and **64 visual source layers** intersecting the composition. This conservative source cap includes sequential sources, not just simultaneous ones.
- Sound: existing **96 MiB decoded source PCM**, mono/stereo only, **64 simultaneous voices**, **128 MiB mix** budget. The 60-second limit normally keeps the stereo mix below 22 MiB. Whole-file browser decoding still has codec-managed transient allocation.
- Precise encoded packets and final WebM: **256 MiB maximum**; the complete file is held in memory, with temporary muxer/Blob copies possible. Long-source streaming and background queues are absent.
- Media loading waits at most 15 seconds; source seeking waits at most 10 seconds. Abort is checked during preparation, sample mixing, frame rendering and finalization. Abort cancels the muxer; media, scene templates, audio contexts, canvas references and tracks are released as the operation settles. Progress never moves backwards. No partial download is exposed on error/cancel.

Real-time fallback preserves the existing audio-clock capture, requires a visible tab, and may drop/repeat picture frames or have capture-boundary drift. Its dimensions retain the existing still/capture maximum of 7680 pixels per side / 33 megapixels. The sound rules and committed snapshot still apply. Preview keeps its existing element transport and shared gain envelope; sample-accurate preview transport is not claimed.

## Verification

node scripts/precise-export-smoke.mjs encodes then independently demuxes/decodes the actual WebM in Edge. A **1.025-second / 24 fps** fixture yields **25** frames, all expected red/green frame pixels, timestamps within 0.5 ms, and a fixed-frame end of **1.042 seconds**. Stereo decode yields **49,608 frames / 1.0335 seconds**; expected sound onset 0.25 seconds measured **0.2501041667 seconds**. Early/late left RMS is **0.0987895 / 0.191214**, right/left ratio about **0.501**; the initial silent region is effectively zero. The resulting video/audio end difference is **8.5 ms**. Six imported source-color frames verify source offset and 2× speed. Native save before/after UI export, in-flight key/source edits, monotonic progress, cancellation, missing/out-of-range source, unsupported encoder, and explicit real-time fallback are covered. Artifacts: ignored artifacts/precise/.

The browser regression originally failed against real-time capture: **23 frames instead of 25**. Four Node preflight tests first failed for absent precise validation/capability behavior. The progress regression first reproduced a backwards jump after sound preparation. All pass after implementation.

The existing native Flux3D+audio fixture also passes: onset **0.3000625 seconds** for expected 0.3; stereo duration **1.4135 seconds** for a 1.4-second composition; picture **320 × 180**. Its cancellation trigger now uses encoding progress, because precise export can finish before the old 350 ms wall-clock timer.

Remaining: waveform UI, sample-accurate preview transport, track/bus mixing, proxy/relink workflows, pitch-preserving stretch, codec/hardware qualification, MP4/alpha/professional color and recoverable background render jobs.

Final local verification: build and all **110 Node tests** pass. Browser suites passed: precise export (including UI/native stability), native-scene audio, editor, custom easing, key clipboard, key selection (including committed export during a pending drag), and recovery. Recovery explicitly dismisses the retained FluxLab review using Keep working before proceeding after reload. Independent source review found no actionable production issue; an independent precise browser rerun also passed.
