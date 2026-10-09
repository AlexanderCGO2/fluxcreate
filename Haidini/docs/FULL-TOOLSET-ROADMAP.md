# Fluxini: complete-toolset roadmap

Updated 3 October 2026. Scope explicitly includes modeling, animation, characters, simulations, materials, rendering, compositing and production workflows.

## Product commitment and present status

Build a Windows-first procedural creation tool for people with design knowledge. A starter should yield a usable scene, the inspector should expose the few controls that matter, and the graph should remain available for deeper editing. Flux memory and the existing OMMAX Claude gateway remain the AI architecture; no LangChain.

The target is coverage of the entire toolset. This is a continuing engineering program, not a claim that the current editor implements every Houdini operator, solver, file format or production workflow. This release completes a scene-building and rendering foundation. Full parity remains unimplemented.

The scope was checked against the [official Houdini documentation index](https://www.sidefx.com/docs/houdini/index.html), including its geometry, character, dynamics, scene-building and pipeline domains. SideFX documentation currently identifies itself as Houdini 22.0. The implementation choices and delivery order below are Fluxini engineering decisions, not claims of equivalent SideFX internals.

## Delivered in this milestone

- Editable sphere, box, cylinder, cone, torus and plane geometry, with scale and three-axis transforms.
- A surface-material node with color, roughness, metalness, transmission, IOR, thickness, clearcoat, emission and opacity. Matte, polished-metal, glass and coated-plastic presets apply as one undoable edit.
- Directional, point and spot lights with color, intensity, targets and optional shadow maps.
- Saved perspective-camera nodes with animatable position, target and field of view. The viewport offers camera selection, Perspective, Top, Front and Right views.
- Move, rotate and uniform-scale handles. A drag commits once, honors protected parameters and adds a key when the property is already animated. W/E/R select tools; Escape cancels an active drag.
- Frame-accurate WebM export: every frame waits for its simulation state, then encodes with an explicit timestamp. Output size and start/end range are editable. HD, Full HD, square and current-viewport presets also serve PNG export.
- A Studio turntable starter combining geometry, copper material, a light, camera and rotation animation. New and Add both use the same editable recipe.

Current inventory: **25 operator types, 43 templates, eight template families**. Existing work includes GPU particles, shallow-water paint, CPU position-based water, artistic cloud volumes, constrained cloth, terrain/scatter, text/font management, property animation, scene libraries, persistent undo and Flux proposals.

Limits of this milestone: geometry primitives are visual objects; the separate Shape operator supplies supported simulation sources/colliders. Surface materials affect ordinary shaded meshes; particle and volume shaders retain their own controls. There is no path tracer, texture-authoring graph, depth of field, motion blur, audio export or general mesh import. Scene-camera selection is a local viewing preference; camera nodes and animation are saved in the project. GLB exports the current frame, including applicable PBR materials, lights and cameras, but does not export animation.

## Follow-up delivered: history and continuous paint

Persistent undo/redo has no fixed step cap. The new archive retains discarded redo branches, supports paginated recovery and survives restarts. Restoring a historical revision is a new undoable edit. Existing snapshots migrate without rewriting; older states discarded before archiving cannot be recovered.

The basin now supports twelve transported pigments, separate-color regions, cycling recirculating inlets, animated palettes and continuous preview beyond clip length. Color edits preserve calculated GPU state; late ranges export with exact frame timing. Old scenes retain their settings. Tests are described in [paint and timing](PAINT-AND-TIMING.md).

The supplied recording confirms that the remaining target includes fully 3D overturning sheets, droplets and viscous folds. These still belong to M3. Continuous shallow-water paint does not complete that target or the wider toolset.

## UX rules for every subsequent milestone

1. **Start with a result.** Each implemented system needs a useful starter, a thumbnail, plain-language controls, sensible defaults and an explanation of what its simulation actually models.
2. **Keep the workspace stable.** Composition, Objects, Design, timeline and optional full-screen Graph remain the main workflow. Add domain-specific editors as focused views rather than permanent extra panels.
3. **Make direct edits authoritative.** Handles, inspector, graph and Flux must change the same validated project model. All document edits participate in undo, locks, saving and migration.
4. **Show where appearance comes from.** Geometry linked to a material exposes a shortcut to that material. Extend this to texture, lighting and compositing dependencies as they become editable.
5. **Distinguish preview and final output.** Show calculation progress, quality and backend. Changing preview quality must not silently change a saved physical setup or the final render.
6. **Test with designers.** Use three tasks: make a title emit sparks, recolor and animate a studio object, and tune a paint wave pool. Measure completion, incorrect edits and recovery without a graph tutorial. No claim of validated usability until those sessions occur.

## Full coverage map

“Working” means the named subset exists. “Planned” means it must still be implemented and tested. A template with a similar appearance does not satisfy a physics or character capability.

| Area | Current Fluxini capability | Remaining work |
| --- | --- | --- |
| Procedural foundations | Typed acyclic graph, cached evaluation, parameters, locks, atomic patches, undo | Stable geometry attributes/groups, reusable subgraphs, exposed controls, loops, feedback/solver contexts, time dependencies, versioned custom operators |
| Modeling | Primitives, transforms, terrain, curves used as masks, instancing, extruded text | Component selection; editable curves; extrude, bevel, inset, fuse, resample, remesh, subdivision, booleans, deformers, normals, UVs, packing; NURBS and implicit/volume modeling; asset import |
| Terrain and environments | Height/noise/masks, scatter and instances | Paintable heightfields, erosion, sediment, roads/rivers, biome masks, vegetation assets, large-world tiling and LOD |
| Animation and motion design | Property tracks, easing, text motion, timeline, animated camera/material/light values | Multi-key selection, curve handles, dope sheet, tracks/clips/layers, constraints, paths, expressions, channel/audio processing and retiming |
| Particles | GPU ballistic solver up to 128,000 total, emission/lifetime, source sampling, sphere/box contact, sprites | Field-driven motion, mesh/SDF collision, particle contacts, events, groups, branching spawn, instancing and persistent disk caches |
| Liquids and paint | GPU depth-averaged conserved waves and pigment advection; CPU PBF water | Fully 3D free surfaces, controlled viscosity, mesh/SDF boundaries, surface tension, pouring/filling, overturning waves and coupled foam/spray/bubbles |
| Smoke, fire and explosions | Artistic advected cloud parcels and GPU volume shading; particle fire/smoke | Grid pressure projection, velocity/density/temperature/fuel fields, combustion, obstacles, sparse/adaptive domains and self-shadowing |
| Rigid bodies and destruction | Designed debris and precut-wall animation | Contact solver, sleeping, constraints, physical fracture pieces, break thresholds, glue networks and fracture-driven secondary FX |
| Cloth and flexible materials | Gravity/wind/pins and stretch/shear/bend constraints | Self-contact, sewing, tearing, pressure balloons, soft-body volume constraints, hair/strand contacts, FEM and tissue |
| Grains and MPM | Procedural grain-like templates | Validated frictional grains and material models for sand, snow, mud, viscous material and plastic deformation |
| Characters | No rig/skin/character system yet; text characters are glyphs | Skeletons, skin weights, FK/IK, rig components, pose library, retargeting, animation clips/blending and procedural rig graphs |
| Groom, feathers and crowds | Procedural strand appearance only | Guide authoring/interpolation, clumping, grooming, hair dynamics, feather systems, crowd agents/avoidance/transitions and muscle/tissue workflows |
| Materials and lighting | PBR surface node, presets, three light types, environment illumination | Image/procedural textures, UV workflows, shader graphs, displacement, subsurface shading, area lights, environment assets, material interchange and baking |
| Rendering and look development | Real-time shaded viewport, saved cameras, exact-frame WebM, PNG, GLB | Path tracing, volumetric shadows, motion blur/DOF, OCIO workflow, render passes, EXR sequences, denoising and a render queue |
| Compositing | No compositing graph | Images/layers, masks, transforms, color correction, blend operations, blur/glow, keying, time operations, GPU image graph and composited export |
| Production and interchange | Local projects/fonts, import/export of Fluxini packages, snapshots, GLB output | Asset registry, relinking, glTF import, Alembic/OpenVDB/USD bridges, scene layers/variants, dependencies, task graph, headless batch cooking, render farm adapters and publish/version workflows |
| Scripting, integrations and ML | Catalog-driven Claude plans, Flux event memory, schema validation | Supported custom operator API, sandboxed expressions, scripting bridge, host/DCC/game integrations, synthetic-data workflows and explicit model inference operators |
| Desktop and operations | Windows launcher/local service; Tauri source | Native build, installer/signing, WebView2 GPU/export verification, crash recovery, project backup UI, profiling and hardware support matrix |

The modeling scope is informed by [SideFX geometry workflows](https://www.sidefx.com/docs/houdini/model/index.html). Character coverage follows the domains described in [Character/KineFX](https://www.sidefx.com/docs/houdini/character/index.html). USD scene composition, MaterialX and rendering belong to the wider [Solaris/Karma workflow](https://www.sidefx.com/docs/houdini/solaris/index.html); current Three.js materials are only our first shading implementation. The compositing and scheduling tracks correspond to the distinct [Copernicus](https://www.sidefx.com/docs/houdini/copernicus/index.html) and [PDG/TOPs](https://www.sidefx.com/docs/houdini/tops/index.html) domains.

## Delivery sequence and acceptance gates

Do not expand the visible library with nonfunctional placeholders. Each row below requires an editable scene, persisted project data, undo/redo, export behavior, numerical or functional checks, and an end-to-end browser test before it is marked delivered.

| Milestone | Concrete delivery | Acceptance gate | Status / dependency |
| --- | --- | --- | --- |
| M1 Studio foundation | Geometry, material, light, camera, handles and exact-frame output | Build and edit a turntable; restore by undo; reload camera; decode a correctly timed video; preserve existing simulations | Implemented in this release |
| M2 Shared scene/solver data | Indexed mesh/attribute model, reusable source/collider descriptors, field interface, cache identity and cancelable simulation jobs | One imported or generated mesh can render, emit and collide through validated explicit conversions; cache invalidates only for relevant inputs | Next; required by most remaining domains |
| M3 Real fluid and pyro workflows | First bounded 3D liquid tank and pressure-projected smoke solver, then viscosity, combustion and coupled secondary FX | Gravity-driven pour fills a basin, collides and settles; mass and boundary diagnostics; smoke divergence decreases under projection; cached seeks reproduce frames | Highest simulation priority after M2; numerical prototypes before presets |
| M4 Procedural modeling and assets | Mesh operations, selection/groups/attributes, UV tools, reusable subgraphs, import/relink | Build a reusable object from a primitive, edit upstream parameters, preserve intended selections, reopen and export | Depends on M2; establish attribute/topology rules before many operators |
| M5 Contact and material dynamics | Rigid bodies/fracture, cloth self-contact, strands, soft bodies; grains and MPM one validated material at a time | Resting stacks stay at rest; fracture responds to a threshold; cloth avoids self-penetration; granular slopes and deformable volume behave consistently | Depends on M2; independent solver validation per material |
| M6 Animation and characters | Curve editor, clip/layer system, skeleton/skinning, FK/IK, retargeting and pose assets | Import a rig, retarget a clip, edit poses, scrub deterministically and preserve animation in interchange | Requires mesh attributes, asset import and transform conventions |
| M7 Groom, environments and crowds | Groom guides/dynamics, feathers, erosion/biomes, crowd clips/avoidance, then tissue | Saved guides reproduce a groom; erosion conserves tracked material within tolerance; agents navigate with valid animation transitions | Depends on M4–M6 according to domain |
| M8 Production images | Shader/image graphs, texture assets, advanced rendering, compositing, color-managed image sequences and passes | Preview and export use declared color transforms; passes recombine; render resumes without losing completed frames | Material/asset foundations first; can advance beside solver work |
| M9 Production platform | USD/volume/cache bridges, task dependencies, batch/headless processing, integrations, desktop packaging | Reopen a portable asset package; restart/resume a batch; inspect failed jobs; signed Windows build passes hardware tests | Incremental from M2; broad completion after domain formats stabilize |

M3 starts with the user's paint-basin requirement: fluid motion must be caused by forces and boundaries. The present shallow-water implementation remains useful for top-down pools, but cannot provide the overturning, splashes and full 3D viscous folds in the visual references. Deliver those through a new 3D solver and surface reconstruction, with a migration-free choice between the two models.

There is no defensible completion date for full parity from this prototype. A small team should finish one demonstrable slice at a time, estimate after solver/format spikes, and keep the matrix above as the scope register. UI engineering, geometry/graphics engineering and numerical simulation work are distinct responsibilities even if a person covers several.

## Architecture decisions

Keep React/TypeScript and React Flow for the editor, the validated command protocol for all edits, and Three.js for the current renderer. Introduce data contracts before swapping runtimes: geometry (topology and typed attributes), fields (grid/domain/units), particles, constraints, skeletons, images and asset references need distinct representations.

Retain the working WebGL2 compute paths. Evaluate WebGPU against specific pressure-solve, neighbor-search and field benchmarks before moving a solver. Dispatch compute through a capability-based backend; do not send full particle/grid state through JavaScript every preview frame. Transfer explicit checkpoints or exports only when required. CPU workers remain useful for reference calculations and unsupported devices; native/WASM components should be introduced where measured cost or library compatibility justifies them.

A shared simulation contract should define fixed time, seeded initialization, input hashing, progress, cancellation, current frame, cache eviction and error reporting. Disk caches must identify solver version, source graph and relevant animation so an old result cannot masquerade as a new calculation. GPU work must report memory budgets and handle device loss.

Large interchange libraries and future offline rendering are candidates for native sidecars behind a narrow typed protocol. Do not make the UI dependent on an installed Houdini instance. Any actual Houdini Engine integration would be a separate licensed adapter, with its own setup and compatibility verification.

Flux should propose typed graph patches and explain the effect of each change. Every new operator extends the same catalog, schema and scoped memory model. Keep review/apply, parameter locks, project isolation and stale-revision rejection. AI does not implement missing physics by renaming an artistic preset.

## Current limits and proof

The renderer allows at most eight connected light branches and eight camera branches. Scene budgets remain 64 nodes, 128 edges, two rendered solver branches, 128,000 total particles, a separate 12,000 budget for other particle systems, 100,000 estimated mesh/terrain vertices and 384 rendered text glyphs. Water is capped at 8,000 particles and cloud parcels at 7,200. These are limits, not FPS promises.

Video uses WebCodecs VP9 or VP8 and a WebM container with explicit timestamps. Ranges are capped at 18,000 frames and encoded payload at 512 MiB; output must be within 64 × 64 and 3840 × 2160. No audio track is created. Arbitrary range endpoints round up to a whole output frame, so duration may exceed the requested range by less than one frame. The implementation uses the [WebCodecs specification](https://www.w3.org/TR/webcodecs/) and [WebM container structure](https://www.webmproject.org/docs/container/).

Verification commands:

```text
node node_modules/typescript/bin/tsc --noEmit
node --test tests/*.test.mjs
node scripts/build.mjs --staging
node scripts/studio-tools-smoke.mjs
node scripts/render-timing-smoke.mjs
node scripts/liquid-physics-smoke.mjs
```

TypeScript and all 65 unit/integration tests pass. Browser tests use isolated databases. Studio checks verify material presets, actual shader compilation, drag/save/undo, camera persistence, HD PNG, camera/light/PBR GLB, a decoded eight-second/240-frame video and cancellation. The timing test deliberately delays CPU water-worker delivery: a one-second output took 3.8 seconds to render and still contained exactly 30 correctly timed frames. GPU paint also produced a decoded one-second/30-frame video. The liquid regression covers persisted physical controls, a six-digit timeline, seeking beyond 30 seconds and textured GLB/PNG. Artifacts are under `artifacts/studio-tools`, `artifacts/render-timing` and `artifacts/liquid-ui`.

The existing gateway configuration is preserved; this milestone makes no model request. Native Tauri compilation, production installer verification and full-toolset parity remain open.
