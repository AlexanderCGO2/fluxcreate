# FluxCreate Open-Source Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release a trustworthy, usable open-source alpha and establish a sustainable maintenance process.

**Architecture:** Retain the existing monorepo and browser editors with their Node.js services. Qualify a small set of complete workflows, make shared boundaries explicit, and separate source-release, public-hosting and payment milestones. Deliver each workstream as focused, reviewable changes rather than a suite-wide rewrite.

**Tech Stack:** Existing JavaScript/TypeScript editors, Node.js 24.x, pnpm 12.3.4, GitHub Actions, browser storage, existing SQLite services, FluxExchange and MCP. New services require their own design and evidence.

**Spec:** [Open-source release specification](../../OPEN-SOURCE-RELEASE-SPEC.md)

Prepared **1 November 2026**. This is a proposed execution plan, not evidence that the tasks below are complete.

## Global constraints

- Node.js 24.x and pnpm 12.3.4 remain the current reproducible baseline until a separately verified update.
- Preserve native project IDs and internal compatibility directory names.
- Core editing and supported exports work without provider keys.
- No live provider calls or private credentials in ordinary CI.
- Personal provider billing never silently falls back to shared managed billing.
- License selection remains an owner decision; recommendations are not adopted licenses.
- Current credentials, private media and runtime state must not enter published source, releases, screenshots or examples.
- No model or imported document may grant itself permission to spend, publish, access arbitrary local files or execute code.
- Keep the deployed workspace protected until a separately qualified public-service launch.
- Preserve the confirmed 50% contribution-margin target for future managed creation services; do not confuse it with net company profit.
- Only publicize feature and compatibility claims backed by release evidence.
- Plan work now; execute visibility changes, licensing and announcements only after explicit owner decisions.

## Review focus

1. A newcomer has no Codex runtime, private environment files or API key: installation and core editing must still work. Owned by OS-07.
2. A file is malformed, oversized, or uses unsupported format features: report the issue and preserve the current project. Owned by OS-08 and OS-10.
3. Storage fills, a tab closes or two tabs save concurrently: preserve a recoverable version and do not silently overwrite newer work. Owned by OS-08 and OS-09.
4. A generation times out or an imported workflow requests paid/external actions: do not silently resubmit or change funding scope. Owned by OS-11 and OS-18.
5. An untrusted fork changes build scripts or a workflow: it must not gain deployment secrets, writable release permissions or access to a maintainer machine. Owned by OS-04 and OS-06.

## 1. Where we are

| Area | Evidence | Remaining work |
|---|---|---|
| Repository overview | Comprehensive root README exists | Add cleared visuals, maintain exact release claims |
| Contributor onboarding | CONTRIBUTING and issue/PR templates exist | Independent newcomer test, smaller per-app instructions |
| Automated checks | Pinned actions; Windows/Linux build/test and credential jobs exist | Required checks/rulesets, browser qualification, dependency maintenance |
| Credentials | Previous source/history/build review found no confirmed keys; exact synthetic exceptions | Repeat on release candidate; inspect non-text/publication surfaces |
| Installation | October 26 record: fresh-clone build and 784 tests passed | Requalify the release commit; Mac support only if tested |
| License | No project license in inspected checkout | Owner decision, dependency compatibility, notices |
| Governance | Contributor guidance exists | Named responsibilities, conduct/reporting, decision and succession rules |
| Product scope | Eight foundations and extensive feature-gap reports | Qualify real workflows; label preview features accurately |
| Hosting/billing | Protected deployment and plans exist | App identity, ownership, durable jobs and ledger before paid public service |
| GitHub live state | CLI resolution failed and connector returned 404 on November 1 | Restore access and verify owner, visibility, default branch and preparation PR |

Do not rerun all historical work merely to fill a checklist. Preserve existing evidence and rerun tests when the release candidate or relevant environment changes.

## 2. Positioning and release boundaries

Recommended description: **An open creative suite for editable AI-assisted workflows across images, layouts, video, motion and 3D.**

The first users should be independent creators and small studios producing related stills, layouts and short videos. This is a customer hypothesis to test, not proven demand.

Use three independent milestones:

- **R0 — private release candidate:** legal/provenance work, release tests, security review and onboarding complete.
- **R1 — public source alpha:** licensed repository, usable source installation, sample workflows, honest limitations, contributor path.
- **R2 — public managed service:** separately verified accounts, tenant isolation, asset ownership, durable jobs, budgets, billing and operational support.

