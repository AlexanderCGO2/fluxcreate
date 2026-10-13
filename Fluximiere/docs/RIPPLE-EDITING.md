# Ripple editing

The timeline **Ripple** button previews and applies one of three operations: delete the selected clip's interval, trim its start to the playhead, or trim its end to the playhead. Trim points align to the sequence's actual frame rate, including fractional rates. This increment shortens clips; extending a ripple trim, slide and linked selection remain future work. Bounded [slip](SLIP-EDITING.md) and [rolling trim](ROLLING-EDITING.md) are separate implemented commands.

Choose the scope before applying:

- **Selected track** removes time only on that track. Other tracks and sequence duration stay unchanged. The dialog explicitly notes that picture and sound may move apart.
- **All picture and sound tracks** removes the same interval everywhere and shortens the sequence. Clips crossing the interval split into source-contiguous surviving pieces; the later piece advances its source offset by the removed source time, including playback speed. Clips beyond the old sequence end are retained and the resulting sequence includes them.

The preview lists every removed, trimmed, split or moved clip. An affected locked clip rejects the entire operation. The current fade model cannot retain a partially cut ramp exactly, so a boundary inside any affected fade also rejects the operation with a specific explanation. Cuts outside fades preserve surviving picture opacity and audio gain, mute, source offsets, speed and original-edge fade envelopes. Sub-frame remnants and a sequence shorter than 0.1 seconds are rejected. Source bytes are never rewritten.

Applying is one validated document change: Undo/Redo restore all affected tracks together, and the normal native-save/autosave/recovery path preserves the result. Closing or cancelling the dialog changes nothing.

Verification: four command tests cover track scope, locks, source-sample equality, fades, fractional-frame trimming, source immutability and sequence bounds. `node scripts/ripple-smoke.mjs` exercises the actual dialog, trimming, Undo/Redo, cancel and reload, then decodes its WebM export. In the generated 1.5× stereo reference, removing 0.6 seconds moved cues to 0.200083 and 0.800083 seconds; the expected times were 0.2 and 0.8. Decoded video changed from red to blue as expected; the 1.2-second sequence decoded to 1.2135 seconds with the Opus tail. All 37 unit/import tests and 16 existing browser checks passed.
