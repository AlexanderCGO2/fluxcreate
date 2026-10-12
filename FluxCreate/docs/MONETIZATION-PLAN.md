# FluxCreate: sustainable open-source business proposal

Prepared 2026-10-09. Recommendation and validation plan, not a price announcement or statement of existing revenue. No billing changes or license selection are made here.

## Recommendation

Keep the creative editors, portable project formats, supported exports and personal AI connections in the open core. Start revenue with carefully scoped studio pilots and integration/support work. Introduce paid managed workspaces only after accounts, remote assets and durable jobs are ready. Charge for reliable operation, collaboration and service rather than holding a creator's files behind a subscription.

The initial customer hypothesis is a small creative studio producing related stills, layouts and short videos. The strongest initial offer is two or three reliable cross-app workflows: a product campaign from source assets; a repeatable set of branded content variants; and reviewable AI assistance inside existing documents. Eight mature replacement applications are not a credible near-term sales promise.

## What can be offered, and when

| Offer | Value | Status / release gate | Revenue structure to test |
|---|---|---|---|
| Community software | Local/self-hosted editing, exchange, exports, BYOK | Finalize licensing, installation and contribution documentation | Free software; optional sponsorship |
| Guided pilot | A real studio workflow configured and tested with its own assets | Can be scoped around verified current features; explicitly exclude unsupported fidelity | Fixed fee for agreed deliverables and capped support |
| Managed personal workspace | Accessible projects, backups and history across devices | Requires app identity, remote storage, conflict recovery and deletion/export controls | Monthly fee plus clear storage limits |
| Studio workspace | Shared assets, review, permissions and repeatable workflows | Requires tenant isolation, asset ownership, durable execution and team lifecycle | Workspace fee including a small seat allowance |
| Managed AI usage | No provider setup; visible spending and recoverable jobs | Requires metering, budget reservation, idempotency, refunds/reconciliation and provider terms review | Prepaid usage with a disclosed service fee |
| Private deployment/support | Operational assistance, controlled environment and integrations | Requires an install/upgrade/restore playbook and explicit support boundaries | Annual agreement priced from actual work |
| Templates/extensions marketplace | Reusable workflows and creative components | Wait for repeat users, creator demand and quality review | Later transaction fee; not an initial dependency |

Deploy protection is not team identity. Browser autosave is not cloud backup. Current local job recovery is not the infrastructure required to sell unattended cloud workflows. These are product gates, not wording changes.

## Price experiments, not a public price list

For qualified interviews, test a €750 guided pilot with a narrow deliverable and a stated support-hour cap. Learn whether a studio will pay for an actual reduction in repetitive work. Record delivery time so a successful pilot does not hide an unprofitable service commitment.

After managed workspaces exist, test €19/month for an individual and €79/month for a small studio including three seats, with modest explicit storage/job limits. These are starting hypotheses, excluding taxes and model usage, not market-derived optimal prices. Also test annual commitments only once retention is understood. Do not sell an unlimited AI/video allowance.

Keep BYOK available: customers pay their provider directly, while any hosted workflow execution or storage charge is separate and visible. For optional managed AI, show the estimate before submission, reserve a maximum authorized amount, and reconcile against actual provider cost. Never present an unavailable cost as zero. A failed request, retry or browser refresh must not create an unexplained second charge.

## Unit economics to measure before scaling

Separate subscription revenue from pass-through model usage. Track model fees, job compute, storage, egress, payment fees and support per active workspace. Also track fixed engineering/security/operations spend; contribution margin does not mean profitability.

Illustrative monthly example only: €79 studio revenue minus €8 infrastructure, €3 payments and €12 allocated support leaves €56 contribution, about 71%. If the same customer instead needs €35 of infrastructure and €30 support, contribution falls to €11, about 14%. None of these costs have been measured for FluxCreate; the example shows why workload and support limits must be tested. AI usage is excluded in both cases and must fund its own provider cost and operating overhead.

