# Fluxini design consistency review

Reviewed 2026-10-09 against actual local renders of Fluxfoto, FluxDesign, Fluximiére and Fluxiffects. The initial audit below records the original interface. The approved first implementation batch is now implemented and locally verified; deployment is tracked separately.

## Implemented and verified — 2026-10-09

- Shared 70 px `SuiteHeader`, registry-backed app switching, home/FluxLab navigation, Settings and appearance action. A shared `documentSlot` preserves the server-backed scene picker and explicit rename/save/revision behavior. Scene tools remain available in a compact toolbar; Ask Flux and Export remain in the header.
- Persisted light/dark interface appearance, neutral semantic surfaces, consistent numeric/unit fields, focus states, dialog styling and graph chrome. Settings receives the active theme. Axis, socket/type, material swatch and scene/render colors remain meaningful; theme changes do not touch renderer settings.
- Readable translucent viewport hint/status surfaces; short viewports switch the camera tools into a horizontal row so opening a tall graph does not hide them.
- Collapsible object and water-performance explanations, preserved material override notice, a 200 px laptop object list with existing collapse/tooltips, and one saved-state indicator in the bottom bar.
- Graph divider supports pointer drag and keyboard arrows/Home/End; dock height persists. The initial graph view focuses the selection at a readable zoom (minimum 0.8), with separate Fit all and Focus selection actions. Fullscreen restores the exact docked view. Graph positions and procedural semantics are unchanged by view controls.
- Existing Ask Flux review/compare/apply behavior retained with clearer panel/field presentation and a labelled full-width preview action. Existing export choices remain available with neutral dialogs.

Verification uses isolated Edge profiles and temporary scene stores, with no provider generation requests. `scripts/design-consistency-smoke.mjs --staging` checks light/dark at 1600×1000 and 1280×800, the supported 1000×720 minimum desktop, long scene names, Settings theme, app-switcher Escape, export/cancel, graph pointer/keyboard resize, readable scale, exact fullscreen return, inspector resize and panel collapse. It compares complete scene JSON before/after appearance-only interactions, proving unchanged data and revision; no JavaScript page errors or desktop document overflow were observed. The 1000 px minimum is explicit; this is not a mobile layout certification.

`scripts/graph-editor-smoke.mjs --staging` passes node search/selection, parameter validation/protection, graph undo/redo, keyboard focus containment and save/reload. `scripts/studio-smoke.mjs --staging` passes numeric validation/reset, explicit project rename and undo/redo, primary water controls at 1280×720, real PNG/GLB/WebM download checks, cancellation, scene creation and effect insertion. The staging build passes. Final combined TypeScript verification follows the concurrently integrated floating AI adapter.

New evidence: `artifacts/design-consistency/report.json`, `light-1600.png`, `dark-1600.png`, `light-1280.png`, `dark-1280.png`, both graph dock/fullscreen views and both export themes; regression reports are `artifacts/studio/graph-editor-smoke.json` and `artifacts/studio/studio-smoke.json`. These are local verification artifacts and are not a claim of deployment. Resizable object-list width, a shared modal implementation, and deeper inspector grouping are later polish; the existing bounded list, modal focus handling and editor semantics remain supported.

**Conclusion:** Fluxini's workspace is functional, but its surrounding interface reads as a separate, older product. Align the header, neutral surfaces, appearance controls, fields and dialog styling with FluxCreate. Keep its object list, procedural graph, simulation controls, timeline and resizable inspector; these are meaningful differences in the tool rather than inconsistencies to remove.

## What was inspected

- Fresh isolated Edge contexts at `http://localhost:4318/`, `4321`, `4322`, `4323` and `4320`; no existing user browser profile was used.
- All five main editors at 1600 × 1000; Fluxini and Fluxfoto also at 1280 × 800.
- Fluxini's graph dock, Ask Flux panel and export dialog; Fluxfoto's dark appearance and AI panel for a fair dark-to-dark comparison.
- Source: `src/StudioApp.tsx`, `style.css`, `studio.css`, `suite-link.css`, `components/NodeGraph.tsx`; shared `FluxCreate/shared/Shell.jsx`, `shared.css`, `Settings.jsx` and `registry.mjs`; Fluxfoto's `src/style.css`.

No JavaScript page errors were observed in the five initial editor loads. Neither tested Fluxini desktop size overflowed horizontally. This is not a full accessibility audit, interaction regression suite or mobile certification. No AI request, export render or project edit was submitted.

Evidence is in `C:/Users/RyZen-9/.codex/visualizations/2026/09/30/01a0f386-dd1b-70f1-bca2-6d5c606c1ebc/fluxini-design-audit/`. Main files: `fluxini-1600.png`, `fluxini-1280.png`, `fluxini-graph.png`, `fluxini-ai.png`, `fluxini-export.png`, `fluxfoto-1600.png`, `fluxfoto-dark.png`, `fluxfoto-ai-dark.png`, `fluxdesign-1600.png`, `fluximiere-1600.png`, `fluxiffects-1600.png`. `report.json` and `details.json` record observed titles, sizes, computed styles and page errors. These are review artifacts, not new demo artwork or release screenshots of implemented changes.

