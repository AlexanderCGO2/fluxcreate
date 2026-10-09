# Paint basin, long timelines and tornado appearance

## Liquid model

Paint and Water finishes use a GPU nonlinear shallow-water solver: depth-averaged conservation of liquid mass and horizontal momentum, hydrostatic gravity pressure (9.81 m/s²), viscous shear and bottom drag. A finite-volume Rusanov flux transfers water and momentum between neighboring columns. Mirrored ghost states enforce impermeable reflecting basin walls. The timestep uses automatic substeps for a conservative two-dimensional CFL bound, with a 4 m/s velocity limit on extreme forcing. All surface displacement and normals in these finishes come from the computed elevation. Colors do not create geometry.

The wave machine applies oscillating momentum near the chosen wall; it does not impose a height map or add water. Stirring, sideways force and recirculating color inlets act on the same momentum field. Liquid depth determines gravity-wave propagation speed. Wave drive controls forcing strength; the resulting height depends on depth, viscosity, frequency and reflections. Stop forces after (0 = continuous) smoothly turns off the wave drive, stirring and inlets, while the existing liquid keeps moving and dissipates energy. Turning off the wave machine still allows gravity and stirring to operate.

Pigment concentrations follow the liquid velocity using limited MacCormack advection and separate color diffusion. Their initial patches are optional. Inlets recirculate the carrier at a fixed fill level rather than increasing basin volume. Colors use an absorption-inspired mixing approximation in linear light. Viscosity is an artistic control, not a calibrated paint material. First-order momentum fluxes introduce numerical diffusion, especially on the coarse grid. Pigment advection is bounded but not an exactly conservative mass tracer.

This is a physical **depth-averaged basin model**, not a full 3D liquid solver: it cannot overturn a surface, make detached splashes, entrain air, or pile up thick three-dimensional paint folds. Those need a volumetric free-surface solver and surface reconstruction. The independent Sculptural finish remains explicitly artistic: procedural folds and bead shading are not liquid physics.

