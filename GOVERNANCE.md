# Governance

FluxCreate is an early creative suite preparing for an open-source release. This document describes the initial project decision process. It does not select a license, grant redistribution rights, change repository access or promise a hosted service.

The current responsible person and available contact routes are recorded in [MAINTAINERS.md](MAINTAINERS.md). All participation is subject to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Project purpose

Build understandable, connected creative tools that preserve editable work and let people choose how they use AI. Prefer complete, documented workflows over unsupported claims of professional feature parity.

Core priorities are:

- Protect existing projects, original media and recoverable edits.
- Document compatibility limits and migrations.
- Keep core editing and supported exports usable without a provider key.
- Make billable AI operations deliberate and distinguish personal connections from managed services.
- Keep contributions reviewable and decisions discoverable.
- Publish only code and assets for which the project has the necessary rights.

## Initial governance model

The project uses a **lead-maintainer model**. Alexander, recorded in project history as [@AlexanderCGO2](https://github.com/AlexanderCGO2), coordinates scope, releases and maintainer appointments. Additional maintainers may be appointed for specific areas.

Contributors can propose changes, question decisions, review work and provide evidence. Maintainers should seek agreement and explain unresolved tradeoffs. There is no elected board, formal voting membership or independent conduct committee at this stage.

Repository control is not proof of ownership of every contribution. License changes require the relevant rights and review, not merely an administrator's approval.

## Who decides what

| Decision | Responsible party | Required record or review |
| --- | --- | --- |
| Small documentation or scoped bug fix | Assigned area maintainer; lead maintainer if none | Focused PR, relevant verification and compatibility notes |
| App behavior within an existing design | Area maintainer | Reproduction or example, meaningful tests where applicable, review of user impact |
| Shared formats, migrations, architecture or cross-app contracts | Lead maintainer with affected area maintainers | Written proposal, compatibility/migration plan and review before implementation |
| Credentials, authorization, MCP permissions, paid requests or deployment exposure | Lead maintainer with a qualified reviewer when available | Threat/abuse cases, validation, operational impact and explicit release decision |
| Release scope, tags and supported versions | Lead maintainer | Release checklist, exact commit, check results and known limitations |
| License, contribution terms, trademarks or rights | Relevant rights holders; coordinated by lead maintainer | Explicit written decision and appropriate rights/compatibility review |
| Optional hosted services, pricing and spending commitments | Service owner, coordinated with project lead | Separate commercial and operational approval; no implied change to software rights |
| Maintainer appointment, scope and access removal | Lead maintainer, or designated successor | Consent, scope, rationale and updated maintainer roster |
| Conduct reports and moderation | Non-conflicted designated handler | Private handling under the Code of Conduct |
| Changes to governance | Lead maintainer after contributor review | Proposed text, rationale, discussion and recorded decision |

An unfilled role falls back to the lead maintainer only when there is no conflict of interest. A conflict or missing specialist is a reason to obtain an appropriate reviewer or defer a risky decision, not a reason to imply independent review occurred.

## How a change moves forward

1. Describe the problem and the expected result. Small, obvious fixes can begin with a PR; substantial changes should begin with an issue or proposal.
2. Identify the affected apps, formats, compatibility boundaries and costs.
3. Implement a reviewable change with documentation and verification appropriate to the risk.
4. Review the actual diff and results. Automated checks assist review; they do not approve a design or establish legal rights.
5. Record the decision, merge through the configured repository process, and include user-visible changes in release notes.

External contributions must follow the applicable component license and contribution terms in [CONTRIBUTING.md](CONTRIBUTING.md). The [licensing policy](docs/LICENSING.md) records AGPL-3.0-only for apps and Apache-2.0 for FluxExchange. Rights to third-party material still need review.

## Changes requiring a written proposal

Use an issue, available discussion or linked Markdown proposal for:

- Breaking native or exchange format changes and migrations.
- Shared architecture changes, new service dependencies or substantial package upgrades.
- Authentication, credential handling, AI tool permissions and managed billing.
- New data collection, external transmission, storage or retention behavior.
- Major product scope, licensing, governance or distribution changes.

A useful proposal contains the problem, concrete use cases, scope and exclusions, alternatives, compatibility impact, privacy/security/cost implications, migration or rollback approach, and completion evidence.

Allow at least seven calendar days for ordinary governance, licensing-policy or major architecture feedback before a decision. This is a discussion window, not a promise to implement a proposal. Extend it when affected contributors need time. Urgent containment follows the emergency process below.

Document the outcome as accepted, revised, deferred or declined with a reason. Silence, popularity, sponsorship and AI-generated recommendations do not constitute approval. A proposal approval is not authority to relicense third-party work or spend a user's money.

## Review and disagreement

Prefer an independent review for substantive changes. When only one maintainer is available, record the absence of a second reviewer and the checks performed; do not describe self-review as independent approval. Do not bypass configured protections to make a routine merge convenient.

For contested technical work, summarize the alternatives and evidence in the proposal. The lead maintainer makes the final project-scope decision and explains the reasoning. A contributor can request reconsideration with new information. Repeated disagreement is not itself misconduct.

Conduct decisions use their separate private review process. The subject of a complaint must not adjudicate that complaint.

## Emergency changes

A maintainer with appropriate access may contain an active credential exposure, serious vulnerability, data-loss regression or unauthorized-spending path by disabling an affected feature, reverting a release or restricting access.

Record what changed, who authorized it and how it was verified. Obtain follow-up review as soon as practical, restore normal controls and publish a redacted explanation when safe. Keep exploitable details and personal data private while coordinating a fix.

Emergency authority does not authorize unrelated license changes, publication of private work or additional customer charges.

## Maintainer growth and continuity

Maintainer roles are earned through sustained, constructive contributions and demonstrated care for users' work. Before appointment, agree on responsibility, availability and access. There is no automatic appointment after a commit count or financial contribution.

Use the handover and inactivity process in [MAINTAINERS.md](MAINTAINERS.md). Do not grant repository, hosting or provider access solely because someone appears in an issue or claims to be a successor.

If the sole lead becomes unavailable without a designated successor, continuity is not guaranteed. A public, licensed source release may permit continued work under its license; it does not transfer the original repository, accounts or trademarks.

## Governance changes and status

Propose amendments through the same documented process. Retain previous versions in Git history and avoid applying new process requirements retroactively to settled decisions.

This document describes project policy. Enforced GitHub rules, verified access and release readiness are tracked separately in [the release checklist](docs/OPEN-SOURCE-READINESS.md).

Last updated: 2 November 2026.