## Observed differences and fixes

Here **P0** means required for the requested suite-alignment pass; **P1** means the next usability/polish pass. These priorities do not imply a security or data-loss defect. No outright broken product flow was found that required an immediate code change.

| Priority | Observed evidence | Concrete change | Acceptance |
| --- | --- | --- | --- |
| P0 | Fluxini has a custom 62 px header; Fluxfoto/Design/Miére use the shared 70 px header. Its Settings, FluxLab and home icons precede the logo, unlike the other apps | Adopt the shared header structure: home, divider, app identity/switcher; document area; actions, Settings, appearance | Same landmark, navigation order, height and baseline as the suite at 1600 and 1280 px |
| P0 | Fluxini has no shared app switcher. Users can reach suite home, but cannot use the common direct workspace menu | Reuse the registry-backed switcher through `SuiteHeader` or extracted shared header parts | All current apps appear automatically; active Fluxini state and keyboard access work |
| P0 | Branding is a serif italic `f` plus two-tone lowercase wordmark at 24 px, versus the suite's rounded 31 px mark and 19 px name | Use the registry's Fluxini identity and green accent in the standard mark; retain a procedural icon only where it explains content | Consistent name, mark size and spacing across app switcher, header and settings; do not invent another acronym |
| P0 | Fluxini is fixed dark with green-tinted panels and helper text. `style.css` sets global `color-scheme:dark`; `SettingsButton` is passed `theme="dark"` | Add explicit light/dark appearance using semantic tokens. Use neutral white/stone chrome in light mode and neutral charcoal in dark mode; reserve green for identity/selection/actions | Theme persists, settings matches the active appearance, every panel/dialog has readable states, scene materials and camera remain unchanged |
| P0 | Header carries New, Fonts, Import, undo/redo, Graph, Ask Flux, Export and Help alongside a wide scene picker | Keep Ask Flux and Export prominent; move scene-specific tools, graph toggle and undo/redo to a compact workspace toolbar. Put Fonts/Help in an overflow/menu when needed | No action disappears; scene management remains easy; no header clipping with long project names at 1280 px |
| P0 | A faint gray camera hint is drawn directly over bright cyan scene content in the captured viewport; visibility depends on the artwork | Put viewport hints/status in a small neutral translucent surface with reliable contrast, or in the fixed composition bar | Hint stays readable over white, black and saturated backgrounds without changing the render |
| P1 | Inspector numeric field is 65 × 29 px with 3 px corners, green border/background; Foto uses 32 px neutral grouped fields with 6 px corners | Normalize field height, border, focus, unit placement and spacing; keep sliders for continuous simulation values | Number entry, units, reset, parameter lock and animation affordances remain visible and reachable |
| P1 | Large descriptive paragraph and appearance note separate title from first useful controls; many minor labels share the same green tint | Use neutral primary/secondary text, a concise one-line summary and an expandable explanation; group transform/material/simulation sections consistently | Important controls appear earlier without deleting technical help; meaningful material-override notice remains available |
| P1 | Docked graph auto-fits six vertically arranged nodes into a 220 px panel; names are barely legible in `fluxini-graph.png` | Add a resizable graph divider and readable default/minimum fit policy; offer Fit all and Focus selection separately; preserve fullscreen | Default node text is readable, larger graphs can pan/zoom, fullscreen restores prior viewport, opening/closing does not alter node positions |
| P1 | Graph chrome, handles and node cards use a separate collection of hardcoded green values | Map React Flow background, grid, controls, edge, card and selection colors to the same tokens; keep meaningful socket/type colors | Nodes/ports/edges remain distinguishable in both themes and selected/error states; visual change does not alter graph semantics |
| P1 | Fluxini Ask Flux uses a separate title/status/prompt layout and icon-only send control; shared AI Studio has labelled scope/mode and a full-width action | Reuse the panel's visual frame and field/button styles; retain Fluxini's graph preview, memory, comparison and validation behavior | Consistent heading, status, prompt, action and review states; request scope is understandable; no accidental rewrite of Fluxini's AI protocol |
| P1 | Export dialog is coherent but square/green compared with the suite's softer neutral dialogs; controls/radii differ | Reuse a shared modal shell and button/field primitives while preserving the existing Video/Image/3D/Exchange choices and truthful export notes | Matching padding, radius, close/focus behavior; all export settings and cancel behavior remain intact |
| P1 | At 1280 px the 160 px object list truncates several short names; the inspector remains about 312 px | Preserve the inspector resize control; add a bounded list width or clearer collapse/expand behavior and tooltips; prefer manual space allocation over shrinking all text | Object selection, visibility and names remain usable on a laptop without reducing graph/viewport controls to tiny targets |
| P1 | Saved state appears in both the object-list footer and bottom status bar; revision/particle counts compete with small hints | Keep one clear saved indicator. Put secondary revision/simulation details in a compact status area with optional expansion | Saving/error/recovery states are never hidden; routine status is quieter and consistent with other apps |

