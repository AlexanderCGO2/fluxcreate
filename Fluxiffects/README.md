# Fluxiffects

A standalone, local motion design editor with a calm, Apple-inspired interface. Fluxiffects has its own project folder, build, launcher, and browser storage. Version 0.3 adds reusable creative preferences and three editable AI directions to the existing Fluxini exchange and composition assistant.

## Open the studio

Double-click **Start-Fluxiffects.cmd**, or open **http://localhost:4320** while the local server is running.

Keep the sibling `FluxExchange`, `FluxCreate`, and `Flux3D` projects beside this directory. They supply the exchange codec, suite integration, and shared 3D loader/compositor. Install Flux3D's dependencies before building Fluxiffects from source. From this directory, with Node.js 22+ and pnpm installed:

```sh
pnpm install
pnpm build
pnpm start
```

For development, `pnpm dev` watches source changes; refresh the browser after an edit. The server binds only to `127.0.0.1`. Chrome and Edge support the complete tested workflow. The Windows launcher also detects the bundled Codex Node runtime if Node is not on PATH.

## What works

- **Compositions:** multiple compositions, custom dimensions, background color, duration and frame rate; landscape, portrait and square presets.
- **Layers:** editable text, rectangles, ellipses, solids, nulls, images, video, audio and live 3D scenes. Duplicate, delete, reorder, show/hide and lock layers.
- **3D scenes and motion:** import native Flux3D scenes, GLB or self-contained glTF. Original scene bytes, embedded motion clips, hierarchy, skeletal animation and morph targets stay in the saved project. Choose a clip, loop it, adjust speed/source start, and animate scene translation, rotation, scale and camera orbit/elevation/zoom with normal keyframes. Each scene renders into its own layer, with existing 2D transforms, opacity, blend modes and effects.
- **Canvas:** live preview, selection, dragging, corner scaling, fit/custom zoom, panning, grid and full-resolution rendering. Imported 2D affine parenting is supported.
- **Timeline:** playback, looping, frame stepping, scrubbing, movable clips, in/out trimming, clip splitting and draggable keyframes.
- **Animation:** position, scale, rotation, opacity and other numeric property tracks; linear, ease in, ease out, ease in/out and hold interpolation. A value graph displays the evaluated curve. Fade, rise, pop and drift presets create editable keyframes.
- **Design:** text editing, font family/weight/size/tracking, shape fills, rounded corners, transforms, opacity and blend modes.
- **Effects:** blur, glow, brightness, contrast, saturation and grayscale controls. The renderer also supports shadow, hue and sepia in imported project data.
- **Media:** import and embed images/video/audio; relink missing AE footage; preview audio; adjust per-layer volume, mute, playback speed and source start. Trimming and splitting preserve source timing.
- **Freeze frames:** create a PNG copy from the video frame at the playhead, holding over the whole layer duration. Keeps editable picture keys/effects/parenting and retains the original video hidden and muted in one Undo. See [scope and limits](docs/FREEZE-FRAME.md).
- **Projects:** undo/redo, device-local IndexedDB autosave and portable JSON save/reopen, including imported media.
- **Export:** full-resolution PNG and precise timestamped WebM from a committed composition snapshot, with stereo Opus, progress/cancel and explicit picture-only output. Up to 60 seconds / 60 fps; precise output supports up to 4096 pixels per side / 8.8 megapixels. Explicit real-time WebM fallback remains available. See [timing, memory and codec limits](docs/AUDIO-EXPORT.md).
- **Appearance:** light and dark workspaces, keyboard shortcuts and compact desktop layouts. The editing workspace is designed for desktop; narrow phone screens use a horizontally scrollable layout.
- **Flux Exchange:** readable `.flux.md` import/export for both studios, creative briefs, handoff notes, compatibility reports, and explicit recovery of saved native source snapshots.
- **Ask Flux:** refine selected layers or the active composition, create a new editable composition from a brief, or explain a scene. Review animated before/after previews and individual changes before applying; every applied proposal is one undoable edit.

## Exchange with Fluxini

FluxLab can send saved MP4/WebM videos and MP3/WAV audio directly to Fluxiffects. Review the playable preview and choose **Add to project** to create a media layer. The transfer carries the original saved file, up to 64 MiB, rather than an expiring generation link. Canceling the preview leaves the composition unchanged. Embedded sources remain in native project copies; audio plays in the editor and is included in the WebM sound mix.

