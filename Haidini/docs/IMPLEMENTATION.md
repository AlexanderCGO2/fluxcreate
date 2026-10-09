# Fluxini milestone 01 — graph, motion and particle simulations

**Current scope, 3 October 2026:** the [complete-toolset roadmap](FULL-TOOLSET-ROADMAP.md) supersedes the earlier FX-only delivery order. The sections below record successive milestones; older counts and real-time-recording limitations describe those earlier builds. Current catalog: 25 operators and 43 templates.


Implemented September 27, 2026. Product name: Fluxini. The existing workspace directory remains `Haidini` so paths, the running checkout and local databases stay valid.

## Persistent revision archive and paint update — 3 October 2026

The working undo/redo stack retains its existing SQLite snapshots and has no step cap. An append-only compressed archive now also retains abandoned redo branches. Migration copies existing snapshots and current states without rewriting them. Create, mutation, undo, redo and historical restore archive state atomically with the document transaction. Authenticated, project-scoped history uses keyset pagination; restore checks the current revision and creates a new edit. Local disk capacity is the practical limit; portable scene files omit history.

Paint supports twelve transported pigment channels, separate-color display and continuous preview. Old scenes retain three pigments and finite playback. See [paint implementation and limits](PAINT-AND-TIMING.md). The supplied recording was inspected across its 25.73 seconds; full 3D free-surface folds remain required work.

Verification: 75 unit/API tests pass, including 520 edits followed by restart, complete undo/redo, abandoned-branch recovery, rollback and migration. Browser checks cover historical restoration across service restart, continuous playback across clip lengths, animated swatches, one-step palette undo without GPU reconstruction and decoded late-range video. Numerical GPU checks cover all twelve colors at 60 simulated seconds, normalized pigment fractions, volume drift, rewind and textured GLB output.

## Scene authority and evaluation

`src/engine/project.ts` defines version-2 projects: graph, timeline, locks and monotonically increasing revision. The server validates each complete command batch before committing it. Commands rename projects, add/remove/duplicate/move/rename nodes, set typed parameters, connect/disconnect ports and set timeline duration/frame rate. Incomplete graphs may be saved; invalid types, cycles, duplicate IDs, locked changes and excessive rendering work are rejected. Incomplete inputs produce diagnostics at the corresponding node.

`src/engine/catalog.ts` is the common operator contract for inspector controls, host validation and the Claude prompt. The model does not provide executable code. `src/engine/evaluator.ts` evaluates in topological order and caches operator outputs by parameters and upstream versions; node positions do not invalidate calculations. Only branches reaching Scene output render. Source/branch budgets prevent repeated DAG connections from multiplying render work without bounds.

The viewport creates Three.js geometry from the evaluated descriptors. Particle and glyph transforms are updated with time without rebuilding the graph. Semantic graph edits reconstruct render objects; layout, label, project-name and timeline-only edits preserve them and their simulation workers; moving geometry work off the UI thread and updating only changed GPU buffers are further optimizations, not completed features.

## Motion

`src/engine/motion.ts` implements pure time-based functions. Particle identity is a seeded candidate index, with a seeded lifetime phase. Swirl, fountain and drift have analytical trajectories; turbulence is deterministic. Seeking to a time directly matches reaching it through playback. There is no accumulated solver state or collision response. Each emitter branch supports one Particle motion operator.

