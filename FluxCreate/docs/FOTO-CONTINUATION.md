# Fluxfoto continuation

Plan: FluxCreate/docs/IMPLEMENTATION-PLAN.md, milestone 6 photo editing.
Base suite commit: d30692b. Existing source and release workspaces are clean; prior authorization covers commit, push and protected deployment.

1. Combine rectangular/ellipse/lasso selections (replace/add/subtract/intersect); retain invert/feather, cancellation and document-space masks.
2. Copy/cut selected-layer pixels into an internal clipboard, paste as a new movable image layer, fill a selection on a separate layer, hide selected pixels non-destructively. Preserve original source and existing mask, one undo per edit; no OS clipboard overwrite. Bound pixel work to 32 MP and reject empty output.
3. Flat multi-selection with Ctrl/Cmd toggle and Shift range; atomic bulk move, duplicate/delete and drag ordering; refuse mutations containing locked layers. Existing single-layer behavior remains.
4. Verify actual browser pixels, lock/stale/cancel guards, undo/reload/native output, existing selection/order/PSD workflows; update gap records, commit/push/deploy and verify protection.

Ruling: nested groups remain a separate milestone because they require a hierarchy-aware renderer and format/export policy. This batch's layer organization is multi-selection and batch editing, not Photoshop group parity.
Ruling: copied pixels use the isolated selected layer (including appearance/mask); Copy merged is not included. Clipboard stays within Fluxfoto and memory only, with clear UI wording.
Pre-flight: selection operations consume document-space masks; clipboard snapshots consume renderer output; batch layer operations retain the existing flat schema and stacking order. No schema migration needed.

Verification ledger follows.

Local verification: 31 unit tests; 8 new pixel/batch browser groups; 25 existing editor checks; 6 selection groups; 5 delayed-image cancellation groups including copy/cut/hide; 16 layer ordering checks; 11 PSD export/reopen checks. Source build passes. Initial new tests failed before implementation; an early browser failure exposed unsettled canvas coordinates in the test, fixed by waiting for the interactive artboard to stabilize. Final release and independent review remain centrally tracked.

Independent review found a stale drag could overwrite Undo. Fixed by cancelling the uncommitted draft before history, revision guards on movement/release, and Escape/pointer cancellation rollback. The reviewer original repro now exports x0/x40 (instead of erroneous x26/x66); four permanent gesture browser groups and the eight editing groups pass.
