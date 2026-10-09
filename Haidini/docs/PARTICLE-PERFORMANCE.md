# Particle performance on this PC — CPU baseline

This report records the CPU implementation before GPU migration. See [the current GPU comparison](GPU-PARTICLES.md) for the new default particle solver.

Measured 2026-09-28T20:52:07.460Z.

Hardware: AMD Ryzen 9 3950X 16-Core Processor; 64 GiB RAM; ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002216) Direct3D11 vs_5_0 ps_5_0, D3D11). Edge 152.0.4191.62.

Rendering uses WebGL 2 GPU acceleration. Physics, collision handling, lifetime color/size and instance-matrix preparation currently run on the CPU.

## Method

Actual Fluxini worker, particle renderer and shaders; 1280x720 DPR1; one box source, one box collider, turbulence, all particles alive; normal project limits bypassed only inside this harness. Each sample has 1.5s render-only then 3s playback, after warmup. Two rounds in reverse order. Existing desktop load is uncontrolled.

The empty-scene baseline was 60.0 FPS. GPU timings use EXT_disjoint_timer_query_webgl2, discarding disjoint samples. Values average the two runs; lag and frame p95 use the worse run. Main-thread cost measures the animation callback plus render submission. The worker message callback also prepares instances outside that interval, so it is not total main-thread cost. Worker-step samples are telemetry from received frames.

Render-only freezes simulation and instance buffers before measuring drawing. It demonstrates rendering headroom, not the performance of a future GPU simulation. The scene has moderate screen coverage; close-up smoke, multiple emitters, larger viewports, recording and desktop activity can change performance. This does not benchmark water, cloth, volumetric clouds or long-duration thermal stability.

## Measured scaling

| Effect | Live particles | Playback FPS range | Frame p95 (ms) | Main callback median (ms) | Worker step median (ms) | GPU median (ms) | Simulation lag p95 (ms) | Render-only FPS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| sparks | 1,000 | 60.0–60.0 | 16.8 | 1.8 | 1.5 | 0.023 | 16.8 | 60.0 |
| sparks | 2,000 | 60.0–60.0 | 16.8 | 3.2 | 3.0 | 0.028 | 16.7 | 60.0 |
| sparks | 4,000 | 60.0–60.0 | 16.8 | 6.1 | 5.7 | 0.039 | 16.7 | 60.0 |
| sparks | 8,000 | 41.7–42.0 | 33.4 | 12.2 | 11.0 | 0.060 | 50.1 | 60.0 |
| sparks | 16,000 | 30.3–30.8 | 50.1 | 23.9 | 21.1 | 0.101 | 866.7 | 60.0 |
| sparks | 32,000 | 15.9–16.2 | 100.0 | 47.3 | 43.8 | 0.166 | 1916.6 | 60.0 |
| smoke | 1,000 | 60.0–60.0 | 16.7 | 1.6 | 1.5 | 0.037 | 16.8 | 60.0 |
| smoke | 2,000 | 60.0–60.0 | 16.8 | 3.1 | 2.9 | 0.056 | 16.8 | 60.0 |
| smoke | 4,000 | 60.0–60.0 | 16.7 | 6.1 | 5.8 | 0.090 | 16.8 | 60.0 |
| smoke | 8,000 | 43.0–44.0 | 33.4 | 11.8 | 10.6 | 0.157 | 50.1 | 60.0 |
| smoke | 16,000 | 32.7–33.3 | 50.1 | 23.3 | 22.9 | 0.275 | 1133.4 | 60.0 |
| smoke | 32,000 | 16.7–17.3 | 100.0 | 45.0 | 43.3 | 0.477 | 1916.6 | 60.0 |

## Interpretation

The highest tested count meeting the smooth-preview criteria in both styles and runs (at least 55 FPS, frame p95 at most 25 ms, simulation lag p95 below 100 ms) was 4,000 live particles. This is a threshold for this workload, not a universal guarantee.

Viewport FPS alone is misleading at high counts: drawing can continue while physics trails the requested playhead. App limits remain 4,000 ballistic particles per simulation and two rendered solver branches. Two full emitters were not measured by this one-emitter benchmark.

The first optimization should target CPU instance preparation and repeated appearance work. The next larger change is moving simulation and appearance calculations to GPU compute/shaders. Raising limits alone exposes simulation lag. Validate scrubbing, collisions, opacity and export before changing those limits.

Checkpoints store 40 bytes per particle every half second. At 30 seconds that is approximately 74.5 MiB for 32,000 particles, excluding render buffers and transient frames. Higher counts also need a checkpoint-memory budget.

## Reproduce

Run node scripts/particle-benchmark.mjs, followed by node scripts/particle-benchmark-report.mjs. Optional arguments: --counts=1000,2000,4000,8000,16000,32000 --styles=sparks,smoke. The harness bypasses schema budgets only inside the benchmark and never writes saved project databases.

Raw samples: [results.json](../artifacts/particle-benchmark/results.json). Separate CPU-only Node timings are included there and must not be substituted for browser playback results.
