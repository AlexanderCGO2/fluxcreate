# FluxCreate managed AI credits and Stripe — plan

Prepared 2026-10-12. **Planning only.** The user confirmed a **50% margin**, rather than a 50% markup. Implementation follows the requested gap-closing work; this document does not enable payments, create Stripe products, change credentials or authorize a live charge.

## Decision

Keep two explicit ways to use AI in every app:

1. **Your API key**: retain the user's configured Vercel/Cloudflare connection and billing scope. No FluxCreate generation-credit debit.
2. **FluxCreate credits**: buy a prepaid package through Stripe, then use the managed connection without supplying a provider key. Show the credit price or maximum before creation.

Use **Stripe Checkout in payment mode plus an application-owned transactional credit ledger** for the first release. Use the same shared billing service for FluxLab, floating helpers, editor planners and FluxAgents. The local/open-source editors, supported exports and BYOK stay available. Self-hosted installations do not receive our service credentials or mint hosted credits.

Credits buy FluxCreate services only; they are not transferable, cash-out balances, provider credits or a marketplace currency. Default launch proposal: no arbitrary expiry for purchased credits; confirm applicable service/refund terms before sale. Promotional credit, if introduced later, has separate funding and expiry rules.

## Why this architecture

| Approach | Assessment |
|---|---|
| Stripe Checkout + our durable ledger | Recommended. Supports immediate prepaid packages and atomic reservation before each model call across all modalities. We own reconciliation and concurrency, which the present local request records cannot provide. |
| Stripe Billing Meters + Credit Grants | Better fit for a later subscription/usage-invoice product. Stripe currently applies these grants to metered subscription invoices at finalization. It does not replace our real-time spend authorization and job ledger. |
| Browser balance or per-instance memory | Rejected. Multiple tabs/instances can overspend, a restart loses state, and a client can forge its balance. |

Stripe's current credit-grant eligibility and invoice timing are documented in [Billing credits](https://docs.stripe.com/billing/subscriptions/usage-based/billing-credits). Keep one authoritative consumption ledger in v1; do not debit both our ledger and Stripe credits for the same creation. Stripe Connect is unnecessary for selling our own creation service.

## Meaning of 50% margin

For a settled creation:

`margin = (recognized revenue excluding tax - attributable costs) / recognized revenue excluding tax`

Attributable costs include provider usage, gateway charges if any, rendering/job compute, attributable storage/egress, currency conversion, allocated payment-processing fees, and a measured allowance for failed billable requests/refunds and variable support. Marketing, salaries and other fixed overhead remain separate: a 50% contribution margin does not promise 50% company net profit.

With no other fees, €1 of cost needs €2 of revenue, not €1.50. With fees proportional to revenue:

`minimum pre-tax price = non-payment cost / (1 - 0.50 - effective payment-fee fraction)`

Reject any payment route or credit lot with an effective fee fraction of 50% or more: the denominator is zero or negative and no finite price can preserve this margin.

Example planning assumption: effective payment fees are 5% of revenue after allocating the package transaction fee. Then €1 of non-payment cost requires €2.222…; round up to €2.23, yielding at least 50% modeled margin. Five percent is an illustrative reserve, not a quote from Stripe or a confirmed safe ceiling for every market.

## Packages and credit value

Proposed initial package ladder, **illustrative EUR prices excluding tax** pending confirmation of the selling entity, settlement currency and tax treatment:

| Package | Credits | Illustrative price | Paid value per credit |
|---|---:|---:|---:|
| Starter | 1,000 | €10 | €0.01 |
| Creator | 2,500 | €25 | €0.01 |
| Studio | 5,000 | €50 | €0.01 |
| Production | 10,000 | €100 | €0.01 |

Use a constant paid value initially: larger packages reduce fixed payment-fee impact without introducing a bonus that silently destroys margin. Do not sell an unlimited allowance. A later bonus/discount must reduce the recorded effective revenue per credit and pass the margin guard using that lower value. Promotional credits are a separately capped marketing expense, never counted as 50%-margin revenue.

For these illustrative credit units and a 5% effective processing allocation:

| Non-payment cost per creation | Minimum whole credits | Pre-tax retail value | Modeled margin after 5% processing |
|---|---:|---:|---:|
| €0.01 | 3 | €0.03 | 61.67% |
| €0.05 | 12 | €0.12 | 53.33% |
| €0.20 | 45 | €0.45 | 50.56% |
| €1.00 | 223 | €2.23 | 50.16% |
| €5.00 | 1,112 | €11.12 | 50.04% |

