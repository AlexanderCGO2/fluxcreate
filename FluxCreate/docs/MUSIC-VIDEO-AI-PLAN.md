# Fluximiére Music Video AI — product and architecture plan

Status: proposed design, 17 October 2026. Planning only; no model generations, infrastructure provisioning or product implementation have been performed for this feature. This is a new addition to the editor gap program, not a claim that its existing gaps are closed.

## Intended result

Give Fluximiére a Music Video mode that takes a video concept, a character image, scene reference images and a song. One Gemini director analyzes the song and visual references, develops the treatment and scene/sub-scene plan, and calls tools to measure beats, cut exact audio excerpts, request opening frames and Pruna takes, and preview the edit. There is no separate audio agent. Approved takes become a normal, editable Fluximiére timeline.

Success means a coherent, music-led video that the person can revise one shot at a time, with retained source media, visible costs, reliable recovery and no loss of manual edits. Character consistency and musical performance are quality targets to assess, not guarantees made from a model name.

Assumptions: keep the supplied song intact; default to a narrative/performance hybrid; make lyrics optional user input; use the latest stable, suitable Gemini model through the existing Vercel AI Gateway connection for direction and a separate server-side Pruna connection for Pruna models. Singing/lip-sync requires a capability experiment before it is offered as a supported outcome. The first full-song target is up to 180 seconds, mono/stereo, 24 fps, one character identity and one chosen aspect ratio; longer songs and multiple interacting characters follow qualification.

## Gemini director and model policy

User refinement, 17 October: one Gemini director owns the creative decisions and directly invokes media tools; no audio-agent delegation. Fast sections should support **2–5 cuts per 10 seconds**, aligned to measured beats or deliberately chosen subdivisions.

The current default is **Gemini 4 Argon**, Google model ID `gemini-4-argon`, Gateway ID `google/gemini-4-argon`. Google's model page lists audio/image/video input, function calling and structured output support; Vercel documents the Gateway ID and tool calling. Verify the actual Gateway audio-plus-tool request path and account access in integration tests; model capability does not prove that the existing FluxLab text request shape forwards those inputs. [Google model](https://ai.google.dev/gemini-api/docs/models/gemini-4-argon), [Gateway model](https://vercel.com/ai-gateway/models/gemini-4-argon).

Resolve “latest” when starting a new project against the current stable Gemini catalog and required capabilities, then pin the resolved model/profile for that production revision. Show the choice in Director settings. Never switch an active project to a new model silently. If the latest model cannot be used through the configured connection, explain the missing capability and require an explicit model/connection choice; do not silently substitute Claude, Flash or another provider. Do not label a text-only fallback as listening to the song.

Gemini receives the actual song or bounded timestamped excerpts, reference images and measured beat information. It interprets mood, structure and visual intent; deterministic tools supply exact timing. Google's general audio guide supports music/emotion and timestamped-segment analysis, but this does not make model-produced timestamps sample-accurate. [Audio understanding](https://ai.google.dev/gemini-api/docs/audio).

## Model research and routing

Verified against public provider documentation on 17 October 2026; account access and real output quality have not been tested.

| Model | Documented distinction | Proposed role |
|---|---|---|
| `p-video-2-pro` | First/last-frame conditioning; no audio input; 5–15 seconds, 480p/768p, 24 fps; cost/speed/quality modes | Narrative and atmosphere shots using approved opening frames |
| `p-video-2-pro-reference` | Image/video/audio references; optional soft opening/closing frames; 5–15 seconds, 480p/768p; cost/speed modes | Preferred candidate for character continuity and music-conditioned performance |
| `p-video-2` | Audio conditioning with a different capability and quality profile | Optional explicitly chosen alternative after evaluation |

