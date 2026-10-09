# GPU particle simulation

The editor now supports 128,000 particles per scene. See [expanded effect capacity and current measurements](EFFECT-CAPACITY.md) for the 128k tests, GPU cloud density and higher-detail water.

Particle simulation now defaults to GPU physics and appearance on supported WebGL 2 hardware. This covers text/shape/point emission with grains, soft dots, sparks, flame and smoke sprites. The viewport shows the active device. Advanced controls → Simulation device can prefer the GPU or force the CPU reference solver. Unsupported float-render-target hardware falls back to CPU; the indicator's tooltip explains why.

## Work distribution

- GPU: fixed-step gravity, wind, buoyancy, drag, turbulence, sphere/box collision response, position/velocity state, age, lifetime color/opacity/size ramps and camera-facing particle geometry.
- CPU: deterministic birth scheduling, source geometry/glyph sampling, animated emission rates, slot allocation, parameter validation and UI.
- GPU state stays on the graphics card during playback. Framing, picking and current-frame GLB export explicitly read it back. PNG and WebM capture the GPU rendering directly.
- Water, cloud parcel motion, cloth and the separate procedural Particle emitter use CPU simulation/update paths. Cloud density generation now uses GPU accumulation when supported; see the capacity report.

Implementation uses the existing Three.js WebGL renderer and [GPUComputationRenderer](https://threejs.org/docs/pages/GPUComputationRenderer.html). It uses floating-point render-target passes, not a WebGPU renderer. Two ping-pong state textures hold position/age and velocity/lifetime; birth textures supply deterministic emission metadata. Each 60 Hz simulation step retains four collision substeps. Vertex shaders read particle state without uploading per-particle matrices each frame.

Rewind checkpoints stay on the GPU. A per-simulation cache budget of approximately 64 MiB covers cached state and birth snapshots, with at most 61 checkpoints. The initial checkpoint is retained; evicted intervals are recomputed when needed. Working textures, geometry, transient readbacks and JavaScript object overhead are additional. Initialization failure uses the CPU path; a graphics-context loss during playback asks for reload.

## Measured on this PC

GPU run: 2026-09-28T21:27:59.741Z. CPU baseline: 2026-09-28T20:52:07.460Z.

AMD Ryzen 9 3950X, 64 GiB RAM, NVIDIA RTX 3080, Edge 152.0.4191.62; hardware WebGL 2 via ANGLE Direct3D11, not software rendering. Both runs use the actual renderer and solver, a 1280 × 720 viewport at DPR 1, one burst of particles with 12-second lifetimes, one box source, one box collider and turbulence. Each count/style has two samples in reversed order: 1.5 seconds frozen rendering, then three seconds of playback after warmup. Sparks and smoke are combined into each range below.

| Live particles | CPU playback FPS | GPU playback FPS | CPU lag p95, worst (ms) | GPU lag p95, worst (ms) |
|---|---:|---:|---:|---:|
| 1,000 | 60.0–60.0 | 60.0–60.0 | 16.8 | 16.8 |
| 2,000 | 60.0–60.0 | 60.0–60.0 | 16.8 | 16.8 |
| 4,000 | 60.0–60.0 | 60.0–60.0 | 16.8 | 16.8 |
| 8,000 | 41.7–44.0 | 60.0–60.0 | 50.1 | 16.8 |
| 16,000 | 30.3–33.3 | 60.0–60.0 | 1133.4 | 16.8 |
| 32,000 | 15.9–17.3 | 60.0–60.0 | 1916.6 | 16.8 |

At 32,000 particles, GPU playback reaches the 60 Hz display ceiling with about one simulation step of lag. The CPU baseline reaches 15.9–17.3 FPS with about 1.92 seconds of lag. GPU-mode render-callback median is approximately 0.1 ms; sampled compute-submit median is also approximately 0.1 ms. These are separate CPU submission measurements, not GPU execution times or total CPU utilization. Timer queries in the harness measure drawing only; simulation compute runs outside those queries. The 60 Hz ceiling prevents estimating a maximum GPU particle capacity from this result.

These short tests cover a moderate-screen-coverage, one-emitter workload on this PC. Large close-up smoke cards, continuous high birth rates, multiple full emitters, complex animated text, exports and other desktop activity can alter performance. Two emitters are functionally tested, not capacity-benchmarked. This initial benchmark preceded the expanded editor limits. The subsequent capacity report covers continuous text emission, multiple emitters and current limits.

## Verification

CPU/GPU comparisons cover seeded text-outline emission, animated sources, variable lifetimes, forces, box and sphere collisions, timed bursts, a full pool and backward/forward scrubbing. Maximum observed position difference is below 0.000008 scene units. Repeated GPU scrubbing is bit-identical on this hardware, including recomputation after eviction at 32,000 particles over 30 seconds; cross-device bit identity is not promised.

The lifetime UI regression imports a disposable copy of the reported scene. At playhead 6 seconds, Lifetime 0.5 yields 387 live particles with oldest age 0.483 seconds; Lifetime 12 yields 4,000 particles with oldest age 6 seconds. It reads actual GPU state through the framing action. Browser workflows also cover all five appearances, zero opacity, source visibility, two emitters, controls and PNG/WebM/GLB export. CPU fallback and restart/keyframe regressions remain covered separately.

## Reproduce

- node scripts/gpu-particle-check.mjs
- node scripts/particle-benchmark.mjs --backend=GPU
- node scripts/particle-controls-smoke.mjs --staging
- node scripts/lifetime-smoke.mjs --staging (optional --cpu for the fallback)
- node scripts/animation-smoke.mjs --staging

Build staging first with node scripts/build.mjs --staging. Tests use isolated databases and do not alter saved user scenes. Benchmark samples: [GPU results](../artifacts/gpu-particle-benchmark/results.json), [preserved CPU results](../artifacts/particle-benchmark/results.json). [Earlier CPU report](PARTICLE-PERFORMANCE.md) records the baseline before GPU migration. Raw artifacts are local and ignored by Git.
