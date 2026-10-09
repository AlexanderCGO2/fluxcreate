# Fluximiére realtime audio and local performance

Assessment and proposed plan, 2026-10-09. No realtime scratch engine or desktop media service was implemented during this audit.

## Direct answer

Realtime timeline scrubbing, jog/shuttle and DJ-style scratching are feasible in a browser. The Web Audio API supports custom processing on its audio thread through AudioWorklet. That is an appropriate foundation for a continuously controlled sample reader; repeated HTML media seeks are not. Device, operating system and browser latency still need measurement. [AudioWorklet documentation](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet).

Current Fluximiére uses HTML media elements, seeks their `currentTime` when the error exceeds roughly 25 ms paused or 220 ms during playback, and accepts positive playback rates from 0.1× to 16×. There is no AudioWorklet/decoded-PCM scrub engine or continuous reverse transport. The WebM export currently records a canvas stream with no audio track. Sources: `src/renderer.mjs`, `src/model.mjs`, `src/main.jsx`.

## Distinguish the requested interactions

| Interaction | Expected result | Required work |
|---|---|---|
| Scrubbing | Hear short context around the dragged playhead | Bounded decoded audio, audition windows, click-free envelopes |
| Jog/shuttle | Play forward/backward at a controlled speed | Stable audio clock, reverse sample reading, smoothing and rate limits |
| Record scratching | Continuous gesture changes direction/speed and naturally pitch | Worklet sample cursor, interpolation, velocity smoothing, loop/boundary behavior |
| Pitch-preserving stretch | Change duration/speed while keeping voice or music pitch | Separate time-stretch algorithm; not achieved by playback rate alone |
| Export | Final file reproduces all clip timing, fades, gain and audio | Offline mix plus synchronized encoding/muxing; regression fixtures |

## Browser-first design

1. **Measure current playback:** log seek latency, UI responsiveness, drift, memory and audio glitches on the user's Windows/Edge setup plus a second browser. Use wired audio for a baseline; test Bluetooth separately rather than blaming the app for device buffering.
2. **Create an audio engine:** one AudioContext, a documented time origin, source-to-timeline mapping, per-track gain and a master bus. Resume audio through a user gesture. Video follows the audio clock during playback.
3. **Decode/cache samples:** start with supported short assets and a strict memory budget. `decodeAudioData` consumes a complete encoded file and resamples to the context rate, so it is not by itself a solution for chunked decoding of multi-hour sources. Use proxies/chunked decode paths for large media. [Decode documentation](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData).
4. **Render waveforms:** build multiresolution min/max peaks in a worker, cache by asset hash and show actual sample energy rather than decorative shapes.
5. **Audition scrubbing:** schedule small overlapping windows with short envelopes to prevent clicks. Stop audition cleanly on pointer release and avoid overlapping every pointer event as a new source.
6. **Continuous scratch mode:** a worklet reads a fractional sample cursor, handles signed velocity and interpolation, smooths discontinuities and reports underruns. Start with MessagePort control; evaluate shared-memory transport only if measurements justify its isolation/header requirements.
7. **Mix/export:** use the same gain/fade/time mapping for realtime and offline processing, then mux audio/video with matching timestamps. Add cancel/progress and temporary-output recovery. Feature-detect browser codecs and retain an explicit fallback.
8. **Validate perceptually and numerically:** impulses for sync, sine waves for pitch, stereo fixtures, reverse/stop/start boundaries, long timelines, simultaneous clips, device changes and UI stress. Measure interaction latency rather than publishing a guessed universal number.

Uncompressed audio is large: stereo float32 at 48 kHz is 384,000 bytes/second, about 23 MB/minute. A whole-hour decode is about 1.38 GB before overhead. Cache/proxy design matters in both web and desktop editions.

## When a local version helps

| Browser / hosted edition | Optional local companion / desktop edition |
|---|---|
| Immediate access, one update path and the same sharing/AI experience | Direct project folders, persistent disk caches and local asset indexing |
| Canvas/WebGL and Web Audio already execute on the user's device | Native decode/proxy/export processes for heavy workloads |
| Browser memory, codecs, permissions and lifecycle constrain very large jobs | Wider codec/tool options, managed long-running jobs and native audio integration if needed |
| Best first target for a bounded audio engine | Best candidate when measurements show disk/decode/export or device access is the actual bottleneck |

Recommendation: keep one editor and one document format, add a browser audio engine first, then prototype a local compute service. Tauri can package native sidecar executables, which makes it a candidate for this architecture; it is not proof of faster rendering by itself. [Tauri sidecars](https://v2.tauri.app/develop/sidecar/).

Compare a small Tauri shell/companion with the existing desktop scaffolding and with a bundled-engine alternative only after benchmarking. Account for codec licensing, native tool distribution, updates/code signing, OS permissions and IPC validation. The native interface should expose typed operations such as decode, proxy and export, never arbitrary shell commands.

## Proposed order

1. Fix audio-inclusive movie export and establish the shared mix/timing model.
2. Add real waveforms and audible scrubbing.
3. Add jog/reverse/scratch mode with bounded PCM caches.
4. Add optional pitch-preserving stretch.
5. Benchmark large projects and prototype local decode/cache/export where it demonstrably improves results.

All are planned work. The detailed suite sequencing is in [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md).
