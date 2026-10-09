# FluxCreate

Fluxfoto, FluxDesign, Fluximiére, Flux3D, Fluxiffects, Fluxini, FluxLab and FluxAgents: connected creative workspaces, shared exchange files and Vercel AI Gateway.

Use Node 24 and pnpm. Run `pnpm install`, then `pnpm build`. The build creates all browser apps in `dist/` and the shared server function in `api/`.

Source folders keep the original internal app IDs so existing native projects remain compatible. See each app README for import limits. See [optimization audit](FluxCreate/docs/OPTIMIZATIONS.md), [hosting](FluxCreate/docs/HOSTING.md) and [FluxLab](FluxLab/README.md).

This release repository includes the complete suite source. Local sibling app folders are synchronized into this release by `FluxCreate/scripts/prepare-release.mjs`; do not place private data or credentials in source. Browser project storage is device and origin specific: export a native file before moving between local and hosted workspaces.
