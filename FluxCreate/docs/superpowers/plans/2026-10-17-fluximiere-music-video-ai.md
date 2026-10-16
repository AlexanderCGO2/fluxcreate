# Fluximiére Music Video AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a concept, character/scene references and a song into a directed storyboard, generated takes and an editable Fluximiére music video.

**Architecture:** Fluximiére owns the board, music analysis and editing; FluxLab owns provider adapters and retained assets; FluxAgents exposes an explicit staged workflow. Deterministic tools compile timings, cut audio and assemble clips. A durable runner performs approved model operations with persistent ownership, cost and revision records.

**Tech Stack:** Existing React/ES modules, Node 24, Web Audio/workers, Mediabunny export, Vercel AI Gateway for reasoning, direct Pruna predictions for selected media models. Proposed hosted additions: Workflow SDK, transactional Postgres and private object storage; prove build compatibility and configure them before advertising hosted execution.

**Spec:** [Music Video AI product/architecture design](../../MUSIC-VIDEO-AI-PLAN.md).

Status: proposed, not implemented. All paths below are relative to the suite root and are created only where marked Create. Existing source folders are mirrored into `FluxCreateSuite` by the established release script. Execute one verified increment at a time; read-only investigation may overlap, but do not concurrently change shared schemas.

## Global constraints

- Preserve the original song bytes; final playback uses one continuous song at speed 1, with generated video audio muted by default.
- First supported full-song envelope: 1–180 seconds, mono/stereo, 24 fps, one character identity, fixed 16:9 or 9:16 output; no automatic tempo/speed changes.
- Initial ceilings: 60 shots, three retained takes per shot, 64 MiB per generated video, 1 GiB retained project media; expose preflight failures before spending.
- Keep the existing 96 MiB PCM budget; new analysis working memory is capped at 16 MiB and active excerpt working memory at 8 MiB. Decode no generated audio for ordinary muted-shot playback. Account for copies into the audio worklet separately in measured memory results.
- Exactly two video submissions may be active per project; server enforces owner-wide limits as well. Zero automatic creative retries; unknown submission results require reconciliation.
- No provider keys in projects, Markdown, logs, browser persistence or workflow history. Keys resolve from an owner-scoped revocable credential reference.
- No generation without an approved input revision and cost reservation. BYOK first; Stripe remains a separate plan.
- Legacy Fluximiére native v1/v2 stays readable. New music-video/blob-reference projects use v3, with explicit unsupported-version behavior in old readers and declared losses in exports.
- Never place incomplete, undecodable, stale or too-short media as a successful take. Apply timeline changes atomically with one Undo and conflict detection.

## Review focus

1. Silence, free tempo and half/double-tempo ambiguity: analysis offers uncertainty/manual anchors instead of confidently wrong cuts. Tests: task 2.
2. Accepted provider request followed by a network timeout/restart: do not issue a second paid request automatically. Tests: tasks 4 and 6.
3. Fractional song boundaries and returned clips shorter than the request: preserve original audio and reject invalid picture coverage. Tests: tasks 3 and 8.
4. Character/timing edits or another tab changing the project during generation: retain the take as stale without overwriting edits. Tests: tasks 1, 6 and 8.
5. Browser storage pressure, revoked keys, expired URLs or another owner's asset IDs: fail visibly and preserve recoverable state. Tests: tasks 5–7.

## Shared contracts

Define these runtime-validated records in task 1; names are shared by later tasks.

| Record | Required fields / invariants |
|---|---|
| `AssetRef` | `assetId`, SHA256 `hash`, MIME, byte length, role; IDs resolve in the authenticated owner scope, never arbitrary URLs |
| `MusicAnalysis` | `sourceHash`, `revision`, canonical `sampleRate` and `sampleCount`, measured `duration`, tempo candidates, beat/change-point sample indices and confidence, manually approved anchors |
| `MusicVideoPlan` | `format: fluxmusicvideo`, `version: 1`, ID/revision, concept, character/scene asset references, song reference, 24 fps, dimensions, analysis revision, sections/scenes/shots, field locks |
| `Shot` | ID/revision, parent scene/section, integer `[startFrame,endFrame)`, sample anchor IDs, narrative/camera/look/prompt fields, reference IDs, `performance` flag, model profile, selected take ID |
| `AudioSlice` | source hash, integer `startSample/endSample`, `sampleRate`, explicit head/tail padding, shot anchor offset, retained derivative asset/hash |
| `GenerationSpec` | owner/project/shot revisions, provider/model/profile version, prompt, ordered asset hashes, audio slice, provider parameters, connection reference, quote ID, canonical `inputHash` |
| `Take` | prediction ID, input hash, actual frames/fps/duration, retained video asset, usable source interval, alignment evidence, status/review flags, actual usage if available |
| `TimelinePatch` | base project revision, added assets/clips, replacement clip IDs and expected prior hashes, shot lineage map, coverage report; no mutations until validation succeeds |

