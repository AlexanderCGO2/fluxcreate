# Precise composition delivery plan

13 October 2026. Scope: bounded timestamped WebM, not full After Effects delivery parity.

1. Add regression fixtures first: a fractional final frame, keyed colors, video source offset/rate, stereo audio onset/gain/fades, immutable native snapshot, limits, cancellation and capability errors. Observe failure with current real-time export.
2. Add an Effects-owned encoder helper using the suite's existing pinned mediabunny 1.61.3 dependency. Encode VP9/VP8 and optional stereo Opus, with awaited video frames and explicit timestamps. Reuse the native offline sound mix.
3. Give export its own cloned document/assets, media and scene instances. Await source seeks, reject out-of-range footage, support cancellation during preparation and encoding, and dispose all owned resources. No preview or document changes.
4. Keep explicit real-time WebM fallback and explicit picture-only options; no silent capability fallback. Keep 60 seconds / 60 fps, cap precise output at 4096 pixels per side / 8,847,360 pixels, 64 visual sources, 96 MiB source PCM, 128 MiB mix and 256 MiB encoded output.
5. Verify actual encoded and decoded timestamps, frame pixels/count, stereo samples and A/V drift in browser; native roundtrip and in-flight edits; cancel/error recovery; build and all existing unit/audio/editor/keyframe browser tests.

No queue, MP4, alpha, professional codecs/color, reverse or animated source retiming, long-source streaming, or AE parity claim. Browser source seeking uses the frame covering the requested source time; timestamped output does not promise source VFR normalization. A capability error invites the explicit real-time fallback.
