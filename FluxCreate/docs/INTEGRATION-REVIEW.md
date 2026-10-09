# FluxCreate integration review

> Working-source update (2026-10-09): the connected four-editor floating MCP helper and bounded reference-image editing are now implemented. See [implementation evidence and limits](FLOATING-AI-IMPLEMENTATION.md). AI upscaling, provider smoke verification and durable cross-instance paid-job recovery remain open; the broader milestone is not marked complete.

Reviewed 2026-10-09 against the working source. This is an implementation audit, not a claim of Adobe, Blender or Houdini parity. New feature expansion was paused at the user's request so the next phase can follow a detailed plan.

## What exists

The suite has a shared app registry, navigation, appearance, General Settings, protected hosted API routing, per-browser personal Gateway credentials, bounded native/exchange files, reviewed AI commands and several reviewed media handoffs. These are useful foundations. They are not yet a shared document system, an account service, or a universal embedded-object engine.

| Boundary | Current behavior | Important limit |
|---|---|---|
| Native project files | Native source plus an optional portable motion representation | Different schemas, fidelity and size limits; not every format can render in every app |
| Flux Markdown | Readable description and structured exchange blocks; preserves supported editable objects | Markdown is a manifest, not a suitable long-term container for large embedded media |
| FluxLab → editors | Reviewed text/image insertion; video/audio into motion/video apps | Popup/opener transfer, origin-specific storage, limited compatible receivers |
| FluxAgents → editors | Same text handoff protocol | Local source-origin omission was found and fixed in this release |
| FluxAgents → FluxLab | New explicit prompt review and insertion | Does not start paid generation or create a new model result automatically |
| Flux3D → Fluxiffects | Existing 3D scene/GLB rendering and supported motion | Not a general object link or full Blender scene conversion |
| Other app objects in layers | Bounded source/provenance foundation is partly implemented | General placement, source refresh and all-app rendering are not complete |
| Shared AI | Existing app-specific command planning plus FluxLab generation | Floating selection-aware helper and browser MCP transport are planned, not shipped |
| Gateway settings | Encrypted, request-scoped browser connection | No account-bound credential vault or unattended personal-credential use |
| Hosted access | Vercel Authentication protects the suite | Deployment access is not application identity, workspaces or per-project permissions |
| FluxAgents execution | Persistent local runs; hosted design and simulation | Cloud execution, durable remote artifacts and schedules are missing |

## Findings and proposed improvements

### P0 — A single capability and transfer registry

**Evidence:** `shared/registry.mjs` defines app URLs; `shared/asset-handoff.mjs` independently defines allowed destinations and source origins; FluxLab and FluxAgents also maintain their own destination options. The receiver originally trusted local port 4326 but not 4327. Hosted same-origin tests did not expose this omission.

**Immediate fix:** add the actual FluxAgents origins, keep exact origin/window/nonce checks, add FluxLab text-only prompt reception, and exercise real popup transfers across distinct localhost origins. Do not broaden trust to arbitrary origins.

**Next design:** derive destination menus and validation from one versioned capability table: accepts text/image/audio/video/scene; accepts editable conversion or preview; maximum dimensions, duration, bytes and text length; available import actions; supported launch environments. A receiver remains the authority on validation.

**Acceptance:** every listed route has an end-to-end test; unsupported routes never appear as enabled actions; a newly registered app cannot silently become an allowed sender; hostile origin, wrong window and stale nonce cannot inject a result.

### P0 — Persistent delivery with explicit outcome

**Evidence:** current handoff payloads exist in memory, the sender waits for a short browser handshake, and the URL contains an ephemeral nonce. Reload, lost opener, popup restrictions or closing the sender can lose the transfer. A receipt currently acknowledges receipt for review, not successful insertion.

**Plan:** a bounded local outbox/inbox first, with a transfer ID, source app, destination, content kind, checksum, expiry and status (`prepared`, `received`, `reviewing`, `applied`, `dismissed`, `failed`). Persist before navigation. At the hosted origin share an IndexedDB inbox; for separate local origins retain an authenticated handoff broker or explicit message transport. Introduce server-owned storage only with app identity and ownership checks.

