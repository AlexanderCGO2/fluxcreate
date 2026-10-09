# Fluxini: UI/UX review and next-release plan

27 September 2026 · Review of 0.3

**Implementation update:** The first usability package is now implemented in 0.4. See [delivery and verification](Studio-0.4.md). The findings below preserve the original 0.3 evidence; later milestones remain planned.

**Recommendation: Make a complete visual result easy to create, change and export before expanding the operator catalog.**

## Scope and decision

Expert inspection of the running Windows/Edge workbench and source code. Reviewed the active water project at 1440×900 and 1280×720, and checked overflow at 1024×640. Tested navigation, contextual actions, keyboard behavior, memory presentation and sampled contrast. This is not a participant study, a full accessibility audit or proof of production simulation accuracy. No application code or saved scene was changed for this review.

Audience confirmed by the user: people with design knowledge. Design the workspace around composition, typography, motion, materials and timing; assume familiarity with those concepts, while making procedural and simulation settings discoverable. User sessions still need to validate the proposed controls.

The next milestone should be a usability release. Preserve the current engine and make a complete create → adjust → animate → export path coherent. Recommendations below are proposed work, not features already implemented. Priority labels P0/P1/P2 describe delivery order, not incident severity.

The native canvas directory is not provisioned for this workspace. A self-contained interactive HTML companion contains the same findings and a clickable layout sketch.

## What is already worth keeping

- A working local scene, editable parameters and reproducible simulations already exist.
- Undo, typed graph validation and review-before-apply AI provide a sound safety foundation.
- The restrained visual style, central viewport and consistent inspector are worth retaining.
- Water, cloud, text and particle templates are a useful starting catalog; the next release should make them easier to discover.
- Keep the existing Flux memory and Claude gateway. Manual work must remain available offline.

## Review findings, ordered by delivery priority

Observed evidence is separated from proposed changes. Browser automation demonstrates behavior; it does not substitute for watching intended users.

### UX-01 · P0 · The workspace exposes too much at once

**Evidence (Measured):** Measured: at 1440×900 the viewport is 912×485 px; a permanent 232 px graph panel and roughly 232 px AI panel compete with it. At 1280×720 only Initial state and Fluid particles fit in the water inspector before scrolling.

**User impact:** A new user has to understand the graph and find useful controls before shaping the result.

**Proposed change:** Default to a scene/object view with an expandable graph. Make the AI assistant a drawer. Use resizable panels and a compact inspector with 5–6 primary controls.

**Acceptance:** At 1280×720 the primary controls and Play remain visible. At least 55% of the editing workspace is the viewport when optional panels are closed.

**Trace:** src/App.tsx:47–50; src/motion.css; measurements-1280.json

### UX-02 · P0 · Visible actions can fail on the selected scene

**Evidence (Reproduced):** Reproduced on the current water project: clicking More particles displays “Add Particle emitter from the operator library first.” The action only searches for a legacy emitter; Taller hills and More motion are also shown regardless of scene content.

**User impact:** The interface encourages an action and then tells the user they used the wrong tool.

**Proposed change:** Offer actions derived from the selected effect and its capabilities: Calmer water, Stronger splash, Softer cloud, Faster title. When unsupported, explain the requirement before activation or show the relevant Add action.

**Acceptance:** Every suggested action is valid for its displayed scope. A water scene never requires a legacy emitter to increase simulation detail.

**Trace:** src/App.tsx:41,50

### UX-03 · P0 · Keyboard controls override normal button behavior

**Evidence (Reproduced):** Reproduced: focus About this build and press Space; playback starts instead of opening Help. Escape does not close Help. Tab from the open dialog reaches the Current project selector behind it.

**User impact:** Keyboard users cannot rely on familiar controls, and a modal does not contain focus.

**Proposed change:** Scope shortcuts to the editor canvas; exempt interactive controls and open dialogs. Add initial focus, focus containment, Escape dismissal and focus restoration to dialogs.

