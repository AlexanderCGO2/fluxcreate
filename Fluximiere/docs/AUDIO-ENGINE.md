# Audio and movie export — implemented increment

Implemented and checked locally on 2026-10-09. This is a bounded browser engine, not a desktop/native audio workstation.

## Supported workflow

- Mono/stereo browser-decodable audio and video sound use a shared PCM sampler. Clip volume, mute, source in, constant speed and fades apply identically to preview and export. Picture opacity does not affect sound. HTML media elements are always muted, avoiding duplicate playback.
- Play uses an AudioContext clock and an AudioWorklet stereo mix. Drag the ruler to audition sound; turn on **Scratch** for signed variable speed (bounded to ±4×). J/K/L provide reverse, stop and forward shuttle. Direction, playback speed and pitch follow the source; pitch-preserving time stretch is not implemented.
- Scrub grains are short, speed changes are smoothed, and discontinuities have a 128-sample crossfade. Pointer release/cancellation stops auditioning. The level meter reports the generated output signal, not a measurement at the speakers.
- Timeline waveforms contain real worker-generated min/max peaks, sliced using the clip's source in and speed. Silence is flat. Loading/offline/unsupported sources have a text state instead of invented bars.
- **Export video** renders each timestamped frame after its source seek completes and encodes stereo sound in small blocks. VP9 or VP8 with Opus is muxed by pinned Mediabunny 1.61.3 (MPL-2.0). Encoder support is checked first; no automatic silent fallback is used.
- **Real-time WebM export** is an explicit compatibility choice using Canvas/MediaRecorder and the AudioContext clock. It stops if the tab becomes hidden. It is not frame-deterministic.
- **Export picture only** is an explicit muted output. PNG export prepares its own source decoders and waits for the requested frame, independently of the preview canvas.
- Missing/undecodable sound, source-range overruns and clipping above full scale stop export. Lower overlapping clip volumes to restore headroom. Native projects retain all original clip properties.

## Resource boundaries and cleanup

The PCM cache holds at most **96 MiB** and rejects a whole source whose estimated stereo decode would exceed that budget. Duration is measured from the actual embedded media before decoding rather than trusting project metadata. `decodeAudioData` is whole-file decoding; a short trim of a large source still needs a shorter proxy. The decoded result is checked again, and multichannel sources require a mono/stereo downmix. This does not claim a hard cap on the browser codec's internal transient allocations.

The worklet receives one bounded copy of the active PCM; waveform analysis serializes one worker at a time. There are at most **64 simultaneous audio clips**, and precise export allows at most **64 simultaneous visual sources**. Inactive preview decoders are released. Replaced/deleted sources are pruned; project changes clear worklet samples; disposal closes the audio context.

Precise export encodes only a frame-sized audio block at a time and bounds encoded packet payload to **256 MiB**. The final file and the muxer's buffers still occupy memory. The real-time compatibility path separately bounds its complete stereo mix to **128 MiB / approximately 349 seconds**. Exports own separate decoders/audio contexts and release resources on success, failure or cancellation. Partial files are never downloaded as completed movies.

## Recorded verification

`node --test tests/*.test.mjs`: 33 passing tests, including real peak analysis, stereo/mono interpolation, volume/mute/fade timing, opacity independence, signed worklet traversal, stop, source boundaries and cross-editor audio-fade persistence.

`node scripts/browser-smoke.mjs`: the existing 16 editor checks pass, including actual WebM decode and reimport.

`node scripts/audio-smoke.mjs`: generated stereo tone/silence fixture, actual editor metering, reverse pointer audition, pointer-release silence, offline RMS, export cancellation, missing-sound rejection and budget rejection. The produced 1.4-second WebM has two independently decoded audio channels; tone onsets are 0.3000833 and 0.6000833 seconds for expected 0.3 and 0.6. Decoded Opus includes a 13.5 ms encoder tail.

The ten-minute reference uses **64 × 36 at 30000/1001 fps**, a short reusable sound source and markers near both ends. It produced exactly **17,983 video packets**, decoded audio duration **600.0135 seconds**, and marker onsets **0.3000833 / 599.3000833 seconds**, with no accumulated audio timing drift. Recorded local export plus verification time was about **9.52 seconds**; this small fixture is not a full-resolution performance benchmark. Results and the short playable reference are saved under ignored `artifacts/audio/`.

Still needed: hardware listening, measured input-to-speaker latency, device-change and sustained UI-load testing, long-source/proxy decoding, professional channel routing, track/master/pan controls, loudness tools, pitch-preserving stretch, MP4 and native background jobs. Silent videos whose container cannot be decoded by Web Audio require explicitly muting their clip; unsupported sound is not silently discarded. No universal latency or codec-compatibility claim is made.

Implementation references: [AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet), [Web Audio stream destinations](https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioDestinationNode), [WebCodecs](https://www.w3.org/TR/webcodecs/), [Mediabunny sources and backpressure](https://mediabunny.dev/guide/media-sources), and [Mediabunny codec detection](https://mediabunny.dev/guide/supported-formats-and-codecs).