**Acceptance:** reload both sides during every state; retry cannot insert twice; the sender distinguishes received from applied; cancellation preserves the source; interrupted work has a visible recovery action. Keep download/import as a usable fallback.

### P0 — Atomic insertion and context checks

**Evidence:** editor mutations and imports use different history, validation and readiness mechanisms. Several already capture document revision; there is no shared selection/mutation contract.

**Plan:** each app exposes an adapter for document identity/revision, selected object IDs, capabilities, preview and apply. Capture identity and revision when preparing an import or AI edit; recheck before apply. Build a validated next state, then commit once. Reject stale results with a way to rebase or start again.

**Acceptance:** failed decode, deleted/locked selection, changed document, undo during generation and recovery mode cannot overwrite work. One user-approved operation equals one undo step, including multi-object insertion.

### P0 — Credential and usage ownership

**Evidence:** personal Gateway credentials are browser scoped and request isolated; local background workflows explicitly use the suite connection. Jobs and provider tickets are tied to a connection. The proposed floating helper adds another entry point that must preserve those guarantees.

**Plan:** pass immutable connection context through every REST/MCP/media operation. Never persist keys in document source, layer provenance, transfer files or run events. Keep background billing explicit. For cloud automation, add application identity, a revocable encrypted credential vault and workspace-level permission checks before execution.

**Acceptance:** two users/keys cannot share a provider response, cached balance or generation job; key removal/expiry fails closed; stored job artifacts contain no credentials; actual usage and estimated reservations are labelled separately.

### P1 — Embedded objects with an honest fidelity contract

**Current foundation:** a bounded `suiteSource` descriptor can retain a native/exchange source and provenance beside a normal preview image. This is not live editing. A picture of a 3D object is not an editable mesh.

**Plan:** define `native editable`, `portable editable`, `rendered snapshot` and `unsupported` outcomes. An embedded object records stable ID, source app/version, original source reference, preview, chosen page/composition/time, dimensions, fidelity warnings and content hash. Validate recursive embedding depth and total bytes. Prefer asset references to nested base64 copies.

**Placement:** add `Place from studio` separately from `Open project`; opening replaces a document, placing appends an object. Preview and choose page/frame/time before insertion. For Flux3D/Fluxini snapshots use a textured plane; real geometry continues through supported geometry import. For Fluxfoto use an image layer; for Fluxiffects use footage or an existing supported scene layer.

**Editing source:** explicit Open source / Download source / Replace source / Refresh preview, with revision and undo. Begin with manual refresh. Automatic subscriptions come only after identity and asset versioning.

**Acceptance:** source remains recoverable after save/reload/duplicate; unsupported data cannot disappear without a notice; replacement preserves the destination transform and creates one undo entry; preview selection is deterministic; normal AI context never includes embedded native payloads.

### P1 — Shared assets and media lifetime

**Evidence:** browser projects embed image data, generated audio/video use browser Blobs, local origins have independent storage, and histories frequently copy whole projects. Current cache bounds are different in each renderer.

**Plan:** content-addressed asset records, references from documents/history, reference-counted object URLs, decoded-media budgets, thumbnail/proxy variants, missing-media and relink views. Native export resolves references into a portable package. Introduce cloud Blob storage and signed URLs with app identity; do not assume Vercel function disk is persistent.

**Acceptance:** duplicate/undo does not duplicate large asset bytes; deleting or relinking releases decoders; export reports missing media before rendering; cold reload reproduces output; local-to-hosted migration is an explicit file/package operation until sync exists.

### P1 — Floating AI helper through FluxLab MCP

**Requested experience:** a consistent floating helper in Fluxfoto, Fluxiffects, Fluxini and Flux3D, with a clearly named current selection and available actions. Extend to the remaining editors through adapters, not copied UI.

