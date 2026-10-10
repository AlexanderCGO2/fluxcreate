# Cloudflare fallback and music implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add an isolated Cloudflare connection, eligible Vercel-to-Cloudflare text fallback and ElevenLabs Music v2 in FluxLab.

**Architecture:** Keep the Vercel deployment and current primary connection. Establish one credential/routing contract before splitting text adapters and music UI into parallel workstreams. Preserve existing editor validation and reviewed audio handoff.

**Tech Stack:** Existing Node 24, React, native fetch, encrypted HTTP-only connection cookies, IndexedDB, official MCP SDK and current test/browser harnesses; no new dependency required for HTTP transport.

**Spec:** [Research and product design](../../CLOUDFLARE-AI-GATEWAY.md).

## Global constraints

- Existing Vercel personal cookies remain readable; no implicit personal-to-workspace fallback.
- Music v1: `elevenlabs/music-v2`, 3–60 seconds, one MP3 result, explicit instrumental flag.
- At most two text attempts; cancellation, invalid credentials, uncertain completion and validation failures do not automatically retry.
- Credentials never enter project files, recipes, handoffs, browser storage values readable by scripts or logs.
- Simulated verification incurs no model charges; actual-provider activation remains separately recorded.
- Do not enable hosted live Agents or claim durable remote jobs as part of this increment.

## Review focus

1. Removing/expiring a personal connection mid-request must not select workspace credentials (Task 1).
2. Providers returning partial output then failing must not generate twice (Task 2).
3. Same model names across gateways must not hide actual routing or cost provenance (Tasks 2–3).
4. Remote audio URLs must not permit private-network fetching, credential forwarding or redirect escapes (Task 3).
5. Reload, storage failure and connection changes must preserve uncertain paid submissions (Tasks 3–4).

### Task 1: Independent Cloudflare settings and immutable request context

Create `FluxCreate/server/cloudflare-connection.mjs`, `FluxCreate/shared/CloudflareConnection.jsx` and `FluxCreate/tests/cloudflare-settings.test.mjs`. Modify `server/settings.mjs`, `shared/Settings.jsx` and settings styling; update request resolution in local/hosted entrypoints without losing current cookie semantics.

Interface: `resolveCloudflareConnection(req, options)` returns `undefined`, a frozen `{mode:'personal'|'suite', accountId, gatewayId, apiToken, scopeId, available:true, allowTextFallback, allowMusic}` or frozen invalid status. `publicCloudflareStatus(context)` never returns a token. Preserve a provider-specific scope fingerprint. Validate a 32-hex account ID and bounded gateway ID; construct fixed Cloudflare hosts server-side.

- [x] Write failing tests for old Vercel cookie roundtrip, separate save/remove, expired/corrupt Cloudflare cookie, wrong origin, token omission in status, personal connection isolation and in-flight immutable credentials.
- [x] Run `node --test tests/cloudflare-settings.test.mjs` from FluxCreate; confirm the new contract fails before implementation.
- [x] Implement independent settings endpoints and UI; show configured versus verified distinctly. A non-inference token check must not claim credits/model entitlement are verified.
- [x] Pass the new tests, current settings tests and browser keyboard/save/remove/reload checks; include the independently usable settings slice in the verified integration release.

### Task 2: Shared text routing with truthful fallback

Create `FluxCreate/server/ai-routing.mjs` and `FluxCreate/tests/ai-routing.test.mjs`. Modify `FluxCreate/server/ai.mjs`, `Haidini/server/planner.mjs`, `Fluxiffects/server/ai-provider.mjs` and FluxLab text generation in `server/service.mjs`.

Interface: `runRoutedText({primary, fallback, policy, connection, signal})` accepts injected attempt functions returning `{value, provider, model, gateway, usage}`. Return that result plus bounded attempt metadata. Normalize upstream errors into `{status, outcome:'rejected'|'uncertain', partialOutput}` before choosing a retry. Retain every app's final schema and edit validation. Avoid modifying SDK-wide fetch behavior or retrying the whole editor command pipeline.

- [x] Add failing tests: primary success uses one call; explicit eligible rate-limit rejection uses one fallback; disabled policy, 401/402/403, cancellation, timeout, partial result and malformed command output use none. Ensure changed personal credentials cannot select workspace billing.
- [x] Run `node --test tests/ai-routing.test.mjs`; confirm failure before implementation.
- [x] Implement the fixed account REST text adapter and approved-model mapping; pass the same overall deadline and cancel signal to both attempts. Report actual fallback gateway/model visibly.
- [x] Pass routing tests and each affected planner's existing schema/scope/lock/stale checks. Mock Cloudflare output for all planner adapters; commit only after all use the same policy.

### Task 3: Bounded music service and MCP contract