Browser requests do not supply trusted owner IDs or prices. Server derives ownership and quotes. All revision-changing operations use compare-and-swap semantics; a conflict is HTTP 409 with current revision information.

## Task 1 — Versioned recipe and reference board

**Files:** Create `Fluximiere/src/music-video/model.mjs`, `recipe.mjs`, `MusicVideoMode.jsx`, `music-video.css`; modify `Fluximiere/src/main.jsx`; create `Fluximiere/tests/music-video-model.test.mjs` and `scripts/music-video-board-smoke.mjs`.

**Interfaces:** `validateMusicVideoPlan(raw) -> MusicVideoPlan`; `reviseShot(plan, shotId, patch, expectedRevision) -> MusicVideoPlan`; `invalidateDependents(plan, change) -> {plan,staleTakeIds}`; `encodeRecipe(plan) -> string`; `decodeRecipe(text) -> MusicVideoPlan`.

- [ ] Write failing tests for duplicate IDs, nonfinite times, negative/reversed intervals, over 60 shots, unknown references, stale revision, locked fields and changing only one shot. Assert unrelated shot revisions stay equal and affected selected takes become stale.
- [ ] Run `node --test tests/music-video-model.test.mjs` in Fluximiere; confirm the failures concern missing contracts.
- [ ] Implement strict bounded schemas and the six-stage workspace with manual references/shot editing. The Markdown recipe has one `fluxmusicvideo-json` block; reject multiple blocks and never evaluate its prose as instructions. Save recipe metadata without media bytes or credentials. The early board resolves bounded local references through the current browser asset storage; task 5 replaces that adapter for full production media.
- [ ] Run the tests and `node scripts/music-video-board-smoke.mjs`: keyboard-accessible navigation, reference-role labels, light/dark styling, save/reopen, invalid import leaves the current plan unchanged, cancellation preserves work.
- [ ] Commit the tested recipe/board increment; mark it as planning/animatic capability, not video generation.

## Task 2 — Bounded music analysis with manual correction

**Files:** Create `Fluximiere/src/music-video/analysis.mjs`, `analysis-worker.mjs`, `MusicMap.jsx`; modify `Fluximiere/src/audio.mjs` only to expose bounded read access; create `Fluximiere/tests/music-video-analysis.test.mjs`, `scripts/music-video-analysis-smoke.mjs`.

**Interfaces:** `analyzeMusic({mono,sampleRate,sourceHash}, {signal}) -> MusicAnalysis`; `applyMusicAnchors(analysis, anchors, expectedRevision) -> MusicAnalysis`. `mono` is a bounded resampled analysis proxy; results map back to canonical source samples.

- [ ] Add click-track tests at 90/120/150 BPM, silence, changing tempo and a half-time pattern. Assert duration/sample mapping, finite confidence, zero confident beats for silence and manual anchors overriding only chosen ranges.
- [ ] Run the new test file and confirm RED before implementation.
- [ ] Implement energy/onset/tempo-candidate analysis off the UI thread, with bounded windows rather than full spectrogram retention. Preserve candidate ambiguity; mark section labels as suggested. Display editable anchors over waveform; do not claim existing peak extraction already detects beats.
- [ ] Verify tests and browser analysis cancellation, changed song during analysis, 180-second memory bounds, playback while analyzing, and explicit rejection of unsupported channel count/duration. Record worker latency/memory on declared hardware.
- [ ] Commit the music-map increment.

## Task 3 — Structured director and deterministic audio specialist

**Files:** Create `Fluximiere/src/music-video/timing.mjs`, `audio-slices.mjs`, `animatic.mjs`; create `FluxLab/server/music-video/director.mjs`; modify `FluxLab/server/service.mjs` and `Fluximiere/src/music-video/MusicVideoMode.jsx`; create tests in each app for director/timing/slices and `Fluximiere/scripts/music-video-animatic-smoke.mjs`.

