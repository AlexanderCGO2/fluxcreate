# Everyday multi-frame editing

Use a page-local ID selection, without model/schema changes or persistent groups. Exactly one selected frame keeps the existing inspector and resize handle. Shift/Ctrl/Cmd toggle on canvas and layer buttons. Select-all includes visible unlocked frames; explicit layer selection can include hidden/locked frames. Mixed locked selections reject transformations, duplication and deletion as an atomic operation.

Pure operations cover shared translation with one bounded delta, rotated bounding-box alignment, equal-gap distribution, duplication preserving relative geometry/stack order, and deletion. Group dragging snaps its union bounds to existing page/margin/column/unselected frame targets. No multi-frame resize or rotation.

Gesture previews never enter autosave/native/export snapshots. Escape, pointercancel, selection/page changes restore the committed project; pointerup makes one undo entry. Shortcuts are suppressed inside text fields and every shared dialog.

Verification sequence: meaningful pure-operation tests and browser selection failure first; implementation; full unit suite and build; multi-selection browser scenarios, existing editor/layout/typography/PDF suites; actual native, PNG and PDF outputs retained under artifacts/multi-selection. Report delivered subset and remaining D1 gaps in FEATURE-GAPS.md.