The conserved equations and numerical-flux approach are described in the primary [Clawpack shallow-water solver documentation](https://www.clawpack.org/master/riemann/Shallow_water_Riemann_solvers.html). The GLSL implementation is local to Fluxini. This replaces the previous separate pressure-projected color flow, linear wave height forcing and artistic surface deformation used in the active paint scene.

## Continuous multicolor basin — 3 October 2026

Paint carries 3–12 pigments in up to three RGBA GPU textures. Each pigment follows the same liquid velocity. Bounded MacCormack correction can change the sum of material fractions, so the multicolor solver normalizes the complete set after transport and inlet replacement. This prevents pigment-weight growth in a full basin; it does not make the transport exactly mass-conservative.

**Keep colors separate** disables diffusion and displays the dominant advected pigment with boundary antialiasing. This preserves visible regions rather than modeling interfacial forces between immiscible fluids. Turning it off restores absorption-inspired blending and the saved diffusion control. Three recirculating inlets rotate through the palette at the chosen interval. Palettes, animated swatches and protection use ordinary project edits. Color-only edits update uniforms without recreating the solver.

New paint-basin scenes start filled, with twelve separate colors and continuous preview. Existing scenes gain neutral defaults, retaining their three colors and finite playback. Continuous preview applies to visible paint branches reaching Scene output. It expands the ruler and keeps advancing instead of looping to zero. Export defaults to the playhead plus clip duration. The common 999,999-second limit still applies.

The supplied 25.73-second recording was inspected using eight frames across its duration. Visible features include overhanging sheets, detached droplets and substantial depth. These remain outside the current model. The next fluid milestone requires 3D free-surface transport, viscous momentum, basin contact, surface reconstruction and persistent material IDs. Synthetic displacement is not a substitute. The [Unsupervised project page](https://refikanadol.com/works/unsupervised/) is a visual reference, not evidence for a specific numerical implementation.

## Controls, rendering and storage

Surface & colors groups the palette and finish. Flow & forces exposes liquid depth, pouring, viscosity, stirring, sideways force, damping and the stop time. Show flow arrows samples actual liquid velocity. Simulation edits recalculate from time zero; colors and opacity update appearance without rebuilding fluid state. The basin floor matches liquid depth.

Standard detail is 256 × 256; fine detail is 384 × 384. Playback performs no GPU readbacks. Rewind checkpoints store pigment and conserved liquid state, retain time zero and are bounded to about 32 MiB per solver. Velocity and rendered surface are derived again after seeking. Unsupported floating-point rendering reports an error; there is no CPU fallback.

PNG and video preserve rendered appearance. GLB exports the simulated surface geometry and a baked color texture at the selected time, not animated fluid state. Legacy wave speed is retained in the schema for compatibility and converted to depth when loading old files. Current controls expose depth instead of an independent wave speed.

## Verification (2026-09-29)

The GPU test checks rest equilibrium, positive finite depth, volume conservation, decreasing energy and surface variation after forcing stops, viscosity response, depth-dependent wave arrival, pigment movement, rewind agreement within 0.001, and the absence of extra surface displacement. Extreme settings cover both depths, all four walls and the fine grid. Browser tests cover saving and reloading depth/stop-time controls, timeline changes, seeking beyond 30 seconds, PNG/GLB export and undo/redo.

Initial RTX 3080 measurements at 256²: a closed 0.8 m basin retained volume within 0.002% over 24 seconds. With forces ending at 4 seconds, surface variation fell from about 30 cm to below 0.2 mm by 24 seconds. A three-second isolated 1024 × 900, DPR 1 playback sample reached about 60 FPS; this display-limited sample is not a capacity claim or a guarantee for combined scenes.

Reproduce with scripts/liquid-physics-check.mjs, scripts/liquid-physics-smoke.mjs (after a staging build), and tests/paint-waves.test.mjs. Captures and raw measurements are under ignored artifacts/liquid-physics and artifacts/liquid-ui. The regression suite contains 58 tests.

## Verification of the multicolor update (2026-10-03)

TypeScript, the production build and all 75 unit/API tests passed. Coverage includes legacy migration, atomic palette edits and locks, additional animated pigments, ordinary versus continuous playback, hidden/disconnected paint and the time cap. Browser checks verify animated swatches, playback across clip lengths, palette undo, unchanged GPU texture allocation when recoloring, saved mode changes and a decoded late-range one-second/30-frame WebM.

At 256² and a 1024 × 900 viewport, the GPU check retained all twelve substantial color regions through 60 simulated seconds. Liquid volume drift was approximately 0.0018%; total pigment fractions stayed within 0.00001% of their initial total. Rewind across all pigment packs reproduced the tested values exactly. A short isolated playback sample reached about 60.6 FPS; this display-limited measurement does not predict other hardware or combined scenes. Textured GLB output was 954,120 bytes. Checkpoints retain a bounded 32 MiB budget as pigment count increases.

Reproduce with `node scripts/paint-palette-check.mjs` and, after a staging build, `node scripts/continuous-paint-smoke.mjs` and `node scripts/history-smoke.mjs`. Raw results and captures are in `artifacts/paint-palette`, `artifacts/continuous-paint` and `artifacts/history`.

## Timeline

The common maximum is 999,999 seconds for project duration, keyframe times, particle emission start/duration and CPU/GPU seek requests. This is a representable scene length, not instantaneous seeking or practical eleven-day video capture. Previously uncached distant frames require all intervening simulation steps. Export waits are bounded. Particle birth/death times use split GPU clock epochs to retain integer frame precision at large times. Cloth, particle, cloud, water and paint rewind caches are bounded.

## Tornado

Tornado motion defaults to GPU ray-marched condensation and a ground dust skirt, with rotating noise, density-based self-shadowing and an irregular cloud cap. Height, ground radius, density and dust have controls; particle display remains available. This is procedural volumetric shading, not a meteorological simulation or a suction force affecting surrounding objects. GLB uses the existing particle representation; PNG/video retain volume shading.
