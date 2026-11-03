# FluxEffects — Motion + Procedural

A Windows-first procedural editor with an editable graph, water and cloud simulations, seeded particles, animated 3D text and local Flux memory. Claude uses the configured AI Gateway connection. No LangChain or LangGraph.

The target now covers the entire Houdini-style toolset. See the [complete-toolset roadmap](docs/FULL-TOOLSET-ROADMAP.md) for implemented capabilities, remaining domains and acceptance gates. Full parity is not implemented.

See the [suite README](../README.md) for setup and the [branding map](../docs/BRANDING.md) for current display names.

## Start on this PC

Double-click **`Start-Fluxini.cmd`**. The launcher opens an Edge app window and runs the local service at `http://127.0.0.1:4318`. Keep the terminal open while working. Existing projects remain in `.data/`.

Choose **New → Dam break** for a fluid simulation or **New → Drifting cloud** for a buoyant volume. Press Play, or Space with the canvas focused. The Design inspector leads with creative controls. Open **Advanced controls** for simulation detail, gravity, variation, display mode and parameter protection.

For the motion example, choose **New → Type + particles**. **Alpine landscape** creates the terrain example; **Start empty** starts a blank graph. **Add → Effects** adds complete branches to the current composition. **Add → Operators** exposes individual nodes. Old Haidini/Fluxini version-1 project files still import; their terrain parameters and locks are mapped to graph nodes.

## Studio 0.4: a workspace for designers

Objects is the default view. Open **Graph** and **Ask Flux** as needed; resize the inspector or hide the scene panel. In the graph header, **Full screen** expands the graph across the app; **Exit full screen** or Escape returns to the same workspace layout. The graph keeps its previous zoom unless nodes were added or removed, in which case it fits the updated graph. Layout and camera choices persist on this PC. Primary controls have units, inline validation and per-field reset. Suggestions match the selected effect. F frames the selection; Home frames the composition. Help, New, Rename and Export dialogs support Escape, focus containment and focus restoration. Rename the project with the pencil beside its name; the name change supports undo.

In the full-screen graph, the floating **+ Add node** button (or **Shift+A**) opens a searchable node picker. Compatible nodes appear first and insert after the selection. Select a node to edit its parameters in the floating window, including connections, protection, duplicate and delete. Hide the window for more graph space; selecting a node opens it again. The bottom bar provides undo/redo, and Ctrl+Z / Ctrl+Shift+Z work when a text field is not being edited. Escape closes the node picker before exiting full screen.

**Organize** selects several nodes with Ctrl/⌘-click, checkboxes or **Select upstream branch**. Move their layout by an X/Y offset, align left, arrange a row, duplicate or delete in one undoable edit. Copies retain animation and source bytes, reconnect internal wires and keep shared external inputs; connect their output explicitly when ready to render them. The inspector and AI continue to use the focused node. Selection is temporary, and multi-node movement uses the layout controls. Protected nodes and Scene output cannot be duplicated or deleted in a batch. The existing 32-command limit applies to the complete operation; an oversized operation is rejected without partial changes. See [feature status and verification](docs/FEATURE-GAPS.md).

## Persistent history and continuous paint

Undo has no fixed step limit and survives app restarts. Use Ctrl+Z and Ctrl+Shift+Z or Ctrl+Y. **History → Scene history** lists saved revisions with paging. Restoring a revision creates a new undoable edit. Earlier redo branches remain recoverable after a new edit. Local disk capacity is the practical limit. Edits discarded before archiving was installed cannot be recreated; portable project copies omit local history.

**New → Paint mixing basin** starts a continuous GPU basin with twelve editable pigments. **Surface & colors** offers Vivid, Gallery and Mineral palettes, a 3–12 color count and **Keep colors separate**. Pigments follow the simulated flow; separate mode disables diffusion and retains distinct color regions. **New inlet color every** cycles through the palette at the three recirculating inlets. Palette edits respect locks and animation and preserve the calculated simulation state.