**Acceptance:** Space activates the focused button; canvas Space controls playback. All dialogs pass a keyboard-only focus cycle and return focus to the opener.

**Trace:** src/App.tsx:42,54

### UX-04 · P0 · The falling-drop preset does not match its name

**Evidence (Observed + code-supported hypothesis):** The active scene uses falling drop. At 0.60 s it shows a large block-like, perforated water volume. Source initializes a rectangular lattice and compresses spacing by 0.85; it does not initialize a spherical drop. Excess density is a plausible contributor to the expansion, not yet a proven diagnosis.

**User impact:** A beginner cannot tell whether a surprising result is their mistake or a simulation problem.

**Proposed change:** Investigate density initialization and meshing, then create a stable spherical drop or rename the preset to a falling block. Validate several early and late frames before promoting it as a starter.

**Acceptance:** Preset name, preview and actual playback agree. No unexplained explosion, domain-shaped artifact or non-finite state across supported particle counts and gravity settings.

**Trace:** src/engine/simulation.ts:27–33; current-1440.png

### UX-05 · P1 · Creation begins with technical operators

**Evidence (Observed):** The left library opens on 16 node types. Starter scenes sit below the scrollable operator list. New creates an empty graph whose message asks the user to connect a branch to Scene output.

**User impact:** People must translate a visual intention into graph terminology.

**Proposed change:** Make New open visual starters: Animated title, Particle trail, Water splash, Drifting cloud and Empty scene. Keep Add to scene separate from New project. Move the full operator catalog into Graph.

**Acceptance:** A first-time user reaches a moving example in two deliberate actions, with no graph wiring and no AI request.

**Trace:** src/App.tsx:30,45,47; src/components/Viewport.tsx:87

### UX-06 · P1 · The inspector follows the solver instead of the creative task

**Evidence (Observed + code):** Water presents particle count and seed before motion and appearance. Numeric values do not show catalog units. Every parameter has a lock icon, while field reset and grouped defaults are absent.

**User impact:** Users spend attention on implementation details and may change expensive settings accidentally.

**Proposed change:** Group controls as Look, Motion and Physics; expose practical defaults first. Display units, bounded validation, per-field reset and a clear Advanced section. Explain seed as Variation. Keep solver particle count under Simulation detail.

**Acceptance:** The primary panel exposes no more than six common controls. Invalid values receive an inline explanation. Units and reset work with keyboard and pointer.

**Trace:** src/components/Inspector.tsx:7–16; src/engine/catalog.ts

### UX-07 · P1 · Text and controls are smaller than they need to be

**Evidence (Measured; partial accessibility review):** Measured: operator labels 10 px, parameter labels 11 px, graph hints 8–9 px, time labels 7 px and status 8 px. Sampled graph-hint contrast is 4.06:1 and time-label contrast 3.63:1. Lock targets are 22×22 px and transport targets 23×23 px.

**User impact:** Dense text and small targets make prolonged work and laptop use harder.

**Proposed change:** Use 14 px primary text, 12–13 px labels, and 11–12 px supporting information. Aim for 32–36 px desktop controls. Bring ordinary text to at least 4.5:1. Review target spacing and focus visibility.

**Acceptance:** Sampled text meets the applicable contrast criteria; all important actions are comfortably targetable at 100% and 125% Windows scaling. Tiny-target measurements are not by themselves a WCAG failure because spacing exceptions exist.

**Trace:** measurements-1440.json; src/style.css; W3C references below

### UX-08 · P1 · Viewport interaction has too few visible affordances

**Evidence (Observed + code):** The viewport has orbit, reset, grid and wireframe controls. The Select button is permanently styled active and has no mode-changing handler. There is no rendered selection outline, framing-to-selection or transform gizmo.

**User impact:** Selecting and positioning a result depends on the inspector and coordinate knowledge.

