# Direct graph selection and layout plan

12 October 2026. Extend the existing atomic graph organizer with box selection and direct group layout movement.

Selection remains temporary UI state. ReactFlow selection flags, node highlighting and the organizer list must agree. A Box select toggle and Shift-drag select fully enclosed nodes; Ctrl/Command/Shift-click changes membership. The inspector keeps its focused node. Numeric layout controls remain available.

A gesture previews only canvas positions. Pointer release emits one relative `graphBatch` move for the complete selection, preserving offsets and using existing validation and the 32-command bound. Parameter locks protect values, while layout movement remains allowed. Scene output can move. No-op movement adds no history. Save, export and evaluation always read the committed project.

Escape, pointer cancellation, window blur, project/revision/selection changes and disabled editing discard a draft. Cancelled native ReactFlow callbacks must not resurrect the preview or commit it. ReactFlow keyboard movement is disabled to prevent uncommitted layout divergence; numeric controls supply keyboard layout editing.

Verification: first fail pure transaction tests for relative offsets, stale contexts, invalid bounds, command limits, no-op and immutability; first fail browser tests for actual box selection and multi-node dragging. Then verify both drag event paths, cancellation followed by continued pointer movement/release, undo/redo, numeric organization, native download/reload and unchanged evaluator/output. Run all Node tests, TypeScript, build and existing graph browser regressions before freeze.

Status: implementation frozen after scoped verification. RED evidence: all three missing transaction contracts failed before the helper existed; the actual Shift-drag browser gesture selected one node instead of two before UI changes. Additional browser assertions exposed and then verified fixes for cancellation changing zoom and selection rectangles intercepting modifier clicks.

GREEN evidence: three pure tests, ten app browser groups and five actual-component boundary groups pass. The existing batch/editor/authoring/design suites pass (17 groups). TypeScript passes for the app and the new harness under tsconfig.checks.json; staging build passes. PNG exports before and after layout edits are byte-identical, and native downloads/reloads contain committed layouts and original parameter locks.

Release gate: complete Node suite passes **112/112** after granting sibling dependency access; the first sandboxed run had blocked the existing Fluxiffects provider fixture. A final RED/GREEN browser assertion also verified that leaving full screen after cancellation restores the original docked viewport. No commit or deployment was performed by this increment. Remaining graph gaps include notes/backdrops, encapsulated subgraphs, assets, favorites and profiling.
