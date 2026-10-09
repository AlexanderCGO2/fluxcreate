# Expanded effect capacity

The editor now permits 128,000 live GPU particles per simulation, with a shared 128,000-particle scene budget and at most two rendered solver branches. Emission rate reaches 32,000 particles/s and bursts reach 128,000. Capacity fields and the automatic increase action account for other emitters and duplicated graph branches. Capacity alone does not increase density: raise Emission rate or Burst count as appropriate. Default counts and existing scenes are preserved.

New Bonfire, Fireball burst, Sparks and Fountain spray starters use the GPU particle solver, including lifetime styling and scene-collider support. Existing saved procedural graphs keep their original behavior. The other analytical Particle emitter templates retain their previous limits.

## 128,000-particle measurement

Recorded 2026-09-28T22:03:22.177Z on RTX 3080 / Ryzen 9 3950X in Edge 152.0.4191.62, at 1280 × 720, DPR 1, hardware WebGL 2. Two reversed rounds each tested sparks and smoke. All four burst samples and all four continuous animated-text samples held approximately 60 FPS, the test's display ceiling. Continuous emission used 32,000 births/s, four-second lifetime, a moving FLUXINI outline source, turbulence and one box collider. Ten-second measured playback followed five simulated seconds of warmup. Simulation lag p95 stayed below 17 ms. This establishes a tested workload, not an absolute maximum or a guarantee for close-up overdraw, other hardware or multiple full-size emitters.

Two 32,000-particle emitters also held 60 FPS with sustained animated-text emission. A 128,000 scene total can be divided between two emitters; two 128,000 emitters exceed the budget. Higher counts on CPU fallback can be slow; the backend tooltip explains when CPU rendering work is being used. CPU and GPU rewind caches are bounded separately at approximately 64 MiB per solver, excluding working buffers and runtime overhead.

## Water, clouds and volumetric smoke

Water supports up to 8,000 fluid particles, with surface resolution increasing from 52 up to 80 cells per axis and a larger triangle buffer. Hot density/viscosity calculations avoid repeated general exponentiation. In isolated Node measurements, median 8,000-particle fluid step cost dropped from 60.9 ms to 27.4 ms. The position-based fluid solver and surface reconstruction still use the CPU. High-detail mode can calculate slower than the playhead; the inspector recommends starting at 2,400 or below for smoother playback. Pause to finish a frame before exporting.

Cloud and Dark smoke support up to 7,200 parcels. Motion stays in the CPU worker; density accumulation and normalization now run on the GPU, using instanced parcel splats into a tiled volume texture. The worker skips building and transferring the CPU volume. GPU volume data matched the CPU reference exactly in three tested cases, including 7,200 parcels at spread 2 and time 10 s. Unsupported float blending uses the previous CPU density path. Both render the same 48³ density grid; more parcels improve sampling, not voxel resolution.

Full-view browser measurements below use five-second playback intervals, one-second simulated warmup, 1280 × 720 at DPR 1 and two reversed rounds. These use real worker, density, surface and rendering paths; the water view uses hemisphere lighting, so editor lighting and shadows can alter frame costs.

| Effect | Particles/parcels | Viewport FPS range | Worst simulation lag p95 (ms) |
|---|---:|---:|---:|
| water | 2,400 | 60.0–60.0 | 33.4 |
| water | 4,800 | 59.6–60.0 | 566.7 |
| water | 8,000 | 60.0–60.0 | 2216.8 |
| cloud | 1,800 | 60.0–60.0 | 16.8 |
| cloud | 3,600 | 60.0–60.0 | 16.8 |
| cloud | 7,200 | 60.0–60.0 | 16.8 |

Water's high viewport FPS can show an older simulation frame. The lag column is essential: 8,000-particle fluid is a detail option, not a real-time 60 Hz solve. Cloud motion and GPU density kept pace at 7,200 parcels. Water, clouds and analytical emitters retain a combined 12,000-particle budget inside the overall scene budget. Cloth is unchanged.

## Verification and reproduction

- node scripts/particle-benchmark.mjs --backend=GPU --counts=128000 --styles=sparks,smoke --output=artifacts/gpu-particle-128k
- node scripts/particle-benchmark.mjs --backend=GPU --continuous-text --counts=128000 --styles=sparks,smoke --emitters=1 --output=artifacts/gpu-particle-128k-continuous
- node scripts/fluid-capacity-benchmark.mjs
- node scripts/gpu-cloud-check.mjs
- node --test tests/particle-capacity.test.mjs
- node scripts/build.mjs --staging
- node scripts/particle-capacity-smoke.mjs

The browser regression edits capacity, rate and burst count, measures live GPU state, reloads the saved scene, and downloads PNG/GLB. It also verifies maximum cloud/water counts and their GLB exports. Existing particle, water/cloud playback and recording checks remain applicable. Benchmarks use isolated pages or disposable databases; user scenes are not changed. Raw local results live under artifacts/gpu-particle-128k, artifacts/gpu-particle-128k-continuous, artifacts/gpu-particle-capacity and artifacts/fluid-capacity.
