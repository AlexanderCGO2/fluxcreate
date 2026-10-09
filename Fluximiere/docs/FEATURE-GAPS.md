# Fluximiére versus Adobe Premiere Pro: gaps and delivery plan

Source review: 2026-10-09. This document describes the current implementation and a proposed order of work. It does not claim Premiere parity or completion of planned features. **Working** means the stated workflow is implemented; **Partial** identifies restrictions; **Missing** means no complete workflow is present. Historical checks are in [OPTIMIZATIONS.md](OPTIMIZATIONS.md); this review did not rerun the entire browser suite.

Fluximiére can assemble browser-decodable picture and sound, edit cuts, create simple titles and preserve native projects. The first delivery milestone should be a reliable short-form movie with synchronized exported sound. Current WebM output is silent, which prevents many ordinary finished-video jobs even though editor playback has sound.

## Evidence and comparison scope

Inspected `src/main.jsx`, `model.mjs`, `renderer.mjs`, `timeline-import.mjs`, model/import fixtures, README and optimization backlog. Native projects contain one sequence, assets and clips. Supported clip fields include timing, constant speed, transform, opacity, simple fades, volume/mute and basic title/card properties. There is no general keyframe, transition, effect, caption, transcript or audio-bus model.

Adobe's [current Premiere help index](https://helpx.adobe.com/premiere/desktop.html) provides the baseline categories; [professional editing objectives](https://certifiedprofessional.adobe.com/premiere) cover media management, sequence editing and output. [Color-management documentation](https://helpx.adobe.com/premiere/desktop/correct-color/set-up-color-management/about-color-management.html) demonstrates why an RGB browser canvas is not a managed grading pipeline. This comparison separates broadly established workflows from optional or beta capabilities; it does not promise exact Adobe UI or plugin compatibility.

## Capability inventory

Priorities: **P0** protects work and deliverable correctness; **P1** completes common editing jobs; **P2** expands production capability; **P3** covers specialist workflows and ecosystem parity.

