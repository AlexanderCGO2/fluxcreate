# FluxCreate

**One idea. Eight creative spaces.**

FluxCreate is an early creative suite for images, page layouts, video, motion, procedural scenes, 3D, AI content and agent workflows. It runs its editors in the browser, with a Node.js service for local AI connections and supported server features.

The aim is simple: keep creative work editable, make handoffs between tools understandable, and let AI help without taking control away from the person making the work.

> **Release status:** preparing for an open-source release. The repository is currently private and a license has **not** been selected. Public visibility alone will not grant open-source reuse rights. Licensing recommendations remain proposals; see [release readiness](docs/OPEN-SOURCE-READINESS.md).

[Get started](#get-started) · [The studios](#the-studios) · [File compatibility](#file-compatibility) · [AI and privacy](#ai-and-privacy) · [Contribute](CONTRIBUTING.md) · [Roadmap](FluxCreate/docs/FEATURE-GAPS.md)

## The studios

| Studio | What you can do today | Source |
| --- | --- | --- |
| **Fluxfoto** | Edit photos and layered artwork; rearrange layers; paint, erase, select and mask; adjust Levels/Curves; import supported PSD/PSB content and export layered raster PSD | [Fluxoto](Fluxoto/) |
| **FluxDesign** | Arrange pages, text and image frames; use margins, columns, guides and alignment; import supported IDML/PDF content; export PDFs with documented fallbacks | [Fluxidesign](Fluxidesign/) |
| **Fluximiére** | Edit a video/audio timeline; trim, slip, roll and slide within supported constraints; scrub/scratch audio; use Autoedit and music-video planning; export picture with stereo sound | [Fluximiere](Fluximiere/) |
| **Fluxiffects** | Animate layers and keyframes; apply effects; work with supported 3D scenes and imported motion; use source objects; export bounded video with audio | [Fluxiffects](Fluxiffects/) |
| **Fluxini** | Build procedural scenes and simulations; edit node graphs; work with particles, source objects and exchange scenes | [Haidini](Haidini/) |
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

While the repository is private, cloning requires access to it.

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
| Fluxfoto | [localhost:4321](http://localhost:4321/) | `/fluxoto/` |
| FluxDesign | [localhost:4322](http://localhost:4322/) | `/fluxidesign/` |
| Fluximiére | [localhost:4323](http://localhost:4323/) | `/fluximiere/` |
| Flux3D | [localhost:4324](http://localhost:4324/) | `/flux3d/` |
| Fluxiffects | [localhost:4320](http://localhost:4320/) | `/fluxiffects/` |
| Fluxini | [127.0.0.1:4318](http://127.0.0.1:4318/) | `/fluxini/` |
| FluxLab | [localhost:4326](http://localhost:4326/) | `/fluxlab/` |
| FluxAgents | [localhost:4327](http://localhost:4327/) | `/fluxagents/` |

Use the same browser profile, hostname and port to return to existing browser projects. `localhost`, `127.0.0.1`, local ports and hosted domains are different storage origins.

### Your first workflow, without AI

1. Open Fluxfoto and explore its sample artwork or import a small photo.
2. Select a layer, change its appearance and rearrange it in the layer stack.
3. Download the native project as a backup, then export an image.
4. Import that image into FluxDesign or Fluximiére.
5. Save a native project in the destination app too.

This verifies import, editing and export without connecting an account or making a paid request. For scene and media handoffs, use each studio's supported exchange/export controls and review the destination preview.

## File compatibility

Native files preserve the source editor's supported model. Exchange formats translate between different models and can lose unsupported details.

| Format / workflow | Current boundary |
| --- | --- |
| PNG, JPEG, WebP and supported SVG | Raster/vector input depends on the studio; output options vary |
| PSD / PSB → Fluxfoto | Bounded layered import; not complete Photoshop fidelity |
| Fluxfoto → PSD | Layered raster output; text, shapes and masks are not native Photoshop text/path/mask controls |
| IDML / PDF → FluxDesign | Supported subsets with conversion limits; INDD is not a general native reader |
| FluxDesign → PDF | Supported vector/searchable text output with reported fallbacks; not full CMYK/prepress |
| Premiere projects, supported XML and EDL | Supported timeline mappings; relinking and omitted effects/structures may be required |
| After Effects | Documented export-script bridge and supported exchange paths; not a general binary AEP decoder |
| GLB, self-contained glTF, OBJ, STL | Geometry/material/animation support differs by studio; no general native BLEND reader |
| MP4, WebM and audio input | Browser codec support applies even when the file extension is accepted |
| Video output | Bounded timestamped WebCodecs WebM with audio, plus explicit compatibility paths where supported |
| `.flux.md` | Human-readable Markdown with a validated exchange payload; not universal lossless project interchange |
| Native Fluximiére projects | Large-media binary container embeds original bytes; older JSON projects remain readable; other apps do not directly read every container variant |

Use [the integration review](FluxCreate/docs/INTEGRATION-REVIEW.md), [FluxExchange](FluxExchange/README.md) and individual [feature-gap reports](FluxCreate/docs/FEATURE-GAPS.md) for exact limits.

### Video and Autoedit

Fluximiére Autoedit accepts up to **48 unique source videos**, **512 MiB per source** and **2 GiB total source media**, subject to available browser storage and supported codecs. Autoedit sources are limited to ten minutes each. Soundtrack edits use up to three minutes; longer songs retain the original and use a faded excerpt for the edit.

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
- Local Fluxini and FluxAgents services use **SQLite** for their supported local persistence.
- Download native projects and required media for portable backups.
- Browser data can be removed by clearing site data, private browsing or quota pressure.
- Cross-app transfer receipts and local job recovery are not cross-device synchronization.
- Video jobs can retain provider tickets, but provider media expires and recovery depends on the original connection.
- Closing a tab does not turn a browser render into a durable cloud job.

## Hosting

The repository includes [vercel.json](vercel.json) and one API dispatcher. Build output is in `dist/`; app routes are listed above.

**Keep deployment authentication enabled before configuring a shared billable AI connection.** Application accounts, tenant ownership and a durable hosted background runtime remain separate work. Vercel deployment access does not provide those features.

Follow [HOSTING.md](FluxCreate/docs/HOSTING.md) for setup, secrets, persistence, MCP and media limits. The existing hosted workspace is authenticated; source availability will not automatically make it a public demo.

## Development

```sh
pnpm build
pnpm test
pnpm secrets:check
pnpm secrets:history
```

`pnpm test` runs the current unit/API/contract suites and both Fluxini TypeScript checks. Browser checks are separate, use isolated profiles and generally require Microsoft Edge; see each app's scripts. Tests use injected providers rather than paid generation.

The last relocation verification passed 782 tests, type checks and all nine app builds. That is a dated baseline, not a claim that every feature or provider was tested on every platform. Fresh-install and hosted CI results for a release must be checked on its actual commit.

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

Internal directory names retain earlier app IDs for project compatibility. Work directly in this monorepo. The legacy sibling-folder release assembler is not the normal contributor build or development command.

## Roadmap and limitations

See the [feature-gap index](FluxCreate/docs/FEATURE-GAPS.md) and [implementation progress](FluxCreate/docs/IMPLEMENTATION-PROGRESS.md).

Near-term work includes stronger cross-app asset handling, larger-media performance, deeper editing features, accessibility, durable jobs, and reproducible contributor onboarding. Still missing are many professional photo/print/video/3D workflows, cloud project synchronization, hosted unattended agent execution and a complete generated music-video pipeline.

Managed AI credit packages and Stripe billing are **planned**, not a shipped payment service. The [monetization proposal](FluxCreate/docs/MONETIZATION-PLAN.md) and [credit plan](FluxCreate/docs/STRIPE-CREDITS-PLAN.md) describe possible hosted services alongside personal provider connections.

## Contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Useful contributions include reproducible bug reports, documented format fixtures you can redistribute, focused editor improvements, accessibility fixes and accurate compatibility documentation.

Do not include API keys, private project files, personal footage, account cookies or provider tickets in issues or pull requests. Run the credential checks before sharing a branch. Follow the private-reporting guidance in [SECURITY.md](.github/SECURITY.md) for sensitive findings.

## License and release status

**No open-source license has been adopted yet.** Proposed directions include AGPL-3.0 for the apps with separately reviewed permissive exchange components, or Apache-2.0 throughout. These are recommendations, not grants of rights.

Dependency licenses do not automatically license this repository's own code, artwork or sample media. Copyright ownership, asset rights, contributor terms and the final license must be resolved before announcing an open-source release.

See [the release checklist](docs/OPEN-SOURCE-READINESS.md). Nothing in this README changes repository visibility or the hosted deployment's access controls.