**Proposed change:** Add a clear selection highlight, F to frame selection, Home to frame all, transform handles and named camera views. Make one navigation scheme visible and consistent.

**Acceptance:** Users can select, frame, move and scale an object in the viewport, then undo the manipulation as one action.

**Trace:** src/components/Viewport.tsx:26,39–41,89

### UX-09 · P1 · Saved, simulated and previewed states are mixed together

**Evidence (Code + observed states):** Scene is current appears independently of Simulation ready / Simulating. The main playhead displays requested time, while the simulation badge can show a different calculated time. Graph edits reconstruct render objects and simulation workers, including layout edits.

**User impact:** Users cannot easily tell whether they are seeing their intended frame, a stale frame or a recalculation.

**Proposed change:** Separate document state from preview state. Use one preview status: Playing, Paused, Calculating frame, Ready or Failed. Show cached timeline ranges and a cancellable long seek. Preserve workers for layout and appearance-only edits.

**Acceptance:** The displayed frame time is unambiguous; a node move does not restart simulation; a calculation error has an actionable recovery path.

**Trace:** src/components/Viewport.tsx:42–47,73–88; src/engine/simulationClient.ts

### UX-10 · P1 · Export asks users to understand implementation formats

**Evidence (Code + existing export tests):** The primary actions are Frame GLB and Record WebM. Clouds become parcel geometry in GLB; no baked animation is exported. Video captures the current viewport size and can stretch in time when simulation is slow.

**User impact:** A user can get a technically valid file that differs from the animation they expected to deliver.

**Proposed change:** Use one Export action with Video, Image and 3D scene choices. Show dimensions, aspect ratio, duration, frame rate and destination. Explain capability differences before export. Build a frame-accurate render path.

**Acceptance:** An 8 s / 30 fps render contains 240 evaluated frames and encodes to 8 s within one frame, regardless of preview speed. Cloud volume appearance is retained in image/video output.

**Trace:** src/components/Viewport.tsx:76–84; README Saving and exporting

### UX-11 · P1 · Project management is hard to recognize

**Evidence (Observed + code):** The picker contains repeated Water / dam break and Alpine passage names distinguished by UUID fragments. The UI exposes no project rename or recent-project thumbnails. Open means import; Save a copy downloads JSON, while autosave lives in a database.

**User impact:** Users may not know what is saved, where it is stored, or which project is theirs.

**Proposed change:** Add project naming, recent thumbnails, last-edited time and explicit Duplicate, Import and Export project actions. Preserve local autosave and make its location and recovery discoverable.

**Acceptance:** A user names, closes and reopens the right project without identifying it by an ID fragment; interrupted work can be recovered.

**Trace:** src/App.tsx:24,30,45–46

### UX-12 · P1 · Graph editing can be surprising even for willing learners

**Evidence (Code inspection):** Compatible additions insert after the selected node and rewire its consumers. Duplicates copy inputs but have no output connections. Edges rely on double-click removal; deleteKeyCode is disabled. Fit-to-view runs when node count changes.

**User impact:** An add operation may reorganize the process, while a duplicate may appear to do nothing.

**Proposed change:** Keep contextual auto-wiring, but show an insertion preview and a clear result selection. Provide output visibility, bypass/enable, explicit connection removal, searchable compatible operators and stable graph framing.

**Acceptance:** Add and Duplicate produce a predictable visible result or a clear explanation. Graph insertion can be undone in one action without losing orientation.

**Trace:** src/App.tsx:33–37; src/components/NodeGraph.tsx:11–17; src/engine/project.ts

### UX-13 · P2 · Flux exposes internal machinery before user value

**Evidence (Observed + existing architecture):** Memory displays LOCAL · SQLITE, Context package, token estimates, raw node IDs and revision events. The assistant remains open even when the user is changing a numeric control.

**User impact:** Memory reads like a debug view and consumes space without a clear creative benefit.