Fluxiffects also has a custom header despite matching the suite's 70 px light chrome. The shared `SuiteHeader` used by Fluxfoto, FluxDesign and Fluximiére is the preferred base; copying every detail of Fluxiffects would preserve another inconsistency. Likewise, some other apps use very small secondary labels: matching the suite should not require copying text that is hard to read.

## Proposed token map

Introduce semantic variables on the Fluxini application root. Keep compatibility aliases for old selectors during migration, then remove duplicated hardcoded values in small batches. The values below are proposed targets based on the inspected suite, not already-applied styles.

| Token | Light target | Dark target | Use |
| --- | --- | --- | --- |
| `--surface` | `#ffffff` | `#23252b` | Header, panels, dialogs |
| `--workspace` | `#ececef` | `#17191e` | Empty workspace/graph surroundings; not scene material colors |
| `--surface-secondary` | `#f7f7f9` | `#282a31` | Toolbars and grouped areas |
| `--field` | `#f5f5f7` | `#1c1e25` | Inputs/selects/textarea |
| `--text` | `#25272d` | `#e8e9ee` | Main content |
| `--secondary` | Contrast-checked neutral gray | Contrast-checked neutral gray | Labels and helper text; test final rendered backgrounds |
| `--border` | `#e9e9ee` | `#34363d` | Hairline separation |
| `--app-accent` | Registry Fluxini green with darker action variant where necessary | Softer green for highlights | Selected state, app identity, focus and primary action; not every label |
| Spacing | 4, 8, 12, 16, 20, 24 px | Same | Repeated rhythm |
| Radius | 6–8 px fields/buttons, 10–12 px cards, 16–20 px dialogs | Same | Match the suite's softer shape language |
| Type | System UI stack; 12–13 px controls, 11–12 px supporting copy, 16–19 px headings | Same | Use tabular numerals for frame/time/value fields |
| Geometry | Header 70 px; tool/panel headers 40–48 px; fields 32–36 px; icon targets at least 32 px | Same | Shared layout rhythm |

Keep green hue as Fluxini's identity. Do not globally recolor simulation sources, axis gizmos, material swatches, warnings, port types or rendered output. Theme switching must not modify document data, renderer exposure, lights or camera.

## Component reuse and implementation order

1. **Shared chrome first.** Reuse `FluxCreate/shared/Shell.jsx`, registry, Settings and appearance controls. Fluxini has server-backed multiple scenes, whereas the shared header currently exposes a simple title input. Add a document slot or extract reusable brand/actions parts instead of forcing the scene picker into the wrong API. Preserve explicit rename commits and revision checks; do not send a server rename for every keypress just to match the visual input.
2. **Scoped theme layer.** Add a Fluxini root theme and map current `--line`, `--muted`, `--panel`, `--accent` to shared semantics. Scope global button/select/dialog rules so imported shared components are not accidentally overridden. Pass the actual theme into Settings. Remove fixed dark option backgrounds and focus colors in a controlled pass.
3. **Inspector primitives.** Share appearance and keyboard behavior for icon buttons, segmented controls, numeric/unit fields, section headers and modal shells. Keep parameter bounds, reset/lock/keyframe semantics in Fluxini adapters; the generic component should not own procedural behavior.
4. **Workspace framing.** Move scene actions into the workspace toolbar, improve list width/collapse and graph sizing, then update graph theme tokens. Preserve the existing split between scene preview and procedural graph, fullscreen mode and inspector resizing.
5. **AI and dialogs.** Align presentation and language while preserving Fluxini-specific proposal previews, before/after, history and memory. Do not blindly replace the graph assistant with the shared 2D command panel.
6. **Visual and interaction verification.** Capture the same reference views in light/dark at 1600 × 1000 and 1280 × 800; add a narrower-width check to define the supported minimum. Verify keyboard focus, long scene names, settings, app switching, graph fullscreen return, inspector resize, export/cancel, AI preview without paid calls and saved/error states. Confirm unchanged project revision/data during appearance-only interactions.

## Recommended first implementation batch

Limit the first batch to the shared header/navigation, neutral light/dark tokens, theme control and safe viewport hint surfaces. Then normalize inspector controls and the graph dock. This delivers the largest visual improvement while leaving procedural editing behavior intact. Node rewrites, renderer changes and new features are outside this design-consistency task.