Professional Photoshop/Adobe/Houdini/Blender parity is not an R1 requirement. Unsupported previews may ship as clearly labeled experimental features if they cannot corrupt work, expose credentials or create unauthorized spend. A public website does not need to expose the hosted editor.

## 3. Ownership, estimates and dependency order

Roles are responsibilities, not invented team members. Initially the founder may hold several roles:
**Owner** decides rights, license, brand and release; **maintainer** owns code/reviews; **security reviewer** verifies boundaries; **QA/creator** tests real workflows; **legal/accounting reviewer** resolves specific rights and commercial questions.

Effort estimates below are focused working time for bounded preparation, excluding unknown defect repairs and external review lead times. They are not calendar commitments. One maintainer should keep at most two substantial workstreams active.

| ID | Deliverable | Owner | Depends on | Effort | Gate |
|---|---|---|---|---|---|
| OS-01 | Verified repository ownership/access | Owner | — | 0.5 day | R0 |
| OS-02 | License and contribution decision | Owner + legal reviewer | OS-01 | 1–3 days + review | R0 |
| OS-03 | Dependency/media rights inventory | Maintainer + owner | —; feeds OS-02 | 2–4 days | R0 |
| OS-04 | GitHub access and change controls | Maintainer | OS-01 | 0.5–1 day | R0/R1 |
| OS-05 | Publication credential review | Security reviewer | Candidate files | 1–2 days | R0 |
| OS-06 | CI and dependency maintenance | Maintainer | OS-04 | 1–3 days | R0 |
| OS-07 | Independent installation/onboarding | QA + maintainer | OS-06 | 1–2 days | R0 |
| OS-08 | App workflow qualification | QA + app maintainers | OS-07 | 3–5 days + fixes | R0 |
| OS-09 | Exchange/storage compatibility contract | Maintainer | OS-08 | 2–4 days + fixes | R0 bounded scope |
| OS-10 | File/parser and local-service review | Security reviewer | OS-08/09 | 2–4 days + fixes | R0 |
| OS-11 | AI/MCP permission and cost boundaries | Maintainer + security | OS-08 | 2–3 days + fixes | R0 |
| OS-12 | Contributor/governance package | Owner + maintainer | OS-02 | 1–2 days | R0 |
| OS-13 | Docs and accessible flagship flows | Maintainer + QA | OS-07/08 | 2–4 days + fixes | R0 |
| OS-14 | Release artifact/rollback process | Maintainer | OS-02–13 | 1–2 days | R0 |
| OS-15 | Private creator pilot | QA/creator | OS-14 | 5–10 elapsed days | R0 |
| OS-16 | Public alpha and announcement | Owner | R0 gates | 1–2 days | R1 |
| OS-17 | Maintenance/community cadence | Maintainer | R1 | Ongoing | R1 |
| OS-18 | Sustainable hosted/paid offer | Owner + maintainer | Separate R2 design | Separate estimate | R2 |

Parallelizable work: rights inventory, documentation/governance drafts and workflow testing. Shared format changes, security fixes and release integration should be sequenced to avoid incompatible assumptions. Do not dispatch agents or start implementations merely because this plan lists parallel work.

## 4. Executable work packages

### OS-01 — Establish the authoritative repository

**Files:** record findings in `docs/OPEN-SOURCE-READINESS.md`; update links in README only after verification.
**Input:** local checkout and authenticated GitHub access.
**Output:** verified owner/repository, default branch, exact candidate SHA, preparation PR state and named administrator.

- [ ] Confirm the correct GitHub account/app installation can access the repository; a 404 alone cannot distinguish permissions, rename, transfer or deletion.
- [ ] Read the Git remote and confirm it against the owner-visible repository; do not create a replacement repository.
- [ ] Inspect preparation PR #1 and compare its commits with the default branch.
- [ ] Preserve the uncommitted LinkedIn drafts; do not absorb them into unrelated commits.
- [ ] Decide whether a project-owned GitHub organization is useful. Transfer only after reviewing Actions, deploy integrations, redirects and permissions.
- [ ] Record who owns domains, trademarks, hosting, provider accounts and release credentials.

**Done:** a second authorized maintainer can identify the canonical repo and release commit; remote status is verified rather than inferred.

### OS-02 — Decide licensing and contribution terms

**Files:** create `LICENSE`, `docs/LICENSING.md`, `TRADEMARKS.md`; update package metadata and CONTRIBUTING after approval.
**Input:** ownership evidence and OS-03 inventory.
**Output:** one explicit license policy and contributor rights process.