**Proposed change:** Present History and Project preferences in plain language. Let users ask Flux from a collapsible drawer, see the target object, compare before/after, and choose whether a confirmed preference is remembered. Keep provenance and technical detail expandable.

**Acceptance:** A user can explain what Flux will change and remember before applying it. No unapproved preference enters context, and manual editing stays complete offline.

**Trace:** src/components/MemoryPanel.tsx; src/App.tsx:49–50

### UX-14 · P1 · The timeline plays a scene but does not yet let users compose one

**Evidence (Observed + code):** The current timeline provides transport, scrub, duration and loop. It has no effect clips, per-object tracks, easing editor or camera animation. Text modes have parameters but no visible timing relationship.

**User impact:** A motion designer can tune an example but cannot easily coordinate a title, particles and an ending.

**Proposed change:** Start with effect clips, delay/duration handles and a few easing presets. Add keyframes only for an explicit set of continuous properties. Keep topology and solver-resolution changes out of animation initially.

**Acceptance:** Users can stagger a title and a particle effect, ease their motion, set an end state, and produce the same result after reload and export.

**Trace:** src/components/Timeline.tsx; src/engine/motion.ts

### UX-15 · P2 · The fixed shell does not handle compact windows

**Evidence (Measured):** At 1024×640 the document expands to 1050×650. At 1280×720 the viewport is 354 px tall and advanced controls require substantial scrolling.

**User impact:** A resized desktop window or increased display scaling can hide actions.

**Proposed change:** Define a minimum supported editing size, allow panel collapse, and persist layout. Test 1280×720 and 1440×900 at 100% / 125% scaling; offer a compact arrangement before clipping.

**Acceptance:** No essential control becomes unreachable on the declared supported window sizes. Compact mode trades optional panels for viewport and inspector space.

**Trace:** src/style.css .workbench; measurements-1280.json

## Product interaction principles

1. **Begin with a result.** Templates and visual examples answer “What can I make?” before the app asks the user to understand nodes.
2. **One project, one underlying graph.** Scene objects, primary controls, clips and Graph edit the same document. A simple view must not create a second source of truth.
3. **Show complexity when it becomes useful.** Advanced physics, node wiring, memory provenance and diagnostics stay one explicit step away. Experienced users can keep them open.
4. **Make changes visible and reversible.** Preview inexpensive edits while dragging, commit once per gesture, and preserve clear Undo. Expensive simulation edits show their cost and recalculate explicitly.
5. **Use the language of the creative task.** Color, timing, softness, direction and splash strength precede seeds, buffers, node IDs and database technology.
6. **Be precise about what is on screen.** Differentiate saved document, pending AI preview, requested time, calculated frame and exported result.
7. **Keep AI optional and inspectable.** Flux proposes a small, targeted edit. The user sees the outcome, can compare, apply or undo, and controls remembered preferences.

## Proposed workspace and first-use journey

The default **Create** view keeps a scene/object list on the left, a large viewport in the center and the selected effect’s primary controls on the right. A compact transport bar stays below the viewport. **Graph** expands on demand and can be pinned by experienced users. **Ask Flux** opens a drawer instead of permanently reducing the inspector. All views operate on the same document.

The top bar contains the project name, save state, Undo/Redo and one **Export** action. Move CPU engine, FTS5, token counts and raw IDs into Diagnostics.

