# Open-source release readiness

Prepared 26 October 2026. This is a release checklist, not a public-release announcement.

## Decisions already made

- Prepare the repository and announcement material before publishing.
- Owner approved AGPL-3.0-only for apps and Apache-2.0 for standalone FluxExchange on 3 November 2026; see [licensing](LICENSING.md).
- Keep the repository private until the public-release gates are resolved.
- Preserve personal provider connections as a separate path from planned managed credits.

## Repository preparation

- [x] GitHub owner access restored using the existing AlexanderCGO2 login; repository verified private (3 November 2026).

- [x] Comprehensive root README with all studios, setup, compatibility and limitations.
- [x] Contributor guidance, issue forms and pull-request template.
- [x] Initial governance, maintainer responsibilities, Code of Conduct and support guide written (2 November 2026).
- [x] Owner-supplied private contact published: build@flux-ai.co.
- [ ] Reporting mailbox delivery, handler access and monitoring verified.
- [ ] Backup maintainer and independent conduct escalation contact appointed with consent.
- [x] Placeholder-only environment example.
- [x] Redacted current-source/history/build credential-check command.
- [x] Narrow, fingerprint-based exceptions for independently verified synthetic fixtures.
- [x] CI configuration with pinned action commits, read-only permissions and no provider secrets.
- [x] CI verified on preparation commit daa2877: [GitHub run 40300770645](https://github.com/AlexanderCGO2/fluxcreate/actions/runs/40300770645).
- [x] Fresh-clone install, build and 784 tests passed locally on Windows; clean checkout/install/build/test CI passed on Windows and Linux.
- [ ] Branch protection and required CI checks configured for the chosen public workflow.
- [ ] GitHub secret scanning/push protection enabled where available.
- [ ] Private email reporting route verified before public visibility; GitHub private vulnerability reporting enabled and tested at public launch before broad promotion.

The credential check uses known-format patterns, high-entropy credential assignments and optional exact matching against recognized local configuration values. It is not a universal detector. Do not suppress entire test directories. It cannot establish the contents of images or archives, external CI logs, deleted remote refs, issues or third-party account settings.

## Legal and asset gates

- [ ] Confirm the copyright holder and contribution terms.
- [x] Apply AGPL-3.0-only app license and Apache-2.0 FluxExchange license, with package metadata (3 November 2026).
- [ ] Review direct/transitive dependency obligations and prepare notices.
- [ ] Review fonts, artwork, templates and demo/media distribution rights.
- [ ] Confirm any commercial or mixed-license boundary before announcing it.

The license policy is adopted; the authoritative texts are [root LICENSE](../LICENSE) and [FluxExchange/LICENSE](../FluxExchange/LICENSE). Dependency compatibility, ownership, sample rights and notices remain under review.

## Product and hosting gates

- [ ] Verify a small import -> edit -> export workflow from a clean installation.
- [ ] Update dated feature-gap statements against the selected release.
- [ ] Keep the hosted editor protected unless a separate public-demo design is approved.
- [ ] Confirm that no shared billable connection becomes anonymously accessible.
- [ ] Explain browser-origin storage, backup/export and background-job limits.
- [ ] Keep planned managed credits, cloud sync and autonomous hosted workflows labeled as planned.

## Publication sequence

1. Resolve license, rights, private reporting and credential findings.
2. Verify CI and fresh installation on the release commit.
3. Review the README, sample project, video and final announcement.
4. Explicitly approve changing repository visibility and publishing the release.
5. Verify anonymous access and clone before announcing "now open source".

The existing launch draft and editable film are review material. Nothing in repository preparation changes visibility, publishes a social post or enables a paid service.

## Credential incident response

If a real key is found, revoke or rotate it first and review provider usage. Deleting the current file or rewriting Git history does not invalidate a credential. Coordinate any history rewrite because it affects existing clones. Never paste the credential into a public issue or a scan report.