**Interfaces:** `directMusicVideo({brief,analysis,references,locks}, {connection,signal}) -> MusicVideoPlan`; `compileShotTiming(plan,analysis) -> {shots,coverage}`; `cutAudioSlice({channels,sampleRate,sourceHash},range) -> {wav,sliceMetadata}`; `makeAnimatic(plan,frames,song) -> TimelinePatch`.

- [ ] Test malformed director output, fabricated asset IDs, locked-shot changes, section containment and missing music confidence. Test that concatenating adjacent unpadded sample ranges reproduces source PCM exactly; a 7.5-second range at 48 kHz contains 360,000 samples per channel.
- [ ] Run targeted tests, confirm RED, then implement director prompting through the existing connection/routing layer and strict output validation. Pass actual measured features and supplied text; only use image input when the selected reasoning endpoint explicitly supports it. Otherwise use reviewed reference descriptions and disclose that limitation.
- [ ] Compile absolute anchors to shared frame boundaries. Create lossless conditioning WAVs with explicit context/padding. Build an animatic from supplied/manual frames and the uninterrupted master audio. Until task 5, use a bounded ordinary v1/v2 preview project with embedded media and keep the production recipe separate; no v3 payload reaches the old validator. Generation windows target the documented model envelope, independent of the editorial shot length.
- [ ] Verify exact sample extraction, worker cancellation, no mutated master bytes, no cumulative rounding drift, no silent story-plan truncation and complete picture coverage. Confirm a rejected director result cannot mutate the board.
- [ ] Commit this useful end-to-end animatic milestone before any provider automation.

## Task 4 — Pruna adapter and reference-image pilot

**Files:** Create `FluxLab/server/providers/pruna.mjs`, `pruna-capabilities.mjs`, `pruna-pricing.mjs`; create `FluxCreate/server/pruna-connection.mjs` and `shared/PrunaConnection.jsx`; modify `FluxCreate/server/settings.mjs`, `shared/Settings.jsx`, `FluxLab/server/service.mjs`, `index.mjs`; create `FluxLab/tests/pruna.test.mjs` and settings tests.

**Interfaces:** `uploadPrunaAsset(asset,context) -> ProviderAsset`; `startPrunaPrediction(spec,context) -> {predictionId}`; `getPrunaPrediction(id,context) -> ProviderStatus`; `quotePruna(spec,priceSnapshot) -> CostQuote`; `generateOpeningFrame(shot,references,context) -> JobReceipt`. Context resolves a connection reference server-side and carries an abort signal, not a browser key.

- [ ] Create mocked provider contracts for upload/start/status, multi-image starts, incompatible parameters, unsupported audio, reference ceilings, corrupted output and uncertain POST outcomes. Assert Pro and Pro Reference payloads are different, not loosely forwarded user JSON.
- [ ] Run the new tests to confirm RED. Fetch and retain the current official API schema in test fixtures, verifying status/upload paths, authentication, response IDs, retention, cancellation and any idempotency contract. Treat undocumented capabilities as unavailable. Never assume an `Idempotency-Key` header is honored.
- [ ] Implement adapters with server-owned endpoint allowlists, sanitized errors and scoped settings. Add a candidate opening-frame path using `p-image-edit`; provider options remain capability-driven. Existing Gateway text/video tools stay compatible.
- [ ] Run adapter/settings tests. With an explicitly approved small paid-pilot allowance at execution time, test a few character/story/performance shots using the local private suite connection; record actual duration/fps, opening-frame behavior, identity, cost and audio alignment. This pilot does not expose multiuser background generation before task 5. If quality fails, retain manual/no-audio alternatives and update scope honestly.
- [ ] Commit adapter tests and measured capability profile. Do not enable unattended batches until task 6.

## Task 5 — Owner identity, asset persistence and native package migration

**Files:** Create `FluxCreate/server/jobs/owner.mjs`, `credentials.mjs`, `store.mjs`, `assets.mjs`; create `FluxCreate/shared/media-store.mjs`, `media-resolver.mjs`, `media-package.mjs`; modify `Fluximiere/src/model.mjs`, `renderer.mjs`, `audio.mjs`, `video-export.mjs`, `main.jsx`, `FluxCreate/shared/browser.mjs` and native/studio source adapters where their tests require it. Create owner/asset/package/migration tests in FluxCreate and Fluximiere.

**Interfaces:** `requireOwner(req) -> OwnerContext`; `resolveCredential(owner,ref) -> Credential`; `retainAsset(owner,stream,limits) -> AssetRef`; `resolveMedia(ref,{owner,signal}) -> {url,release}`; `migrateProject(raw,assetStore) -> ProjectV3`; `writeMediaPackage(project,assets,sink)` / `readMediaPackage(source) -> {project,assets}`.

