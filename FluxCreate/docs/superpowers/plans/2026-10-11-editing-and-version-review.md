# Editing and workflow review continuation — implementation plan

**Goal:** Extend photo color correction, motion key editing and safe workflow review using the existing local document model.

**Architecture:** Independent app slices; shared contracts stay centrally reviewed. Preserve old documents, originals, explicit edits and one-step undo. The existing release checkout is clean at `eeeb137`; runtime baseline is `b4def79`.

**Tech stack:** Existing React, JavaScript, IndexedDB and browser renderers. No new dependency, cloud service or paid inference.

**Spec:** Suite FEATURE-GAPS.md and each app's detailed feature-gap document. This continues the user's authorized parallel plan and release workflow.

## Constraints and review focus

- Older photo Levels must render exactly the same with neutral new channels; alpha/source bytes remain unchanged.
- Keyframe paste validates every key before changing anything; a collision, lock, incompatible property or duration violation rejects the whole edit.
- Compare is read-only. It never replaces the workflow draft, saves a version, starts a run or approves a model call.
- Late reads, changed selections, cross-tab revisions and failed storage must preserve existing work.
- Native reload and exported/rendered output establish behavior; tests with copied implementation logic alone are insufficient.
- Cloudflare account activation and durable remote paid jobs remain open separately.

## Task 1 — Fluxfoto channel and output Levels

Owner: photo agent. Files: src/levels.mjs, LevelsPanel.jsx, levels.css, model/renderer where needed; tests/levels.test.mjs; browser Levels checks and app docs.

Interface: retain legacy enabled/black/white/gamma. Optional outputBlack/outputWhite and channels.red/green/blue use bounded input black/white/gamma and output bounds. Combined RGB transform precedes channel transform. Neutral/absent options preserve legacy object/rendering behavior.

- [x] Observe failing validation/render tests for per-channel correction and neutral compatibility.
- [x] Add channel selector, channel histogram, bounded input/output controls, reset current/all and explicit Apply.
- [x] Verify actual alpha/source/pixel preservation, lock/stale behavior, one undo and native/portable/PSD output; run full app tests/build.

## Task 2 — Fluxiffects internal keyframe clipboard

Owner: motion agent. Files: src/core.mjs, KeyframeSelection.jsx, main.jsx/style as needed; new unit/browser clipboard checks and app docs.

Interface: copyKeyframes(layer,property,ids) returns detached clipboard. pasteKeyframes(layer,property,clipboard,playhead,{duration}) returns validated immutable layer with fresh IDs. Earliest copied time anchors to playhead; exact compatible property only. Relative time/value/outgoing easing survive. Clipboard stays session-local.

- [x] Observe failing copy/paste/collision/lock/type/duration tests.
- [x] Add explicit Copy/Paste and shortcuts outside typing/modal contexts; preserve committed-state gesture handling.
- [x] Verify same/cross-layer paste, atomic rejection, one undo/redo, reload and independent rendered timing plus existing key/easing tests.

## Task 3 — FluxAgents saved-version comparison

Owner: root. Create src/workflow-diff.mjs, WorkflowComparison.jsx, workflow-comparison.css, tests/workflow-diff.test.mjs, scripts/version-compare-browser-smoke.mjs. Extend workflow-library.mjs with readWorkflowComparison(id,number,expectedRevision) returning entry/version/head from one readonly transaction. Embed in WorkflowLibrary.jsx.

Interface: compareWorkflowGraphs(before,after) validates bounded library graphs and returns deterministic metadata, node field and ordered data/guard connection differences by stable IDs. No input mutation. UI compares chosen immutable version against a captured current draft or saved head, names both sides, displays complete bounded text safely, and labels stale snapshots until explicit refresh.

- [x] Observe failing tests for prompt/model/limits/approval/condition differences, added/removed nodes, reordered join inputs, immutable input and invalid graphs.
- [x] Implement pure diff and atomic saved-pair read; add accessible read-only comparison with cancel/Escape and guarded async reads.
- [x] Browser-verify no graph/library/run writes, actual changed fields, changed/removed versions, late reads, keyboard/mobile and storage failures. Run full tests/build and existing library/recovery checks.

## Task 4 — integration and release

- [x] Review app contracts and any shared Levels rendering/schema use; correct remaining-gap inventory.
- [x] Assemble source into release; full unit matrix, nine builds, hosted app/handoff/MCP checks.
- [ ] Commit/push/deploy under existing authorization; retain authentication and match live bundles.
- [ ] Record delivered subsets, evidence and remaining specialist/cloud gaps.

## Execution notes

Parallel ownership: photo and motion agents edit disjoint apps; root owns Agents and shared/release work. The agent thread limit prevents a third worker; root performs that slice directly. No independent task consumes another's new API. Release is a single integration commit after the combined gates pass.

## Local verification and review

Fluxfoto: 44 unit tests, build, 17 channel/legacy browser groups, photo source and PSD export checks pass. An independent review found no actionable issues; ten Levels unit tests were rerun. Shared studio-object rendering already delegates to the photo renderer, so no new shared contract was necessary.

Fluxiffects: 106 unit tests, build, seven new clipboard browser groups and existing easing/selection regressions pass. PNG and decoded WebM output establish shifted key timing. Review identified native selection/shared-dialog shortcut isolation; a regression test failed before the guard was added, then passed. Root independently reran all seven clipboard browser groups.

FluxAgents: 33 unit tests, build, eight comparison browser groups, ten existing library groups and five recovery groups pass. Delayed reads, stale drafts, failed/missing storage, Escape, responsive themes and zero execution/persistence side effects were exercised. Independent code review found no actionable issues and reran all four pure comparison tests.

No paid model calls were made. The assembled release passes 601 tests across ten packages, all nine browser builds plus shared server/MCP App, 36 hosted browser checks and six hosted MCP checks. Deployment and live verification follow.
