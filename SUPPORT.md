# Support

FluxCreate is an early open-source project. Help is currently **best effort**. There is no guaranteed response time, production support SLA, managed-service entitlement or long-term maintenance branch.

## Where to ask

| Need | Route | What to share |
| --- | --- | --- |
| Installation, usage or a reproducible bug | [Repository issues](https://github.com/AlexanderCGO2/fluxcreate/issues), if you have access | Version/commit, app, environment and a small non-sensitive reproduction |
| Feature or integration proposal | Repository issue; follow [governance](GOVERNANCE.md) for substantial changes | Problem, example workflow, expected result and compatibility implications |
| Contribution help | [CONTRIBUTING.md](CONTRIBUTING.md), then the relevant issue or PR | Intended change, what you tried and the specific question |
| Repository inaccessible or help that needs private routing | [build@flux-ai.co](mailto:build@flux-ai.co) | A short description and safe contact details; ask before sending private files |
| Vulnerability, leaked credential or sensitive exploit | [Security reporting](.github/SECURITY.md) | A redacted, minimal private report |
| Harassment or community conduct | [Code of Conduct reporting](CODE_OF_CONDUCT.md#private-reporting) | A private report using the designated address |
| Provider charges, account credits or provider service failures | The provider's own account/support channel, plus a redacted FluxCreate report if relevant | Provider request ID and timing; never API keys or full payment details |

Use the project mailbox if you cannot access the repository or need a private reply.

The project mailbox was supplied by the owner. No email has been sent to test delivery as part of these documents. Do not rely on an immediate response.

## Start with the documentation

- [README](README.md): studios, setup, ports, AI configuration, formats and limitations.
- [Feature gaps](FluxCreate/docs/FEATURE-GAPS.md): implemented subsets and remaining work.
- [Integration review](FluxCreate/docs/INTEGRATION-REVIEW.md): cross-app boundaries.
- [Hosting guide](FluxCreate/docs/HOSTING.md): server configuration and deployment limits.
- [Connection settings](FluxCreate/docs/CONNECTION_SETTINGS.md): credential storage and isolation.
- [Maintainers](MAINTAINERS.md): responsibilities, availability and continuity.

Core editing does not require an AI key. Generation can require a configured provider and incur charges. Neither the source repository nor this support guide includes provider credits.

## A useful bug report

Before reporting, search existing accessible issues. Use one issue per distinct problem and include:

1. The studio name and project version or commit, if known.
2. Local versus hosted use, OS, browser/version, Node/pnpm versions if relevant.
3. Exact steps, expected behavior and what actually happened.
4. The error text and whether it reproduces with a new sample project.
5. File format, approximate size and relevant media duration/codec, without uploading the original private file.
6. A small synthetic or redistributable reproduction and redacted screenshot/log excerpt when useful.
7. Whether unsaved work, media, an export or a paid request may be affected.

Do not paste environment files, keys, cookies, signed download URLs, authorization headers, payment details or unrestricted browser/network exports. Review logs and screenshots before attaching them. A privately shared customer file still needs permission to be used.

Keep original projects and media backed up. Never delete browser data as the first troubleshooting step.

## Common problems

### The app does not start

Use the documented **Node.js 24.x** and **pnpm 12.3.4** baseline. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build
node FluxCreate/scripts/launch.mjs fluxcreate
```

Read launcher output for addresses and port conflicts. The portable Node commands do not require a Codex installation. Use the per-app foreground start command in README when you need to see server output directly.

### A project seems to have disappeared

Return using the same browser profile, hostname, port and local/hosted origin. Browser storage for localhost, 127.0.0.1 and different ports is separate.

Do not clear site data, overwrite the project or repeatedly import over it. Download any still-accessible native project and source media first. Native backups and explicit relinking are different from browser autosave; clearing browser storage can remove the only local copy.

### A media file will not import or export

An accepted extension does not guarantee browser codec support. Check the app's documented format subset, size/duration limits and the precise error. Keep the original; if conversion is needed, create a separate compatible copy.

For video, include codec and duration information if available. Do not assume complete Adobe/Blender/Houdini fidelity from a supported import format.

### AI is unavailable

Check the selected provider/model and the studio's General settings. Saving a key or fetching a catalog does not prove generation access, supported inputs or remaining provider credits.

Do not send your key to support. Personal connections should not silently become shared managed requests. Report an unexpected funding-scope change privately.

### Generation timed out or cancellation was requested

A timeout or closed tab does not prove the provider stopped or charged nothing. Inspect the job/library state and your provider account before submitting again. Keep any request ID private if it contains sensitive routing information.

Do not repeatedly click Generate to diagnose a stalled request. Support cannot promise provider cancellation or reimbursement.

### Output is missing in another studio

Check the supported source/target type, any transfer receipt, target browser origin and missing-media notice. Some source objects are rendered snapshots with recoverable source rather than synchronized native objects.

Preserve the source project. Report the source/target apps and transfer steps without attaching private transfer storage.

## Supported scope and triage

Use the documented build/runtime versions and browser paths as the initial support baseline. Historical test counts describe a specific revision, not ongoing certification of every browser, operating system, provider or import.

Maintainers prioritize reports involving data loss, credential exposure, unauthorized spending, security boundaries and broken advertised workflows. Security details stay private. A priority label does not guarantee a response deadline or fix date.

Useful reports about older versions are welcome, but a maintainer may ask for reproduction on a current candidate. There is no long-term-support commitment at this stage.

Feature requests are proposals, not orders or delivery promises. Paid integrations, sponsored work or service support require a separate explicit agreement; sending an email does not create one.

## Response expectations

Please allow time for a small project to respond. If ordinary help receives no reply after seven calendar days, one concise follow-up with the original link or context is reasonable. This is a follow-up suggestion, not an SLA.

Avoid posting the same report across multiple channels or contacting individual contributors who have not volunteered for support. You can help by improving a reproduction, documenting a workaround or submitting a focused fix.

## Privacy and data collection

Project files, prompts and media may be confidential. Start with a description or synthetic fixture. Arrange recipient, purpose and handling before sending private material. Do not send unnecessary personal information.

The repository's open-source preparation does not make your projects public or give maintainers access to your local browser storage. Provider transmission and storage behavior are described in README and the hosting/connection guides.

Last updated: 2 November 2026.