Create `FluxLab/server/music.mjs`, `FluxLab/tests/music.test.mjs`; modify `server/service.mjs`, `server/index.mjs`, `server/mcp.mjs` and suite hosted dispatch as needed. Reuse hardened remote-media fetching only after reviewing audio compatibility.

Interface: `createMusicService(dependencies).generateMusic({model,prompt,durationSeconds,instrumental},{connection,signal,requestId})` returns the existing `kind:'audio'` artifact with music/gateway provenance and verified MP3 bytes. Use the documented `/ai/run` envelope and `cf-aig-gateway-id`; reject unknown fields, prompts over 2,000 characters and lengths outside 3–60 seconds before a provider call. Request one MP3 format supported by the documented model. Bound downloaded bytes to just under 3 MiB (to fit the hosted 4 MiB base64 JSON limit) and decoded duration to 65 seconds. Audio decoder/frame tests remain independent of returned MIME labels.

- [x] Write failing tests for exact request envelope, token isolation, unsupported settings, missing/failed result, private or redirected media URL, bad MP3, oversized response and cancellation after accepted submission. Repeated request ID must not silently resubmit an uncertain request.
- [x] Run `node --test tests/music.test.mjs`; confirm failure before implementation.
- [x] Implement the service, explicit music catalog capability and `fluxlab_generate_music` tool. Use a separate voice-free schema; music selection must not depend on a healthy Vercel catalog request.
- [x] Pass service/MCP tests and speech/video regressions; label request duplicate protection by its real persistence scope. Include the service slice in the verified integration release without claiming durable cloud execution.

### Task 4: Music UI, storage, recipes and audio handoff

Create `FluxLab/src/MusicControls.jsx`, `FluxLab/src/music-jobs.mjs`, `FluxLab/scripts/music-browser-smoke.mjs`; modify `src/main.jsx`, `src/client.mjs`, recipe/draft validation and library handling where required. Extend browser persistence tests for any schema change.

Interface: UI submits Task 3's validated fields; record `{requestId,connectionScope,model,prompt,durationSeconds,instrumental,state}` before submission. No secret in this record. States: `prepared`, `submitting`, `completed`, `uncertain`, `failed`; reload of an interrupted submission becomes `uncertain`, never an automatic new POST.

- [x] Create failing browser cases for connection unavailable, bounded controls and price estimate, explicit Generate, uncertain reload, quota failure before submission, completion decode/save and cross-tab duplicate submission. Assert zero POSTs when restoring a draft or loading a recipe.
- [x] Implement controls and request-state UI, decoded preview, original download and separate library save. Make instrumental-off copy say vocals are allowed, not guaranteed.
- [x] Verify real audio bytes reach Fluximiére and Fluxiffects, preserve existing content and undo once. Verify old speech recipes/drafts remain readable.
- [x] Pass browser and library/recipe/draft tests, then include the complete studio in the verified integration release.

### Task 5: Account activation and protected release

Modify hosting/setup docs, model capability notes and the current gap index. Use the existing source-to-release assembly.

- [ ] Install the scoped account token through secure settings/server secrets and verify the selected `default` gateway and billing mode. Do not infer account access from the dashboard URL.
- [ ] Record a short actual music generation, decoded duration/audio playback, actual billing metadata and both editor handoffs before calling provider output verified. Use mocked failures to test fallback; do not deliberately incur duplicated paid jobs.
- [ ] Run all affected app/MCP checks, combined builds/matrix and hosted handoff checks. Commit/push/deploy under existing authorization once tests pass; keep authentication enabled.
- [ ] Match deployed bundles and verify settings/MCP without paid production test repetition. Update the release record and preserve remaining long-job recovery and broader media-fallback gaps.

## Current status

Tasks 1–4 are implemented and verified with injected providers. Release verification passes 586 tests across all ten packages, nine browser builds plus hosted API/MCP, 36 hosted suite checks, 11 music recovery/browser groups, 10 actual-audio handoff checks, 12 existing studio groups, eight recipe groups, nine draft groups, settings browser checks and six hosted MCP checks. No paid model requests were made.

Implementation details: music draft saving is explicit; starting a request atomically persists the exact draft plus submitting state. There is no unused prepared state. Reload displays persisted submitting as uncertain and never resubmits. Its ledger is process-local (24 hours, 512 records, 32 MiB cached results), not a durable cloud queue. Storage failure after completion preserves the in-memory audio and warns before leaving. An independent review reproduced and verified the fix for that recovery edge case.

One integration commit includes settings, router, service and UI so interfaces are released together. Account-token setup, model entitlement/credits, paid generation/playback and actual structured-output compatibility remain open. Text fallback requires explicit same-ID deployment approval and per-connection consent; no model is approved implicitly. Long jobs, cross-instance reconciliation, richer music controls and other app parity gaps remain tracked separately.