1. **Choose a starting result.** Open recent work or start Animated title, Particle trail, Water splash, Drifting cloud or Empty scene. Each starter shows its actual result. New creates a project; Add effect inserts into the current project.
2. **Shape it directly.** The object list uses meaningful names such as Title, Sparks and Cloud. Selection highlights the object. Frame selection and transform handles remove the need to type coordinates for common placement.
3. **Adjust the essentials.** Show 5–6 relevant controls plus a clearly labeled Advanced section. Examples: Title → text, font, size, alignment, color, animation. Water → starter, initial push, viscosity, obstacle size, color, playback. Cloud → shape preset, wind, turbulence, softness, density, color. These groupings are hypotheses to test, not a second scene model.
4. **Compose timing.** Show effect clips and start/end handles before exposing a full curve editor. Common ease-in/out presets support short motion-design work. Add keyframes only for selected continuous properties; leave topology, particle count and seed changes out of initial animation support.
5. **Ask for a change when useful.** Flux shows the target and a visual comparison, then Apply / Discard. Advanced users can inspect graph commands. A remembered preference is separately understandable and user-approved.
6. **Deliver what was previewed.** Export offers Video, Image and 3D scene. Show size, aspect, duration, frame rate, destination and relevant limitations. Display progress and Cancel; reveal the completed file.

**Expert escape hatch:** a persistent Graph control, command search and keyboard shortcuts keep expert work efficient. Expert changes to a recipe mark it Custom when needed; simplified controls must not overwrite hand-edited branches.

## Interaction details that should be explicit

- **Cheap adjustments:** draft live while dragging; commit one undoable action on release. Provide inline bounds and a per-field Reset.
- **Expensive changes:** show that simulation will recalculate, retain the previous valid frame, offer progress/cancel and avoid rebuilding unrelated branches. Avoid an extra confirmation dialog for routine reversible edits.
- **Simulation status:** show requested versus calculated time only while catching up; otherwise one Ready/Playing/Paused state is enough. Saved describes the document, not simulation readiness.
- **Quality:** initially change rendering detail for faster preview while keeping the solver state fixed. Increasing solver particle count can change the motion and requires a fresh final preview.
- **History:** layout-only moves should not dominate creative history or invalidate caches. Preserve the actual graph and document undo guarantees.
- **Keyboard and focus:** do not intercept Space from buttons or dialogs. All essential controls need labels, visible focus and a keyboard alternative to drag.
- **Viewport persistence:** preserve the view across ordinary edits and reopen. Keep navigation state separate from scene-camera animation.
- **Help:** short explanations next to unfamiliar controls and actionable diagnostics beat a long first-run tutorial.

## Delivery sequence and capacity assumption

Plan around **two engineers plus a product designer who can also run user sessions**, with dedicated QA time during each milestone. This is an assumption, not confirmed staffing. The five milestones total approximately **63–95 engineering days** before contingency. Allow roughly **10–14 calendar weeks** for design, testing, integration and platform uncertainty with that team. A solo engineer should sequence the same work and re-estimate; these are planning ranges, not deadlines.

Critical path: **M1 → M2 → M3 → M5**. M4 can overlap once selection and recipe contracts settle. Time-box native packaging and exact-frame export feasibility spikes during M1 so they do not become late surprises. Gates override calendar targets.

### M1 · Make the existing app understandable

**Outcome:** A newcomer can start, change and replay a useful result.

**Planning effort:** 10–15 engineering days. **Depends on:** Current build.

- Fix context-invalid actions, scoped shortcuts, dialog focus and sampled contrast failures.
- Investigate falling-drop initialization and starter-scene visual reliability.
- Add a default Create layout: collapsed Graph and AI, resizable panels, readable text, grouped controls, units and reset.
- Introduce explicit project names, clear creation labels and a single understandable simulation status.
- Run a formative test with five intended users and measure the current and revised flows.

**Exit gate:** Four of five participants can open a starter, change its look and replay it without graph wiring or moderator help. All reproduced keyboard issues are fixed.

**Main risk:** Preset grouping must remain a view over stable node IDs; hiding controls alone will not simplify an inconsistent workflow.

### M2 · Build a useful motion-design workflow

**Outcome:** Users can compose a short title-and-effects sequence.

**Planning effort:** 15–22 engineering days. **Depends on:** M1 interaction model and validated inspector groups.

