# Flux3D

FluxCreate's local 3D workspace. Create and arrange editable primitives, adjust transforms and materials, import model geometry, and review AI scene edits before applying them. Use the suite launcher in `../FluxCreate`; the standalone workspace runs at `http://localhost:4324`.

## Local recovery and editing

If a local saved scene cannot be read or validated, Flux3D shows a persistent recovery notice and pauses autosave. Editing the visible preview will not replace that saved data. Choose **Start new scene** or successfully open a scene/model file to resume saving; a model opened during recovery starts a fresh scene. You can also save the current preview to a separate project file.

Model sizes are checked before reading their bytes. A delayed import is discarded if you create, reopen or switch scenes while it is opening. Duplicated objects keep independent transforms while sharing immutable mesh data to avoid unnecessary geometry copies.

## Multiple objects

Shift/Ctrl/⌘-click objects in the outliner or viewport to toggle membership. Select all editable excludes hidden and locked objects. Use the shared Move gizmo or inspector XYZ offsets to translate a selection together. Duplicate/Delete and each move form one undo step; undo/redo also restore the selection. Any locked or hidden member blocks the complete batch. For shared rotation or uniform scale, enter world XYZ angles and a scale factor under **Rotate & scale together**. The displayed pivot is the combined rendered bounds center, including off-origin geometry. Choose **Preview group transform**, then **Apply group transform** for one undo step. Escape, Cancel, pointer cancellation and scene/selection changes discard the preview. Native, GLB, PNG and autosave include committed geometry only. Shared rotate/scale gizmos and custom pivots are not implemented. Selection itself is temporary; committed scene edits are saved normally.

## Mesh vertices

Choose **Edit vertices** on an unlocked mesh, or **Convert to mesh** on an ordinary primitive first. Vertex markers are X-ray: click them directly, or enter exact stored indices/ranges. Coincident seam grouping applies only to viewport picks and can be disabled. Enter local XYZ offsets and apply once; Undo restores the prior mesh. UVs, triangle indices, object transforms and untouched custom normals are retained. Editing supports 10,000 stored vertices / 50,000 triangles with at most 4,096 selected vertices; larger imports remain intact. This is vertex translation, not edge/face modeling.

## Model interchange

- **GLB** and self-contained **glTF 2.0** import: triangle meshes, parent transforms, base colors, opacity, metallic and roughness values. External file or network references are rejected. Import an embedded GLB/glTF or relink/package sources in the originating application.
- **FluxEffects frame exports:** ordinary mesh geometry and bounded `EXT_mesh_gpu_instancing` particle geometry import. Instanced meshes become independently editable objects, preserving instance translation, quaternion rotation, scale and Three.js `_COLOR_0` instance colors. Children retain the node's original world transform. Mirrored transforms preserve consistent triangle winding.
- **Limits:** model files up to 64 MB; at most 200 expanded mesh objects in a scene, 500,000 vertices per mesh and 1.5 million imported vertices overall. Imported glTF index data is limited to 6 million indices overall. An instanced particle scene above the object or geometry limits is rejected before expansion; reduce particle count in FluxEffects or transfer a PNG/WebM render for appearance.
- **OBJ** imports geometry without external MTL or textures. **STL** imports geometry; units and original material appearance are not specified by that format.
- **GLB / glTF / OBJ / STL exports:** real geometry formats. GLB and glTF retain editable object transforms and material values; OBJ and STL carry the transformed geometry. PNG renders transfer the visible result to the 2D studios.

The editable-mesh importer does not reconstruct texture images, per-vertex colors, custom shaders, skinning, skeletal animation, morph animation or procedural simulation. It reports simplifications. Unlit materials become standard editable materials; per-instance colors from the supported Three.js extension are retained. Keep the original source file for full appearance and animation fidelity. Draco/other compressed or required unsupported extensions are rejected.

## Animated scenes in FluxMotion

The separate `src/scene-loader.mjs` path preserves the original self-contained GLB/glTF scene for a FluxMotion 3D scene layer. It uses the standard Three.js GLTFLoader and AnimationMixer without flattening hierarchy. Named clips, parent/child translation, quaternion rotation, scale, STEP/LINEAR/CUBICSPLINE interpolation, skeletal deformation, morph targets and embedded textures remain in the source. Native Flux3D JSON and FluxCreate wrappers preserve their saved static scene and camera. Source bytes remain embedded in the FluxMotion project for reopening.

`inspectSceneFile(input, name)` returns `{modelFormat, clips, duration, warnings}`. `validateScenePayload` validates before any Three.js parsing. `loadAnimatedScene` returns the original scene, clips, cameras, duration and a disposal function for the compositor. Scene-layer payloads support up to 64 MB, 2,000 nodes, 100 animation clips, 100,000 animation keys and 20,000 GPU instances; this GPU scene path is separate from the 200-object editable-mesh expansion limit. External URI references, malformed buffers and unsupported compressed extensions are rejected explicitly. The loader accepts embedded PNG/JPEG/WebP/AVIF textures and does not fetch external resources.

Native projects preserve this workspace's objects, mesh data, materials and camera. Use a PNG render for FluxFoto, FluxDesign or FluxVideo, and GLB for 3D geometry exchange. FluxMotion can import a native Flux3D file or self-contained GLB/glTF directly as a live 3D scene layer. Native Blender `.blend` files are not decoded.

## Verification

`node --test tests/*.test.mjs` covers model edits, locks and AI scope, supported formats, malformed file bounds, mirrored normals, instance expansion limits and hierarchy. Import fixtures are produced with the actual Three.js GLTFExporter used by FluxEffects. The inverse test loads Flux3D GLB output in the independent standard Three.js GLTFLoader and compares each object's world bounds and material settings.

The suite currently includes 57 Node tests and 26 editor browser checks. `node scripts/group-transform-smoke.mjs` adds 6 shared-pivot preview/apply groups with independent GLB geometry, real PNG output, cancellation, bounds/locks and persistence. `node scripts/mesh-edit-smoke.mjs` adds 6 vertex/source/pixel/export groups. `node scripts/multi-selection-smoke.mjs` adds 10 real browser groups for additive picks, atomic batch edits, locks, stale/rejected drags, undo, native reload and GLB/PNG output. `node scripts/studio-object-smoke.mjs` adds 4 retained-source groups. `node scripts/document-reliability-smoke.mjs` adds 6 real browser workflows covering corrupt/failed IndexedDB restore, explicit recovery, delayed imports, allocation preflight and independent duplicate transforms. See [the optimization audit](docs/OPTIMIZATIONS.md) for completed work and prioritized follow-ups.

Generated fixtures are saved at `artifacts/interop/fluxini-instanced-fixture.glb` and `artifacts/interop/animated-hierarchy.glb`; they contain no user project data. Animation tests verify genuine GLTFExporter clips, deterministic world-space motion, STEP and cubic interpolation, skeletal/morph deformation, source-byte preservation and invalid reference rejection. Instancing follows the [Khronos EXT_mesh_gpu_instancing specification](https://github.com/KhronosGroup/glTF/tree/main/extensions/2.0/Vendor/EXT_mesh_gpu_instancing).