- [ ] Test cross-owner read/write, revoked connections, key redaction, missing bytes, quota exhaustion, v1/v2 import including linked clips, stale writes and unresolved asset IDs. Assert old data is retained if migration fails.
- [ ] Confirm RED, then define authenticated owner sessions and encrypted server-side credential references. Retain deployment protection. Use transactional owner-scoped job metadata; use private media storage locally/hosted. Never derive account identity from API keys.
- [ ] Implement immutable media references outside Undo snapshots; resolve only active clips. Migrate embedded sources atomically into v3. Package as a versioned ZIP manifest plus hashed media entries with no compression requirement; select and pin a maintained streaming ZIP implementation after compatibility/license review. Validate entry paths, expansion/byte limits and hashes before import; no arbitrary filesystem paths. Provide a bounded fallback where streaming file save is unavailable.
- [ ] Verify native/portable save-open, original hashes, linked A/V compatibility, cache release, quota failure and offline package reopening. Mark motion/EDL conversions' loss of production lineage explicitly. Test 60-shot projects without duplicating media in every Undo state; report measured memory.
- [ ] Commit persistence/migration before advertising full-song assembly. No unrelated editor schemas change unless required by a tested interchange contract.

## Task 6 — Durable orchestration and bounded spending

**Files:** Create `FluxAgents/server/music-video/workflow.mjs`, `store.mjs`, `budget.mjs`, `runtime.mjs`; create `FluxAgents/workflows/music-video.ts` for the hosted runner; modify `FluxAgents/server/hosted.mjs`, `index.mjs`, `FluxCreate/server/hosted.mjs`, and release/build configuration only as required by the integration proof. Create workflow recovery/ownership/budget tests and `FluxAgents/scripts/music-video-recovery-smoke.mjs`.

**Interfaces:** `startMusicVideoRun(owner,{planId,revision,approvedQuoteId,requestId}) -> RunReceipt`; `advanceRun(runId,event) -> RunSnapshot`; `reserveCost(owner,quote,operationKey) -> Reservation`; `reconcileOperation(operationId) -> Operation`; `cancelRun(owner,runId) -> RunSnapshot`.

- [ ] Test two simultaneous starts, duplicate events, process restart in every state, provider-accepted timeout with missing ID, quota race, withdrawn approval, changed connection, stale shot and cancellation during retention. Assert no automatic second submission after ambiguous acceptance.
- [ ] Confirm RED. Prove Workflow SDK compilation/deployment against a no-charge mock job that sleeps, resumes after deployment and writes owner-scoped state. The current app uses esbuild, so keep required Workflow/Nitro build changes isolated; failure of this proof leaves hosted execution disabled and the local runner available.
- [ ] Implement persistent state transitions from the design, transactional reservations, durable polling, revision checks and exactly two active video submissions per project. Save provider IDs immediately; retrieve/retain results before marking them ready. Separate provider completion, media retention and creative acceptance. Automatic retries apply to known-safe reads/retention, not uncertain paid submissions.
- [ ] Run fault-injection tests and the recovery smoke: close browser, stop/restart worker, revoke key, repeat completion, expire provider URL after retaining bytes. Verify owner-wide reservation accounting, no secret serialization, no duplicated dispatch and no claim of automatic refunds.
- [ ] Commit local and qualified hosted paths; document configured infrastructure and actual execution limits.

## Task 7 — Storyboard approvals, take review and FluxLab/MCP integration

**Files:** Create `Fluximiere/src/music-video/Storyboard.jsx`, `TakeReview.jsx`, `RunProgress.jsx`; modify `MusicVideoMode.jsx`, `FluxLab/src/library.mjs`, `FluxLab/server/mcp.mjs`, `FluxCreate/shared/asset-handoff.mjs`; create suite handoff/MCP tests and `Fluximiere/scripts/music-video-takes-smoke.mjs`.

**Interfaces:** `approveStage(owner,{planId,revision,stage,quoteId}) -> Approval`; `selectTake(plan,shotId,takeId,expectedRevision) -> MusicVideoPlan`; MCP tools `fluxlab_music_video_plan`, `fluxlab_music_video_status`, `fluxlab_music_video_generate_frames`, `fluxlab_music_video_generate_shots`, `fluxlab_music_video_assembly` delegate to the same services.