**Continuous preview** advances beyond the saved clip length without looping to zero. The timeline displays ∞ and expands as playback advances; **Clip** sets the default export length. Video export starts at the playhead, with an editable range. The overall 999,999-second scene-time limit still applies; distant uncached frames require calculation. Old scenes keep their previous settings until edited.

The overturning sheets, detached droplets and thick 3D folds in the supplied video require the separate 3D-fluid milestone. The current model remains depth-averaged. See [paint behavior and verification](docs/PAINT-AND-TIMING.md).

## Studio geometry, materials, lights and cameras

Choose **New → Studio turntable** for a complete editable example. Add individual Geometry, Surface material, Light or Camera operators from **Add → Operators**. Geometry includes sphere, box, cylinder, cone, torus and plane. Surface materials provide matte, polished-metal, glass and coated-plastic presets; color, roughness, metalness, transmission, clearcoat, opacity and advanced optical/emission controls can be animated. Material nodes override their connected surface appearance; the source inspector links to the material. Particle and volume shaders keep their own appearance controls.

Use **W / E / R** for Move, Rotate and uniform Scale. Dragging creates one undoable edit and respects locks. Editing an already animated transform adds a key at the playhead. Escape cancels a drag. Handles apply only to supported object transforms; a particle simulation’s emitter position remains an emission control. Geometry primitives are visual objects; use Shape for supported sources/colliders.

Choose a saved camera or Perspective/Top/Front/Right above the viewport. Saved cameras animate position, target and field of view. Frame selection, Frame all and Reset camera return to the editor view. Directional, point and spot lights expose color, intensity, targets and shadows. These are real-time scene tools; path tracing, texture authoring and depth of field remain planned.

## Scene, FX and font libraries

**Scenes** in the left panel, or the folder beside the current project name, opens saved-scene management. Search, open, duplicate or delete a scene. Delete moves it to persistent Trash; Restore brings back its graph, history, locks and Flux context. Duplicates start independent edit and memory histories. Deleting the last active scene creates an empty scene.

**New** and **Add → Explore FX library** share 43 editable templates in eight families. Search by effect, filter by method and favorite common presets. Water, paint, cloth and particle recipes use their respective physics solvers; cloud and smoke use artistic parcel simulation with GPU density generation when supported. The other templates use procedural motion or geometry. Every card explains its method and limits; the library disables additions that exceed scene budgets. Full production Pyro, FLIP, MPM, rigid-body fracture, hair and crowds remain future solver work, not hidden capabilities of the presets.

**Fonts** opens a local typeface library: six included regular/bold styles, actual outline previews with editable sample text, search, favorites, display names and TTF/OTF/typeface-JSON import. Select a text object and choose **Typeface**, or browse/import directly in its inspector, including the full-screen graph. Imported fonts persist across restarts. Removing an imported style hides it from the library but preserves existing scenes and undo history; reimport restores it. Each file represents a static style. Color fonts, variable axes and complex-script shaping are not supported. Editable scene exports include referenced imported fonts, so copies can be reopened on another FluxEffects installation. Old unwrapped project JSON still imports.