**Plan:** implement a same-origin, authenticated MCP transport using the official SDK and existing FluxLab tool dispatcher. Separate context queries from mutation proposals. An edit tool returns bounded commands; the app renders a preview and applies only after explicit review. Generation creates a reviewed asset. Pixel editing/upscaling must declare required reference image/mask, supported model, output constraints, cost and cancellation behavior.

**Limit:** current object-edit planning changes supported document properties. It is not image-to-image generation, content-aware fill, AI upscaling or a remote MCP service. Local 2× resampling, if added, must be labelled Resize rather than AI upscale. The partial MCP injection hook does not complete this feature.

**Acceptance:** selected object preview/name agrees with the request; changing selection or document invalidates Apply; cancel and repeated clicks cannot silently create duplicate jobs; image bytes are sent only for an explicit pixel action; returned URLs/files are validated; failed or unsupported actions leave the project unchanged. Test with injected providers first, then separately record any authorized paid provider smoke test.

### P1 — FluxAgents outputs as typed artifacts

**Evidence:** outputs currently become text strings with manual destination selection. No cloud artifact store or general media-producing node exists.

**Plan:** introduce typed output handles (text, image, audio, video, scene, document), provenance, immutable versions and compatible destinations. Start with a FluxLab prompt-draft output, then explicit generation nodes with a cost reservation and approval policy. Keep workflow generation, media generation and editor insertion as separately recorded effects.

**Acceptance:** a recovered run reuses completed artifacts; retries cannot pay twice without review; an output can be downloaded independently of its destination; a receiver failure does not require rerunning the workflow. Do not claim self-running hosted agents until the durable runtime is deployed and failure-tested.

### P1 — Common rendering and timing semantics

**Evidence:** apps disagree on top-left versus anchor coordinates, scene units, page selection, frame time, blend names, text layout and opacity conventions. Fluximiére exports are currently silent; that is a functional release gap, not merely a compatibility warning.

**Plan:** explicit coordinate/time/color metadata in conversion adapters; reference fixtures for transformations, transparent edges, masks, blend modes, embedded motion, fonts and audio sync. Separate static preview generation from full animation export. Preserve unsupported source alongside the converted result.

**Acceptance:** golden pixel/scene samples plus editable-value assertions; deterministic selected frame; measured audio/video synchronization; no success notice for silent output when audio export is requested.

### P2 — Consistent integration UX and diagnostics

Use the same meanings for Open, Place, Replace, Send, Review and Apply. Identify the real sender in receiving dialogs (the generic receiver still uses FluxLab branding for FluxAgents output). Provide origin app badges, source status, grouped import warnings, full downloadable reports, progress/cancel and actionable retry. Add shortcuts, focus restoration, keyboard layer ordering and narrow-screen checks.

Introduce trace IDs from workflow run → model request → artifact → transfer → editor mutation. Record bounded metadata and timings, never API keys or full private prompts by default. Surface a human-readable failure with a diagnostic code and exportable report.

### P2 — One release source and contract test matrix

Current development uses sibling folders copied into a release repository. This is working but creates opportunities for stale copies, missed files and local-only path assumptions. Prefer a single workspace/monorepo once current changes are stabilized. Keep internal app IDs stable during any rename.

Build a generated integration matrix and run it in both environments: actual distinct local origins and the hosted path layout. Include anonymous access denial, personal-key isolation, unavailable services, corrupted payloads, oversized media, blocked popups, expired transfer, old file versions, missing fonts/media and restart recovery. A green sender-side test is not proof that a receiving canvas changed.

## Recommended order

1. Publish the bounded handoff fix, drag ordering and verified layered PSD export; preserve the audit and plan.
2. Establish capability contracts, persistent transfer outcomes and selection/mutation adapters.
3. Complete embedded-object placement/source refresh for the four requested apps.
4. Deliver the floating MCP helper, then provider-verified image editing and upscaling.
5. Add shared assets, account identity and durable cloud execution; keep personal credential ownership explicit.
6. Expand professional editing tools according to each app's feature-gap report.

The detailed build sequence and completion criteria are in [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md). Per-app status is indexed in [FEATURE-GAPS.md](FEATURE-GAPS.md).