- [ ] Test exact revision/quote approval, locked identity, manual opening-frame import, image edit returning a new revision, stale take completion and cross-app wrong-project responses. Assert status/plan/export calls cannot initiate media generation implicitly.
- [ ] Confirm RED, then implement storyboard/animatic review and take cards with price, progress, failure/recovery and source lineage. Require selection of a valid ready take; keep originals and alternates. Fluxfoto edits a frame as a new asset; Fluxiffects receives an explicit shot copy for compositing.
- [ ] Implement MCP discovery and typed tools with the same owner, approval and cost checks. Internal calls use shared services; avoid unnecessary MCP network hops inside one backend.
- [ ] Run browser/MCP checks for keyboard use, light/dark, mobile-width fallback, refresh recovery, original-frame retention and no secret leakage. Verify only affected dependent jobs become stale.
- [ ] Commit storyboard/take workflow with truthful progress labels.

## Task 8 — Editable assembly, conflict-safe revisions and export

**Files:** Create `Fluximiere/src/music-video/assemble.mjs`, `apply.mjs`, `quality.mjs`; modify `main.jsx`, `model.mjs` and `video-export.mjs` only through tested interfaces; create `tests/music-video-assembly.test.mjs`, `scripts/music-video-export-smoke.mjs`.

**Interfaces:** `buildMusicVideoPatch(plan,takes,song,baseProject) -> TimelinePatch`; `validateTakeFit(shot,take) -> FitResult`; `applyMusicVideoPatch(project,patch,expectedRevision) -> ProjectV3`; `compareMusicVideoRevisions(previous,next,currentProject) -> {patch,conflicts}`.

- [ ] Test gaps, overlaps, short videos, invalid source ranges, changed aspect ratio, performance alignment uncertainty, existing locked/manual clips and a non-frame-exact song end. Audio must retain all original samples; final picture covers to `ceil(songDuration * 24)` frames, with any sub-frame trailing silence reported rather than a cut song.
- [ ] Confirm RED, then implement one master-song clip plus muted picture clips, per-shot provenance and measurable source ranges. Default to creating a new project. Applying revisions is one atomic Undo operation and rejects stale project versions; no new aligned links to the entire song.
- [ ] Add fit/coverage review and explicit handling of manual edits. Never silently stretch a performance shot, extend a frozen final frame or rewrite source audio to make coverage pass.
- [ ] Run decoded movie tests: synthetic visual flashes/stereo impulses aligned at start, middle and end of a 180-second fixture; all offsets within one 24 fps frame; no extra song copies; correct frame coverage; original bytes preserved; save/open, Undo/Redo and cancelled export. Test failed provider output cannot be exported as a completed cut.
- [ ] Commit the editable end-to-end music-video milestone and update the app's feature-gap documentation with its measured limits.

## Task 9 — Release qualification and remaining scope

**Files:** Modify `FluxCreate/docs/FEATURE-GAPS.md`, `Fluximiere/docs/FEATURE-GAPS.md`, `FluxLab/README.md`; create a dated release record and a reproducible music-video fixture/evidence report; modify hosted smoke checks to cover the new mode.

- [ ] Run the app unit/browser tests for all affected workflows, strict type checks and the established whole-suite check/build scripts. Baseline before this feature is 680 combined tests; use the actual new count rather than copying it.
- [ ] Run hosted ownership, credential, approval, quote and recovery checks against the exact assembled build. Default fixtures use mocks and make no paid provider calls.
- [ ] Complete the budgeted real pilot from task 4 and a full-song acceptance review before promoting the workflow as production-ready. Report identity drift, rhythm/lip-sync failures, costs and runtime honestly. Quality failure may block performance mode while narrative editing remains available.
- [ ] Commit/push and deploy under the existing release authorization only after passed gates; verify authenticated production and exact bundles. Keep unsupported long songs, codecs, advanced transitions and lyric/singing capabilities explicitly labelled.
- [ ] Record closed gaps, operational dependencies, upgrade/rollback behavior and remaining work. Do not describe this feature as closing every Premiere or suite gap.

## Execution order

Tasks 1–3 produce the first reviewable animatic. Task 4 qualifies the provider. Tasks 5–6 are production prerequisites. Tasks 7–8 complete the experience; task 9 qualifies/releases it. Shared contracts and migrations remain sequential. Independent tests/UI/provider work may be delegated after its contracts are frozen, consistent with the existing collaboration preference.

No implementation approval or paid generation is implied by this document's status; it is the requested plan for review.