Use measured job costs and actual support time to set caps. Large media egress and repeated video generations deserve their own limits. Customers should see storage usage, remaining budget and what happens at a limit; quota exhaustion should never remove access to their existing files.

## Licensing and trust

No suite-level project license was found in the inspected release checkout. A public repository alone does not establish an open-source license. The Open Source Definition includes modification, redistribution and commercial use; restrictions against competitors or commercial use would not fit that definition. [Open Source Initiative](https://opensource.org/osd)

Shortlist two approaches for a deliberate decision. Apache-2.0 is a permissive option with patent and notice provisions; it favors reuse but does not require downstream proprietary modifications to be published. AGPL-3.0 adds source-sharing obligations for modified software used over a network; it still permits commercial use and is not a ban on competing hosting. Application boundaries and dependencies need review before choosing either. [Apache license](https://www.apache.org/licenses/LICENSE-2.0), [GNU licensing guidance](https://www.gnu.org/licenses/gpl-howto.en.html), [GNU FAQ](https://www.gnu.org/licenses/gpl-faq.en.html)

My product recommendation is to keep interchange specifications and small integration libraries easy to adopt, and decide the app license based on whether broad embedding or reciprocal contributions matter more. Do not promise dual licensing unless contribution ownership and the required rights are actually in place. Document third-party assets, fonts and dependency notices separately. Add a contribution policy and a clear boundary between code licensing, hosted-service terms and trademark use before an open-source launch.

## Comparable models and their limits

Penpot combines free core functionality with paid space/history, governance and dedicated hosting. This supports the proposed distinction between accessible creation tools and paid operational value; it does not establish demand or achievable pricing for FluxCreate. [Penpot pricing](https://penpot.app/pricing)

Blender names its Development Fund as the foundation's main income source. Sponsorship can support open creative infrastructure, but Blender's established community is not evidence that donations will fund an early suite. Treat sponsorship as a complement until FluxCreate has its own supporting base. [Blender Foundation](https://www.blender.org/about/foundation/)

## Validation sequence

**First 30 days:** interview 10–15 creators/studios using their real workflows; measure handoff effort, unsupported imports and frequency of repetition. Recruit three design partners. Publish accurate compatibility boundaries and an installable licensed release when ready. Offer only bounded pilots; do not build a billing system to test willingness to pay.

**Days 31–60:** deliver two or three pilot workflows, measure completion time against the customer's existing process, log failures/support and request actual payment for the agreed value. Prioritize the most repeated workflow and the gaps blocking it. Prototype managed identity/storage with restore and deletion tests before promising cross-device use.

**Days 61–90:** offer a small managed beta only if ownership, budget controls and recovery gates pass. Test the subscription hypotheses with real purchase decisions, review retention and cost per successful workflow, and either narrow the offer or expand cautiously. Dates are a proposed cadence, not an announced launch schedule.

Decision signals: successful import → reviewable edit → cross-app handoff → usable export; repeat weekly use; time saved verified by the creator; paid pilot conversion; workflow failure/recovery rate; support minutes; cost per successful output; renewal intention backed by a payment. Separate curiosity-driven signups from retained usage. Avoid a marketplace or broad enterprise commitments before these signals exist.

## Decisions to make after evidence

Choose the first customer/workflow, the license, the service boundaries and the first paid pilot scope. Retain a free path to files, exports and personal model connections. Validate managed-service pricing after real workload measurements. The business should fund reliable creative work and a maintainable open project; it should not depend on selling unfinished parity or concealing AI costs.

## Confirmed managed-credit direction — 2026-10-12

The user requested prepaid Stripe packages after the gap-closing work and confirmed a **50% margin**, not a 50% markup. The [Stripe credits plan](STRIPE-CREDITS-PLAN.md) supersedes the earlier open-ended managed-usage pricing proposal. It retains BYOK, recommends Checkout plus a durable application ledger, defines payment-fee/credit-lot allocation and margin safeguards, and sequences identity, pricing, durable jobs, refunds and suite integration before live sales. This is planning only; no payments or live Stripe products are enabled.