Sources: [Pro](https://docs.api.pruna.ai/guides/models/p-video-2-pro), [Pro Reference](https://docs.api.pruna.ai/guides/models/p-video-2-pro-reference), [P-Video-2](https://docs.api.pruna.ai/guides/models/p-video-2).

For Pro Reference, reference counts and duration must be validated before submission: at most nine images including opening/closing frames, and up to three audio inputs totalling 15 seconds. `keep_audio` requires exactly one audio input; nearby audio duration can affect output length. Treat reference keyframes as guidance, not exact pixel locks. Source: [reference input contract](https://docs.api.pruna.ai/guides/models/p-video-2-pro-reference).

Use `p-image-edit` as the initial start-frame candidate: it supports 1–5 reference images. Compose character, location and look into a single frame, then review identity and framing. Keep the model replaceable if another supported reference-image model performs better. [Image-edit documentation](https://docs.api.pruna.ai/guides/models/p-image-edit).

The existing FluxLab video adapter cannot deliver this by changing its model string: it only accepts text, duration and aspect ratio. Add explicit Pruna adapters and capability records. Gateway support for the required Pruna inputs has not been established; do not claim that a Gateway key alone enables them. Never silently switch models/providers or drop unsupported references.

## The experience

Add **Music Video** beside ordinary editing in Fluximiére, using the suite's light/dark surfaces, typography, rounded cards and restrained accent colors. Keep a persistent preview, song waveform and progress rail: Brief → Music → Direction → Storyboard → Takes → Edit. Show useful creative controls; hide provider plumbing in expandable details.

1. **Brief.** Enter concept, visual style, pacing, target aspect ratio and budget cap. Upload the song, one required character reference, optional additional views and scene images. Assign each image a role and an editable description. Uploading assets is not an instruction to start paid generation.
2. **Music map.** Show waveform, candidate beats, energy changes, silence and section boundaries. Let the person correct tempo, tap beats, rename sections and move boundaries. Labels such as verse/chorus are interpretations with confidence, not measured facts. No lyrics are invented when none were supplied or transcribed.
3. **Director's treatment.** Gemini listens to the song, inspects the references and presents an emotional arc, character/look guide, recurring motifs and scene list. Every scene explains its relationship to the song. Expand it into sub-scenes/shot cards with timing, action, camera, references, continuity and transition intent. Lock any field or shot before asking for alternatives.
4. **Storyboard.** Generate one opening frame per approved shot by default. Offer additional variants on request. Play a still-image animatic against the original song before spending on video. Revise only selected shots; changing the character reference marks dependent frames/takes stale.
5. **Takes.** Show quoted cost, generation status, reference frame, resulting video and reasons for any review flag. Generate a small pilot first, then the approved batch. Choose a take, keep alternates, regenerate one shot or reuse an accepted take. A cheaper mode is an explicit option, not an undocumented fallback.
6. **Editable cut.** Build a new sequence/project from selected takes and the original song. Keep stable shot-to-clip relationships. Existing sequences are never replaced without an explicit apply action. Subsequent AI revisions show a diff; manually changed or locked clips are conflicts to resolve, not overwritten content.

## Direction and sub-scenes

The hierarchy is **Music video → musical section → story scene → shot/sub-scene → take**. A section describes musical timing; a scene describes narrative purpose. Multiple scenes may occupy one section. For the first implementation every scene lies within one section; a continuing story uses related scenes on either side of a section boundary.

Each shot records: stable ID; scene/section IDs; absolute start/end frames; musical anchor; cut-density target and beat-snap error; generation-unit ID and source interval; story purpose; character/location reference IDs; action; framing; camera movement; lighting/palette; opening-frame prompt; motion prompt; transition intent; continuity notes; model choice; status; selected take; estimated cost. References, prompts and music analysis have revision IDs. Director output must validate against this schema before it can change the board.

Illustrative passage, not an analysis of an uploaded song:

| Song time | Scene | Sub-scene | Direction |
|---|---|---|---|
| 00:00–00:08 | Arrival | 01A | Wide empty station; slow approach; establish amber lighting |
| 00:08–00:16 | Arrival | 01B | Same character in close-up; turn on the musical phrase |
| 00:16–00:24 | Pursuit | 02A | Tracking movement as energy rises; retain costume and screen direction |
| 00:24–00:30 | Pursuit | 02B | Detail and reaction inserts from approved takes; cut on selected accents |

Shots are editorial decisions, not necessarily one provider call each. Short cuts may use different ranges of a suitable approved take. Otherwise generate enough footage for the model minimum and retain the actual cost. Do not ask a model to produce multiple precise internal cuts and assume it will obey them.

## One director with media tools

Gemini is the only reasoning agent in this mode. Analysis, cutting, image/video requests and assembly are typed tools/services, not additional autonomous agents.

| Director tool | Result | Execution |
|---|---|---|
| `analyze_music` / `get_beat_grid` | Energy, beat candidates, confidence and exact sample anchors | Bounded DSP worker |
| `set_shot_boundaries` | Validated beat-aligned cut plan and density report | Deterministic timeline compiler |
| `cut_audio` / `cut_audio_batch` | WAV excerpts with exact source/shot mapping | FFmpeg worker or equivalent bounded PCM slicer |
| `generate_start_frames` | Opening-frame candidates | FluxLab reference-image adapter |
| `generate_video_takes` | Pruna jobs within approved allowance | FluxLab durable media service |
| `preview_edit` / `assemble_edit` | Animatic/preview or a validated editable timeline patch | Fluximiére assembly service |

The director chooses what to cut and why, then receives tool results and can revise the edit. It calls audio tools directly without a second model conversation. Existing stage approvals authorize the bounded work; individual safe cut calls do not require repeated confirmation. Paginate structured shot plans into at most 20 shots per response with an 8,192-output-token cap; validate each page and reject truncated output. Set a maximum of 12 model/tool rounds and 128 tool invocations per direction pass; batch cutting accepts at most 120 validated ranges. Exceeding these bounds saves progress for explicit continuation instead of looping indefinitely. Generation remains bound by the approved cost/revision.

FFmpeg runs in the local Node media worker or a provisioned hosted media worker. Do not assume an FFmpeg executable exists in the browser or ordinary Vercel function. Tools take owner-scoped asset IDs and numeric ranges; a fixed worker constructs arguments and invokes the binary without a shell. Gemini is not given an arbitrary command terminal. The browser implementation can use the existing bounded PCM path with the same contract.

Canonical decoding produces a retained PCM source with sample rate, sample count and hash. Both backends cut that same source, so switching browser/FFmpeg decoders cannot shift an MP3 boundary. FFmpeg's `atrim` sample options and `asetpts` support exact sample selection and rebased timestamps; use float PCM WAV and verify sample count. [FFmpeg filters](https://ffmpeg.org/ffmpeg-filters.html#atrim).

FluxAgents exposes the director/tool workflow as a template. FluxLab owns requests and assets; Fluximiére owns the board and timeline. Human review remains available for continuity, identity and performance quality.

## Beat-aligned fast editing

Cut density is a section-level creative target. Fast passages target 2–5 cuts per 10 seconds, roughly a change every 2–5 seconds, while an intro or emotional hold can be slower. Gemini chooses the beat anchors and varies rhythm with the song; it does not force a uniform interval or cut every beat.

Measure density from internal picture transitions in non-overlapping, section-relative 10-second windows using `[start,end)`; exclude the project's opening boundary. Report partial windows separately. Use this as a pacing target, not an inflexible quota when a musical phrase or manual lock conflicts. Each cut records its nearest chosen beat/subdivision and frame-rounding error. At 24 fps, snapping to the nearest frame must be within half a frame of that anchor; a deliberate off-beat cut carries a visible reason. Low-confidence analysis asks for manual anchors instead of claiming exact beat alignment.

Example at 120 BPM: boundaries at 0, 2, 4, 6, 8 and 10 seconds make five two-second shots with four internal cuts in the first 10-second window. Closer or varied beat choices can produce five internal cuts without arbitrary off-beat timestamps.

Separate **editorial shots** from **generation units**. Pruna's minimum generation length must not become a minimum timeline shot length. A two-second shot may select a valid two-second interval from a longer take. An alternate camera view normally needs another generation; trimming one clip does not create a new angle. Reuse only when visually intentional, and keep performance footage tied to its correct song interval. Multiple shots may reference one generation unit, with explicit source offsets and dependency tracking.

Raise the initial board ceiling to **120 editorial shots**, enough for a 180-second edit at the requested pace. Keep three takes per generation unit, 64 MiB per video and the 1 GiB project limit; budget/storage preflight can require reducing variants. Quote generated seconds, including unused handles/minimum durations, rather than song length alone. For example, 90 distinct two-second shots each requiring a five-second generation request mean 450 requested video seconds before retries, although the edit is only 180 seconds. The earlier 24-take cost example is not a quote for that dense edit.

## Music analysis and exact cuts

Reuse the existing AudioStore for bounded decoding. Analyze a bounded mono proxy in a worker: energy envelope, onset candidates, tempo candidates and change points. Preserve original stereo samples for excerpt creation. Keep one canonical decoded sample rate/count, source hash and analysis revision. Low-confidence/free-tempo music supports manually marked anchors; no forced constant BPM grid.

The director chooses boundaries from measured anchors or explicit manual positions. A compiler resolves them to absolute timeline frame indices. Derive each boundary once from absolute time, not by summing rounded shot lengths. Store the original sample anchors alongside frame boundaries. Shared boundaries use the same frame index so picture has no accidental gaps or overlaps.

The director calls the cutting tool with validated integer sample ranges. Excerpts are lossless conditioning derivatives; preserve channels and gain. Store pre/post context and any edge padding explicitly. Do not fade or normalize the master song. Any conditioning-only edge smoothing must be recorded and must never alter final playback.

Plan generation windows separately from the edit, within the verified model duration limits; 6–12 seconds is a useful generation range, never a minimum editorial shot length. Short editorial shots can have a larger conditioning window; long scenes split into several shots. A requested duration is not proof of returned duration: inspect decoded output frames, timestamps and usable source range. If output is short, fail that take's fit check rather than silently freezing a frame or changing song speed. For performance shots, approve alignment only after comparing the result to the intended excerpt; conditioning alone does not establish lip-sync accuracy.

Final A1 contains one continuous original-song clip at speed 1. Generated clip audio is muted by default, including when it was useful for conditioning. Optional sound design belongs on separately approved tracks. This prevents doubled music and audible seams between model outputs. A music video does not link every short picture clip to the entire song using the recently added aligned A/V pair feature.

## Existing foundations and required changes

Inspected local files: `Fluximiere/src/audio.mjs`, `model.mjs`, `main.jsx`, `video-export.mjs`; `FluxLab/server/video.mjs`, `service.mjs`, `video-media.mjs`; `FluxLab/src/video.mjs`; `FluxAgents/server/store.mjs`, `engine.mjs`, `hosted.mjs`; `FluxCreate/server/settings.mjs`.

- AudioStore already decodes mono/stereo, measures sources and supports waveform work; its PCM budget is 96 MiB. A 180-second stereo 48 kHz float source alone needs about 66 MiB. Analysis and excerpt buffers must be bounded independently; do not copy the full stereo song into every worker or keep every excerpt decoded at once.
- Fluximiére validates native v1/v2 media as embedded data URLs and has no music-video provenance or blob-reference schema. A multi-take song must not multiply large base64 strings through Undo. Add an asset-resolver/package migration before enabling full-song production.
- FluxLab already verifies downloaded videos with a 64 MiB limit, supports recovery tickets and has MCP entry points. Its current image editing takes one source image; multi-reference start-frame generation is new work.
- FluxAgents has a local SQLite runner. Hosted service explicitly disables live runs because durable server storage is missing. That remains a real prerequisite, not something a new screen fixes.
- Personal Gateway credentials currently arrive via an encrypted request cookie. Background jobs need durable owner identity and a revocable credential reference; a cookie/key fingerprint is not a user account.

## Architecture and reliability

Recommended approach: a guided workflow embedded in Fluximiére, backed by shared FluxLab services and a FluxAgents template. A browser-only chain is a useful no-charge animatic prototype but cannot promise execution after closing the tab. A general-purpose agent swarm adds variability and expense before solving timing and persistence. The guided approach makes the creative stages editable while tools enforce timing and spending.

Use Vercel Workflow as the preferred hosted runner candidate, behind a small execution interface; prove integration with the existing build first. Its documented framework integration requires compilation support, so adding a dependency to the current esbuild output alone is insufficient. Keep the existing local runner path. For hosted records, propose transactional Postgres and private object storage; choose/configure actual provisioned resources in the implementation infrastructure task, not during this planning work. [Workflow integration](https://workflow-sdk.dev/docs/getting-started/express), [private Blob access](https://vercel.com/docs/vercel-blob/using-blob-sdk).

Persist project revisions, stage results, provider prediction IDs, cost reservations and asset hashes. Every job binds to owner, project revision, shot revision, provider/model, connection reference and input hash. Durable orchestration and provider idempotency are different requirements.

State path: `planned → awaiting-approval → queued → submitting → running → retaining → validating → ready`. Terminal/exception states include `failed`, `cancelled`, `uncertain`, `needs-review` and `stale`. Persist intent before a paid call. If the process dies after submission but before obtaining a provider ID, enter `uncertain`; do not automatically submit again unless provider-supported idempotency is verified. Poll an existing ID with bounded backoff. Retention retries never regenerate a take. Cancellation stops new work but does not promise refunds for accepted work.

Retain completed bytes in owned storage promptly; an expiring provider URL is not the asset. Use hashes, MIME/decode checks, bounded fetches and authenticated ownership checks. Stage outputs contain asset IDs, never provider credentials. App-level owner authorization is required for every asset/job route; Vercel deployment authentication alone is not tenant isolation. Browser connection expiry, revoked keys and two-tab edits must produce explicit resumable states.

A scoped mutation invalidates only its dependents. When several editorial shots share one generation unit, changing that unit invalidates its dependent shots without changing unrelated manual edits. Camera change → that shot's frame/takes; boundary change → that shot's excerpts/takes; character change → all shots referencing that character. Old media stays available as an alternate. A late completion from an obsolete revision is retained but cannot replace a current selected take automatically.

## Interchange and suite integration

Create a versioned music-video recipe with validated JSON as the canonical data. An exported `.fluxmusicvideo.md` contains a readable treatment and exactly one versioned JSON block for tools. It references assets by ID/hash; it does not embed credentials, expiring URLs or executable instructions. A packaged project contains manifest plus required bytes; Markdown alone is not an offline media archive.

Fluxfoto can edit an opening frame as a new revision; Fluxiffects can receive an approved shot for compositing; FluxLab stores inputs, frames, takes and lineage. All return routes preserve owner/project/shot/revision identity. Expose plan/status/frame/shot/assembly operations through MCP using the same service authorization and budget checks as the UI. Only explicitly approved generation tools may spend.

## Budget and business rules

Quote images, output duration, reference inputs, reasoning, storage/transfer and an explicit allowance for variants. Reserve the worst allowed batch cost transactionally before parallel dispatch. Show reserved, spent and remaining separately. Default to two concurrent video submissions per project; cap automatic creative retries at zero. More takes require remaining approved allowance or a revised quote.

For a planning example, assume 24 requested eight-second Pro Reference takes, each with three image references and eight seconds of reference audio, plus 24 start images. At the published 768p rates, output costs $0.025/s in cost mode or $0.035/s in speed mode; image references cost $0.005/$0.01 each and audio references $0.0015/$0.0025 per second. Start images are listed at $0.01 each. That gives about **$5.69 cost mode or $8.16 speed mode**, excluding reasoning, storage, variants and failures. This is request-based arithmetic, not a live quote: billing uses measured output/reference usage. [Video pricing](https://docs.api.pruna.ai/guides/models/p-video-2-pro-reference), [image pricing](https://docs.api.pruna.ai/guides/models/p-image-edit).

Use current list rates, not the Pro promotion documented as ending on 13 October. Refresh server-side capability/pricing snapshots before quoting and refuse an expired quote after a material price change. Start in BYOK mode. Future hosted credits follow [STRIPE-CREDITS-PLAN.md](STRIPE-CREDITS-PLAN.md): target 50% contribution margin after variable costs, not a 50% markup. No Stripe activation is part of this feature plan.

## Delivery sequence and definition of done

1. **Contracts and animatic:** input/reference board, bounded music analysis, corrected anchors, Gemini direction with direct cut tools, fast beat-aligned shot planning, manual storyboard frames and editable still-image cut. Useful before video automation exists.
2. **Provider pilot:** Pruna settings/adapters, reference-aware start images, measured audio excerpts, one shot through generation/retention/validation. Start with a 20–30 second passage and a few representative shots.
3. **Reliable production:** owner-scoped durable runs, asset packages/resolver, budget reservations, restart/uncertain handling, dependency revisions. Hosted batch controls remain unavailable until these pass.
4. **Full editable music video:** approved bounded batches, take review, whole-song assembly, safe revision application, native package round-trip and measured export sync. Test the declared 180-second envelope.
5. **Later expansion:** longer songs with chunked decode/proxies, richer character sets, optional lyrics alignment, qualified singing/dance modes, alternate aspect-ratio versions, transitions and broader export formats.

Acceptance includes: no separate audio-agent calls; the selected Gemini model receives actual audio and tool results; beat-aligned 2–5-cut/10-second passages including two-second shots; exact tool sample counts; no seams/doubled song; continuous frame coverage; decoded export A/V offset within one 24 fps frame; immutable original audio; character/scene locks obeyed; failed/short takes never look successful; selected-shot regeneration leaves unrelated shots/manual edits untouched; refresh/restart resumes known jobs; ambiguous submissions never auto-repeat; expired URLs recover from retained bytes; one Undo reverses an assembly apply; package reopening works without provider URLs; no cross-owner access; no batch exceeds its approved reservation.

Use synthetic click tracks, stereo impulses, silence, variable-tempo fixtures, corrupted/truncated video and mocked provider failures for automated tests. Creative identity, lyric interpretation and performance timing additionally require human review of a small real generation pilot. No paid quality claim can be established by mocks.

Detailed interfaces, tasks and verification: [implementation plan](superpowers/plans/2026-10-17-fluximiere-music-video-ai.md).