- Add visible selection, frame selection/all, transform gizmos and saved camera framing.
- Add six curated title/particle/cloud/water combinations, with tested default timing and visual previews.
- Introduce per-effect delay/duration clips and easing presets; then limited continuous-property keyframes.
- Support one deliberate typography path: font import with clear supported formats and missing-font recovery, alignment and line breaks.
- Add shared recipe bindings and a backward-compatible document migration for clips, camera and assets.

**Exit gate:** A user creates a named 6–8 second title-plus-effect scene, adjusts its timing, reloads it and gets the same composition.

**Main risk:** Do not turn this milestone into a full video editor. Asset licensing and format support need explicit product choices.

### M3 · Make simulation and export dependable

**Outcome:** The file matches the composition and duration the user approved.

**Planning effort:** 20–30 engineering days. **Depends on:** M2 time/property model; frame-clock spike can begin during M1.

- Use one evaluated frame clock for text, particles, simulations and output; show cache readiness and permit cancellation.
- Separate layout/material edits from solver invalidation and profile surface reconstruction, transfer and rendering on two Windows hardware classes.
- Expose basin, primitive collider and emitter positioning visually. Improve fluid surface continuity and cloud detail within measured budgets.
- Create an Export dialog with resolution, aspect ratio, frame rate, range, destination and progress. Start with exact-frame image sequences, then a timestamp-controlled local video encoder.
- Keep GLB as a separate geometry-delivery path and explain cloud/animation limitations. Investigate MP4 feasibility in a time-boxed spike before promising it.

**Exit gate:** An 8-second 30 fps export evaluates 240 frames and has the correct duration within one frame. Preview and export sample the same state. Cancel/error paths leave the app usable.

**Main risk:** Video encoding, WebView2 compatibility and fluid rendering can dominate scope. If the encoder is delayed, ship verified image sequences before broadening formats.

### M4 · Make Flux useful during creative work

**Outcome:** Natural-language changes are targeted, understandable and reusable.

**Planning effort:** 8–12 engineering days. **Depends on:** M1 selection model; M2 recipe/property schema.

- Make the assistant contextual: explicit target object, capability-aware suggestions and selected-frame context.
- Present visual before/after and a plain-language edit summary; retain a detailed command view.
- Turn approved presets and preferences into useful project memory, with source, scope, edit and forget controls.
- Add a representative evaluation set for title timing, water calmness, cloud softness, locked values and unsupported requests.
- Keep the existing OMMAX Claude gateway and local Flux system; no LangChain introduction and no automatic sharing across projects.

**Exit gate:** All evaluation cases preserve locked values and project scope; supported requests yield valid previews or a clear recovery response. Users can predict the target and undo the result.

**Main risk:** AI must not compensate for hard-to-use manual controls. Avoid an unbounded agent workflow or automatic memory approval.

### M5 · Deliver a Windows beta people can trust

**Outcome:** A small external group can install, create, export and recover work independently.

**Planning effort:** 10–16 engineering days. **Depends on:** M1–M3 release gates; packaging spike starts during M1.

- Compile and verify the existing Tauri/WebView2 shell; test launch/shutdown without a terminal, downloads, encoding and lifecycle.
- Add project recovery, atomic backup, asset portability and a visible error/retry path. Define migration and rollback tests.
- Test the supported window sizes/scaling, keyboard workflow and baseline performance on integrated and discrete GPUs.
- Run a 5–8 person private beta with consented task observation and minimal local diagnostics.
- Close the highest-impact failures, document system requirements from evidence, and choose the next investment from observed demand.

**Exit gate:** Clean install, first result, export and reopen succeed on both test machines; interrupted sessions recover; no known high-severity task blocker remains.

**Main risk:** Rust/MSVC build, signing, redistribution notices and WebView2 media behavior are currently unverified. Budget explicit time rather than assuming the browser build proves desktop readiness.

## Recommended next two weeks

This is the concrete first implementation package. It improves the existing four effect families; it does not add a new solver family.

### Days 1–2