Choose **Exchange** in Fluxiffects, add a brief and handoff notes, and save a `.flux.md` file. In Fluxini, import that file and review the conversion report. To return, choose **Export → Exchange** in Fluxini and import the resulting file into Fluxiffects.

Markdown carries readable context and one versioned JSON block with the authoritative scene data. Text, basic shapes, placement, colors and supported animation convert into editable elements. Each export saves that studio's current native source and retains the other studio's latest source snapshot. Returning a file converts the latest work by default; **Recover saved source** explicitly opens the older native copy. Keep earlier handoff files for historical versions.

2D composition and procedural 3D features do not have exact equivalents. Conversion reports explain approximations and unsupported content. For a faithful particle, fluid, or procedural effect, export a PNG or WebM from Fluxini and import it as media here; keep the Markdown alongside it for source recovery. Exchange files are limited to 16 MB. See [the format and compatibility specification](../FluxExchange/README.md).

## AI inside the editor

Open **Ask Flux** and choose **Refine**, **Create**, or **Understand**. Choose the selection or whole composition as context. A saved creative brief carries design intent through later prompts and exchange files. Generated text, shapes, effects and keyframes remain normal editable project data.

**Creative preferences** saves up to 30 named rules on this device, such as a palette or typography principle. Check up to 10 rules to include with your next request. Saving a rule does not select it, and editing a selected rule deselects it. Request selections clear after sending, switching projects, or closing the AI panel. This library stays separate from project copies and exchange files; the project brief remains the portable place for shared design intent.

Choose **Explore → Three directions** to generate three alternatives in one AI request. Compare their animated previews, then apply the direction you prefer. Each alternative starts from the same scene, and the chosen result remains one undoable edit. This works for both refining a scene and creating a new composition. Three directions can take longer than one; each is limited to 16 edit commands. Understand returns one explanation.

The local server reads the existing Fluxini AI Gateway connection; it does not copy or expose credentials. The configured Fluxini model is reused without automatic fallback. AI requests send your prompt, brief, explicitly selected preference text and chosen scene properties. Media bytes, file paths, unrelated compositions, AE metadata, unselected preferences and saved exchange snapshots are excluded from the provider context. A configured connection still requires a successful provider request; errors appear in the panel without applying changes.

Proposals use validated typed commands, respect locked layers and selection scope, and are rejected if the scene changed while the request was running. AI cannot execute expressions or scripts. See [AI architecture, limits and next steps](docs/ai.md).

For imported 3D scenes, Ask Flux can propose scene transform and camera keyframes, clip selection, looping, speed and source timing. It receives scene-layer properties and clip names/durations, never model bytes. Editing internal meshes, bones, materials or animation tracks remains a source-editor task.

## Bringing 3D into motion