| Area | State today | Remaining gap and priority |
| --- | --- | --- |
| Project/sequence model | Partial: one editable sequence with duration/background and native save/open | P1: multiple sequences, sequence duplication/tabs, selectable size/fps/aspect presets; dimensions/fps are currently mostly read-only in the UI |
| Media bin | Partial: local embedded assets, basic type/name list and relink controls | P1: folders, search/filter, metadata columns, thumbnails, usage count, source ranges and remove/replace management |
| Ingest | Partial: browser-compatible MP4/WebM, images and MP3/WAV; file-size and decode checks | P1: codec report, orientation and source-range validation. P2: transcode/proxy pipeline and image sequences; no broad camera/RAW/container guarantee |
| Source monitor | Missing dedicated source viewer | P1: inspect footage, mark In/Out, insert/overwrite at playhead and source match-frame |
| Track model | Working subset: V1–V16 and A1–A16, track order, per-clip locks/mute | P1: track locks/mute/solo/targeting/sync-lock as persistent state, add/remove/rename tracks and keyboard movement |
| Basic cuts | Working: move, edge trim, split, duplicate, delete and clip timing inspector | P1: snapping, multi-selection, clip groups, copy/paste and consistent keyboard trim operations |
| Advanced trimming | Missing | P1: ripple delete/trim, rolling trim, slip/slide, insert/overwrite modes, track targeting and explicit collision behavior |
| Linked picture/sound | Missing | P1: linked selection, unlink/relink, sync offsets and J/L cuts; separate media clips currently have no link/group model |
| Markers/navigation | Partial: playhead seeking, frame steps, start/end and timeline zoom | P1: clip/sequence markers, next/previous edit, timecode entry, J/K/L shuttle, range selection and navigable search |
| Timebase accuracy | Partial: floating-second timing and fps metadata; XML imports understand fractional rates | P0: rational frame-time semantics and NTSC/drop-frame display. Current `timecode()` rounds fps, so imported fractional rates need a dedicated correctness pass |
| Transforms | Partial: model supports x/y/size/rotation; main inspector exposes x/y/opacity | P1: complete transform/crop/fit controls and direct monitor handles; clear pixel aspect/orientation behavior |
| Keyframes | Missing general clip automation | P1: transform/opacity/audio keyframes, interpolation and property lanes; fades alone are not a keyframe editor |
| Retiming | Partial: constant positive speed 0.1×–16× for media | P2: reverse, freeze, rate stretch, time remapping and interpolation; audio pitch policy and source-bound behavior must be explicit |
| Transitions | Partial: individual clip opacity/volume fades | P1: real two-clip dissolve/audio crossfade with handle checks. P2: additional transitions and transition presets |
| Effects/compositing | Missing general stack | P2: crop, blur, blend modes, adjustment layers, masks/keying/tracking, effect ordering and GPU-appropriate evaluation |
| Titles/graphics | Partial: plain editable title, lower-third preset, basic alignment/size/color and cards | P1: font choice, style presets, placement controls and safe areas. P2: rich text, shape graphics, reusable animated templates; no native MOGRT engine |
| Captions/subtitles | Missing | P1: timed caption tracks, SRT/VTT import/export, burn-in and style editing. P2: broadcast formats, translation and accessibility review |
| Transcript editing | Missing | P2: transcription, word timing/speakers, transcript-driven cuts and correction workflow; cannot operate solely on generated prose |
| Color correction | Missing | P2: exposure/contrast/white balance, LUTs, scopes and match workflow; then defined input/working/output color spaces and HDR handling |
| Audio playback | Partial: per-clip media element, volume/mute, fades and speed | P0: synchronized audio graph and independent audio/picture envelope semantics. Current renderer multiplies media volume by active visual opacity |
| Real-time audio scrubbing / scratching | Missing | P1, explicit user priority: audible pointer scrubbing, jog/shuttle, signed reverse playback and variable-speed scratch response. Setting an HTML media element's `currentTime` does not provide this workflow |
| Pitch-preserving time stretch | Missing | P2: a separate mode for changing duration/speed while retaining pitch; scratching normally changes pitch with signed playback speed and must remain a distinct control |
| Audio waveforms/meters | Missing real analysis | P1: decoded peak cache, actual waveform and level meters. Current timeline bars are decorative and do not represent source amplitude |
| Audio mixing | Missing mixer/bus model | P1: gain/pan, track/master mix, headroom and clipping warnings. P2: channels/submixes, EQ/compression, loudness targets and automation |
| Recording/audio repair | Missing | P2: voice-over recording, noise/speech cleanup, ducking and sync tools; preserve source audio and make derived changes reversible |
| Movie export | Partial: real-time full-resolution silent WebM via Canvas/MediaRecorder | P0: sound mix/mux, deterministic timestamps and output validation. P1: configurable size/rate/quality and codec-aware MP4 support or honest fallback |
| Still export | Working subset: current canvas frame as PNG | P0/P1: export independently awaits exact source seek/decode; range/sequence export and color metadata are additional work |
| Render queue | Missing durable job workflow | P1: cancellable deterministic export with progress; P2: background jobs/restart recovery, batch presets and external/native encoder option |
| Proxies/performance | Missing proxy workflow; full-resolution preview | P1: prune unused decoders and cache indexes; P2: managed proxies, preview quality and optimized long-timeline rendering |
| Local high-performance edition | Partial: local Node-served browser version already exists | P1: benchmark the media/render path locally. P2: optional desktop shell/native helper for streaming decode/encode and file access; a wrapper alone does not improve the current algorithms |
| Multicam/nesting | Missing live sequence model | P2: nested sequences first, then synchronized angles, angle switching and audio-follow rules. Imported nested/multicam content currently needs replacements |
| Native save/recovery | Working: JSON envelope with embedded media, autosave, undo/redo, recovery quarantine and atomic imports | P0: keep these guarantees during schema/media-store migration; P1: visible storage budgets and complete backup packaging |
| Premiere import | Partial: actual gzip/plain XML PRPROJ graph parser with sequence choice and offline clips | P1: richer per-clip diagnostics/verified schema coverage. Effects, grading, MOGRT, variable speed, routing and full Adobe round-trip remain unsupported |
| XML/EDL exchange | Partial: legacy xmeml import; restricted CMX3600 V-track cuts in/out | P1: supported xmeml export and clear feature mapping. P2: richer interchange; modern FCPXML, AAF/OMF are not implemented |
| Suite interchange | Partial: native source plus portable scene, FluxExchange, text/shapes/media/timing with conversion warnings | P1: preserve semantic track/link/transition data when both apps support it; source-preserving placed objects are not a finished workflow here |
| 3D content | Missing live 3D compositor in this app | P2: linked or rendered Flux3D/Fluxiffects output; current conversion skips live scene3d with guidance rather than pretending to flatten it |
| Generated media handoff | Working: persisted FluxLab video/audio/image bytes with playable review, then source-bin import | P1: source provenance, range placement and generated alternatives. Handoff does not imply movie export contains sound |
| AI edits | Working: typed reviewed cuts/title/timing changes, selection/lock enforcement, one undo step, no media/path payload | P1: source-range-aware validation and edit summaries; P2: transcript/media analysis with explicit provider scope and cost |
| AI media tools | Partial: FluxLab generation is separate from timeline editing | P2: explainable footage search, caption/transcript workflows and optional frame extensions; no existing equivalent of all Adobe generative tools |
| Collaboration | Missing shared editing service | P2: review exports/comments/versioned handoff; P3: shared projects, permissions, media coordination and concurrent edits |
| Professional monitoring | Missing | P3: calibrated external monitoring, surround, broadcast output, specialized ingest and hardware integration |
| Extensibility | Missing plugin/effect SDK | P3: typed versioned extension API and isolation before plugin ecosystem claims |
| Accessibility/workspace | Partial: labelled controls, basic keyboard shortcuts, light/dark UI | P1: full keyboard clip/track selection, screen-reader feedback, dialog focus and adjustable panels. Quality/Fit chips are currently displays, not full quality/zoom menus |

