# Flux3D: feature gaps and delivery plan

Audit date: **9 October 2026**. Reference product: **Blender**. This report compares user workflows and inspected source, not marketing similarity. Flux3D currently provides a compact 3D scene arranger and geometry interchange workspace. It is not a mesh-modeling, character-animation or production-rendering replacement for Blender.

Blender’s official [feature overview](https://www.blender.org/features/?eventId=21), [modeling documentation](https://www.blender.org/features/modeling/) and [Geometry Nodes introduction](https://docs.staging.blender.org/manual/en/latest/modeling/geometry_nodes/introduction.html) establish the reference domains. The live manual pages were inaccessible to the browsing tool during this audit; official indexed feature pages were used instead. No unreleased roadmap item is counted as an existing Blender requirement.

## Implemented increment — 9 October 2026

Retained studio objects are now implemented as unlit textured planes. The shared Place studio object review renders a selected source page/frame/scene; the destination retains both its PNG preview and exact original document. Replace source and Refresh preview preserve destination transforms; native save/reload, duplication, lock protection, undo/redo and source download are supported. Base color tints the snapshot and opacity controls transparency. Physical roughness/metalness controls remain available for regular geometry.

GLB/glTF exports embed the actual preview PNG with UVs, transparency and an unlit material. OBJ/STL remain geometry-only. The editable GLB importer still omits general texture/material graphs and reports this; the native scene compositor and the standard GLTFLoader preserve snapshot appearance. This increment does not add UV authoring, arbitrary mesh texturing or live source synchronization.

Each source is limited to 16 MiB and each preview to 2048×2048 / 4 MiB. A scene enforces a combined 32 MiB source/preview budget and a 16-megapixel decoded-preview budget. Texture loads are awaited for PNG/native-compositor output; replacement/removal and late loads release textures. Runtime texture state is held outside serialized scene metadata. AI context and request transport exclude original document and preview bytes.

Verified locally: all **38 Node tests**, existing **26 editor browser checks**, and `scripts/studio-object-smoke.mjs`. The source workflow proves actual red/blue transparent artwork pixels, replacement preserving transforms, one-step undo/redo, refresh, exact original download, duplicate/locks, mocked AI privacy, native save/reload, and independent native/GLB compositor rendering. No provider requests or deployment were part of these checks. Evidence is in `artifacts/studio-objects/report.json`, `red-plane-light.png`, `blue-plane-dark.png`, `scene.flux3d`, and `scene.glb`.

Inspected source: `src/main.jsx`, `model.mjs`, `geometry.mjs`, `formats.mjs`, `Viewport.jsx`, `document-state.mjs`, `scene-loader.mjs`, `compositor.mjs`, format/interoperability tests and [the optimization audit](OPTIMIZATIONS.md). Prior tests are recorded below, not represented as freshly rerun here.

## Scene assembly increment — 9 October 2026

Multi-object selection is now available in the outliner and viewport with Shift/Ctrl/⌘ toggles, Select all editable, Clear selection and Escape. The inspector accepts one relative XYZ offset for the full selection; a shared Move gizmo previews the same world-space translation on each object. Frame selected uses the combined bounds. Duplicate and Delete operate on the complete selection and select the resulting copies; each batch is one undo/redo action with its selection restored. Select all excludes hidden/locked objects, and any locked member blocks the entire batch. Existing object/geometry/source budgets still validate the final scene atomically.

Selection and numeric drafts are view state; committed scene edits survive autosave/reload and native/GLB export. Duplicates preserve immutable geometry and retained source bytes with independent transforms. This initial increment restricted group manipulation to translation. The shared-pivot increment below adds numeric rotation and uniform scale; parenting, hierarchy, collections, snapping and custom pivots remain future work. Selected outlines and gizmos are excluded from PNG output. Undo, a changed selection, or a rejected bounds check during a drag restores the captured geometry and discards the draft.

Fresh verification: **43 Node tests**, **26 existing editor browser checks**, **4 retained-source browser groups**, and **10 new multi-selection browser groups** pass. The new browser suite uses real viewport picks and gizmo drags, literal transform expectations, native download/reload and actual PNG/GLB output. A mid-drag deselection regression compares pixels before/after an independent geometry resync; the failing test drove rollback of every originally dragged mesh. Independent review reran the same 10 groups. Evidence: artifacts/multi-selection/report.json, selection-light.png, selection-dark-1280.png, selection.png, and selection.glb. No paid inference or deployment was performed.

## Bounded vertex editing increment — 9 October 2026

One visible, unlocked imported triangle mesh can now enter vertex editing. Ordinary primitives expose an explicit **Convert to mesh** action, which snapshots the exact rendered geometry without baking object transforms. Source snapshot planes remain planes. Conversion and each numeric move form one undo action; native reload and geometry export preserve the result. This adds vertex translation, not face/edge topology modeling or a general Blender edit mode.

The viewport shows X-ray vertex markers and supports click or Shift/Ctrl/⌘ toggles. Picks group exactly coincident seam vertices by default; the checkbox makes this optional. The index/range field always selects exact stored indices (including distinct hard-edge/UV seam vertices). Offsets use local mesh coordinates. Object position/rotation/scale, UVs and triangle indices are retained. Normals are regenerated only for vertices belonging to affected triangles; untouched custom normals stay exact, and split edges remain split. The original immutable geometry and duplicate mesh references are not modified. New triangle collapse after Float32 conversion is rejected atomically.

The editor limit is 10,000 stored vertices and 50,000 triangles per editable mesh, with at most 4,096 selected vertices. Larger supported imports remain renderable/exportable and explicitly show why vertex editing is unavailable. Invalid/missing indices, locked/hidden objects, nonfinite/out-of-bounds coordinates and stale geometry cannot commit. Vertex markers are excluded from PNG output. Modeling tools such as extrude, bevel, topology selection, merge/weld and UV authoring remain future work.

Fresh evidence: **51 Node tests** (8 mesh-specific), **6 vertex browser groups**, existing **26 editor browser checks**, **10 multi-object groups** and **4 retained-source groups** pass. Tests check frozen pre-edit geometry, untouched custom normals, real viewport seam picks, literal position/normal/UV expectations, actual changed pixels for imported geometry, one-step undo/redo, native reopening, explicit large-mesh refusal without source loss, and independent GLTFLoader recovery of exported positions/normals/UVs. PNG bytes match exactly with vertex editing on/off. Browser evidence is in artifacts/mesh-edit/report.json, vertex-light.png, vertex-dark-1280.png, edited.glb and the native snapshots. No provider calls or deployment occurred.

## Shared-pivot rotation and scale — 12 October 2026

Multi-selection now exposes numeric world XYZ rotation and a positive uniform scale factor with explicit **Rendered bounds center** coordinates. The pivot uses transformed geometry vertices, including off-origin imported meshes, and excludes unused vertices from indexed geometry. Rotation pre-multiplies each object's orientation; uniform scaling changes both spacing and size while retaining existing nonuniform proportions. Mesh positions/normals/UVs/indices and retained source bytes remain unchanged.

**Preview group transform** changes viewport geometry only. **Apply group transform** commits one undo/redo transaction. Escape (including from a numeric input), Cancel, pointer cancellation and selection/document changes discard a preview. Hidden, locked, missing, stale, nonfinite and out-of-range operations reject atomically. Native, GLB and PNG exports and autosave use committed scene state. PNG temporarily renders committed transforms even while viewport meshes show a draft.

The shared Move gizmo remains the direct manipulation path. Shared rotation and scale are numeric-only; there is no rotate/scale group gizmo, nonuniform group scaling, active-origin/custom pivot, parenting or hierarchy editing. The Move gizmo's origin remains the average object origin; the explicitly displayed rendered bounds center belongs to numeric rotation/scaling.

Fresh verification: **57 Node tests** (6 shared-transform tests), **6 new group browser checks**, **26 existing editor checks**, **10 multi-selection checks**, **6 vertex-edit checks** and **4 retained-source checks** pass; build succeeds. RED tests first demonstrated missing shared transform transactions and inspector controls. A real pointer-cancellation regression then drove clearing the pending viewport pick. Independent review found unused indexed vertices affecting the pivot; a failing outlier-vertex regression drove index-aware bounds. Inspector controls are verified to scroll above the floating helper at 1280×800. Browser evidence includes actual changing mesh pixels, literal off-origin/nonuniform geometry expectations, one-step undo/redo, native/autosave reopening, exact committed PNG bytes during preview and draft GLB exclusion. Independent GLTFLoader checks exported positions, scale, transformed vertices and UVs; unit checks compare embedded PNG source bytes. No paid provider calls or deployment occurred.

Evidence: artifacts/group-transform/report.json, committed-before.png, preview-export.png, preview-export.glb, scaled.png, group.glb, native snapshots and light/dark screenshots. Implementation plan: [GROUP-TRANSFORM-PLAN.md](GROUP-TRANSFORM-PLAN.md).

## Coverage and gaps

| Area | Status and current behavior | Missing or incomplete work | Priority |
| --- | --- | --- | --- |
| Scene arrangement | Working: primitives/imported meshes, multi-selection, atomic batch translate/rotate/uniform-scale/duplicate/delete, shared-pivot numeric previews, lock guards and selection-aware undo | Collections, parenting, hierarchy editing, reusable linked instances, search/filter and object grouping | P1 |
| Direct manipulation | Working subset: move/rotate/scale for one object, shared translation gizmo plus numeric shared-pivot rotation/uniform scale, orbit/pan/zoom and combined selection framing | Shared rotate/scale gizmos, snap modes, custom transform origins/pivots, constraints, align/distribute, local/custom orientations and precision tools | P1 |
| Basic modeling | Partial: six primitives, explicit mesh conversion and bounded vertex selection/local translation with affected normals | Edge/face selection and topology editing, extrude, inset, loop cuts, bevel, merge/dissolve/fill and topology tools | P1 |
| Modifier stack | Missing | Non-destructive mirror/array/subdivision/boolean/deformers with editable order and apply/bake semantics | P1/P2 |
| Curves/surfaces/text | Missing authoring workflow | Bézier/NURBS editing, curve extrusion, editable 3D text, metaballs and volumes | P2 |
| Sculpting/retopology | Missing | Brushes, symmetry, multiresolution/dynamic topology, masks, remesh and retopology aids | P3 |
| UVs and texture painting | Missing | UV layers/seams/unwrap, image assets, projection paint, brushes and baking | P1/P2 |
| Materials | Partial: base color, opacity, metalness and roughness; unlit studio snapshot textures on planes | General mesh textures, material slots, normal/bump maps, transmission/emission/clearcoat, node graph, subsurface and material library | P1/P2 |
| Lighting | Partial: fixed soft studio environment with real-time shadows | Editable lights/HDR environments, light linking, area lights and exposure controls | P1 |
| Camera | Working subset: saved position/target/FOV, presets, frame selected | Multiple cameras/shots, physical lens/sensor, depth of field, composition guides and animated camera control | P1/P2 |
| Animation in Flux3D editor | Missing | Timeline/keyframes, curves, actions/clips, constraints, drivers, shape keys and exportable animation | P1/P2 |
| Animated 3D bridge | Working separate path: FluxMotion scene layers use original GLB/glTF hierarchy, clips, skins, morphs and embedded textures | This is not animation editing in Flux3D; the editable-mesh importer still simplifies those features | P0 clarity |
| Rigging/characters | Missing | Bones, skin weights, FK/IK, rig tools, pose libraries, retargeting and nonlinear animation | P3 |
| Geometry Nodes | Missing | Typed geometry graph, attributes/fields, group assets, simulation zones and node-based tools | P2/P3; coordinate with FluxEffects |
| Physics | Missing | Rigid/soft bodies, cloth, liquids, smoke/fire, particles, hair dynamics and caches | P3; coordinate with FluxEffects |
| Grease Pencil/story tools | Missing | 2D strokes in 3D, drawing animation, onion skins and storyboard workflows | P3 |
| Rendering | Partial: real-time Three.js viewport and fixed-size PNG output | Path tracing, configurable render settings/resolution, motion blur/DOF, denoising, render passes, EXR and render queue | P1/P2 |
| Color management | Missing explicit workflow | Working/display transforms, HDR, high-bit-depth assets, OCIO and reference color controls | P2 |
| Compositing/tracking/video | Missing inside Flux3D | Compositor, masks, camera/object tracking and sequencer; nearest-term suite route is Fluxiffects/Fluximiére | P2/P3 |
| GLB/glTF editable import | Partial: bounded triangle geometry, baked parent transforms, basic PBR values and supported GPU instance colors | Editable hierarchy reconstruction, textures, vertex colors, skins, morphs and animation; compressed/required unknown extensions remain rejected | P0/P1 |
| Other geometry formats | Working subset: OBJ geometry, STL, GLB/glTF/OBJ/STL export | OBJ MTL/textures, units/axis dialogs, CAD/FBX/USD/Alembic and larger asset pipelines | P1/P2 |
| Blender native files | Missing | `.blend` is not decoded. A real Blender-host export bridge is a possible future path; an accepted extension is not a parser | P0 honesty |
| Cross-app objects | Working bounded snapshot path: review/place retained sources on textured planes; replace/refresh, save original, native persistence and portable GLB/glTF preview textures | Live synchronization, shared media deduplication and deeper editable adapters remain later work | P1 |
| AI | Working subset: reviewed typed scene/material/transform edits and primitive creation respecting scope/locks | Floating helper, visual grounding, topology/material-graph commands and explicit cost/history controls | P1/P2 |
| Files and history | Working subset: native copies, browser autosave, recovery quarantine and 30-state undo | Persistent revision history, media deduplication, backups, quota UI and large-asset save progress | P0/P1 |
| Performance | Partial: immutable geometry reuse, limits and stale import checks | Worker parsing/cancel, render-on-demand, progressive meshes, asset caching, profiling and hardware targets | P1 |
| Collaboration/add-ons | Missing | Multi-user documents, library links/overrides, Python/plugin API, render farm and signed desktop packaging | P3 |

## Format fidelity must stay explicit

The **editable geometry path** currently limits files to 64 MB, scenes to 200 mesh objects, meshes to 500,000 vertices, total imported vertices to 1.5 million and total indices to 6 million. Instancing is expanded within those limits. OBJ/STL do not imply texture/material/units fidelity. Exporting GLB preserves the supported scene geometry/material values, not unsupported original rigging or shader graphs.

The **scene-layer path for FluxMotion** preserves raw packaged source and uses the standard loader/mixer. It has separate node/key/instance budgets and can retain features intentionally absent from the editable model. These two paths must not share an ambiguous “fully editable import” label. Native Flux3D currently stores a static scene and camera.

## Detailed implementation sequence

| Stage | Concrete work and dependencies | Acceptance before completion |
| --- | --- | --- |
| B0 — dependable asset handling | Keep recovery quarantine; add versioned source/asset records, budget/report UI, worker parsing and cancel. Review before merging a whole import batch. | Corrupt native files preserve previous storage; cancelled/stale imports add nothing; allocations are rejected before decoding; exact unsupported features listed; native export can reopen offline. |
| B1 — scene assembly | Multi-selection/translation/duplicate/delete and numeric shared-pivot rotation/uniform scale delivered; collections/parents, shared instances, snapping/pivots and editable lights/cameras. Preserve local/world transform semantics. | Reparented objects retain world transforms; mirrored/nonuniform transforms and undo are tested; snapping meets grid/vertex tolerances; duplicate instances share geometry without sharing edits unintentionally. |
| B2 — useful mesh editing | Define stable mesh/attribute IDs and selection model, then vertex/edge/face edit mode plus extrude/bevel/subdivision. Implement bounded non-destructive modifier evaluation. | Reference topology fixtures validate boundaries/normals/UV ownership; modifier reorder and save/reload reproduce geometry; one operation is one undo; degenerate input fails clearly. |
| B3 — appearance fidelity | Add image/UV/material assets, slots and texture sampling before procedural shader graphs; source-object planes can reuse this asset system. | Packaged textured GLB imported/exported through independent tools matches UV orientation/material channels; relink updates all intended references; missing textures retain geometry and show notices. |
| B4 — motion | Add timeline and transform keys first, then glTF clip import/export, constraints and morphs. Preserve hierarchy rather than baking animated transforms into static meshes. | Independent GLTFLoader evaluates exported animation at reference times; reverse seek and loop are deterministic; imported source clips stay recoverable; cameras retain roll/world orientation. |
| B5 — finished output | Configurable render dimensions, explicit color pipeline, offline renderer evaluation, image sequences/queue and suite delivery. | Decoded images have expected size/color; known lighting scenes compare against references; long jobs cancel/recover; outputs never claim unsupported alpha/audio/color behavior. |
| B6 — advanced disciplines | Sculpt/retopology, rig/skin/IK, Geometry Nodes and simulation in separate milestones using shared FluxEffects infrastructure where appropriate. | Real sculpt/rig/simulation fixtures survive save/export, have measured performance and clear editing limitations; a visual preset alone cannot satisfy a solver acceptance test. |
| B7 — ecosystem | Blender-host bridge, USD/Alembic/FBX evaluation, scripted tooling, asset publishing and collaboration after document/permission semantics are stable. | Real host fixtures document retained/lost properties; dependency packaging is validated; concurrency never overwrites another revision; untrusted assets cannot trigger arbitrary reads or code. |

B0/B1 are the recommended first practical slice. B2 and B3 share geometry/asset foundations; B4 depends on hierarchy conventions. Advanced Blender-wide coverage is a long-term program, not a single release commitment. Reuse the suite’s timeline, media, AI and source-provenance contracts where they fit, while keeping the editor focused.

## Verification and freeze record

The vertex-editing and scene-assembly increments above supersede this earlier freeze for their bounded mesh and multi-object editing workflows. The original planning audit changed no source. The implemented increment above supersedes that freeze for retained source planes: 38 Node tests and 26 editor browser checks now pass, with a dedicated real-pixel source workflow. Prior document-reliability evidence remains separate. General topology modeling, texture authoring, animation editing and full Blender compatibility remain unimplemented; the source-plane feature is not evidence for those broader capabilities.