Try [A softer perspective — download the 3D motion study](http://localhost:4320/examples/3d-motion-study.fluxiffects.json) ([local project file](public/examples/3d-motion-study.fluxiffects.json)). Use **Import → Open a project** to open the six-second example. Its warm, sculptural scene includes the original editable Flux3D objects, camera and model keyframes, and separate editable titles. Select **Soft forms / animate in 3D** to explore the controls; save a copy to keep your own version.

Choose **Import → 3D scenes & motion** and open a `.flux3d`, native Flux3D `.json`, `.glb`, or self-contained `.gltf` file. This adds a layer to the current composition. In the Design inspector, use **In three dimensions**, **Camera**, and **Scene motion**. The diamond buttons create editable keyframes, and the Graph editor displays these tracks. Source animation follows the playhead, including backward scrubbing; trimming and splitting preserve its source timing.

Native Flux3D imports retain the saved scene and initial view. GLB/glTF imports retain supported standard animation clips, including transforms, skins and morph targets. They use a fitted initial view; camera controls apply relative offsets. Source textures and buffers must be embedded: external resource URLs, separate `.bin` files and compressed formats requiring extra decoder plugins are not loaded. Re-export as a self-contained GLB when needed. Import is limited to 64 MB per scene. PNG and WebM exports render the 3D layers at the composition time.

Each imported scene is a single composited layer. Internal objects are edited in Flux3D or the original 3D application; separate scene layers do not share depth, lights or shadows. Native `.blend` files require export to GLB/glTF first. The After Effects bridge still supports 2D properties only; its AE cameras and 3D layers are not converted into this scene format. Other 2D suite editors report and skip live 3D layers during conversion; use a PNG render when a flat image is needed. Markdown preserves the original Fluxiffects source snapshot subject to its 16 MB limit.

## After Effects import

**Native `.aep` and `.aepx` projects are not decoded directly by this version.** The included bridge runs inside an installed copy of After Effects and exports an editable `.fluxiffects.json` project.

1. Open the original project in After Effects.
2. In Fluxiffects choose **Import → After Effects project → Download AE bridge**.
3. In AE choose **File → Scripts → Run Script File** and run `Export-to-Fluxiffects.jsx`.
4. Import the exported JSON into Fluxiffects and relink missing footage from the Media panel.

The bridge transfers supported 2D compositions, text, solids, footage references, layer timing, parenting and transform keyframes. Effects metadata, expressions and unsupported properties are retained as inert metadata with import warnings. Spatial/temporal Bézier behavior is approximated; shape paths, nested composition rendering, 3D, cameras, masks, track mattes and third-party effects are not reproduced. Text/font substitution can affect layout.

See [the detailed compatibility guide](docs/after-effects-import.md), [the bridge script](public/bridge/Export-to-Fluxiffects.jsx), and [a sample bridge project](public/examples/after-effects-sample.json). The script has been validated against a mocked AE scripting host and the real Fluxiffects importer; execution inside a real installed After Effects host has not yet been verified.

## Keeping your work

Autosave stays in this browser on this device and origin. Use **Export → Save a project copy** (`Ctrl/⌘+S`) for a backup or to move your project. Clearing browser storage removes autosaves. Media files are embedded in saved projects; the UI limits each imported file to 100 MB and total embedded media to roughly 100 MB. AE references must be relinked before rendering. Editing and rendering are local. Only an explicit Ask Flux request sends the context described above to your AI provider.

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Play / pause | Space |
| Selection / pan | V / H |
| Text / rectangle / ellipse | T / R / O |
| Previous / next frame | Left / Right |
| Step ten frames | Shift + Left / Right |
| Undo / redo | Ctrl/⌘ + Z / Shift + Z |
| Duplicate layer | Ctrl/⌘ + D |
| Save / open project | Ctrl/⌘ + S / O |
| Delete layer | Delete |
| Shortcut help | ? |

## Verification

```sh
pnpm test
pnpm test:browser
pnpm test:freeze
node scripts/renderer-smoke.mjs
node scripts/editing-regression.mjs
node scripts/ai-exchange-smoke.mjs
node scripts/ai-variations-smoke.mjs
node scripts/scene3d-smoke.mjs
```

Browser checks use Microsoft Edge at its standard Windows path. `FLUXIFFECTS_BROWSER` overrides the editor smoke-test browser path. Reports, screenshots and real exported files are written to `artifacts/`.

The tests exercise model validation, interpolation, native/AE import and roundtrips; actual UI editing and persistence; PNG dimensions/pixels; decoded WebM frame movement; media synchronization, rendering effects and cancellation; exchange roundtrips; and AI command validation, scope, cancellation, preview and undo. Automated AI tests use an injected planner and require no credentials or model calls. The separately invoked `node tests/ai-live-smoke.mjs --run-live` sends a neutral synthetic fixture to the configured gateway and requires that connection.

## Current boundaries

This release is a motion editor with composited 3D scene layers, not a feature-complete replacement for After Effects. It does not yet have vector path/mask editing, track mattes, precomposition rendering, a shared 3D world across scene layers, mesh/rig editing, expression execution, tracking/rotoscoping, plugin hosting, MP4 encoding, reverse/animated time remapping, or a native desktop installer. Bounded cubic Bézier easing and multi-key editing/copy/paste are available; spatial paths and overshooting tangents remain unsupported. Font selection uses installed/system fonts; it does not include proprietary Adobe fonts.

After Effects is a trademark of Adobe. Fluxiffects is an independent project and is not affiliated with Adobe.

## Audio export

WebM includes volume/keyframes, audio fades, mute/visibility, source offsets and constant speed. Audio gain is independent of picture opacity. Source decoding is bounded to 96 MiB and unsupported audio blocks output with a relink message. The Media inspector exposes audio fades and animated volume; these persist in native projects.

See [audio export scope, verification and remaining limits](docs/AUDIO-EXPORT.md). Run `node scripts/audio-smoke.mjs` to verify actual stereo sound with a native Flux3D scene, resampling, volume automation, cancellation and transfer history.