## File compatibility is not native fidelity

| Input/output | Current contract | Required caution |
| --- | --- | --- |
| `.fluximiere` | Complete current timeline model, embedded sources and portable scene | Browser storage and JSON/base64 size are practical limits; save external backups |
| `.prproj` import | Supported sequence/track/cut graph, offsets, inferred constant speed and offline media references | Undocumented/version-varying schema; no automatic source-path fetch; no native export or lossless round-trip |
| Legacy `.xml` / xmeml | Cuts, source references/rates, stills, basic Text titles; transition timing can be resolved | Transition effects and native complex graphics are omitted; modern `.fcpxml` is a different format and is rejected |
| CMX3600 `.edl` | Non-drop V cuts; export V1 only, integer fps, nonoverlap and normal speed | No audio, extra picture tracks or reliable effect/title transfer; source relinking required |
| FluxExchange / other suite project | Active portable composition, destination-supported media/text/shapes/timing | Animation, gradients, effects, parent transforms and 3D are simplified or skipped with notices |
| PNG / WebM output | Actual rendered picture; WebM is recorded in real time and contains no audio | No current delivery guarantee for background tabs, exact frame count, codec portability, managed color or sound |

Native project files remain the complete source for supported editor features. Original Adobe files must be retained independently. Import limits and variant-specific details are in the [README](../README.md); they are not certification of every Premiere version.

## Ordered implementation plan

### M0 — Make timing and deliverables trustworthy (P0)