The research, solver boundaries and next implementation sequence are documented in [FX coverage](docs/IMPLEMENTATION.md#fx-coverage-and-research-september-2026).

## Build and animate a scene

1. Select **3D text** in Objects. Change the text and press Enter or leave the field. Adjust size, extrusion, tracking, color and position.
2. Select **Animate text**. Choose wave, reveal or typewriter behavior. Edit amplitude, frequency, character delay, start and reveal duration. Multiple text-animation operators can be chained.
3. Select **Particle emitter** and **Particle motion**. Control count, seed, radius, size, color, speed and lifetime; choose swirl, fountain or drift. Motion is an analytical function of seed and time, so seeking backward reproduces the same state. Use the separate **Water simulation** or **Cloud simulation** operators for stateful simulation.
4. Press **Space** or Play. Scrub or step through the timeline. Duration is saved with the project; the playhead and loop toggle are local viewing controls.
5. Add operators from the library. Compatible modifiers insert after the selected node. Source operators connect to Scene output automatically. Drag ports to wire nodes, double-click a wire to remove it, or use **Advanced controls → Input connections** in the inspector. Duplicates retain their inputs and start without output connections.
6. Open **Ask Flux** and describe an edit to Claude. Proposed nodes and parameters appear in a preview with a command list. **Apply change** commits the whole edit; **Discard** leaves the stored project unchanged. Ctrl+Z and Ctrl+Shift+Z undo/redo graph edits.

The catalog contains 25 operator types: Geometry primitive, Surface material, Scene light, Scene camera, Paint basin, Shape / collider, Particle simulation, Cloth simulation, Procedural FX, Water simulation, Cloud simulation, Ground grid, Fractal height, Trail curve, Distance mask, Scatter points, Instance prototype, Instance on points, 3D text, Animate text, Particle emitter, Particle motion, Transform, Merge branches and Scene output.

## Water and clouds

**Water simulation** uses a fixed-step position-based fluid solver: neighboring particles enforce density constraints, gravity accelerates the fluid, viscosity damps relative velocity, and a basin plus adjustable sphere exclude particles. Choose a dam break or falling drop, adjust the initial push and inspect the particles or the reconstructed reflective surface. This is a small CPU fluid preview, not a production FLIP/ocean solver; connected Shape nodes can also supply sphere or axis-aligned box colliders. Arbitrary scene meshes do not act as colliders.

**Cloud simulation** moves buoyant parcels through a turbulent wind field and splats their density into a 3D texture. A ray-marched material adds density detail and approximate light absorption. Wind, buoyancy, turbulence, parcel radius and density are editable. This is an artistic volume model: it has no pressure projection, condensation or weather thermodynamics. Parcels recycle at the domain boundaries. Intersections between multiple transparent volumes are approximate.

The solvers run at 60 fixed steps per second in background workers, with half-second checkpoints. The viewport shows calculation progress when seeking ahead; playing, rewinding and seeking to the same frame reproduce the same state. Changing physics inputs or emission/collider tracks rebuilds the cache. Color, opacity and particle lifetime styling update without restarting it. Node layout, labels, project name and timeline duration do not restart workers. Falling drops start with a spherical lattice at rest spacing. Simulation state is reconstructed from saved graph parameters rather than stored in the project file.

## Saving and exporting

Open **Export** for these options:

- **Save a copy:** a portable package containing a version-2 `.fluxini.json` project with graph, stable node IDs, parameters, locks, timeline settings and any imported fonts used by text nodes. **Import** imports an independent project. Memory and undo history stay in the local databases.
- **3D scene → Export GLB:** exports the current instant as GLB 2.0, including the current water surface, extruded text, particle/terrain instances, surface materials, saved cameras and lights. Clouds export their underlying parcel geometry because GLB does not preserve this custom volume shader. Use WebM for the rendered cloud. It does not export animation tracks. Consumers need `EXT_mesh_gpu_instancing` support for the instances.
- **Image → Save image:** waits for the calculated frame, then saves PNG at HD, Full HD, square or current-viewport dimensions.
- **Video → Render video:** calculates every frame in a chosen time range and encodes it with explicit timestamps. Slow simulations increase render time while output timing stays fixed. Choose HD, Full HD, square or current-viewport size. Cancel restores the viewport. This requires WebCodecs in Edge/Chrome; output is VP8/VP9 WebM without audio. Ranges are limited to 18,000 frames and 512 MiB of encoded data. Overlays and editing handles are excluded.

## Flux and the existing Claude connection

The ignored `.data/connection.json` references the existing environment file:

```json
{ "envFile": "D:/OMMAX/apps/web/.env.local" }
```

Only `AI_GATEWAY_API_KEY` is read from that file, server-side. No OMMAX files are modified, no OMMAX database is connected, and no key is copied into this repository or browser. Alternatively set `FLUXINI_FLUX_ENV` or supply `AI_GATEWAY_API_KEY` directly. `FLUXINI_MODEL` overrides the existing `anthropic/claude-sonnet-5` model convention.

AI requests send the user request, operator catalog, current graph, locks, selection and selected memories to the configured gateway. Mesh buffers and exported media are not sent. Startup and local editing make no model calls. Without gateway configuration the graph editor, timeline, recording and local memory work offline.

Memory events reference node IDs and scene revisions. Preferences can apply to the whole project or the selected node. A candidate must reference an event from the same project and be approved before entering AI context. Deleted nodes' preferences are excluded from context. Flux context assembly lives in a storage-independent module; the SQLite adapter supplies scoped records. This remains a local adaptation of Flux, not a newly published shared OMMAX package.

## Development and validation

Node.js 24+ and pnpm are required. The Windows launcher also finds the prepared `.runtime/node.exe` or the existing Codex runtime.

```text
pnpm install
pnpm build
pnpm start
pnpm typecheck
pnpm test
```

`pnpm dev` builds once and starts the service; restart after source changes. `node scripts/build.mjs --staging` builds `.staging-dist` without changing the running application's assets.

Browser verification uses Playwright and Edge:

```text
node scripts/studio-tools-smoke.mjs
node scripts/render-timing-smoke.mjs
node scripts/liquid-physics-smoke.mjs
node scripts/browser-smoke.mjs --staging
node scripts/simulation-smoke.mjs --staging
node scripts/animation-smoke.mjs --staging
node scripts/opacity-smoke.mjs --staging
node scripts/particle-controls-smoke.mjs --staging
node scripts/studio-smoke.mjs --staging
node scripts/graph-smoke.mjs
node scripts/graph-editor-smoke.mjs --staging
node scripts/libraries-smoke.mjs --staging
node scripts/browser-smoke.mjs --staging --live
```

Only the command with `--live` makes a real gateway request. The script uses an installed Playwright package or the Codex runtime's bundled package. Override `FLUXINI_PLAYWRIGHT_PACKAGE` with a package.json path and `FLUXINI_BROWSER` with a browser executable if needed. Test databases are isolated from `.data/`; reports and media are written to `artifacts/`.

Core checks cover atomic commands, port types, cycles and rendering budgets; cache invalidation; old-file/database migration; deterministic particle/character motion; persistent undo/redo; recoverable memory writes; node-scoped preferences and project isolation; independently validated AI proposals; and stale concurrent responses.

## Desktop status and limits

The browser workbench and Node service are implemented. Tauri-2 source is in `src-tauri/`; **the native shell and NSIS installer have not been compiled or tested here**, because Rust/MSVC are absent. After installing the [Windows build prerequisites](https://v2.tauri.app/start/prerequisites/), `pnpm desktop` runs it and `pnpm desktop:build` prepares an installer. Verify WebView2 recording, file downloads, full redistribution notices and signing before distributing it.

The CPU reference engine uses incremental node evaluation; geometry/render-object reconstruction still runs on the UI thread. Budgets are 64 nodes, 128 edges, 128,000 total particles, a separate 12,000 budget for other particle systems, 100,000 estimated mesh vertices and 384 rendered text characters, including repeated output branches. A scene may render at most eight light branches and eight camera branches. These are protective limits, not performance guarantees. Six included font styles and imported outline fonts are available; missing glyphs are reported in the inspector. Simulation is limited to two rendered solver branches per scene: 400–8,000 water particles or 200–7,200 cloud parcels per source, cloth meshes with 12–36 subdivisions, or up to 128,000 ballistic particles in total. GPU paint uses a bounded 256²/384² shallow-water grid. Custom Bézier handles, general asset import, general collision geometry, high-resolution fluid solvers, Rust geometry and WebGPU compute remain later work.

Projects and memory use separate SQLite WAL databases. Stop the service before copying `.data/`, or use a SQLite backup; copying only an active `.sqlite` file can omit changes in its WAL. Version-1 database states and undo snapshots migrate when read; there is no destructive bulk rewrite.

The 0.4 live gateway verification received HTTP 500 on 27 September 2026; local editing, memory and validated offline previews passed. The model configuration was preserved. See [release verification](docs/Studio-0.4.md) for evidence and remaining gates.

See [implementation details](docs/IMPLEMENTATION.md) and the original [product concept](Fluxini-Konzept-2026.md).

## Animate a look, or a particle’s lifetime

Select an object and choose **Animate**. Start with **Fade in**, **Fade out**, **Change color** or **Grow & fade**, or set a property’s **From / To**, **Start / End** and **Easing**. Opacity uses percentages. The selected object’s keyframes appear below the timeline: click to seek, drag to retime, or focus a diamond and use the arrow keys to move one frame. Select a keyframe diamond and press Delete (or Backspace), or right-click it and choose Delete keyframe. The same shortcuts work on diamonds in the Keyframes editor. Deleting the last key removes that property's animation; Undo restores it. Typing in value fields keeps normal text-editing behavior, and protected properties cannot be deleted. Expand Keyframes for individual values. Editing an animated property in Look adds a keyframe at the playhead; it does not silently change a hidden base value. All edits are saved, undoable and subject to parameter protection.

Text, shape and procedural FX support color, opacity, scale and position. Particle fields support color, opacity, size and position; simulated particles support color, opacity, size, glow and emission rate. Water, cloth and clouds support color and opacity. Transform nodes animate a whole branch’s position, scale and X/Y/Z rotation. Each property supports up to 24 keys with Linear, Ease in, Ease out, Smooth or Hold interpolation. Color interpolates in linear light. Imported older scenes keep their appearance and receive empty animation tracks.

For particles, **Look → Over particle lifetime** is separate from scene animation: set an end color, end opacity, end size multiplier, easing and optional fade-in fraction. This applies to both procedural emitters and simulated particles. Current-frame GLB approximates per-particle alpha using 16 opacity groups; PNG and video preserve the rendered appearance.

Try **New → Text to sparks**, **Bouncing particles**, or **Color + fade title**. You can also select text and click **Emit particles from this text**. The Particle simulation inspector has an **Emit from** selector, collision checkboxes and a **+ Floor** shortcut. Add a Shape and choose sphere or box to make another emitter or collider. Water and cloth expose the same objects under **Scene collisions**.

Particle simulation runs at 60 Hz with four collision substeps, seeded emission, gravity, drag, bounce and friction. Text samples the chosen font’s surface; animated source position and scale affect newly emitted particles. Up to eight connected shapes can collide with one simulation. Colliders are spheres and axis-aligned boxes with discrete contact projection: very thin or fast-moving obstacles can be missed, and overlapping constraints can conflict. This is a design preview, with no particle-to-particle contacts, arbitrary mesh collision, pressure fluid solve, particle trails or offline renderer.

## Object visibility

Use the eye beside an object in **Objects**, or in the selected object’s inspector header, to hide/show its appearance in the viewport and image, video and GLB exports. Hidden objects remain editable, and their source/collider connections and simulations continue to work. For example, hide a text source and collision floor to render only the emitted particles. Visual modifiers inherit a hidden source; independent simulation and scatter outputs remain visible. A hidden merge or transform hides that rendered branch. Calculation-only nodes and Scene output have no appearance toggle.

Visibility is independent of opacity and animation, is saved in project files, supports undo/redo and is copied when duplicating objects or scenes. Toggling it reuses the existing geometry and simulation workers. Hidden objects do not intercept viewport selection or affect camera framing.

## Text particles, fire and smoke

Select **Particle simulation → Look** and choose **Sparks**, **Fire**, **Smoke** or **Dust**. Presets update look and motion together in one undoable edit while keeping the source, collisions, seed and emission timing. Protected values disable incompatible presets; an already animated appearance property receives a keyframe at the playhead. Existing saved scenes keep their previous grain appearance until you choose an effect.

The inspector groups controls by task:

- **Emission:** continuous stream or one burst, start time, optional emission duration, particle capacity, and full-surface, front-face or outline emission from text. Living particles always finish their lifetime. When capacity is full, new emission waits for a free slot instead of replacing a living particle. The capacity note offers to raise the limit or match emission rate to lifetime for a steady stream; animated emission rates are scaled proportionally.
- **Launch & lifetime:** up/down/front/back/outward/custom direction, speed, spread, lifetime and random variation. Outward uses the sampled surface normal, including letter contours and holes.
- **Forces & collision:** wind on three axes, buoyancy, turbulence, flow detail, gravity, drag, bounce, friction and collider connections.
- **Particle appearance:** solid grains, soft dots, velocity-stretched sparks, animated flame or smoke sprites, size variation, color, opacity and additive glow. **Over particle lifetime** controls fade-in, end color, end opacity and end size.

Each emitted particle has a seeded lifetime, size and shader variation. Camera-facing flame/smoke sprites animate independently; forces move them through the scene. These are stylized particle effects, with approximate transparent overlap, rather than volumetric combustion, pressure flow or self-shadowing smoke. Glow increases additive brightness and does not light nearby objects. Sparks stretch with velocity; they do not create trail geometry. The separate Cloud simulation still provides the density-volume rendering option.

Select a text object and **Emit particles from this text**. If it already emits particles, **Edit emitted particles** opens that simulation, and **+ Add another particle effect** adds a second layer using the same source and colliders. This lets fire and smoke share a title. The source eye hides the letters while keeping emission active. Source position, scale and character animation are sampled at birth. A burst is emitted during the simulation step starting at the chosen time, and becomes visible one 60 Hz step later.

PNG and WebM preserve the rendered sprite effects. Current-frame GLB contains particle cards, color and approximate alpha; custom flame/smoke noise, soft masks and additive glow are not reproduced by GLB. Use an image or video when the final appearance is required. Physics/emission changes rebuild the deterministic simulation; effect style, glow and lifetime styling update it in place.

## Particle performance checks

Particle simulations automatically run physics, collisions and lifetime appearance on the GPU when supported. The viewport shows **GPU simulation**; **Advanced controls → Simulation device** can force CPU mode. Emission scheduling, source sampling, water, cloud parcel motion, cloth and the separate procedural emitter stay on the CPU. Volumetric cloud/smoke density generation runs on the GPU when supported. Unsupported hardware falls back to the CPU solver.

On this RTX 3080, 32,000 sparks and smoke particles held 60 FPS in both benchmark rounds, compared with 15.9–17.3 FPS on the CPU baseline. Simulation lag dropped from about 1.92 seconds to one frame. The editor now supports 128,000 particles per scene and 32,000 births/s. Subsequent 128k burst and continuous-text tests held 60 FPS on this PC; this is not a maximum-capacity claim. See [GPU architecture, measurements and limits](docs/GPU-PARTICLES.md).

Run **node scripts/particle-benchmark.mjs --backend=GPU** for the GPU benchmark. The default CPU command and **node scripts/particle-benchmark-report.mjs** regenerate the CPU baseline. Run **node scripts/gpu-particle-check.mjs** for numerical parity, lifetime, fallback and bounded-cache rewind checks.

**node scripts/lifetime-smoke.mjs** checks that editing Lifetime changes actual GPU ages, particle survival and the rendered scene; add **--cpu** to test the worker fallback. **node scripts/animation-smoke.mjs --staging** also verifies trash deletion and undo after a real local-service restart without reloading the test tab. An older already-open version needs one refresh to load session recovery.


## Expanded effect detail

Particle capacity and burst count reach **128,000**, with a shared scene budget and at most two solver branches. Emission rate reaches **32,000/s**. Raising capacity reserves more live slots; raising emission rate makes a continuous effect denser. New Bonfire, Fireball burst, Sparks and Fountain spray starters use the GPU particle solver. Saved procedural scenes retain their existing behavior.

Cloud and Dark smoke now offer **7,200 parcels** with GPU density generation. Water offers **8,000 fluid particles**, finer surface reconstruction and a faster CPU solver. High-detail water can calculate slower than playback; start at 2,400 or fewer for smoother interaction. Water/cloud particle counts are now in the main Look controls. Existing counts and lifetimes are preserved. See [measured capacity and limitations](docs/EFFECT-CAPACITY.md).
