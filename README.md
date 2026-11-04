# FluxCreate

**One idea. Eight creative spaces.**

FluxCreate is an early creative suite for images, page layouts, video, motion, procedural scenes, 3D, AI content and agent workflows. It runs its editors in the browser, with a Node.js service for local AI connections and supported server features.

The aim is simple: keep creative work editable, make handoffs between tools understandable, and let AI help without taking control away from the person making the work.

> **Release status** — Early open-source software. The apps use **AGPL-3.0-only** and the standalone FluxExchange package uses **Apache-2.0**. See [Licensing](docs/LICENSING.md) and [Support](SUPPORT.md).

[Get started](#get-started) · [The studios](#the-studios) · [File compatibility](#file-compatibility) · [AI and privacy](#ai-and-privacy) · [Architecture](#architecture) · [Support](SUPPORT.md) · [Contribute](CONTRIBUTING.md) · [Governance](GOVERNANCE.md) · [Roadmap](FluxCreate/docs/FEATURE-GAPS.md)

## The studios

| Studio | What you can do today | Source |
| --- | --- | --- |
| **FluxFoto** | Edit photos and layered artwork; rearrange layers; paint, erase, select and mask; adjust Levels/Curves; import supported PSD/PSB content and export layered raster PSD | [Fluxoto](Fluxoto/) |
| **FluxDesign** | Arrange pages, text and image frames; use margins, columns, guides and alignment; import supported IDML/PDF content; export PDFs with documented fallbacks | [Fluxidesign](Fluxidesign/) |
| **FluxVideo** | Edit a video/audio timeline; trim, slip, roll and slide within supported constraints; scrub/scratch audio; use Autoedit and music-video planning; export picture with stereo sound | [Fluximiere](Fluximiere/) |
| **FluxMotion** | Animate layers and keyframes; apply effects; work with supported 3D scenes and imported motion; use source objects; export bounded video with audio | [FluxMotion](Fluxiffects/) |
| **FluxEffects** | Build procedural scenes and simulations; edit node graphs; work with particles, source objects and exchange scenes | [Haidini](Haidini/) |
| **Flux3D** | Compose 3D scenes; transform multiple objects; import/export supported geometry; make bounded vertex edits to meshes | [Flux3D](Flux3D/) |
| **FluxLab** | Generate text, images, video, speech and music through configured providers; keep a local library and recipes; hand results to editors; expose MCP tools and an MCP App | [FluxLab](FluxLab/) |
| **FluxAgents** | Design and simulate workflows; branch, join and review steps; keep local versioned workflows; run supported local workflows with persisted approvals and outputs | [FluxAgents](FluxAgents/) |

**FluxCreate home** launches the studios and shares navigation, appearance, connection settings and recent-project metadata. **FluxExchange** contains the exchange format and shared scene utilities.

These are working foundations with substantial limitations. FluxCreate does not claim feature parity with Photoshop, InDesign, Premiere Pro, After Effects, Houdini or Blender. Those products are independent references; this project is not affiliated with their vendors.

## Why connect the tools?

- **Editable results:** supported AI edits become validated operations or native objects, with review and undo where implemented.
- **Portable work:** native project downloads preserve supported document data; use standard formats or reviewed handoffs when moving between apps.
- **Visible compatibility:** supported subsets and conversion limits are documented instead of promising lossless interchange.
- **Optional AI:** core editing can be used without a provider key. Generation needs a configured account and may incur charges.
- **Local persistence:** browser projects and media generally stay in IndexedDB; local backend features use SQLite where documented.

A cross-app source object is typically a rendered snapshot with recoverable source. It is **not** a live synchronized copy of every native object property.

## Get started

### Requirements

- **Node.js 24.x**, matching the repository engine setting.
- **pnpm 12.3.4**, matching `packageManager` and the lockfile.
- Git.
- A current Chromium-based browser. Chrome/Edge are the tested path for WebCodecs, large media and 3D. Other browsers may have codec or feature limits.
- Enough disk space and browser storage for your media. GPU, decoder and available memory affect practical limits.

### Install and build

```sh
git clone https://github.com/AlexanderCGO2/fluxcreate.git
cd fluxcreate
npm install --global pnpm@12.3.4
pnpm install --frozen-lockfile
pnpm build
```

The root build produces all nine browser entry points, the FluxLab MCP UI, and the shared hosted API bundle. A provider key is not required to build.

### Start locally

```sh
# Start the home app; its Open buttons can launch individual studios.
node FluxCreate/scripts/launch.mjs fluxcreate

# Or start the entire suite.
node FluxCreate/scripts/launch.mjs all
```

Open **[localhost:4325](http://localhost:4325/)** after startup. The launcher reports addresses, starts background processes and reuses already-running studios. Logs are written to each app's ignored `artifacts/studio-server.log`.

For a single foreground process that you can stop with Ctrl+C:

```sh
cd FluxLab
pnpm start
```

Windows users may use `FluxCreate/Start-FluxCreate.cmd` if the Codex-bundled Node runtime is installed. The Node commands above are the portable entry points.

| Workspace | Local address | Hosted path |
| --- | --- | --- |
| Home | [localhost:4325](http://localhost:4325/) | `/` |
| FluxFoto | [localhost:4321](http://localhost:4321/) | `/fluxoto/` |
| FluxDesign | [localhost:4322](http://localhost:4322/) | `/fluxidesign/` |
| FluxVideo | [localhost:4323](http://localhost:4323/) | `/fluximiere/` |
| Flux3D | [localhost:4324](http://localhost:4324/) | `/flux3d/` |
| FluxMotion | [localhost:4320](http://localhost:4320/) | `/fluxiffects/` |
| FluxEffects | [127.0.0.1:4318](http://127.0.0.1:4318/) | `/fluxini/` |
| FluxLab | [localhost:4326](http://localhost:4326/) | `/fluxlab/` |
| FluxAgents | [localhost:4327](http://localhost:4327/) | `/fluxagents/` |

Use the same browser profile, hostname and port to return to existing browser projects. `localhost`, `127.0.0.1`, local ports and hosted domains are different storage origins.

### Your first workflow, without AI

1. Open FluxFoto and explore its sample artwork or import a small photo.
2. Select a layer, change its appearance and rearrange it in the layer stack.
3. Download the native project as a backup, then export an image.
4. Import that image into FluxDesign or FluxVideo.
5. Save a native project in the destination app too.

This verifies import, editing and export without connecting an account or making a paid request. For scene and media handoffs, use each studio's supported exchange/export controls and review the destination preview.

## Creative workflows

These examples connect existing supported features. They are starting points to explore with your own small, redistributable test assets, not promises of lossless round trips or full professional feature parity.

| Start with | Suggested path | What remains editable / what to review |
| --- | --- | --- |
| A photograph and campaign copy | FluxFoto layers/masks -> exported image -> FluxDesign page -> PDF | Keep each native project; the exported image does not carry every photo-editing control into the layout |
| Source clips and a song | FluxVideo Autoedit proposal -> manual timeline changes -> video export | Review cuts, source ranges and sound; proposed edits remain adjustable |
| A supported 3D scene/object | Flux3D or FluxEffects exchange -> FluxMotion composition -> motion export | Review imported geometry/material/motion support and retain original scene data |
| AI-generated text or media | FluxLab -> supported studio handoff -> native editing | A generated asset is not automatically a full native document |
| A repeatable local process | FluxAgents design/simulation -> supported local run -> reviewed output | Approvals and output inspection remain part of the supported workflow; hosted autonomy is separate work |

Download native projects before experimenting with conversions. The [integration review](FluxCreate/docs/INTEGRATION-REVIEW.md) describes the actual handoff boundaries.

## File compatibility

Native files preserve the source editor's supported model. Exchange formats translate between different models and can lose unsupported details.

| Format / workflow | Current boundary |
| --- | --- |
| PNG, JPEG, WebP and supported SVG | Raster/vector input depends on the studio; output options vary |
| PSD / PSB → FluxFoto | Bounded layered import; not complete Photoshop fidelity |
| FluxFoto → PSD | Layered raster output; text, shapes and masks are not native Photoshop text/path/mask controls |
| IDML / PDF → FluxDesign | Supported subsets with conversion limits; INDD is not a general native reader |
| FluxDesign → PDF | Supported vector/searchable text output with reported fallbacks; not full CMYK/prepress |
| Premiere projects, supported XML and EDL | Supported timeline mappings; relinking and omitted effects/structures may be required |
| After Effects | Documented export-script bridge and supported exchange paths; not a general binary AEP decoder |
| GLB, self-contained glTF, OBJ, STL | Geometry/material/animation support differs by studio; no general native BLEND reader |
| MP4, WebM and audio input | Browser codec support applies even when the file extension is accepted |
| Video output | Bounded timestamped WebCodecs WebM with audio, plus explicit compatibility paths where supported |
| `.flux.md` | Human-readable Markdown with a validated exchange payload; not universal lossless project interchange |
| Native FluxVideo projects | Large-media binary container embeds original bytes; older JSON projects remain readable; other apps do not directly read every container variant |

Use [the integration review](FluxCreate/docs/INTEGRATION-REVIEW.md), [FluxExchange](FluxExchange/README.md) and individual [feature-gap reports](FluxCreate/docs/FEATURE-GAPS.md) for exact limits.

### Video and Autoedit

FluxVideo Autoedit accepts up to **48 unique source videos**, **512 MiB per source** and **2 GiB total source media**, subject to available browser storage and supported codecs. Autoedit sources are limited to ten minutes each. Soundtrack edits use up to three minutes; longer songs retain the original and use a faded excerpt for the edit.

Autoedit sends bounded sampled images and measured music features for direction; it does not upload all original videos. Proposed cuts remain editable. Music-video planning is a separate workflow, and its planned generated-frame/video pipeline is not a finished autonomous production system.

See [large-video behavior and verification](FluxCreate/docs/RELEASE-LARGE-VIDEO-2026-10-17.md), [Autoedit](FluxCreate/docs/AUTOEDIT-PLAN.md), and [music-video planning](FluxCreate/docs/MUSIC-VIDEO-AI-PLAN.md). Provider eligibility and current model capabilities must be checked at use time; older release observations are dated evidence.

## AI and privacy

### Personal connections

Open **General settings** in a studio header to add a personal **Vercel AI Gateway** connection. Optional **Cloudflare** settings support the implemented music path and an explicitly configured text fallback.

- Connection checking does not generate content.
- Provider/model availability and credits are separate from merely saving a key.
- Every generation can be billable. Cancelling browser waiting does not guarantee provider cancellation or a refund.
- Saved recipes and restored drafts do not automatically submit paid work.
- Configured connection credentials are handled server-side; they are not intended to enter native projects, recipes or browser JavaScript storage.
- Secrets that you type into a prompt or document are ordinary user content and are **not automatically scrubbed** from exports or provider input.

Personal connections use encrypted HttpOnly cookies scoped to the browser. This is not an account-synced vault. Read [connection storage, expiry and isolation](FluxCreate/docs/CONNECTION_SETTINGS.md).

### Server configuration

Basic editing needs no API keys. Shared AI connections can use server environment variables such as `AI_GATEWAY_API_KEY`. Hosted personal connections additionally require `FLUXCREATE_CONNECTION_SECRET`, a server-only wrapping secret. Optional Cloudflare variables are described in [hosting](FluxCreate/docs/HOSTING.md).

[.env.example](.env.example) lists placeholder-only configuration. Copying it to `.env` does **not** automatically load it: export variables in the server process, use your deployment's environment settings, or use Node's explicit `--env-file` option. Never put credentials in browser build variables, project files or commits.

### MCP integration

FluxLab exposes a local stdio MCP server and an MCP App UI. Build the suite first, then configure your MCP host:

```json
{
  "mcpServers": {
    "fluxlab": {
      "command": "node",
      "args": ["/absolute/path/to/fluxcreate/FluxLab/server/mcp-stdio.mjs"]
    }
  }
}
```

Read-only catalog tools and billable generation tools are distinct. Same-origin browser MCP routes support the integrated editor helpers; they are not an unrestricted public MCP endpoint. See [FluxLab's contract](FluxLab/README.md).

## Storage and recovery

- Browser projects/results normally use **IndexedDB** in the current origin.
- Local FluxEffects and FluxAgents services use **SQLite** for their supported local persistence.
- Download native projects and required media for portable backups.
- Browser data can be removed by clearing site data, private browsing or quota pressure.
- Cross-app transfer receipts and local job recovery are not cross-device synchronization.
- Video jobs can retain provider tickets, but provider media expires and recovery depends on the original connection.
- Closing a tab does not turn a browser render into a durable cloud job.

## Architecture

FluxCreate is a monorepo with nine browser entry points: the home app and eight studios. Browser editors handle interactive document work; Node.js services provide the supported local/hosted API features and provider connections.

| Component | Responsibility | Important boundary |
| --- | --- | --- |
| Studio editors | Document state, selection, previews, timeline/scene/canvas interactions | Supported model and undo/recovery behavior vary by app |
| Shared FluxCreate code | Navigation, appearance, settings, launch/build and hosted API dispatch | Deployment access is separate from application identity |
| FluxExchange | Validated exchange payloads and scene utilities | Conversion supports documented subsets, not every source property |
| FluxLab and MCP | Provider catalog, generation tools, library/recipes and supported editor assistance | Tool discovery does not authorize a paid request |
| FluxAgents | Workflow design, simulation and supported persisted local execution | Local execution is not a durable multi-tenant hosted scheduler |
| Persistence | Browser IndexedDB and documented local SQLite services | Port/origin-local storage is not cloud synchronization |

Keep server credentials out of browser build variables. Treat imported documents, prompts, model outputs and MCP arguments as untrusted input. Use the existing validated operations and provider adapters when extending the suite.

## Hosting

The repository includes [vercel.json](vercel.json) and one API dispatcher. Build output is in `dist/`; app routes are listed above.

**Keep deployment authentication enabled before configuring a shared billable AI connection.** Application accounts, tenant ownership and a durable hosted background runtime remain separate work. Vercel deployment access does not provide those features.

Follow [HOSTING.md](FluxCreate/docs/HOSTING.md) for setup, secrets, persistence, MCP and media limits. The documented hosted setup uses deployment authentication; verify the actual deployment controls before use. Source availability will not automatically make it a public demo.

## Development

```sh
pnpm build
pnpm test
pnpm secrets:check
pnpm secrets:history
```

`pnpm test` runs the current unit/API/contract suites and both FluxEffects TypeScript checks. Browser checks are separate, use isolated profiles and generally require Microsoft Edge; see each app's scripts. Tests use injected providers rather than paid generation.

The recorded open-source preparation verification on **26 October 2026** passed **784 tests**, both FluxEffects TypeScript checks, the suite builds and fresh-clone Windows/Linux checks. See [the verification record](docs/OPEN-SOURCE-READINESS.md). These are historical results, not a new test run or certification of every browser, feature or live provider. Qualify each release on its actual commit.

The repository also includes a redacted credential checker for current files, reachable fetched history and generated assets. After a build, run `node scripts/check-secrets.mjs --build`. Read [credential-check scope and limitations](docs/CREDENTIAL-CHECKS.md); a passing pattern scan is not proof that every possible secret format is absent.

### Repository map

```text
FluxCreate/       home, shared UI/settings, launch/build/deployment code, suite docs
FluxExchange/     shared scene and Markdown exchange utilities
Fluxoto/          Fluxfoto
Fluxidesign/      FluxDesign
Fluximiere/       Fluximiére
Fluxiffects/      motion editor
Haidini/          Fluxini
Flux3D/           3D editor
FluxLab/          AI studio, provider services and MCP
FluxAgents/       workflow designer and local runner
api/             hosted API entry
scripts/         repository checks
.github/         CI, issue forms and pull-request guidance
```

The display names are **FluxFoto, FluxDesign, FluxVideo, FluxMotion, FluxEffects, Flux3D, FluxLab and FluxAgents**. See the [branding and compatibility map](docs/BRANDING.md). Internal directory names retain earlier app IDs for project compatibility. Work directly in this monorepo. The legacy sibling-folder release assembler is not the normal contributor build or development command.

## Roadmap and limitations

See the [feature-gap index](FluxCreate/docs/FEATURE-GAPS.md) and [implementation progress](FluxCreate/docs/IMPLEMENTATION-PROGRESS.md).

Near-term work includes stronger cross-app asset handling, larger-media performance, deeper editing features, accessibility, durable jobs, and reproducible contributor onboarding. Still missing are many professional photo/print/video/3D workflows, cloud project synchronization, hosted unattended agent execution and a complete generated music-video pipeline.

Managed AI credit packages and Stripe billing are **planned**, not a shipped payment service. The [monetization proposal](FluxCreate/docs/MONETIZATION-PLAN.md) and [credit plan](FluxCreate/docs/STRIPE-CREDITS-PLAN.md) describe possible hosted services alongside personal provider connections.

## Help and community

Start with [SUPPORT.md](SUPPORT.md) for installation, missing projects, media compatibility, AI failures and reporting instructions. Ordinary help is best effort; there is no promised response time or production support SLA.

| Document | Purpose |
| --- | --- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Setup, focused changes, verification and contribution boundaries |
| [GOVERNANCE.md](GOVERNANCE.md) | Decision authority, proposals, reviews, disputes and releases |
| [MAINTAINERS.md](MAINTAINERS.md) | Current responsibilities, appointments, handover and continuity |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Expected behavior, private reporting, conflicts and moderation |
| [SUPPORT.md](SUPPORT.md) | Help routes, troubleshooting and response expectations |
| [SECURITY.md](.github/SECURITY.md) | Private vulnerability and credential-exposure reporting |

Private contact: **[build@flux-ai.co](mailto:build@flux-ai.co)**. For conduct reports, read the Code of Conduct's confidentiality and conflict-of-interest limits first. There is no appointed independent conduct reviewer yet. Do not include keys, private media or sensitive allegations in public issues.

The owner supplied this address; preparing these documents did not send a test message or establish an email-response guarantee.

## Contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and read [governance](GOVERNANCE.md) before proposing major shared changes. Contributions must follow the license of the component they modify and include the necessary redistribution rights. Useful contributions include reproducible bug reports, documented format fixtures you can redistribute, focused editor improvements, accessibility fixes and accurate compatibility documentation.

Do not include API keys, private project files, personal footage, account cookies or provider tickets in issues or pull requests. Run the credential checks before sharing a branch. Follow the private-reporting guidance in [SECURITY.md](.github/SECURITY.md) for sensitive findings.

## License and release status

**Applications and shared suite code: [AGPL-3.0-only](LICENSE). Standalone FluxExchange: [Apache-2.0](FluxExchange/LICENSE).** The project owner approved this policy on 3 November 2026. Existing third-party materials retain their own licenses.

Both licenses allow commercial use. AGPL has corresponding-source requirements for covered distributed versions and an additional source-offer requirement for modified versions used over a network. Apache permits broader reuse while retaining its requirements. Read [LICENSING.md](docs/LICENSING.md) for scope, contributions, user-created work and commercial-service boundaries.

Third-party components retain their own licenses and notices. The six bundled typefaces match the Three.js r180 examples and carry the [upstream font license](Haidini/src/assets/FONT-LICENSE.txt). See [the release checklist](docs/OPEN-SOURCE-READINESS.md) for the scope of the dependency and asset review.