Small operations round up; bundle very small text operations into a visible workflow quote if rounding becomes poor value. Store integer microcredits internally and whole-credit quotes initially. Never perform accounting with binary floating-point currency values.

### Payment-fee allocation

Allocate each actual top-up processing fee across all credits issued in that purchase lot. Track purchased amount excluding tax, tax collected, fee, currency and units independently. Consuming lots FIFO transfers their associated revenue and processing cost to each creation. Allocate revenue, fees and refunds in integer accounting units with deterministic remainder handling; partial consumption plus the remaining lot must always reconcile exactly to the original totals. Unspent credit is not assumed earned profit; the accounting recognition policy must be confirmed for the actual product/entity.

If a package's pre-tax price is `P`, tax fraction is `t`, payment percentage is `f`, and fixed fee is `a`, then illustrative processing cost is `f × P × (1+t) + a`. The maximum non-payment cost budget at 50% margin is `0.5 × P - processing cost`. Do not subtract fees first and then call half the remainder a 50% revenue margin.

For example, Stripe's German standard EEA-card rate is currently 1.5% + €0.25. At €10 excluding tax and assuming zero tax solely for the example, processing costs €0.40 and leaves €4.60 for all non-payment costs while retaining €5 profit. Tax, card category, international payments, conversion, disputes and separately enabled Stripe products can change this. The Flux AI Vercel team name does not establish the Stripe merchant country. [Stripe Germany pricing](https://stripe.com/de/pricing)

Choose the production fee ceiling from the enabled payment methods and actual merchant contract. Record actual fees when available and reconcile later adjustments. Until a fee is known, use the configured conservative ceiling. Disable packages/payment routes that cannot meet their cost allocation. Published creation prices should be consistent; evaluate them against the least favorable permitted paid-credit lot, not a cheaper card owned by another customer.

## Generation pricing and cost evidence

