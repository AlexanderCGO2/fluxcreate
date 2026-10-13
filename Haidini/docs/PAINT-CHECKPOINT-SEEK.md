# Paint checkpoint seeks — 13 October 2026

Paint used retained GPU checkpoints only for backward seeks. After seeking from 20 seconds back to 3 seconds, moving forward to an already cached 6-second frame unnecessarily ran 180 simulation steps. Longer replay paths also contributed to the previously observed rewind differences.

The pump now chooses the latest retained checkpoint at or before the requested frame in either direction. Forward seeks restore it only if it advances the current state. A target between checkpoints computes the remaining steps; a target exactly at a checkpoint refreshes derived velocity/surface fields without advancing the solver. GPU copies and rendering stay inside the existing renderer-state guard. The 32 MiB checkpoint budget, origin retention, asynchronous pump, shader arithmetic and error/cancellation paths remain unchanged.

## Evidence

- Two checkpoint selection unit tests failed before implementation and pass afterward, including unsorted cache entries, origin recovery after eviction, exact targets and avoiding future checkpoints.
- The real GPU regression initially failed: the cached 3→6 second seek ran 180 steps. After the fix it runs zero and restores identical pigment, wave, velocity and surface fields. A 3→5.5 second seek starts at the retained 4-second state and runs 90 steps.
- The original `paint-check.mjs` now passes its unchanged 0.001 tolerance, with measured pigment error 0.000228 and velocity error 0.000343 in the recorded run. Original 0/6/12/20-second frame metrics remain unchanged. GLB export, viscosity response and rest checks pass.
- `paint-checkpoint-smoke.mjs` passes four browser groups, including playback replay and bounded eviction/recovery. `paint-palette-check.mjs` passes the 12-color 60-second run, normalization, rewind and GLB checks. `liquid-physics-check.mjs` passes liquid replay, export, conservation, forcing, damping, depth, symmetry and extreme settings.

This closes redundant recomputation of retained frames and the reproduced cached replay regression. It does **not** establish bit-identical recomputation after arbitrary cache eviction or across GPU drivers. Small floating-point replay differences remain possible; broader long-run reproducibility is a separate reliability target. Temporary shader-copy and GPU-finish probes did not establish a general numerical cause and are not included in the product.

Regression: [GPU checkpoint workflow](../scripts/paint-checkpoint-smoke.mjs), [selection tests](../tests/paint-checkpoint.test.mjs). Reports are generated under `artifacts/paint-checkpoint`, `artifacts/paint`, `artifacts/paint-palette` and `artifacts/liquid-physics`.
