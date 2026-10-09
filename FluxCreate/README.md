# FluxCreate

A local creative suite with a shared Apple-inspired interface, portable documents, and the existing Flux / AI Gateway connection. Each editor lives in its own sibling folder.

| Workspace | Address | Core workflow |
| --- | --- | --- |
| FluxCreate | http://localhost:4325 | Suite home, app launcher, recent projects, workflow guide |
| Fluxoto | http://localhost:4321 | Layered artwork, brush/eraser, crop, transforms and adjustments |
| Fluxidesign | http://localhost:4322 | Multi-page layout, editable frames, typography, grids and PDF output |
| Fluximiere | http://localhost:4323 | Video timeline, cuts, source trims, titles and audio playback |
| Flux3D | http://localhost:4324 | 3D scene composition, objects, materials and mesh exchange |
| Fluxiffects | http://localhost:4320 | Motion design, live 3D scene compositing and After Effects script bridge |
| Fluxini | http://127.0.0.1:4318 | Procedural scenes and simulation |

Open `Start-FluxCreate.cmd` to start the home. Its Open buttons launch an editor when needed. `node scripts/launch.mjs all` starts the whole suite. Node 24 is required by Fluxini; the Windows shortcuts use the bundled Codex Node 24 runtime. Servers listen only on loopback. Existing apps are reused, never killed by the launcher.

## Development

Each project has its own `package.json`, lockfile, `src`, `tests`, `dist`, and local launcher. `pnpm install`, `pnpm build`, `pnpm test` and `pnpm test:browser` work from the project folder. Browser checks use installed Microsoft Edge and isolated browser profiles. Shared UI, build, launcher and local service code live in FluxCreate. Build all four new editors again after changing the shared components.

## Compatible documents

`fluxcreate-project` version 1 JSON contains `{ format, version, app, project, motion }`. `project` is the full native editable source. The three 2D editors also include a validated Fluxiffects `motion` scene for conversion in the other editors. Flux3D uses `motion: null`; Fluxiffects opens its native document as a live 3D layer with the original scene and camera retained. PNG carries a rendered view into photo or page layouts, and GLB carries geometry into other 3D apps. Reopen the native file in its source app to recover its full editing model.

The editors save `.fluxoto`, `.fluxidesign`, `.fluximiere`, and `.flux3d` files; the same envelope can also use a `.json` extension. Files stay local until you explicitly export or hand them off.

`.flux.md` is the existing FluxExchange Markdown envelope: a human-readable brief/notes with a validated fenced scene. It is an interchange representation, not a claim of lossless roundtripping between different editing models. 2D text and shapes remain editable where supported. Publishing-specific layout, video source timing, strokes, masks, animation, effects or hierarchy may be approximated. Conversion notices and each editor's README describe these limits. Markdown handoffs currently use the Fluxiffects scene representation and do not carry every new app's native model. Save the native document too.

| Format | Support and limits |
| --- | --- |
| PNG / JPEG / WebP | Local raster input; PNG/JPEG output in Fluxoto, PNG output in the visual editors |
| SVG | Supported image input; vector page output in Fluxidesign, with embedded images where present |
| PDF | Multi-page Fluxidesign export; RGB raster page artwork, not CMYK/prepress or editable PDF text |
| MP4 / WebM / audio | Browser-decodable local media in Fluximiere; codec support depends on the browser |
| WebM | Real-time visual video export; audio is not mixed into the exported file in this release |
| CMX 3600 EDL | Fluximiere V1 cut timing; source media must be relinked, titles/audio/effects are not transported |
| GLB / glTF / OBJ / STL | Flux3D geometry exchange; see its README for supported material/animation limits |
| Flux3D / GLB / self-contained glTF → Fluxiffects | Live 3D layers with retained source bytes. Embedded glTF animation clips follow the composition timeline; scene transforms and camera controls support keyframes. External glTF resources must be embedded first. |
| Adobe / Blender native files | PSD, INDD, PRPROJ, AEP and BLEND binary decoding is not implemented. Fluxiffects has an After Effects export script bridge. Use standard exports otherwise. |

## AI

The suite reuses the user-authorized Fluxini connection through `Haidini/server/connection.mjs`. No copied credentials or extra provider account is required. Status reads do not call the model. Only an explicit AI request invokes the gateway.

New editors send the request, optional brief and supported editable scene properties. Local media bytes and paths are stripped. App-specific command engines enforce ranges, locks and selection scope; no AI code is executed. Proposals are validated on the server and again against the current browser project, shown for review, applied through the editor's history, and undoable. Changes to the document invalidate an older proposal. The provider uses a small structured-output schema and returns inert command JSON. Calls are bounded, cancellable and serialized per editor.

The current configured model is inherited from `FLUXINI_MODEL` (default `anthropic/claude-sonnet-5`). A configured connection does not prove available credits: gateway errors, including HTTP 402, are surfaced without pretending that edits were generated. Automated tests use clearly identified injected planners and do not consume credits.

## Local storage

New editors autosave documents in IndexedDB on their individual local origins. Keep using the same hostname and port to recover them. Download native project files for durable, portable copies. The suite stores only recent document names and save times under `.data/recent-<app>.json`, not media or project bodies. App switchers and the launcher use the canonical addresses above.

This release supplies functional starting workflows across the suite. It is not feature parity with the full Adobe applications or Blender: advanced photo reconstruction, print production, video audio mixing/export, rigging, sculpting and mesh-level 3D animation authoring remain future work. Fluxiffects plays imported 3D motion and can animate scene placement and camera; Flux3D's editable mesh importer does not reconstruct animation rigs.