Recommended default to evaluate: **AGPL-3.0 for the apps if reciprocal hosted modifications matter most**. Keep Apache-2.0 as the simpler broad-reuse option. Separately licensing FluxExchange permissively can help adoption, but only after its boundary, dependencies and ownership are reviewed; avoid unnecessary mixed-license complexity at launch.

| Choice | Practical tradeoff |
|---|---|
| AGPL-3.0 | Modified network-served versions have corresponding-source obligations; commercial use and competing hosting are still possible |
| Apache-2.0 | Permissive reuse with notice/patent provisions; does not generally require downstream proprietary changes to be published |

These are directional summaries, not a legal determination about FluxCreate. Review the final dependency combination and distribution model with a qualified reviewer. [GNU AGPL explanation](https://www.gnu.org/licenses/why-affero-gpl.html), [Apache license](https://www.apache.org/licenses/LICENSE-2.0).

- [ ] Confirm the copyright holder and rights to existing contributions, copied snippets and generated assets.
- [ ] Choose exact license identifiers, including any “only” versus “or later” choice.
- [ ] Apply the unmodified license text and consistent SPDX metadata; preserve third-party license files.
- [ ] Set explicit licensing for documentation, examples, fonts, samples and logos. Do not imply a code license licenses user outputs or third-party model output.
- [ ] Prefer a DCO sign-off process if contributor origin certification is sufficient; a DCO is not a copyright assignment or permission to relicense everything. Use a tailored CLA only if its extra rights are necessary and explained. [DCO](https://developercertificate.org/)
- [ ] Document AI-assisted contribution rules: human accountability, source/provenance review, meaningful tests and no confidential input.
- [ ] Reserve brand use through a clear trademark policy rather than adding commercial-use bans to the software license.
- [ ] Verify LICENSE is present in the source archive and applicable distributed packages.

**Done:** a new contributor can determine use, modification, redistribution, attribution and contribution terms without asking privately. Do not claim “open source” while only making unlicensed source visible. [OSI guidance](https://opensource.org/faq)

### OS-03 — Inventory dependencies, samples and rights

**Files:** create `THIRD_PARTY_NOTICES.md`, `docs/ASSET-PROVENANCE.csv`, `docs/DEPENDENCY-REVIEW.md`; preserve existing font notices.
**Interface:** asset rows contain path, author/source URL, license, redistribution evidence, attribution, modifications and review status.

- [ ] Inventory every workspace's direct and transitive dependencies from the lockfile, plus bundled WASM, fonts, vendor files and optional media binaries.
- [ ] Generate an SBOM from the candidate build/dependency graph; compare it with what the release actually bundles. An SBOM is an inventory, not legal clearance. [GitHub SBOM documentation](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/export-dependencies-as-sbom)
- [ ] Investigate missing/ambiguous license metadata and incompatible redistribution obligations.
- [ ] Review FFmpeg build/configuration obligations if bundled; do not assume every build has identical licensing.
- [ ] Inventory screenshots, music, videos, sample PSD/IDML/AE files and generated assets. Provider access does not itself establish redistribution rights.
- [ ] Replace personal/downloaded demo media with small original or clearly redistributable fixtures; do not publish “That Feather” or private clips without rights evidence.
- [ ] Add notices and separate sample asset licenses; exclude unresolved assets from release.
- [ ] Review binary sizes and choose optional downloads for large packs; do not introduce Git LFS as an unexplained prerequisite.

**Done:** every shipped dependency and asset has a recorded disposition, and no unknown-rights file enters the public release.

### OS-04 — Configure GitHub for maintainable contributions

**Files:** create `.github/CODEOWNERS`, `docs/REPOSITORY-ADMIN.md`; update `.github/SECURITY.md`.
**Input:** verified admins and actual platform feature availability.
**Output:** recorded rulesets, roles, required check names and working reporting routes.

- [ ] Enable 2FA for administrators, protect recovery codes, grant least-privilege roles and nominate a recovery contact.
- [ ] Protect main: PRs, required checks, resolved review conversations, no force pushes/deletion and narrowly recorded emergency bypass.
- [ ] Require an independent approval when a second reviewer exists. Do not create an impossible solo-maintainer self-approval requirement; document the interim exception and evidence.
- [ ] Use the current CI job names: `Credential scan`, `Build and tests (ubuntu-latest)`, `Build and tests (windows-latest)`; add browser checks only once their names and behavior are stable.
- [ ] CODEOWNERS must name actual maintainers with access, covering security/CI/settings/exchange changes explicitly.
- [ ] Enable repository secret scanning/push protection where available and verify settings after publication. Public and private feature availability differs by plan. [GitHub secret scanning](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning)
- [ ] Set up a real private security contact while private. GitHub private vulnerability reporting is for public repositories: enable and test it immediately at publication, before broad promotion. [Private reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
- [ ] Verify rules reject a harmless direct-push/merge violation on a disposable test branch configured with equivalent rules. Do not push a real secret to test controls.

**Done:** permissions, protected paths and emergency ownership are documented; security contact is reachable. [Ruleset availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)

### OS-05 — Repeat the credential review on the candidate

**Files:** existing `scripts/check-secrets.mjs`, `scripts/secret-fixtures.json`, ignore files and `docs/CREDENTIAL-CHECKS.md`; retain redacted evidence.
**Output:** candidate SHA + scanned scope + unresolved findings/limitations.

- [ ] Fetch all authorized release refs, then run `pnpm secrets:check`, `pnpm secrets:history` and `node scripts/check-secrets.mjs --self-test`.
- [ ] Build the candidate and run `node scripts/check-secrets.mjs --build`.
- [ ] Add an established maintained secret scanner as an independent check after pinning/verifying its installation; retain exact exceptions only for validated synthetic values.
- [ ] Review release archives, source maps, docs, screenshots, sample projects, CI artifacts/logs, issue attachments and commit metadata for publication-sensitive information.
- [ ] Keep real credential values out of evidence/log output. Review signed URLs, cookies, private addresses and runtime databases as well as API keys.
- [ ] Rotate/revoke any confirmed exposed credential first; investigate provider usage. Coordinate history cleanup separately because deletion alone does not revoke a key.
- [ ] Record inaccessible refs and external systems explicitly. Never certify that no possible secret exists.

**Done:** no unresolved confirmed secret disclosures, no unexplained skipped release files, and all allowlist entries have review evidence. The previous scan is useful baseline evidence, not a replacement for this candidate check.

### OS-06 — Make checks a dependable contributor contract

**Files:** extend `.github/workflows/ci.yml`; create `.github/dependabot.yml`; modify package scripts only for real implemented checks.
**Output:** deterministic no-key CI and bounded dependency update flow.

- [ ] Preserve SHA-pinned actions, read-only ordinary jobs and frozen installation.
- [ ] Test a fork PR with no secrets available. Never use privileged `pull_request_target` to execute untrusted checked-out code; do not run public contributions on personal self-hosted runners. [GitHub Actions security](https://docs.github.com/en/actions/reference/security/secure-use)
- [ ] Add weekly grouped dependency update proposals with reviewed major upgrades and security escalation.
- [ ] Add dependency vulnerability and code scanning with reviewed findings; do not run blind automated “fix everything” updates.
- [ ] Add broken-local-link and license/provenance checks. Introduce formatting/linting without an unrelated whole-repo rewrite.
- [ ] Add browser workflow checks using existing isolated test patterns; upload only synthetic, redacted failure artifacts with limited retention.
- [ ] Keep paid provider qualification a separate manually authorized process. Mock success/failure tests cannot certify a live model.
- [ ] Avoid mandatory checks that skip themselves forever due to path filters; verify checks on docs-only, app-only and shared-code PRs.

**Done:** fresh external PRs receive actionable results without credentials, and a maintainer can reproduce the failure locally.

### OS-07 — Make first use possible without our environment

**Files:** README, CONTRIBUTING, per-app README files, `docs/GETTING-STARTED.md`, `docs/TROUBLESHOOTING.md`; launcher changes only for observed failures.

- [ ] Have two people uninvolved in development use a clean Windows and Linux environment with Node 24.x/pnpm 12.3.4.
- [ ] Follow only the documented clone/install/build/launch flow. No Codex runtime, private sibling folder, preexisting public directory or API key may be required.
- [ ] Measure installation time separately from first-edit time; propose a target of first successful edit within 15 minutes after prerequisites/dependency download, then validate it.
- [ ] Test paths with spaces, occupied ports, unsupported Node versions, disconnected AI and a browser with no stored data.
- [ ] Explain `localhost` versus `127.0.0.1` and port-specific browser storage.
- [ ] Verify stop/restart behavior and native download/reopen. Document where projects/media actually live.
- [ ] Test macOS before claiming it supported; document unqualified platforms instead of implying certification.

**Done:** both testers complete a no-AI save/reopen/export workflow without private instructions.

### OS-08 — Qualify the apps with reproducible examples

**Files:** add cleared `examples/` assets and `docs/WORKFLOW-QUALIFICATION.md`; update app gap docs; extend existing app tests.
**Evidence row:** commit, app, fixture/hash/license, browser/OS, steps, assertions, result, limitation and issue.

| App | Required alpha example | Next product priority after release |
|---|---|---|
| FluxFoto | Import real photo, mask, reorder layers, adjust, undo, native save/reopen, PNG + bounded PSD export | Retouching, soft/pressure brushes, groups/adjustment layers, large images |
| FluxDesign | Two-page text/image layout, alignment, overset warning, native reopen, PDF inspection | Threaded/rich text, font fidelity, print/preflight |
| FluxVideo | Several clips + song, trim/reorder, Autoedit proposal review, manual correction, reopen, synchronized export | Proxies, J/L cuts, recovery, larger media, captions and mixing |
| FluxMotion | Layer animation/easing, supported scene object, audio, reopen and bounded video export | Precompositions, masks/mattes, time remapping, render recovery |
| FluxEffects | Small node graph, parameter edit, simulation preview, save/reopen and supported exchange | Reusable groups, compute budgets/cancellation, caches |
| Flux3D | Import geometry, transform/edit within current limits, save/reopen and supported export | Hierarchy, mesh modeling, materials/UV, animation |
| FluxLab | No-key discovery, synthetic provider job, save/library/reopen/handoff without resubmission | Cost visibility, reliable recovery, qualified provider editing |
| FluxAgents | Simulate/run a local bounded workflow, branch/approval, reopen and inspect output | Typed media mappings, retry semantics; hosted runtime later |

- [ ] Promote three flagship workflows: photo -> layout -> PDF; clips/song -> reviewed Autoedit -> video; scene/object -> motion -> supported export.
- [ ] Give each app an accurate maturity label; derive it from its evidence, not appearance.
- [ ] Add failure cases: unsupported codec/features, malformed file, cancel mid-import, quota failure, tab restart, conflicting save and missing media.
- [ ] Assert the last usable project survives failures; exports reflect committed state, not an uncommitted drag preview.
- [ ] For video, listen to stereo output and verify timing on real exported files; mocks do not qualify playback.
- [ ] Record source-size limits and large-media benchmarks using cleared 100–500 MB clips where supported.
- [ ] Classify defects: P0 data loss/security/unauthorized spend; P1 broken advertised workflow; P2 workaround exists; P3 polish. Fix P0 and P1 affecting promoted workflows before release.

**Done:** every included app has smoke/recovery evidence and the three promoted workflows pass. Feature parity remains a separate backlog, with FluxFoto -> FluxVideo -> FluxMotion the next implementation priority.

### OS-09 — Make exchange and project formats trustworthy

**Files:** FluxExchange README/utilities/tests; create `docs/FORMAT-COMPATIBILITY.md`, `docs/PROJECT-MIGRATIONS.md`, `docs/DATA-AND-PRIVACY.md`; update supported transfer handlers.

- [ ] Document each schema/version, units, IDs, asset reference rules, render snapshot and recoverable-source behavior.
- [ ] Define supported source/target pairs in a matrix. Unsupported targets must explain the limitation.
- [ ] Add fixtures for current/previous project versions, unknown future versions, missing assets, duplicate transfers and interrupted application.
- [ ] Verify duplicate delivery does not silently insert a second object; ambiguous partial application must be surfaced and recoverable.
- [ ] Verify stale AI/source updates do not overwrite newer edits; review/apply and undo preserve originals.
- [ ] Validate imported payloads before allocating expensive resources or accessing URLs; retain bounded depth/count/size.
- [ ] Document native downloads, media embedding/relinking, backup/restore and origin-local storage; do not label snapshots as live synchronization.
- [ ] Publish migration policy: preserve source backup, convert explicitly, warn about unsupported newer versions.

**Done:** a contributor can implement a bounded exchange reader from the specification and test fixtures, and users can reopen supported older files without silent loss.

### OS-10 — Review actual public-source attack surfaces

**Files:** create `docs/THREAT-MODEL.md` and `docs/SECURITY-RELEASE-REVIEW.md`; fix implicated parser/server modules in separate scoped PRs.

- [ ] Inventory PSD/PSB, XML/IDML, SVG, ZIP/container, JSON/Markdown, audio/video and scene import boundaries.
- [ ] Test malformed nesting, oversized decoded dimensions, archive expansion, unsafe SVG/HTML, external XML entities and path traversal where applicable.
- [ ] Review remote media fetching for SSRF, redirects, private-network targets and credential forwarding.
- [ ] Review local service binding, Origin/CORS checks, cross-site requests, authentication and filesystem access. A local port is not automatically inaccessible to malicious websites.
- [ ] Confirm output/prompt text cannot become executable HTML/JavaScript.
- [ ] Check effective credential storage permissions on Windows and Unix; resolve inconsistent data-directory handling found in the earlier review.
- [ ] Verify logs/diagnostic exports omit credentials and private media by default.
- [ ] Validate fixes with adversarial fixtures and record bounded residual risks.

**Done:** no unresolved high-impact issue in supported public-release paths; scoped review is described honestly without claiming a universal security certification.

### OS-11 — Qualify AI and MCP boundaries

**Files:** existing FluxLab MCP/provider routes, shared connection settings, editor helper planners and FluxAgents runner; create `docs/AI-PERMISSIONS.md`.

- [ ] Document what leaves the machine for each modality, which provider receives it, and which operations can cost money.
- [ ] Use synthetic server-held canaries to verify configured keys do not appear in client responses, bundle content, projects or transfer receipts.
- [ ] Verify imported prompts/projects/agent outputs cannot authorize generation, publication or arbitrary tools.
- [ ] Validate model-generated edit operations; test invalid type, out-of-range value, stale selection and revision conflict.
- [ ] Test expired personal connections, cancellation, provider timeout, uncertain submission and browser reload. Do not silently retry a possibly billed request.
- [ ] Validate MCP arguments, tool permissions, configured endpoints and tool-result rendering; keep read-only discovery separate from billable execution.
- [ ] Run a separately approved, capped live qualification for each advertised provider/model capability. Record model ID, date, input limits, actual output and costs.
- [ ] Label unavailable/unqualified music, image editing, upscale and audio-input capabilities accurately. “Latest model” is not a compatibility contract.

**Done:** provider calls have deliberate authorization, own billing scope and observable outcomes; unrelated imported data cannot expand access.

### OS-12 — Make contribution and governance real

**Files:** create `GOVERNANCE.md`, `MAINTAINERS.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `docs/RFC-TEMPLATE.md`; update CONTRIBUTING and CODEOWNERS.

- [ ] Name active maintainers, responsibilities, decision authority, promotion/removal criteria and continuity procedure.
- [ ] Adopt a conduct policy with a real private contact and someone able to handle reports, including a conflict route if the complaint concerns the owner.
- [ ] Document issue -> scoped proposal -> PR -> checks -> review -> release; use an RFC for format changes, licensing, authentication, billing and major integrations.
- [ ] Explain support boundaries and proposed response targets based on actual capacity. Do not invent 24/7 support or a security SLA.
- [ ] Establish labels: app areas, bug/docs/security/performance/accessibility, good-first-issue/help-wanted, and priority.
- [ ] Prepare 10–15 genuinely small starter issues with file paths, a reproduction, expected result and test command. Keep security/payment/complex parser tasks out of beginner issues.
- [ ] Prefer searchable GitHub Discussions for questions/design/showcase; avoid fragmenting a small community across many chat services.
- [ ] Credit contributors in releases and welcome non-code contributions with concrete tasks.

**Done:** an unfamiliar contributor understands how decisions are made and can complete a small contribution without private coaching. Clear roles and procedures are the goal, not foundation-scale bureaucracy. [CNCF governance guidance](https://contribute.cncf.io/projects/best-practices/governance/)

### OS-13 — Improve documentation and accessible use

**Files:** README, app guides, `docs/ARCHITECTURE.md`, `docs/ACCESSIBILITY.md`, `docs/PERFORMANCE.md`; shared UI and relevant editor components only for identified gaps.

- [ ] Add cleared real screenshots, a short demonstration and exact “works/partial/planned” labels.
- [ ] Document the nine entry points, shared server, FluxExchange, provider adapters and browser/backend persistence.
- [ ] Add one no-key tutorial per flagship workflow and a searchable troubleshooting list.
- [ ] Test keyboard completion, visible focus, modal escape/focus return, labels, contrast, reduced motion, zoom and errors.
- [ ] Give drag interactions a keyboard/button alternative, particularly layer reordering and timeline operations.
- [ ] Use WCAG 2.2 AA as the evaluation target and publish actual findings; do not claim conformance without the assessment. [W3C reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [ ] Measure import, interaction, save and export time with documented hardware/fixtures. Set budgets from measured results, not unsupported marketing numbers.
- [ ] Distinguish installation, first-use, browser support and performance limits; document missing features without burying them.

**Done:** flagship tutorials are usable without private help; material accessibility blockers in those flows are resolved and remaining gaps have reproducible issues.

### OS-14 — Produce a release that can be reproduced and recovered

**Files:** create `CHANGELOG.md`, `docs/RELEASING.md`, `docs/SUPPORT-VERSIONS.md`, `.github/workflows/release.yml` after design; update readiness checklist.

- [ ] Select a prerelease version consistent with existing tags/package versions; do not call it 1.0 because the repository is public.
- [ ] Build from the exact reviewed tag in a clean environment, never a developer's runtime directory.
- [ ] Package source and any supported runnable artifacts with license, notices, examples and instructions; inspect their file lists and run secret checks.
- [ ] Publish checksums and an SBOM for actual artifacts. Add verifiable provenance where platform access allows. Provenance identifies build origin; it is not proof the program is safe. [GitHub attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [ ] Keep release permissions in a separate protected job. Ordinary fork PRs cannot publish or deploy.
- [ ] Reinstall the packaged artifact, verify older project reopening and test rollback while preserving newly created projects.
- [ ] Define the currently supported version/branch and security-update path; avoid promising long-term support prematurely.
- [ ] Attach candidate SHA, test evidence, known limitations and migration notes to release notes.

**Done:** another person can verify origin, install the documented artifact and understand upgrades/rollback without our workstation.

### OS-15 — Run a small private pilot

**Files:** `docs/PILOT-PROTOCOL.md`, redacted issue/evidence records; keep private user media outside Git.

- [ ] Recruit 3–5 creators, including at least two who did not build FluxCreate.
- [ ] Give each one a flagship task and cleared sample project, then observe without coaching first.
- [ ] Record where they stop, incorrect expectations, lost work, installation effort and usable exports.
- [ ] Ask for explicit permission before collecting recordings, prompts or project files; minimize retained data.
- [ ] Repair launch-blocking failures and repeat the failed workflow.
- [ ] Test one small external contribution against the draft contributor guide.

**Done:** each promoted workflow has an independently completed result, zero unresolved P0/P1 in that scope, and documented remaining constraints. Enthusiasm is useful feedback but not acceptance evidence.

### OS-16 — Publish and announce in a controlled sequence

**Files:** README, release notes, existing LinkedIn article/publishing draft; proposed `docs/LAUNCH-CHECKLIST.md`.

- [ ] Review the R0 gate with the owner: license, rights, secrets, candidate CI, fixtures, support and honest claims.
- [ ] Obtain the explicit decision to make the verified repository public; making it private again cannot retract downloaded copies.
- [ ] Publish the reviewed source/tag and enable public-repository security reporting/protection features as available.
- [ ] Test anonymous repository access, clone, release download and every getting-started link in a clean session.
- [ ] Keep production editor authentication unchanged unless R2 is independently ready. A separate static overview can serve public visitors.
- [ ] Update the LinkedIn draft from “preparing” to released only after public licensed access is verified.
- [ ] Produce a 60–90 second real demonstration with captions, cleared media, accurate capability labels and no visible credentials/account details.
- [ ] Announce to an appropriate small audience first; personally review community posting rules. Publish or message only with explicit authorization.
- [ ] Monitor onboarding, issues and reporting channels after launch; patch blockers before expanding promotion.

**Done:** source availability, license, instructions and demonstration agree with each other. No announcement points to an inaccessible private repository.

### OS-17 — Maintain the project after launch

**Files:** `docs/MAINTENANCE.md`, roadmap, changelog and issue board.

- [ ] Weekly: triage issues/PRs, review dependency updates, check security reports, improve one repeated onboarding failure.
- [ ] Every two weeks initially: ship focused fixes when evidence is ready; publish known issues and contributor credit.
- [ ] Monthly: review backups/recovery, costs, permissions, broken links, browser behavior and provider capability drift.
- [ ] Quarterly: review roadmap, license/provenance inventory, maintainer workload and continuity.
- [ ] Track meaningful measures: successful installations/exports, repeat creators, first-contribution completion, review delay, data-loss incidents and support burden.
- [ ] Avoid using GitHub stars as the principal success metric; do not collect private creator behavior by default.
- [ ] Use the OpenSSF Best Practices criteria as a recurring improvement checklist, claiming a badge only after actually meeting its requirements. [OpenSSF criteria](https://www.bestpractices.dev/en/criteria/0)

**Done:** maintenance is assigned and predictable; a growing backlog cannot silently become an unsupported product.

### OS-18 — Fund reliable operation without delaying the source release

**Files:** refine existing MONETIZATION-PLAN and STRIPE-CREDITS-PLAN; future architecture plans before implementing hosted identity/storage/jobs/billing.

- [ ] Preserve no-key editing, exports and BYOK. Publish which features are software and which are optional hosted services.
- [ ] Start with bounded support/integration pilots and sponsorship; test willingness to pay for real completed workflows.
- [ ] Offer managed storage/team workflows only after accounts, asset ownership, deletion/export, backup restore and operational limits work.
- [ ] Before managed generation, implement a transactional ledger, server-approved quotes, atomic budget reservations, durable job state and reconciliation of uncertain submissions.
- [ ] Fulfill prepaid purchases through validated, idempotent server processing; never grant credits because the browser returned from checkout. Validate the exact Stripe Checkout flow during implementation. [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [ ] Preserve the confirmed 50% contribution-margin target after attributable costs. With non-payment cost C, allocated fixed fee F and proportional fee f, an illustrative minimum pretax price is (C + F) / (0.5 - f), only when f < 0.5. Actual pricing must use the real merchant/provider terms and measured cost evidence.
- [ ] Include provider, compute, storage/egress, payment/FX and attributable failure/refund costs. Do not count tax as revenue or promise 50% net profit.
- [ ] Bound total authorized spend across retries and agent steps. Never repair margin by charging above a customer's approved maximum.
- [ ] Verify merchant identity, provider resale terms, tax/refund/accounting treatment and customer disclosures with the appropriate reviewers before selling.
- [ ] Run payment sandbox tests, failure/restart/concurrency tests, then a separately approved limited live pilot before expansion.

**Done:** R2 has its own reviewed readiness record; buying credits is optional and never required to retain access to existing creative files.

## 5. First ten working days

This is a suggested work order, not a launch promise. Stop for actual blockers rather than marking tasks complete by date.

| Day | Main outcome |
|---|---|
| 1 | Restore GitHub access; confirm ownership, candidate branch and scope |
| 2 | Start rights inventory; present concrete license/contribution decision |
| 3 | Establish repository protections and security-reporting contact |
| 4 | Add dependency-maintenance checks; test untrusted fork behavior |
| 5 | Independent no-key Windows/Linux installation |
| 6 | Qualify FluxFoto and the photo-to-layout workflow |
| 7 | Qualify FluxVideo Autoedit/export and recovery |
| 8 | Qualify Fluxiffects/scene handoff plus remaining app smoke checks |
| 9 | Review import/AI boundaries; draft governance and contributor tasks |
| 10 | Review evidence, defects and external-review progress; select a realistic candidate |

If licensing, serious defects or independent testing remain unresolved, continue preparation. Do not schedule a public announcement based solely on this calendar.

## 6. Public-alpha gate

- [ ] Canonical owner/repo, candidate commit and release responsibility verified.
- [ ] License and contribution terms adopted; dependency and media rights resolved.
- [ ] Candidate secret review complete with no unresolved confirmed disclosures.
- [ ] Fresh no-key install/build/test passes on supported platforms.
- [ ] All included apps have smoke/recovery evidence and honest maturity labels.
- [ ] Three flagship workflows complete without unresolved P0/P1 failures.
- [ ] Formats/storage/migrations and known compatibility limitations documented.
- [ ] Private reporting/contact, maintainers, governance and conduct process operational.
- [ ] Release artifact, notices, checksums, rollback and support policy reviewed.
- [ ] Independent pilot completed and launch material matches the release.
- [ ] Owner explicitly approves public visibility.
- [ ] Anonymous clone/download and public reporting are verified before broad announcement.

Keep P0 blockers visible. Deferred P2/P3 features need an owner, scope and reproducible issue; they do not disappear because an alpha ships.

## 7. Decisions needed from the owner

These decisions are intentionally not invented or applied by this plan:

1. Exact copyright holder and eventual repository-owning account/organization.
2. License direction: reciprocal AGPL or permissive Apache; separately reviewed exchange licensing if worthwhile.
3. Contributor agreement approach: DCO by default, or a justified CLA with legal review.
4. Named maintainer/recovery/security/conduct contacts and realistic support capacity.
5. Acceptance of the three flagship workflows and public-alpha positioning.
6. Public release approval once evidence is ready.
7. Later, merchant/provider/commercial decisions for R2; no need to resolve all billing details before R1.

Suggested execution approach after review: the maintainer implements small sequential PRs, with separate review for licensing, security, file formats and billing. Independent documentation, rights inventory and testing can proceed in parallel. Automation assists; named people remain accountable for release decisions.