Maintain a versioned server-side rate card for each allowed model, provider route, modality, output size/duration, token class, tools and currency. A browser-supplied price/model cost is never trusted. Vercel currently documents provider-list pricing without token markup, but actual rates must come from the current model/provider catalog. Free promotional upstream credits must not set sustainable retail prices. [Vercel Gateway pricing](https://vercel.com/docs/ai-gateway/pricing)

Quote images, video, speech and music from bounded parameters. For variable text/agent work, reserve a maximum using bounded input and output tokens, tool calls and steps; settle lower verified usage and release the difference. Include all enabled fallback routes and possible billable attempts in the bound. If the cost cannot be bounded or reconciled, keep that model BYOK-only until an adapter exists. A timeout is not proof that a provider charged nothing.

Persist provider request IDs, usage and reported cost where available. Validate cost provenance against currency, model and units; use catalog-rated usage as an explicitly labeled estimate if reported cost is missing. Do not assume the same response cost fields exist for every image/video/audio API. Rate-card updates require a version and affected-model review; old quotes remain fixed until their short expiry. Retrying after expiry requires a new quote and explicit approval if the price changes.

Target at least 50% on each successfully settled, bounded creation. Unexpected provider fees, chargebacks and customer-service refunds can still make an individual job unprofitable; reserve for these losses, measure actual cohorts, and disable models/routes that repeatedly miss the target. Never surprise-charge beyond the customer's authorized maximum to repair our margin.

## Prerequisites exposed by the current code

Current Vercel deployment protection is not an application account system. Personal connections are not a credit ledger. Browser persistence and the process-local music request cache cannot be used as durable paid-job infrastructure.

Before any public credit sale, deliver:

- Verified application identity and stable account/workspace ownership, with server-checked membership and revocable sessions.
- A hosted transactional database with migrations, backup/restore and tenant isolation. Recommend PostgreSQL for atomic wallet reservations, unique event keys and auditable records; choose the managed host during implementation.
- Durable job/outbox processing with per-account concurrency limits, provider IDs and reconciliation after restarts. A database transaction cannot atomically commit an external model call; explicitly handle that uncertainty.
- Managed credentials available only to the billing-controlled server path. Default public accounts must never inherit unrestricted internal suite keys.
- Per-user and global caps, administrative kill switches, model allowlists, secure artifacts and billing observability.

## Data model

| Record | Essential fields / invariant |
|---|---|
| account / membership | Stable account ID, owner, roles, disabled state. Browser IDs cannot grant ownership. |
| stripe_customer | Unique account/customer association; test/live mode isolated. |
| package_version | Server-approved Stripe Price ID, currency, units, net value, enabled dates, fee assumptions; immutable once sold. |
| purchase_lot | Checkout Session and PaymentIntent IDs, account, paid net/tax/gross, actual/reserved fees, granted units, remaining units and refunds. Unique fulfillment per payment. |
| ledger_entry | Immutable grant, reserve, capture, release, refund/reversal or admin adjustment; integer units, account, source and unique operation key. Corrections use compensating entries. |
| quote | Account, request hash, model/route/options, rate-card version, currency/FX version, maximum units/cost, expiry, funding source. |
| generation_job | Quote, owner, idempotency key, state, provider IDs, artifact references, bounded attempts, actual/estimated costs and settlement status. |
| provider_attempt | Submission state, route, uncertainty, provider ID, timings, usage/cost evidence. No automatic repeat of an uncertain submission. |
| payment_event / outbox | Verified event ID and durable processing state; deduplicate effects and process out-of-order events safely. |

Lock the account balance/consumption lots within a transaction when reserving. Available balance equals granted, unrefunded units minus captured and reserved units. Concurrent tabs, MCP calls and workflows cannot spend the same balance twice. Financial reversals may create a debt state after credits were consumed; freeze further managed spending and reconcile without deleting creative files.

## Purchase flow

1. Signed-in user chooses a server-defined package from General settings → Credits & billing.
2. Server creates a pending purchase and Stripe Checkout Session, binding it to that account. Use a stable purchase ID/idempotency key; never accept arbitrary amount, currency or credit count from the client.
3. Stripe handles payment. The return page displays payment/credit status; its URL does not grant credits.
4. Verify the webhook's raw-body signature, retrieve canonical payment/session details, validate paid status, expected package/currency/amount/account and live/test mode. Persist the event and grant once in a transaction. A delayed-payment completion is not a paid purchase; wait for success.
5. Duplicate or reordered events are harmless. Polling on the return page reads the authoritative balance. Failed delivery is retried from durable state.

Stripe requires webhook-backed fulfillment and supports asynchronous payment success. Its API idempotency keys help retry API requests, but they do not replace durable application deduplication. [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted), [idempotent requests](https://docs.stripe.com/api/idempotent_requests)

The webhook needs a narrowly scoped public endpoint reachable by Stripe. Keep app/API ownership checks and deployment protection elsewhere; do not disable all authentication to receive webhooks. Reject bad signatures and acknowledge only after durable receipt. Process long work outside the request. [Stripe webhooks](https://docs.stripe.com/webhooks)

## Creation lifecycle

`quoted → reserved → submitting → running → delivered → settled`

Alternative states: `failed_unbilled → released`; `submission_unknown → reconciliation`; `cancel_requested`; `billing_review`.

Before submission, atomically reserve the approved maximum and persist an outbox job. A worker claims it, records submission intent and calls the permitted provider. Save returned provider identity immediately. Persist the artifact and cost evidence before settlement. Capture once, then release excess; notifications never perform a second debit.

If a worker dies during submission, use provider status/idempotency support when available. Otherwise leave the attempt uncertain and reconcile; do not blindly retry or release its entire reservation while another worker might still finish it. A lease expiring alone is not evidence of failed billing. Show “Checking request status” and provide an operational review path.

Cancel before submission releases the reservation. After submission, cancellation is best effort: settle documented actual usage only within the agreed bound and policy. A provider failure without delivered output should restore customer credits under the published policy; any upstream charge becomes our failure cost and enters the margin report. Refunding the customer does not imply a provider refund.

Return the existing job for the same account/idempotency key and request hash; reject reuse with a different request. All retries carry the original funding scope. BYOK failure never silently spends managed credits, and insufficient managed credit never silently uses a personal key.

## Cross-app integration

- `FluxCreate/server`: proposed billing/auth modules and one shared generation authorization wrapper around current hosted dispatch and AI routing. Enforce it at the server boundary for every inference route, including legacy editor planners and direct MCP entry points.
- `FluxCreate/shared`: shared funding selector, quote/maximum review, balance indicator and ledger/job status views. No provider secrets or balance authority in browser storage.
- FluxLab: text/image/video/speech/music adapters with explicit quote and settlement evidence. Ship managed access only for verified adapters; keep unavailable models visible with truthful restrictions.
- Floating helper: editing/upscaling/creation each gets the same quote/approval and stale-document application guards. Applying or undoing an already-created artifact is not another inference charge.
- FluxAgents: reserve a bounded workflow envelope; child jobs consume sub-reservations without double-counting the parent. Loops, delays, tools, parallel branches and human approvals cannot exceed its cap or reuse expired credentials. Hosted live execution remains gated until durable ownership is ready.
- MCP/local apps: use revocable user-scoped service tokens and a quote/execute contract, never shared anonymous service keys. Read-only discovery/status is free; generation carries an approved quote. Imported projects cannot import funding authorization.

## Refunds, disputes and taxation

Refunds reference the original purchase lot. Reserve the refundable unused balance before calling Stripe; finalize its compensating ledger entry when confirmed, or release the refund reservation on definitive failure. Prevent concurrent generation from consuming the same units. A dispute reverses/freeze-controls its associated lot; handle already-consumed credit through review. Do not rewrite settled job history or assume processing fees are recoverable. [Stripe refunds](https://docs.stripe.com/refunds)

Determine the actual merchant entity/country, tax registration, customer locations and whether credits are taxed on purchase or redemption before creating live prices. This is a specific accounting/legal configuration decision, not something inferred from the server region. Configure Stripe Tax/tax IDs/receipts accordingly and display any required tax-inclusive price. Never tax the same consumption twice or count tax collected as margin. [Stripe Tax with Checkout](https://docs.stripe.com/tax/checkout)

## Delivery sequence after the gap work

| Phase | Deliverable | Completion test |
|---|---|---|
| 0 — commercial readiness | Confirm gap-program release gate, merchant/currency/tax/terms, permitted resale/provider terms, price table and fee ceiling | Explicit configuration record; no unresolved P0 data-loss, ownership or spend-control gaps in the paid path |
| 1 — identity and ledger | Accounts, migrations, credit lots, immutable entries, reservations and tenant isolation | Concurrent spend cannot go below available funds; a second user cannot read/change another wallet; backup restore reconciles |
| 2 — Stripe sandbox | Fixed packages, Checkout, signed webhook, duplicate/delayed events and refunds | Payment once grants once even after disconnect/restart; forged redirect/webhook grants zero |
| 3 — rate cards and quotes | Cost evidence adapters, FX/fees, margin floor, expired quotes and model gating | Property/boundary tests prove at least 50% modeled margin across allowed packages/discounts/fees; unknown cost blocks managed submission |
| 4 — durable creation | Reservation/outbox/worker, artifact persistence, settlement and uncertain recovery | Crash at every external-call boundary, duplicate callbacks, cancellation and cold instance restart neither overspend nor resubmit uncertain work |
| 5 — suite integration | Credits UI in home/Lab/helper/editors and scoped MCP/Agents paths | End-to-end every paid route debits once; BYOK debits zero; editing/export stays accessible after balance exhaustion |
| 6 — controlled production | Small allowed model set, live payment/refund and model checks with bounded spend, reconciliation/alerts | Actual processor/provider records reconcile; no unowned/unpriced requests; rollback preserves balances and existing files |
| 7 — expansion | Verified video/music, workflow autonomy, optional recurring packs/auto-top-up | Separate modality cost/recovery gates and deliberate user opt-in; no hidden subscription or automatic card charge |

Do not create live Stripe objects as part of the current editing release. The gap plan remains active; broad Photoshop/Blender/Houdini parity is a long-term program. Commercial readiness should eventually be defined through explicit supported workflows and P0 acceptance criteria, rather than declaring every specialist feature complete. That launch decision remains separate from this plan.

## Acceptance matrix and operating measures

Test duplicate/out-of-order/forged webhooks, expired sessions, delayed payment failure, partial refund, dispute after consumption, processor timeout, database outage, two instances reserving the last credit, changed quote payload, token/route cost overrun, lost provider response, delayed completion after cancel, expired job lease, cost evidence missing, FX movement, insufficient credit, cross-tenant artifact access and revoked MCP tokens. Use sandbox/fixtures first; actual paid smoke has its own bounded release step.

Measure actual revenue excluding tax, consumed-lot value, payment/provider/compute/storage costs, realized contribution margin by model and package, uncertain requests, duplicate suppression, refund/chargeback rates, reserved-balance age and ledger discrepancies. Alert on any negative available balance, unmatched paid purchase, model margin below target, unpriced request or unexpected growth in uncertainty. Keep amounts/IDs in financial logs; exclude prompts, API keys and raw generated media.

Open decisions before implementation: merchant entity and Stripe account region; launch currency; tax timing and customer price display; account/auth provider and database host; artifact retention/storage budget; refund/cancellation policy; initial model allowlist; supported payment methods and fee ceiling. The 50% margin target and continued BYOK option are already confirmed.
