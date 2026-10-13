# Fluximiére

FluxCreate's local video editor. Start the suite from `../FluxCreate`, or run this project's build and serve scripts. The editor opens on `http://localhost:4323`.

The first release includes an editable demo, a media bin, up to 16 visual tracks and 16 audio tracks, local video/image/audio import, source relinking, clip movement and edge trimming, splitting, duplication, timing and speed controls, title text, color cards, volume, opacity, fades, frame seeking, undo/redo and IndexedDB autosave. Change a clip's track in its inspector. Space plays or pauses, S splits the selected clip, arrow keys step frames, and Ctrl/Cmd+Z undoes changes.

Ask Flux uses the suite's existing Fluxini AI connection. Proposed timeline changes are validated, previewed, and applied as one undoable edit. Selected-clip scope and locked clips are enforced. Media bytes, source paths, and unrelated clips are excluded from the AI context. Actual AI availability depends on the configured gateway account.

FluxLab can send a saved video or audio result directly to the editor. Review the playable preview, choose **Add to project**, then click the source in the media bin to place it on the timeline. The transfer carries the saved file bytes, so it does not depend on an expiring generation URL. MP4/WebM and MP3/WAV handoffs support up to 64 MiB with browser-compatible codecs; native projects retain those sources. Video export now includes the stereo sound mix; bounded codec and resource limits are described below.

## Formats

- `.fluximiere`: full native JSON envelope with embedded media and a portable motion scene. The original native timeline is restored when reopened in Fluximiére. Keep native project files as the complete editable source.
- Other FluxCreate native files, Fluxiffects JSON, and `.flux.md`: import the portable active composition. Text, rectangular shapes, media, transforms and timing transfer. Animated properties, effects, non-rectangular shapes, parenting and gradients are simplified with transfer notes.
- `.flux.md` export: shared editable motion layers for Fluxfoto, FluxDesign, Fluxiffects and Fluxini. The built-in color-card atmosphere is simplified to a gradient. Clip-specific audio fades remain in the native project.
- CMX3600 `.edl`: import/export non-drop-frame V-track cuts. The importer creates offline media placeholders to relink. Export includes V1 only, rejects overlapping clips and retiming, and warns about omitted audio, titles and effects. Other EDL event types are rejected rather than guessed. Imported EDL without a `FLUX FPS` comment uses the current sequence's frame rate.
- Premiere `.prproj`: locally reads gzip-compressed and plain XML `PremiereData` projects using their object references. Choose a sequence when more than one is present. Supported video/image/audio cuts retain track order, start/end timing, source in/out, constant speed inferred from those points, locked/muted track state, and original media path hints. Clip media is offline until explicitly relinked. Adjustment layers are omitted with a notice; nested/multicamera sequences and generated graphics require rendered replacements. Premiere's undocumented schema varies across versions, so this is a tested subset, not full native compatibility.
- Premiere-exported Final Cut Pro XML `.xml`: reads legacy `xmeml` sequence tracks, cuts, frame rates including NTSC and mixed source rates, file definitions/references, still images and basic Text generator content as editable titles. Transition sentinel timing is resolved from adjacent transition records, while transition effects are omitted. Modern Final Cut `.fcpxml` is a different format and is rejected with guidance.
- PNG: exact requested frame at sequence resolution, using isolated media and awaited source seeks.
- WebM: precise timestamped VP9/VP8 video and stereo Opus sound using browser encoders. The explicit real-time compatibility option records Canvas plus the same sound mix and requires a visible tab. Picture-only output is a separate explicit choice. Decode failures and missing sound block export rather than silently omitting audio.

Import MP4/WebM, PNG/JPEG and MP3/WAV when their codecs are supported by the browser. Each source file must be under 90 MB; native project import is bounded by the shared 180 MB envelope limit. Media is embedded for portability and autosave, so large projects can exceed browser storage quota. Use native exports as backups.

To bring an edit from Premiere, choose **Open** or drop its `.prproj` onto the Project panel. If that project structure is unsupported, use **File → Export → Final Cut Pro XML** in Premiere, then open the resulting XML. Imported effects, transitions, grading, audio channel routing, variable speed curves and native Premiere/MOGRT titles are not reproduced; transfer notes explain the limitations. Basic legacy XML Text generator content remains editable. Save the original Adobe project for full fidelity.