1. Create a reference corpus with 24/25/30 and 24000/1001, 30000/1001 rates, source offsets, mixed media, speed changes, gaps, overlapping sound, mute/fades, offline sources and a short imported PRPROJ.
2. Introduce explicit rational timebase conversion and frame-aligned edit helpers. Validate source ranges for UI and AI commands; show repairable out-of-range clips rather than silently holding their final frame.
3. Define independent picture opacity and audio gain/fade semantics, retaining migration behavior deliberately.
4. Build an audio graph and offline stereo mix, then mux with picture using a selected, licensed implementation. Evaluate WebCodecs/browser support against a local/native or server encoder option before choosing; do not assume MP4 encoders exist everywhere.
5. Make still/movie exports prepare isolated media at exact requested times. Maintain cancellation, missing-source failure and recovery guarantees.

Acceptance: an exported test movie contains audible expected channels, fades and offsets; decoded A/V sync stays within one frame across a 10-minute reference; frame count/duration are checked at integer and fractional rates; mute and picture opacity are tested separately; missing/corrupt media cannot produce a successful-looking deliverable. Codec fallback is explicit. The 10-minute check is a target, not a claim of current support.

### M1 — Complete the editor's core interaction model (P1)

Add sequence setup, a source monitor, In/Out ranges, insert/overwrite and target tracks. Implement multi-selection, snapping, linked A/V, track locks and ripple/roll/slip/slide on a shared command model. Add full transform controls and useful keyboard navigation before adding more decorative controls.

Acceptance: build a three-minute dialogue edit with B-roll and J/L cuts without manual numeric timing for every operation; picture/sound remain linked through trim/ripple/split; locked tracks never move; undo restores all affected clips atomically. Imported fractional-rate footage retains the expected boundary frames.

### M2 — Add real audio editing and captions (P1)

Generate waveform peaks in a worker with immutable media keys and bounded caches. Add real meters, track/master gain/pan, clipping indicators and editable audio envelopes. Introduce caption segments independent of title clips, SRT/VTT conversion, styling and burn-in/export choices. Add transcription only after caption/time alignment exists.

Acceptance: waveform peaks match a known tone/silence fixture; the meter and rendered output agree; multiple tracks mix without duplicated media-element sound; caption timestamps survive native save/open and export. Correcting a transcript never shifts unrelated edits silently.

### M2a — Make scrubbing audible and evaluate the local edition (P1)

This is an explicit requested workflow, not an existing feature. The current renderer seeks HTML media elements with approximately 25 ms tolerance while paused and 220 ms while playing. Its positive `playbackRate` range is 0.1–16; it has no signed PCM reader or AudioWorklet. It cannot provide convincing reverse scratching simply by changing those tolerances.

1. Build a shared audio clock and a bounded PCM cache keyed by immutable source/range. Generate waveform peaks from that same decoded data. Decode/load work stays away from the real-time processor; evict inactive ranges and expose unavailable/loading states. `decodeAudioData` operates on complete file data, so use it for bounded sources, not as a claim of incremental arbitrary-length decoding.
2. Add an AudioWorklet processor that reads PCM with a signed position/rate, interpolates samples and smooths speed changes. Connect pointer scrubbing and keyboard jog/shuttle to this transport; ramp/crossfade grain boundaries to avoid clicks, preserve source limits and mute at intentional zero speed. Keep normal playback, scratch mode and precise edit seeking distinguishable.
3. Keep pitch-preserving stretch as a separate DSP task with its own quality/latency controls and tests. Do not label a playback-rate/pitch shift as a stretch engine.
4. Measure local browser performance before choosing a desktop architecture: input-to-audio delay, glitch count, memory, source-seek time and export speed on fixed hardware. The local server already removes hosted UI/network latency; it does not remove browser decode/render limitations or AI provider network costs.
5. If benchmarks justify it, package a desktop shell with a narrowly scoped native helper for chunked decode, deterministic encoding, filesystem/media caches and codec handling. Keep the same project/command model and explicit permission boundaries. A Tauri wrapper is a delivery choice, not a speed improvement by itself; installer size, codec licensing, updates and platform-specific tests belong in the feasibility review.

