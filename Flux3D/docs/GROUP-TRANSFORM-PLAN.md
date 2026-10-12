# Shared selection transforms — 12 October 2026

Implement numeric world rotation (XYZ Euler degrees) and positive uniform scaling around the combined rendered bounds center. Compute bounds from transformed rendered vertices, including off-origin imported meshes. Pre-multiply world rotation and preserve each object's nonuniform scale, immutable geometry, UVs and retained sources. No hierarchy/topology edits or nonuniform group scale.

Preview is separate view state. Apply validates the captured project and exact selection before one history transaction. Selection/document changes, Escape and pointer cancellation discard preview. Invalid/hidden/locked selections and invalid transforms reject atomically. Native/GLB/autosave/PNG consume committed state only. Keep the existing shared translation gizmo; new rotation and scaling are numeric controls with explicit pivot coordinates.

Verification: RED unit tests for literal transformed positions/world vectors, exact rendered bounds, stale/locked/hidden/limit rejection and immutable geometry; RED browser scenario for preview/cancel/apply/history and actual viewport pixels. Verify downloaded PNG/native/GLB independently, persistence and existing browser suites; run all Node tests and build. Record scope/evidence in FEATURE-GAPS.md.