Choose each offline source in the media bin to relink it. The source's original path appears in its tooltip and stays in the native project, but is never automatically opened or sent to AI. An audio source may be relinked to the soundtrack of a video. Relinking to a shorter source reports that its trims need review. Offline picture clips block video export instead of producing an apparently finished movie with missing footage.

Timeline XML imports accept at most 12 MB of file data and 32 MB of expanded XML, with element/depth limits. External XML entities and DTDs are rejected (the harmless bare `<!DOCTYPE xmeml>` declaration is allowed). Failed imports leave the current project unchanged. This release does not provide multicam editing, live nested sequences, transitions beyond opacity fades, professional audio buses, proxies, color grading, or lossless Adobe project round-tripping. It does not export `.prproj` or Final Cut XML yet.

## Checks

If a saved sequence is invalid or browser storage cannot be read, autosave pauses. The recovery banner preserves the original record, offers its raw data for download when available, and requires an explicit project Open or New before saving resumes. Ordinary media imports and FluxLab handoffs do not clear recovery. Pending project/media reads are invalidated by Cancel, a newer import, New or Undo; a media batch commits only after every source has loaded successfully.

`node ../FluxCreate/scripts/editor-recovery-smoke.mjs` verifies this recovery behavior and delayed-import races in isolated browser sessions. `node ../FluxCreate/scripts/media-handoff-smoke.mjs` checks real saved video/audio transfers, playback previews, exact source bytes and persistence across both motion editors.

`node --test tests/*.test.mjs` checks edits, splits, locks, AI scope, media privacy, format round-trips, Premiere graph/timing parsing, XML titles, bounds and malformed imports. `node scripts/browser-smoke.mjs` uses Edge to verify rendered frames, timeline edits, undo, autosave and playable WebM export. `node scripts/premiere-smoke.mjs` covers the Premiere/XML import, sequence-choice, track-change, relink, title-edit and export-safeguard workflows.

Optional: `node scripts/research-premiere.mjs` downloads public, independently produced Adobe project fixtures into ignored `artifacts/` for additional interoperability checks. Tests skip that external fixture if absent; authored local format fixtures always run. Research references: [Adobe's Premiere tick constant](https://github.com/AdobeDocs/uxp-premiere-pro-samples/blob/main/sample-panels/premiere-api/src/sequence.ts), [Apple's legacy XML elements](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/FinalCutPro_XML/Elements/Elements.html), and [the public PRPROJ reader/sample project](https://github.com/sergeiventurinov/PRPROJ-READER). Native schema observations are based on sample project data, not an Adobe compatibility guarantee.

See [the inspected optimization backlog](docs/OPTIMIZATIONS.md) for completed improvements, remaining priorities and verification.

## Advanced trimming

Use **Ripple** above the timeline to remove an interval with an explicit track scope. **Slip source** in Clip properties changes the source window without moving its timeline slot. **Rolling trim** moves the shared cut into the next adjacent video/audio clip while preserving the pair’s outside endpoints, every other track and sequence length. **Slide clip** moves a selected clip between two adjacent neighbours, keeping its content and duration while trimming the neighbours to fill the space. Numeric/frame/keyboard-slider controls and cancellable pointer preview are available. Rolling and slide require unlocked clips, measured source handles, no same-track overlap and no fades. Each edit is one Undo step. Picture and sound edit independently. See [ripple](docs/RIPPLE-EDITING.md), [slip](docs/SLIP-EDITING.md), [rolling](docs/ROLLING-EDITING.md) and [slide details and checks](docs/SLIDE-EDITING.md).

## Audio editing and export

Drag the timeline ruler to hear sound, enable **Scratch** for signed variable speed, or use J/K/L to reverse, stop and shuttle forward. Speed changes change pitch. Real source waveforms and an output meter are included. Clip volume/mute/fades are independent of picture opacity.

Decoded audio is bounded to 96 MiB, with 64 simultaneous sound clips. Large sources need shorter proxies; surround audio needs a stereo downmix. Precise export uses small audio blocks and a 256 MiB encoded-output budget. The explicit real-time option has a 349-second mix limit.

See [audio architecture, test evidence and remaining limitations](docs/AUDIO-ENGINE.md). `node scripts/audio-smoke.mjs` verifies actual exported stereo and a ten-minute fractional-rate reference. Mediabunny 1.61.3 is used under [MPL-2.0](https://github.com/Vanilagy/mediabunny/blob/v1.61.3/LICENSE).
