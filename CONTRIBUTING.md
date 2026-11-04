# Contributing to FluxCreate

Thanks for helping make creative work easier to move between tools.

Follow the [Code of Conduct](CODE_OF_CONDUCT.md). [Governance](GOVERNANCE.md) explains decision authority and proposals; [Maintainers](MAINTAINERS.md) lists responsibilities; [Support](SUPPORT.md) covers help and troubleshooting.

## Release status and licensing

Applications and shared suite code use [AGPL-3.0-only](LICENSE). The standalone [FluxExchange](FluxExchange/LICENSE) package uses Apache-2.0. Submit only work you have the right to contribute under the applicable component license. Disclose separately licensed material and retain its notices. No copyright assignment, mandatory DCO workflow or separate CLA has been adopted. Read [LICENSING.md](docs/LICENSING.md).

Public release still requires dependency, asset and ownership review. A contribution does not authorize publication of private customer files or third-party media.

## Set up

Use Node 24.x and pnpm 12.3.4. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
node FluxCreate/scripts/launch.mjs fluxcreate
```

Open http://localhost:4325/. See the [README](README.md) for ports, AI setup and native project backups. Keys are optional for basic editing and automated tests.

Work directly in this monorepo. Internal names such as Fluxoto, Fluxidesign and Haidini are intentional compatibility identifiers. Do not rename native format IDs as part of a visual branding change. The old sibling-folder assembler is not a contributor install/build command.

## Choose a focused change

1. Read the relevant app's README and feature-gap document.
2. Describe a concrete input and expected output in an issue.
3. Keep each pull request small enough to verify.
4. Update compatibility documentation when behavior or limits change.
5. Explain any migration or existing-project impact.

Good starting areas include keyboard navigation, readable errors, documented import fixtures, recoverable editing and small cross-app workflow fixes. A broad feature category in the roadmap is not a promise that all of it fits in one change.

## Verify your work

```sh
pnpm test
pnpm build
pnpm secrets:check
pnpm secrets:history
```

For a focused app, use its existing scripts, for example `pnpm --dir FluxLab test`. Browser checks are separate from the root test suite and generally use Microsoft Edge with isolated profiles. Run the checks relevant to the change and report what you actually ran.

Use injected providers for tests. Do not add paid model requests, personal API keys or network-dependent generation to CI. A model catalog result is not proof of paid generation support.

## Protect user work

- Preserve native project compatibility or document an explicit migration.
- Keep previews separate from committed edits and make destructive changes undoable where supported.
- Failed imports, writes and cancelled tasks should preserve the last usable document.
- Validate imported data and generated commands; do not execute model-produced code.
- Do not silently repeat uncertain paid requests.
- Keep personal and suite connections separate.
- Treat prompts, project strings and uploaded files as untrusted data.

## Credentials and examples

Do not commit provider keys, environment files, cookies, signed media tickets, SQLite databases, browser profiles, private logs, downloaded user footage or exported personal projects.

Run the redacted credential checker. The fixture allowlist in `scripts/secret-fixtures.json` is restricted to reviewed file paths and exact SHA-256 fingerprints; do not add folder-wide exclusions to silence a warning. Use clearly synthetic values and injected transports.

Only contribute sample assets you have permission to distribute. Record their origin and license. Prefer tiny generated test fixtures over large media. Scrub screenshots and issue attachments too: a text scan cannot inspect every secret inside an image, archive or video.

## Pull requests

Include the problem, resulting behavior, relevant validation and known limitations. For shared format, architecture, credential, billing or governance changes, use the written-proposal process in [GOVERNANCE.md](GOVERNANCE.md) before substantial implementation. Do not claim full Adobe/Blender/Houdini compatibility for a supported subset. Keep dependency changes pinned and update the lockfile intentionally.

Use a branch such as `codex/short-description` or another descriptive feature branch. Check the proposed diff before submitting; passing automation is not a replacement for reviewing its contents.

## AI-assisted contributions

AI assistance is welcome, but the contributor remains responsible for understanding the change, checking provenance and redistribution rights, protecting confidential input and verifying behavior. Disclose material generated changes when it helps reviewers assess risk. Do not submit model output as proof of correctness or treat an AI reviewer as an independent accountable maintainer.

## Security reports

Follow [private reporting guidance](.github/SECURITY.md). Do not paste a credential or sensitive exploit detail into a public issue. If a credential was exposed, revoke or rotate it before relying on deletion or Git-history cleanup.
