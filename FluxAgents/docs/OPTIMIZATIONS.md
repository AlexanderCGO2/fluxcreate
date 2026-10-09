# FluxAgents: verified foundations and next work

Checked 2026-10-09. The first release implements local durable execution; the hosted studio is explicitly design/simulation only.

| Priority | Item | State / evidence |
|---|---|---|
| P0 | Persist operation before calling a model; never silently repeat uncertain paid work | Implemented; interrupted-call restart test, explicit retry, retained attempt reservations |
| P0 | Keep prior drafts when storage/import fails | Implemented; recovery quarantine, atomic validated import, stale-import guard |
| P0 | Prevent stale runner writes and simultaneous runner ownership | Implemented; SQLite lease checked inside write transaction; ownership regression |
| P0 | Recover every unfinished runnable record, not only recent UI history | Implemented; regression with more than 200 newer records |
| P0 | Avoid work after cancellation/shutdown | Implemented; delayed catalog and late model-result regressions |
| P0 | Protect personal credentials and make billed account explicit | Implemented; suite-only live confirmation, server-side immutable credential, no stored keys |
| P1 | Offer a useful visual editor without implying AI results during simulation | Implemented; editable typed nodes, no-charge labels, explicit connection sources, simulation handoff label |
| P1 | Connect workflow outputs to the creative suite | Implemented; existing reviewed text-handoff protocol and downloadable text/run records |
| P1 | Durable managed cloud execution | Next; Workflow-aware build, application database, credential store, atomic request/outbox coordination and production failure tests required |
| P1 | Accurate spending visibility | Current conservative reservations and reported token counts; next reconcile actual provider charges, tiered pricing and infrastructure separately |
| P2 | Media nodes | Next; reuse FluxLab async video tickets and bounded image/audio generation after durable artifact storage is connected |
| P2 | Rich graph positioning | Next; keep portable validated graph independent of canvas layout. Typed conditions, branch guards and ordered joins are implemented; parallel execution/general typed wiring remain open. |
| P2 | Scheduling and remote triggers | Next; authenticate triggers, persist schedule overlap policies, and test duplicate delivery before enabling |
| P2 | Bounded autonomous tool agents | Next; assess AI SDK/Eve adapter against the research failure matrix; no arbitrary user code |

Local machine/server downtime pauses execution. Browser closure does not. The application does not claim hosted durability, exact provider billing, or cancellation of already accepted model work.

## Completed durable start recovery — 2026-10-09

A browser start record is atomically claimed before POST and contains the frozen graph, request ID, billing choice and stable local SQLite identity. Read-only lookup after reload never submits a new request. Matching run identity and graph are required before expected-ID record deletion; new browser retries retain the same graph/ID and require explicit approval. Cross-tab claims serialize, storage failure prevents POST, mismatched databases reject, and old records remain inspectable with explicit removal warnings. Legacy local API clients can omit the new runnerId field for compatibility; the current browser always supplies it.

Build + 24 unit/API + six editor + five draft-recovery + six branching + eight start-recovery browser groups pass. No paid calls, automatic paid retries, distributed guarantees or hosted-live enablement. Named workflow versioning, richer run monitoring and managed cloud foundations remain open.

Independent review correction: refreshing a saved start clears all prior approval/removal acknowledgments; retry re-reads and compares the complete saved record before POST. The two-tab A→B replacement regression and an unrefreshed stale retry both pass without a new submission.
