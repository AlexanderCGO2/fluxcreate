# FluxCreate Optimization Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first prioritized suite optimization round, meaningful Adobe imports and a versioned Vercel release.

**Architecture:** Preserve the independent studio folders and local ports. Shared modules own storage, AI review and environment-aware routes. The release repository includes every sibling dependency; hosted project persistence must not rely on temporary SQLite files.

**Tech Stack:** React 19, Canvas2D, Three.js, IndexedDB, Node 24, esbuild, pnpm, GitHub, Vercel and bounded format parsers.

**Spec:** `../../OPTIMIZATIONS.md` and the user-approved instructions in this chat.

## Global Constraints

- Preserve existing projects, assets and credentials.
- Reuse Flux AI without shipping credentials, user media caches or runtime data.
- Imports require decoded content, explicit limits and atomic history behavior.
- User authorized implementation, commit, push and deployment; no additional plan-approval pause is needed.
- Keep current independent local studios working while preparing the full-suite repository.

## Review Focus

- Malformed, huge and externally linked Adobe files must fail without partial replacement.
- Switching documents during import or AI work must not mutate the wrong target.
- Photos and pixel masks must preserve source pixels through undo/save/reopen.
- Hosted prefixes must preserve API, font, worker and download routes.
- Failed/aborted storage transactions must settle and retain the prior saved document.

## Task 1: Adobe and photo workflows

**Files:** Each of `Fluxoto`, `Fluxidesign`, `Fluximiere`: `src/`, `tests/`, browser scripts, README and `docs/OPTIMIZATIONS.md`.

**Interfaces:** Importers return validated native data and notices; existing history applies successful conversion once. Missing references remain local, inert and relinkable.

- [x] Implement PSD/PSB layers, nondestructive masks and rectangle radius controls.
- [x] Implement IDML and PDF/PDF-compatible Illustrator page import.
- [x] Implement supported Premiere and Final Cut XML sequences.
- [x] Verify timing/coordinates, real rendered output, malformed input, undo and persistence.

## Task 2: Shared reliability/performance

**Files:** `FluxCreate/shared/AIPanel.jsx`, `shared/browser.mjs`, shared storage tests and AI browser smoke.

**Interfaces:** Storage resolves on transaction completion and rejects on abort. AI computation is cached by immutable project identity; stale-result checks remain authoritative.

- [x] Reproduce aborted storage operations and redundant AI preview work.
- [x] Fix connection cleanup, transaction settlement and repeated full-document work while typing.
- [x] Verify cancellation, scope, stale proposals and one-step undo.

## Task 3: Fluxiffects and Flux3D

**Files:** `Fluxiffects/src/main.jsx`, `Flux3D/src/main.jsx`, app notes and browser regressions.

**Interfaces:** Async imports capture target identity; model duplication shares immutable geometry, preserving independent properties.

- [x] Fix stale media imports, relink lifecycle and pre-read size checks.
- [x] Show saved-scene recovery errors and prevent silent autosave replacement.
- [x] Reuse mesh geometry when duplicating; verify independent transforms/materials.
- [x] Verify import/edit/undo/save/export behavior and existing 3D motion.

## Task 4: Hosted suite/repository

**Files:** Shared registry, routing/build helpers, legacy asset/API paths, hosted Fluxini persistence adapter, release workspace and Vercel configuration.

**Interfaces:** Local URLs retain existing ports; hosted URLs use app prefixes. Durable project/media state stays in the browser; authenticated AI uses server-only credentials.

- [x] Package every studio into the suite repository with explicit source-only copying.
- [x] Implement hosted paths and durable Fluxini browser persistence.
- [x] Build from the repository alone and test app URLs, worker and downloads.
- [ ] Commit, push, deploy to Vercel and verify the published URLs.

## Execution record

- 2026-10-09: Three app owners implement imports in parallel. Root owns shared improvements, Fluxiffects/Flux3D lifecycle and release integration.
- 2026-10-09: GitHub authenticated as AlexanderCGO2. Existing Fluxini repository is on master; sibling studios have no repository. No existing AlexanderCGO2/fluxcreate repository found.
- 2026-10-09: Vercel CLI installed in ignored local tools; user completed device sign-in successfully.
- Decision: execute the first round now while retaining later items as **Next**; do not label the whole backlog complete.

## Task 5: FluxLab (added by user)

- [x] Standalone text/image studio, live Gateway catalog and server-only shared connection.
- [x] Durable result library, cancellation, error handling and accurate unsaved state.
- [x] Reviewed text/image handoffs to four visual editors; entry points across all apps.
- [x] Official MCP App tools, self-contained UI resource and external stdio transport.
- [x] Browser, service, protocol and malformed-image regression checks.