Text uses Three.js [TextGeometry](https://threejs.org/docs/pages/TextGeometry.html) with a locally bundled Helvetiker typeface and its accompanying license. Each character is a separate mesh, allowing wave, reveal and typewriter transforms. Text-animation nodes can be chained; translation/rotation accumulate and reveal scale multiplies. Time, start, duration and character delay use seconds.

The timeline provides play/pause, frame stepping, seeking, looping and editable duration. It defaults to 30 fps. Rendering continues at the browser's display cadence while playback time updates at the project rate. Timeline parameters are saved; the current playhead and viewing loop state are not project edits.

The GLB exporter captures one current frame. It includes `EXT_mesh_gpu_instancing`, but no baked animation tracks. WebM recording uses the canvas stream and a supported browser encoder, runs one real-time timeline pass and temporarily fixes orbit controls. It captures the viewport image without UI overlays. It is not a deterministic offline renderer or an export of editable animation curves.

## Stateful water and cloud solvers

`src/engine/simulation.ts` implements the reference solvers. Water follows the density-constraint approach in Macklin and Müller's [Position Based Fluids](https://mmacklin.com/pbf_sig_preprint.pdf): Poly6 density estimation, Spiky gradients, three position iterations, a small artificial-pressure term and XSPH-style viscosity. Spatial hashing bounds neighbor search; basin and sphere constraints resolve penetrations. This implementation clamps negative density constraints and velocities, uses a 128-neighbor cap and omits vorticity confinement. It prioritizes a stable small preview over production accuracy.

Cloud parcels integrate buoyancy, height-based cooling, drag and a divergence-free analytical curl velocity field. They produce a 48³ density grid through compact parcel kernels. A WebGL2 ray marcher takes 80 samples through the grid with noise erosion and approximate self-shadowing. There is no Eulerian pressure solve, condensation or weather model; parcels recycle at the domain edges. Rendering intersections between transparent volumes remain approximate.

Each source owns a dedicated module worker. Worker bursts are bounded to four 1/60-second steps, accept coalesced time requests and send transferable position/speed/volume buffers. Half-second snapshots store all evolving position/velocity state through the 30-second timeline limit. Backward seeks restore a checkpoint and integrate forward. Future cached checkpoints are reusable. The worker is terminated and GPU resources released when its render branch is rebuilt or removed. Render-work validation limits both source and amplified output solvers to two.

Water surfaces use Three.js [MarchingCubes](https://threejs.org/docs/pages/MarchingCubes.html) with a 52³ field and a bounded 45,000-triangle buffer. Surface reconstruction remains on the UI thread. The volume renderer uses the same general 3D-texture ray-marching approach demonstrated in the [official Three.js cloud example](https://threejs.org/examples/webgl_volume_cloud.html), with density supplied by the simulation.

Frame GLB waits for the requested simulated time, exports the water mesh, and substitutes cloud parcel instances for the unsupported custom volume material. WebM captures the rendered volume. Recording starts after the zero frame is calculated and prevents the requested simulation time from outrunning the solver; a slow solver stretches real-time recording. Errors/timeouts release the recorder and controls.

`tests/simulation.test.mjs` checks spreading/collision exclusion, control effects, fixed-step seeking equivalence, evolving cloud density and solver budget amplification. `scripts/simulation-smoke.mjs` verifies rendered rewind equivalence, controls, reload, undo, water GLB/WebM, cloud parcel GLB and two concurrent solvers; artifacts are kept under `artifacts/`.

## Flux memory and Claude

The user-owned OMMAX `packages/mem-layer/src/budget.ts` and `rrf.ts` were copied with provenance comments; the budget algorithm is used unchanged, while RRF is reserved for future hybrid search. No LangChain or LangGraph is used.

The pure assembler in `src/flux/context.ts` receives scoped events, preferences, a project and a selection. It emits current graph facts, selection, invariants, approved preferences, recent history and retrieved history with source IDs and revision/node references. Selected-node events are prioritized. Optional sections use the original Flux budget behavior and explicitly report dropped lines. Current scene facts and locks are never silently dropped. The planner rejects an oversized context.

`server/memory.mjs` adapts SQLite/FTS5 to this contract. Schema upgrades add node IDs to events and optional node scope to preferences, preserving existing rows. Only approved preferences enter context; a preference targeting a deleted node does not. Retrieval is project/branch-scoped FTS5, not vector retrieval. This modularization prepares shared packaging but does not change or publish the OMMAX package.

Claude receives the actual graph and operator catalog and returns structured commands. A proposal can add and connect an emitter or text branch, insert modifiers, or edit values. The host supplies the base revision, validates the whole batch, and checks freshness again when generation finishes. Preview is transient. Applying the proposal uses the same transactional path as manual edits. The gateway key is read server-side from the user-selected OMMAX environment file; unrelated environment values and database credentials are not imported.

## Persistence and migration

The SQLite project transaction writes scene state, undo snapshot and an outbox event together. Delivery into the separate Flux database is retryable; event IDs make redelivery idempotent. Graph events include affected node IDs. Undo/redo restore complete graph/timeline/lock snapshots but advance the revision, preventing stale patches from matching a restored old revision.

Version-1 files and snapshots are converted on read into the Alpine graph, retaining project identity, name, revision, terrain parameters, seed and locks. The pine prototype becomes an explicit graph node, so the Alpine recipe now has eleven nodes. Existing stored JSON is left intact until an actual edit; undo can still restore an old-format snapshot through the same conversion. Import creates a new project ID while retaining graph node IDs, whose scope is the project.

## Windows delivery

The renamed launcher is `Start-Fluxini.cmd`, package name `fluxini`, Tauri identifier `studio.fluxini.workbench`. The Node service binds to localhost, checks Host/Origin and requires a random session token for project APIs. It is not a security boundary against other programs already running on the PC.

Tauri source launches the bundled Node service on a random loopback port, confines navigation to that origin and shuts the service down with the window. Desktop resource preparation is implemented. Rust/MSVC compilation, WebView2-specific recording and the NSIS installer remain unverified. The Tauri Windows dependencies are documented in the [official prerequisites](https://v2.tauri.app/start/prerequisites/).

## Validation and remaining product work

Eighteen core/simulation tests exercise behavior across graph validation, caching, migration, motion, persistence, memory and AI/API boundaries. The browser script exercises a motion scene, edits, timeline controls, graph connections, node creation/duplication/deletion, preferences, project roundtrip, frame GLB and WebM recording. It can optionally exercise a real Claude graph proposal. Recorded video is decoded and compared at two times; reports are in `artifacts/browser-smoke.json`.

Remaining: native installer verification; larger-scene performance profiling; worker-based terrain geometry; artist interviews and external DCC roundtrips; a reusable shared Flux package; keyed animation curves, camera animation, general asset import, higher-resolution GPU fluid solvers, arbitrary collider geometry and offline animation rendering. These are separate from the completed graph/motion reference implementation.


## Studio 0.4

`src/StudioApp.tsx` owns the designer workspace. `creative.ts` builds bounded, connected effect bundles and selection-specific suggestions using the shared catalog and lock checks. `Dialog.tsx` handles focus containment and restoration; `ResizeGrip.tsx` supports pointer and keyboard resizing. Viewport rebuilds use a signature of project ID, node types/parameters and edges. Camera and panel preferences remain local view state. Project rename is an atomic validated command. See [delivery and verification](Studio-0.4.md).

The full-screen graph keeps the same React Flow instance and exposes a floating node picker, selection inspector and undo/redo bar. `NodePalette.tsx` filters the shared catalog and prioritizes compatible operators; creation delegates to the existing atomic command path. The parameter inspector uses unique field IDs for its workspace and graph instances. Focus stays within the full-screen graph, while Escape cancels field drafts or closes the picker before exiting. `scripts/graph-editor-smoke.mjs` verifies creation, insertion, parameter edits, protection, undo/redo, duplicate/delete, keyboard interaction and reload persistence using an isolated project store.


## Scene and font asset lifecycle

Scene management uses a separate SQLite Trash table without rewriting existing project records. Deletion checks the current revision, hides the scene, and records its memory event in the same transaction; a last-scene deletion creates a blank replacement atomically. Hidden scenes reject patch, plan, preference and read requests until restored. Restoration preserves snapshots, locks and Flux records. Duplication reparses the source, gives it a unique ID/name and revision zero, and creates a fresh undo/memory history. The original is untouched.

Fonts live in fonts.sqlite. Six bundled styles are seeded idempotently. TTF/OTF outlines are converted by Three's TTFLoader and normalized alongside typeface JSON; finite metrics, path operations, glyph count and size are validated. Imported IDs are hashes of normalized outlines, so duplicate imports reuse assets. Removing a font hides its library entry while retaining renderable data for existing scenes and snapshots. Browser font previews use the same outlines as extruded text. Missing assets or glyphs produce inspector diagnostics with a visible fallback. Fonts are loaded before export can proceed.

New editable exports use a fluxini-project-v1 envelope containing the existing schema-version-2 project and referenced imported font assets. Import validates both the graph and asset hashes before creating a new scene. A saved package is limited to 16 MB, individual imports to 3 MB and 6,000 glyphs, and the library to 100 imported styles. Old project files and snapshots gain the default font when read; source records are not bulk-rewritten. Fonts are static outlines: variable axes, color glyphs, ligature/complex-script shaping and kerning layout are not implemented.

## FX coverage and research — September 2026

Research checked official SideFX documentation on 28 September 2026. Houdini exposes an open-ended procedural system, not a finite list of effects that can all be reproduced as presets. The practical target for Fluxini is broad, clearly labeled effect families, then deeper solvers behind stable creative controls. The documentation retrieved identifies itself as Houdini 22.0; no version-dependent parity claim is made.

SideFX's [Simple FX shelf workflow](https://www.sidefx.com/docs/houdini/pyro/intro.html) builds editable simulation networks from one action. Fluxini follows that interaction model: one registry serves New and Add, each recipe instantiates ordinary editable nodes, a complete addition is one validated undoable patch, and scene budgets are checked before insertion. Template favorites are local preferences. No SideFX engine or Houdini license is integrated.

- **Particles and weather.** [POP documentation](https://www.sidefx.com/docs/houdini/dopparticles/index.html) covers forces, surface reactions, collisions and instancing. Fluxini has seeded swirl, drift, rain, snow, confetti, dust, tornado, sparks, fireworks, bubbles and fountain presets. These are deterministic analytical paths; the generic particle system does not solve scene or particle contacts. Burst ages are synchronized; weather uses independently phased lifetimes.
- **Fire, smoke and explosions.** [Pyro](https://www.sidefx.com/docs/houdini/pyro/intro.html) is a volumetric fluid system with sourced fields and solvers. Fluxini's bonfire/fireball presets are age-colored particles, and cloud/dark-smoke presets use the existing advected density parcels. Combustion, pressure projection, fuel, physically coupled smoke and fire, and realistic explosions require a new grid solver.
- **Liquids, oceans and whitewater.** [Ocean tools](https://www.sidefx.com/docs/houdini/fluid/oceans.html) distinguish wave deformation from simulated tanks. Fluxini has four physically calculated position-based-fluid setups, plus procedural multi-directional ocean waves and radial ripples. [Whitewater](https://www.sidefx.com/docs/houdini/fluid/whitewater.html) depends on a source liquid's flow, acceleration and related criteria; generic spray/bubbles are not a substitute for that coupling. FLIP/APIC, breaking waves, wakes and generated foam remain unimplemented.
- **Cloth, hair and soft bodies.** [Vellum](https://www.sidefx.com/docs/houdini/vellum/overview.html) uses position-based dynamics across multiple constraint materials. The new Fluxini cloth operator runs Verlet integration and stretch/shear/bend constraints at 60 Hz, with wind, pinned flag/curtain edges, draping, floor and sphere collisions, and seek checkpoints. It does not yet solve self-contact or tearing. Jelly, balloon and strand templates are procedural deformation; they are not elastic-volume, pressure or hair solvers. [Hair and fur](https://www.sidefx.com/docs/houdini/fur/index.html) is a wider grooming/dynamics workflow requiring dedicated data and authoring tools.
- **Destruction and granular materials.** [Destruction tools](https://www.sidefx.com/docs/houdini/destruction/index.html) provide material fracturing and constraint workflows. Fluxini exposes a precut wall, ballistic debris and a designed sand stream/pile. These are procedural previews, without fracture, rigid-body contact or grain friction. [MPM](https://www.sidefx.com/docs/houdini/mpm/index.html) covers interacting materials such as snow, soil, mud, metal, jelly, fluids and sand; those constitutive models are not implemented here.
- **Nature, energy and character FX.** Procedural terrain/scatter, growth, branching lightning and shockwaves provide design templates now. Erosion, biological growth, muscle/tissue, feathers and [crowd simulation](https://www.sidefx.com/docs/houdini/crowds/index.html) need distinct systems. Flowing strands do not imply grooming or crowd support.

The current catalog has 39 templates: nine physics presets, two artistic volume presets and 28 procedural recipes. Physics is still preview scale and restricted to two rendered solver branches. Budgets include estimated procedural mesh work. The effects share selection, transformation, undo/redo, image/video recording and current-frame GLB export; cloud GLB remains a parcel substitute.

Recommended next implementation order (engineering judgment, not a SideFX claim):

1. **Common simulation inputs and caching.** Editable collider/source nodes, cached-frame ranges, cancel/rebuild controls, per-effect viewport quality, and an offline frame exporter. Keep the template's main controls stable while exposing detailed nodes in Graph.
2. **Real smoke and fire.** Add a bounded grid solver with velocity/density/temperature advection, pressure projection, buoyancy, vorticity and combustion fields. Acceptance: mass/divergence diagnostics, obstacle exclusion, reproducible cache seeks and visibly distinct smoke/fire/explosion templates. Keep the existing particle looks as separate stylized choices.
3. **Destruction and flexible materials.** Add rigid-body contact/constraints and actual fracture geometry; then cloth self-contact, soft-body volume constraints, pressure balloons and strand collisions. Acceptance: stable resting stacks, controlled break thresholds, preserved cloth topology and reproducible exports.
4. **Liquid detail and secondary effects.** Higher-resolution GPU fluid work, arbitrary colliders, free surfaces, ocean/solver boundaries and flow-driven foam/spray/bubbles. Acceptance: measured conservation and boundary behavior, controllable breaking waves and whitewater tied to velocity fields.
5. **Granular and MPM materials.** Material models for sand, snow, mud, goo and metal need a dedicated compute backend and contact tests. Start with one validated material and add presets only after its mechanics are verified. Character grooming, crowds, tissue and erosion follow their own domain implementations.

Validation: 28 unit/integration tests include every recipe's connected output and atomic insertion, cloth motion/collisions/pins/rewind, scene deletion/restore/restart, font validation/deduplication/persistence and authenticated portable font packages. The library browser script verifies scene management, actual text geometry changes, TTF import, favorites, font-preserving export/import, filtering, cloth/wave rendering and undo. Existing graph-editor checks remain in place. All browser mutations use isolated test databases.

## Transition and shared-input milestone

The design follows familiar animation patterns: property keyframes and easing from [Adobe’s interpolation workflow](https://helpx.adobe.com/in_hi/after-effects/desktop/animate-in-after-effects/animation-keyframes/keyframe-interpolation.html), and a separate color/alpha lifetime ramp inspired by [Blender’s Color Ramp](https://docs.blender.org/manual/en/latest/interface/controls/templates/color_ramp.html). The product decision is to expose presets and two endpoints first, with detailed keyframes available below. This is an informed design choice; usability with representative designers still needs observation.

The inspector separates Look from Animate, keeps opacity in percent, and marks animated properties before an edit adds a keyframe. Selected-object tracks stay below the existing transport, collapse when space is needed, and support seeking, dragging and keyboard retiming. Full-screen graph editing shares the same inspector. Source and collision controls are usable without a graph. Three complete templates demonstrate the workflow.

Project schema version 2 gains a default empty animations array, validated against an explicit per-operator allowlist. Atomic animate/removeAnimation commands enforce timeline bounds, increasing times, unique tracks, value ranges and parameter locks. Node duplication copies tracks and deletion removes them; SQLite snapshots and Flux events include the changes. The existing gateway receives animation facts and the command schema, without another orchestration framework.

The worker gains a fixed-step particle solver with deterministic birth IDs, fractional emission credit and cached snapshots of positions, velocities, ages and emitter state. Text surfaces are sampled by triangle area using the selected font. Per-glyph reveal/wave transforms and source transform tracks are applied at birth. A shared contact helper handles sphere and axis-aligned box constraints for particle, water and cloth solvers. Graph inputs carry source/collider descriptors, while render keys include physics-relevant tracks and preserve workers for appearance changes.

Particle alpha uses a per-instance shader attribute. GLB converts instances into 16 opacity buckets and removes the shader-only attribute; generated export resources are disposed. Appearance tracks are evaluated at the rendered/exported time; PNG and current-frame GLB wait for simulation completion. WebM remains a real-time recording.

Validation adds seven focused tests for interpolation, validation/protection, migration, persistence/undo, deterministic emission, shared collisions, lifetime ramps and alpha export. The browser workflow covers both 1440 × 900 and 1280 × 720, keyframe controls, reload, worker reuse/invalidation, collider connections and downloads. Existing scene/font management and graph editing checks remain part of regression verification.

## Appearance visibility

An optional node-level visible boolean defaults to shown for existing projects. The visibility command changes only this display flag; it does not touch parameters, animation, graph edges or simulation caches. Scene-list and inspector eye buttons share one accessible control.

Evaluated render descriptors carry the branch route through merge/transform outputs. Visibility follows visual text/particle/surface modifiers, while simulation source/collider and scatter inputs remain computational inputs. A Three.js wrapper per rendered item gates its appearance without rebuilding geometry or workers. Ancestor visibility is respected by picking, camera bounds and GLB export, including the cloud parcel export substitute.

Four unit tests cover validation, parameter preservation, source/branch independence and SQLite history. The browser check verifies actual viewport changes, hidden GLB meshes, unchanged exported particle positions, worker reuse, persistence, keyboard controls and hidden-object picking.

Opacity changes refresh a shaded material only when it crosses between opaque and transparent rendering, since Three.js compiles an OPAQUE shader define. The opacity browser regression compares actual rendered pixels before an edit, after the edit, and after reload, and checks 0/11/50/100 percent, undo/redo and animated fades without restarting physics.

## Particle controls and sprite effects

The Text to sparks review found fixed upward launch, continuous-only emission, hidden force/collision controls and a capacity that can replace particles before their lifetime fade completes. The inspector now groups emission, launch/lifetime, forces/collisions and appearance, with Sparks/Fire/Smoke/Dust presets, a source visibility/edit row and an explicit capacity warning. The text shortcut opens an existing emitter; a separate action adds a second layer and copies source/collider links.

New particle parameters migrate as defaults when projects and historical snapshots are read. Existing grain rendering, opacity and seeded upward motion are preserved. Newly created Text to sparks scenes use velocity-stretched spark sprites. Presets are atomic, honor parameter locks and keyframe already animated appearance properties at the current playhead.

ParticleDynamics adds scheduled continuous/burst emission, normal/custom launch vectors, bounded variation at birth, three-axis wind, buoyancy and a deterministic procedural turbulence field. Checkpoints and worker frames include each particle's lifetime, size factor, shader seed and velocity. Text sources can sample the full triangle surface, only front-facing triangles or length-weighted outer/hole contours. Glyph motion rotates both emission positions and normals; unrevealed glyphs do not emit.

Rendering supports solid grains plus camera-facing soft dots, stretched sparks, tapered flame and procedural noisy smoke cards. Instance attributes and uniforms drive alpha, age and independent shader detail. Presets pair these styles with lifetime color/size/alpha ramps and appropriate forces. This is a stylized sprite system without a combustion or volume pressure solver, volumetric lighting or sorted per-particle transparency. Additive glow does not illuminate neighboring objects. GLB strips custom instance attributes and exports colored alpha-grouped cards; PNG and real-time WebM capture the custom shaders.

Verification: 43 unit/integration tests pass, including four new cases for scheduled births, rewind/checkpoint equality, forces and variation, front-face/outline/hole sampling, legacy migration and valid presets. The isolated particle browser test covers all five shaders, source controls, saved settings, capacity adjustment, two-layer insertion, appearance worker reuse, zero opacity, animated/locked presets and PNG/WebM/GLB downloads. Existing animation, opacity and visibility browser regressions also pass. Tests use disposable databases, never the user's saved scene.

## Keyframe shortcuts and particle lifetime correction

Timeline diamonds and inspector keyframe diamonds share Delete/Backspace handling and a right-click action menu, including in the full-screen graph. Keyboard shortcuts are scoped to those controls, so Delete in an input keeps normal text-editing behavior. Protected/preview keys cannot be removed. Deleting the final key removes its property track through the existing atomic command; Undo restores it. Ctrl+Z also works while a keyframe button is focused.

A reproduced scene requested 1,500 particles/s with capacity 1,600 and lifetime 12 seconds. The previous circular buffer overwrote each living particle after about 1.07 seconds. The solver now allocates only dead slots, skips new births while full, and resumes emission when slots become available. Checkpoints preserve the live count alongside the allocation cursor. The inspector explains emission pauses and offers a steady-rate adjustment (133/s for that scene's settings); rate keyframes are scaled proportionally. Capacity no longer shortens a particle's assigned lifetime. Birth variation and appearance fades still apply as configured.

A focused simulation regression covers twelve-second survival at the reported rate/capacity, resuming emission, burst clamping and rewind/checkpoint equality. The animation browser workflow covers keyboard/context-menu deletion, input isolation, protection, last-key removal, undo and full-screen graph focus.

Session recovery: the local service rotates its token on restart. The client now recognizes a session-expired rejection, shares one session refresh across concurrent callers, and retries the unchanged request once. It never retries network errors, revision conflicts or unrelated denials, because those do not prove the original operation was rejected before execution. A browser regression keeps the tab open through an actual service restart, deletes via the trash icon and undoes the edit. Older already-open bundles need one refresh to load this recovery behavior.

Lifetime UI verification used an isolated import of the active scene at revision 132, with 4,000 slots and emission rate 800/s. At playhead 6 seconds, changing Lifetime from 0.5 to 12 rebuilt the worker each time: the first frame had 387 live particles, oldest age 0.483s; the second had 4,000 live particles, oldest age 6.000s. No changes were made to the user's project. Images and measured worker metadata are in artifacts/lifetime.


## GPU particle simulation

Particle simulation now defaults to WebGL 2 GPU compute via Three.js GPUComputationRenderer, retaining the CPU reference as a fallback. The CPU schedules deterministic births and samples animated sources; GPU texture passes integrate motion, collisions and ages, and vertex shaders calculate lifetime appearance and billboard transforms. Playback avoids particle-state readback and per-particle instance preparation. Explicit framing, picking and GLB export materialize the current GPU state. The viewport identifies the backend and explains fallback in its tooltip.

Cached GPU states and CPU birth snapshots have a per-simulation memory budget; scrubbing into an evicted interval recomputes from a retained checkpoint. Existing parameter values and limits stay intact; legacy particle nodes gain simulationBackend=automatic on read. Water, cloud, cloth and analytical emitters retain their previous implementations.

Validation: TypeScript, 47 unit/integration tests, GPU numerical/lifetime/fallback/cache regressions, and particle, animation, opacity and visibility browser workflows pass. GPU lifetime UI checks reproduce the prior CPU measurements at playhead 6 seconds: 387 live particles at 0.5-second lifetime, 4,000 at 12 seconds. Two benchmark rounds reach 60 FPS with 32,000 sparks and smoke particles on the RTX 3080, with about one frame of simulation lag. See [GPU-PARTICLES.md](GPU-PARTICLES.md) for methodology, scope and reproduction.


## Expanded GPU and simulation detail

Particle capacity/bursts now reach 128,000 and rate 32,000/s. A 128,000 total budget, a separate 12,000 budget for other particle solvers, and two rendered solver branches are enforced across source nodes and graph amplification. Inspector capacity maxima and quick increases use graph-aware validation. High-count CPU reference checkpoints now have a memory budget.

Cloud/volumetric smoke density uses two GPU passes: parcel splats into a float slice atlas, then density normalization. Float-blend capability checks retain the old CPU path on unsupported devices. Parcel integration still uses the worker; GPU mode skips CPU volume creation and transfer. Water hot-loop exponentiation was replaced by multiplications, and surface resolution/buffer size grow with particle detail. Limits: 7,200 cloud parcels, 8,000 water particles. New Bonfire, Fireball, Sparks and Fountain starters use the GPU particle solver; saved graphs are not rewritten.

Measured results and reproduction are in [EFFECT-CAPACITY.md](EFFECT-CAPACITY.md). High-capacity UI checks validate real GPU occupancy, persistence and PNG/GLB exports, plus maximum water/cloud detail.


## Scene-building and frame-rendering foundation

Geometry, surface material, directional/point/spot light and perspective-camera operators now share the catalog, graph evaluator, animation schema and undo protocol. Geometry supplies six primitive shapes; materials expose physical shading controls and four presets. A connected material owns surface appearance, with a shortcut from its source inspector. Particle/volume shaders retain dedicated controls. Graph budgets include eight rendered light branches and eight camera branches.

Three.js TransformControls implement move, rotate and uniform scale. Live drag values are preview-only; release creates one bounded command batch. Animated values receive a keyframe, locked parameters remain protected, and Escape cancels the drag. Saved camera nodes follow animated targets and parent transforms; camera selection is a local view preference. A Studio turntable recipe demonstrates the complete workflow.

WebCodecs now encodes explicit frame timestamps after each simulation frame is ready, replacing wall-clock recording. PNG and WebM share chosen output sizes; videos use a bounded time range. Export hides editing handles, supports cancellation and restores the viewport. WebM is VP8/VP9 without audio, with 18,000-frame and 512 MiB limits. GLB preserves applicable physical materials, lights and saved cameras at the current instant.

The new studio browser check verifies actual glass shader compilation, a single-edit drag and undo, saved camera reload, HD exports, an eight-second/240-frame decoded WebM, and cancel/restore. A deliberately delayed CPU fluid export takes longer than its one-second output but still encodes 30 corresponding solver frames; GPU paint is covered by the same timing regression. Existing liquid controls, long timelines and textured GLB exports continue to pass. See the roadmap for the full scope and remaining solver, modeling, character and production work.
