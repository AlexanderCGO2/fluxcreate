# Fluximiére Autoedit

Requested mode: upload existing videos and a soundtrack; an editor agent analyzes the footage and music, then creates an editable cut aligned with the song. This is separate from Music Video Studio's generated footage workflow. Status: implementation and verification in progress; core local editing, Gemini sampled-frame direction, browser checkpoints and editable timeline handoff are built. See [release details and limits](RELEASE-AUTOEDIT-2026-10-17.md).

## User flow

1. Open Autoedit beside Music video. Add multiple source videos and one soundtrack; choose aspect ratio and a short creative brief.
2. Import with visible progress, cancel and retry. Show source duration, resolution, audio presence and any unsupported file clearly. Preserve originals and stable source identities.
3. Analyze the song using the shared music map: energy, onset candidates, tempo suggestions, manual corrections. Offer the same first-three-minutes/fade behavior for longer tracks with explicit duration shown.
4. Analyze footage using bounded low-resolution thumbnails and sampled motion information. The editor identifies useful segments, subjects, action, continuity and poor-quality moments. Describe footage as sampled, not exhaustively understood. Let the user exclude clips and mark preferred ranges.
5. Propose a cut list with source video, source in/out, timeline start/end, beat anchor, scene description and editorial reason. Vary shot duration with the music; respect available footage length and user locks. Keep dialogue/original audio muted by default, with an explicit option to include it.
6. Preview a draft, adjust timing, replace shots and lock selections. Replan only unlocked ranges. Show missing media and weak beat coverage before applying.
7. Apply a validated sequence to Fluximiére in one Undo step. Use original media ranges, one continuous soundtrack, existing transforms and fades. Keep the normal editor and export path available afterward.

## Implementation order

- **A — reliable local assembly:** versioned Autoedit plan and source-range schema, persistent asset storage, music analysis reuse, deterministic beat-aligned draft, editable preview and atomic timeline handoff. Label this baseline automatic sequencing, not AI footage comprehension.
- **B — editor agent:** server-side Gemini through the existing gateway/settings path; verify the deployed model's supported image/video inputs before enabling it. Send bounded thumbnails and source time references, plus the music map and brief. Require structured cut proposals and validate every source interval and timeline boundary. Show model/cost status; never expose provider keys to recipe exports.
- **C — production recovery:** durable job IDs, abort/timeout/retry, partial-result checkpoints, immutable input hashes, stale-board rejection, per-user access controls and idempotent application. User must be able to resume after closing the tab without paying twice for completed stages.
- **D — quality and performance:** proxy media, bounded sampling, local workers, scene-change detection, quality-aware segment scoring, continuity constraints and manual source-audio controls. Evaluate native acceleration only against measured browser limitations.

## Acceptance checks

- Two or more real video fixtures plus rhythmic audio produce a playable editable sequence with complete soundtrack coverage and varied beat-aligned cuts.
- Every source in/out lies within its clip, in/out ordering is valid, and timeline ranges neither overlap nor leave accidental gaps.
- Short footage, portrait/landscape mixing, variable frame rate, rotation, silent music, uncertain beats and unsupported codecs produce clear, recoverable behavior.
- Cancelling analysis leaves the saved project intact. Reload resumes saved work. Replacing a source invalidates stale proposals. Locked shots survive replanning.
- Timeline handoff is one Undo step; original source media remains intact. Export uses actual video ranges, not placeholders.
- Agent output is treated as untrusted: fabricated assets, out-of-range cuts, excessive jobs and stale revisions are rejected before timeline mutation.
- Paid model tests require explicit bounded test spending; local fixtures and mocked structured responses cover routine checks.

## Integration dependencies

Reuse Fluximiére's project/import/export, music timing and persistent workspace infrastructure; FluxLab for the shared gateway/job abstraction; FluxAgents only where it adds durable orchestration. Do not add a separate audio agent. The editor owns editorial choices; validated deterministic tools own timing, trimming and timeline mutation.