Acceptance targets: audible forward/reverse scrub follows direction immediately, silence boundaries remain silent, rapid reversals do not click or leave ghost playback, and scrubbing does not alter the edit. Measure a target of under 50 ms input-to-audio response on declared reference hardware, report actual values and fallback behavior, and test overlapping clips, sample-rate conversion, source limits, cache misses and audio-device changes. A long-source test must remain within the declared memory budget. Normal export timing and full A/V sync must remain unchanged.

Technical references: [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet), [MDN decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData), and [Tauri native sidecars](https://v2.tauri.app/develop/sidecar/). These APIs supply building blocks; the proposed transport, cache and desktop performance gains are not implemented or measured yet.

### M3 — Build a reusable effect and transition model (P1/P2)

Implement keyframes and evaluation shared by preview/export. Add transform/crop/opacity automation, two-clip dissolves and crossfades with source handles. Expand titles/fonts/styles and reusable graphics. Then add color adjustments, LUTs and scopes under an explicitly defined color pipeline, followed by masking/keying/tracking where justified.

Acceptance: preview and decoded exports match at sampled keyframe/interpolation times; transition handles are validated; nested effect order is deterministic; color tests distinguish display approximation from managed output. Adobe effects remain unsupported until an actual equivalent mapping is tested.

### M4 — Scale media and export jobs (P1/P2)

Separate immutable blobs from metadata/history and migrate existing embedded projects atomically. Prune unused decoders, cache clip order/asset lookup and virtualize long timelines. Add proxies with original/proxy identity and switchable preview resolution. Move deterministic export into a cancellable job architecture with recoverable state when the selected environment supports it.

Acceptance: measure decoder counts and memory after repeated import/delete/undo; reopening a packaged native project restores all sources; proxy toggles preserve frame/source mapping; interrupted export either resumes safely or reports a clean restart requirement. Record browser/hardware and 500/2,000-clip benchmark timings before claiming scale support.

### M5 — Expand interoperability and multiple sequences (P2)

Add multiple-sequence native schema, nested sequences and cycle checks; then multicam sync/angle edits. Export a documented xmeml subset with an explicit loss report. Improve PRPROJ diagnostics by clip location and add verified version fixtures. Complete suite object placement only when a real preview/source adapter is available; distinguish snapshot, editable conversion and live linked playback.

Acceptance: a supported cuts/titles/media-reference timeline round-trips through an independent NLE without changed timings; nested edits update references without cycles; multicam switches retain synchronized audio; each unsupported import item has a repair action. Original source bytes and native save/open remain available.

### M6 — Add AI-assisted and collaborative workflows (P2/P3)

Use transcripts, source ranges, markers and typed timeline operations for AI rough cuts, explanations and caption help. Generated media stays an explicit paid job with recoverable saved bytes. Add review comments/version snapshots before multiuser editing. Specialist monitoring, RAW ingest and plugin ecosystems require their own feasibility/licensing work.

Acceptance: AI plans cite affected clips/ranges, stay within available footage, obey locks/selection and apply in one undo step; source media is sent only for an explicit media-analysis request. Job retry cannot create duplicate billed requests. Reviewers cannot alter source edits accidentally.

## Immediate recommended batch

Start with M0: source/timebase validation and genuine audio-in-video export. Build the PCM/waveform/audio-clock foundation needed by the explicitly requested scrubbing and scratching workflow alongside that work; then complete signed jog/shuttle and measure the local edition as M2a describes. Follow with sequence presets, source viewing, linked clips and snapping. Real waveforms should replace the current decorative trace early so the UI communicates actual information. Advanced effects, multicam and autonomous editing come after those foundations. Cross-app embedded-object work elsewhere in the suite remains in progress; no new Fluximiére placement capability is claimed by this document.
