# FluxCreate home

This folder holds the FluxCreate home app and the code the studios share. For installation, the current studio list, file compatibility, AI and privacy, and licensing, start with the [root README](../README.md).

The home app runs at [localhost:4325](http://localhost:4325/). It launches the studios and shares navigation, appearance, connection settings and recent-project metadata with them.

## Studios and folders

Some source folders still use earlier project names.

| Studio | Folder | Local address |
| --- | --- | --- |
| FluxFoto | [`Fluxoto`](../Fluxoto/) | [localhost:4321](http://localhost:4321/) |
| FluxDesign | [`Fluxidesign`](../Fluxidesign/) | [localhost:4322](http://localhost:4322/) |
| FluxVideo | [`Fluximiere`](../Fluximiere/) | [localhost:4323](http://localhost:4323/) |
| Flux3D | [`Flux3D`](../Flux3D/) | [localhost:4324](http://localhost:4324/) |
| FluxMotion | [`Fluxiffects`](../Fluxiffects/) | [localhost:4320](http://localhost:4320/) |
| FluxEffects | [`Haidini`](../Haidini/) | [127.0.0.1:4318](http://127.0.0.1:4318/) |
| FluxLab | [`FluxLab`](../FluxLab/) | [localhost:4326](http://localhost:4326/) |
| FluxAgents | [`FluxAgents`](../FluxAgents/) | [localhost:4327](http://localhost:4327/) |

## What is in this folder

| Path | Purpose |
| --- | --- |
| `src/` | The home app interface |
| `shared/` | UI, settings, AI helpers and handoff code used across the studios |
| `server/` | Connection settings and AI routing |
| `scripts/` | Build, launcher, local server and browser checks |
| `deploy/` | Hosted build and the public demo |
| `tests/` | Unit tests |
| `docs/` | Plans, release records and integration reviews |

## Run it

Build from the repository root first, as described in the [root README](../README.md#get-started). Then start the home app, or the whole suite:

```sh
node FluxCreate/scripts/launch.mjs fluxcreate
node FluxCreate/scripts/launch.mjs all
```

The launcher reuses studios that are already running. On Windows, `Start-FluxCreate.cmd` also works if the Codex-bundled Node runtime is installed.

From this folder, `pnpm build`, `pnpm test` and `pnpm test:browser` build and check the home app. After changing `shared/`, run `pnpm build` from the repository root so that every studio picks up the change.

## Further reading

- [File compatibility](../README.md#file-compatibility)
- [Integration review](docs/INTEGRATION-REVIEW.md), for what crosses each handoff
- [FluxExchange](../FluxExchange/README.md), for the `.flux.md` handoff format
- [Feature gaps](docs/FEATURE-GAPS.md) and [implementation progress](docs/IMPLEMENTATION-PROGRESS.md), for what is unfinished
- [Connection settings](docs/CONNECTION_SETTINGS.md) and [hosting](docs/HOSTING.md)
- [Monetization proposal](docs/MONETIZATION-PLAN.md), which is a proposal and not a shipped service
- [Licensing](../docs/LICENSING.md)