Capture the task baseline; fix Space/dialog behavior and invalid suggestions; investigate the falling-drop preset.

**Reviewable result:** Keyboard and suggestion regression checks; explicit physics findings.

### Days 3–4

Introduce typography/spacing tokens, panel collapse and persistence; reclaim viewport space.

**Reviewable result:** 1440×900 and 1280×720 layouts with all primary actions reachable.

### Days 5–7

Group primary controls, show units and Reset, clarify New vs Add, add project naming and a single preview status.

**Reviewable result:** A beginner can start and adjust each existing effect without opening Graph.

### Days 8–9

Test the revised workflow with five target users; observe wrong turns, recovery and first useful result.

**Reviewable result:** Task-level evidence and a ranked list of remaining blockers.

### Day 10

Fix the biggest observed blockers, rerun the core regression suite and demonstrate the revised flow.

**Reviewable result:** A reviewable usability release; no new solver or broad node expansion required.

## Implementation approach

### Preserve the current stack

React, TypeScript, Three.js, React Flow, Zod, local SQLite/Flux and the existing Claude gateway are sufficient for the next usability milestone. A framework rewrite adds no demonstrated user benefit.

### Separate document, editor state and runtime

The scene document owns nodes, parameters, recipes, animation and assets. Editor state owns selection, layout, camera navigation and panels. The evaluation runtime owns jobs, worker generations, caches and GPU resources.

### Add catalog metadata for user-facing controls

Extend definitions with groups, units, descriptions, reset defaults, animatability, performance cost and invalidation category. Keep the same metadata authoritative for UI and AI.

### Bind simple controls to the real graph

Recipe metadata maps named objects and controls to stable node/property IDs. Expert graph edits mark a recipe Custom when necessary; returning to the simple view must not overwrite them.

### Make edits transactional and responsive

Preview during a gesture, commit one bounded patch on release, and record one undo entry. Reuse workers for render-only changes and invalidate only affected simulation branches.

### Use one frame contract

FrameRequest contains document revision, time/frame, seed and quality settings. FrameResult contains evaluated state, readiness and diagnostics. UI and exporters consume that contract. Ignore stale worker results.

### Migrate incrementally

Introduce a versioned schema for timing/asset additions, retain old-file fixtures, preserve stable IDs and locks, and test undo across migration. Avoid a parallel scene representation.

### Keep GPU investment evidence-driven

Measure solver, mesher, transfer and render time separately. Run a bounded WebGPU/native-compute spike only when a specific benchmark and user requirement justify it; keep a supported fallback.

## Ownership and working rhythm

- **Product/design:** define the primary tasks, refine templates and control groups, maintain language and run observed user sessions.
- **Frontend engineer:** own the shell, focus/shortcuts, inspector, selection/gizmos, project navigation and export UX.
- **Engine/platform engineer:** own solver correctness, invalidation, frame clock, asset/document migration, encoder and Windows packaging.
- **Shared quality responsibility:** each behavior change includes its relevant regression check; both engineers test one complete beginner workflow before the milestone demo.

Hold one short weekly playback of a real user task. Prioritize failures by task interruption, frequency and recovery cost. Do not substitute node count, AI usage or visual polish for successful delivery.

## Validation plan and acceptance targets

These are **targets**, not measured improvements. Establish a baseline before implementation.

### First moving result

**Target:** Within 30 seconds from a fresh start, using a template and Play.

**Method:** Timed task; target, not measured yet.

### Basic task completion

**Target:** At least 4 of 5 formative participants complete create → adjust → replay without help.

**Method:** Small qualitative gate; not a population success-rate claim.

### First deliverable

**Target:** A named, customized clip exported within 5 minutes after brief orientation.

**Method:** Measure once reliable export is implemented; baseline is currently unmeasured.

### Visual workspace

**Target:** At least 55% of the editing workspace reserved for the viewport in the default Create layout.

**Method:** Measure at 1440×900 and 1280×720, optional panels closed.

