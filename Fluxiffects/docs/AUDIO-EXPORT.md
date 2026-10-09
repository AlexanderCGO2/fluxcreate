# Audio-inclusive composition export

Implemented and checked locally on 2026-10-09.

WebM export now includes a stereo Opus soundtrack. The composition's audio/video layers are decoded with the bounded Fluximiére PCM store, then mixed using native layer start/end, source in, constant playback speed, mute/visibility, audio fades and volume keyframes. Volume animation uses the same easing as other native properties and is evaluated at each output sample. Picture opacity does not reduce sound.

Volume has a keyframe button and appears among animated properties for audio/video layers. The Media inspector includes explicit audio fade-in/fade-out values. These fields survive native save/open; the editable gain curves and fades are retained in the source document. Preview uses the same gain envelope with its existing media elements.

Video capture retains the existing **60-second / 60-fps real-time** limit. The recorder combines Canvas video with a Web Audio stream and uses the AudioContext clock. Audio-inclusive codecs are feature-detected; unsupported/corrupt/missing sound blocks export. **Export picture only (silent)** is the explicit opt-out. Hiding the tab stops capture with an explanation. Progress and cancellation include the mix preparation, and isolated sound/video resources are released on every outcome.

The shared audio store bounds decoded PCM to **96 MiB**, measures actual source duration before decode, accepts mono/stereo and limits simultaneous voices to 64. Large sources require shorter proxies and multichannel audio needs a downmix. Overlapping levels above full scale stop export instead of clipping silently. Speed changes also change pitch. Whole-file browser decoding has codec-managed transient memory; this is not chunked long-source decoding.

`node scripts/audio-smoke.mjs` generates a mono 22,050 Hz tone/silence file, imports it beside a native Flux3D scene, and verifies the actual stereo Opus WebM by independently decoding it in the browser. The fixture includes source offset, invisible picture opacity, volume keyframes, audio fades and output resampling. Early/late RMS were **0.149695 / 0.247584**, with exact silence before the cue. The expected 0.3-second onset decoded at **0.3065625 seconds**. The 1.4-second movie decoded to **1.38 seconds**, consistent with the real-time fallback's packet boundaries. Native scene video decoded at **320 × 180**. Cancellation, the transfer activity dialog and no browser runtime errors were also verified. Artifacts are in ignored `artifacts/audio/`.

`node --test tests/*.test.mjs`: 93 checks pass, including native volume/fade persistence and invalid automation rejection. The existing editor browser suite remains part of release verification.

Remaining: deterministic full video/audio export for Fluxiffects, sample-accurate preview transport, waveform UI, professional track/bus mixing, source proxies, pitch-preserving time stretch, measured hardware listening/latency, MP4 and recoverable background render jobs. Fluximiére's precise export is a separate implementation and is not claimed here.