### Interface responsiveness

**Target:** Common UI responses below 100 ms; inexpensive visual edits update within 250 ms.

**Method:** Profile on declared hardware; show progress for longer work.

### Preview performance

**Target:** Aim for at least 30 fps for the documented starter scenes at 1280×720.

**Method:** Test both hardware classes; do not infer this from one headless run.

### Export correctness

**Target:** 8 s at 30 fps → 240 evaluated frames, encoded duration within one frame.

**Method:** Decode output and compare sampled frames to evaluated scene states.

### Recovery and keyboard

**Target:** No lost saved edits in restart/recovery tests; all essential tasks have a keyboard path.

**Method:** Manual task walkthrough plus behavioral regression tests.

Use five intended users for the first formative study and 5–8 for the private beta. Recruit from the assumed audience before treating these results as product direction. Ask participants to create a short title/effect clip, change its appearance, adjust timing, recover an unwanted edit, find their saved project and export it. Observe without teaching the node model first. Record time, wrong turns, help requests and whether the delivered result matches intent. Get consent for recording; scene content and prompts need not be uploaded for local diagnostics.

Test Windows on one integrated-GPU machine and one discrete-GPU machine. Record actual CPU/GPU/RAM, display scaling and renderer backend; use those measurements to define system requirements. The earlier headless rendering checks do not establish performance for those users.

Retain existing graph, persistence, memory, simulation and browser tests. Add behavioral checks for scoped keyboard actions, modal focus, invalid action filtering, one undo step per gesture, cache preservation on layout changes, migration and exact export duration. Do not write snapshot tests that merely mirror component markup.

## Explicitly deferred

- No Houdini feature-parity program in this release.
- No full NLE/compositor, render farm, team collaboration, plugin marketplace or account system yet.
- No physically accurate weather claim, ocean-scale fluid claim or arbitrary production collider support without new validation.
- No silent changes to simulation resolution between preview and final output: they can change motion. Initially reduce render quality, not solver state, for faster previews.
- No promise of MP4, alpha video or a signed native installer until their platform and encoding paths have been verified.

## Decisions to validate, without blocking the first fixes

1. Confirm the primary audience: motion designers with limited 3D experience is the current assumption.
2. Confirm the most important delivery path: a short video clip, still image or editable 3D asset. The present recommendation prioritizes short clips.
3. Establish the minimum Windows hardware and supported display scaling from tests.
4. Choose the initial font import/packaging policy and local video encoding path after narrow feasibility work.
5. Decide how far the first beta needs physically plausible water versus stylized art direction; label capabilities accordingly.

The keyboard fixes, action relevance, panel hierarchy and readable controls can proceed before these decisions are finalized.

## Sources and evidence

- [Local UI evidence](../artifacts/ux-review/current-1440.png) — Running Fluxini 0.3, current water scene. Companion screenshots and measured rectangles are in artifacts/ux-review.
- [Progressive disclosure — Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/) — Supports prioritizing common actions and revealing specialized controls when needed. It does not establish this product’s correct default controls.
- [WCAG contrast guidance — W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) — Normal text generally requires 4.5:1 and large text 3:1 at AA, subject to defined exceptions. This report samples text rather than certifying conformance.
- [WCAG target-size guidance — W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) — The 24×24 CSS px criterion has spacing and other exceptions. Our 32–36 px desktop target is a design recommendation.
- [Modal-dialog interaction — W3C APG](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — Supports focus containment, Escape dismissal and appropriate focus placement/restoration.

Local artifacts: `artifacts/ux-review/current-1440.png`, `current-1280.png`, `falling-drop-start.png`, `unavailable-action.png`, `memory.png`, `measurements-1440.json`, `measurements-1280.json`, `review-scope.json` and `review-data.json`.

Source references use the line numbers inspected for this review. Most components are currently written on long lines; those numbers identify the relevant implementation area rather than a narrow expression.
