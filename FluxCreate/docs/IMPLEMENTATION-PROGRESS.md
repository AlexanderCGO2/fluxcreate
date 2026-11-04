# Feature gap implementation progress

Approved scope: the suite roadmap in IMPLEMENTATION-PLAN.md. Updated 2026-10-09. This batch delivers tested editing and integration milestones; the detailed app audits remain the record of open professional features.

| Workstream | Delivered in this batch | Remaining boundary |
|---|---|---|
| Source objects | Place, preview, choose page/frame, replace, refresh and recover original source in FluxFoto, FluxMotion, FluxEffects and Flux3D; preserve transforms and undo | Embedded snapshots, not live shared documents; native FluxEffects graphs travel through the Flux exchange export |
| Handoffs | Capability-driven destinations, browser inbox/outbox and transfer history, reload recovery, terminal receipts and duplicate insertion guards | Browser-local storage, not a distributed exactly-once transaction; interrupted insertion requires explicit checking before retry |
| Floating AI | Selection-aware helper through official MCP transport in four editors, review/apply and stale guards, per-request credential isolation | Paid generation was not exercised; image editing is limited to verified model capabilities; no invented upscaler or durable paid-request ledger |
| FluxFoto editing | Rectangular, elliptical and freehand selections; invert, feather, convert to/intersect a mask; cancellation and undo | Painting/retouch, groups/clipping, adjustment layers, RAW and professional color remain open |
| FluxEffects design | Shared header, light/dark theme, consistent controls and resizable graph dock | Production graph groups, simulation caches and advanced procedural tooling remain open |
| FluxVideo audio | PCM playback/scrub/reverse, real waveforms, gain/mute/fades and synchronized audio/video export | Bounded decoded media; long-source streaming, broader codecs and hardware latency qualification remain open |
| FluxMotion audio | Stereo sound in real-time WebM export including native 3D scenes, gain keyframes and cancellation | Export remains real-time and bounded to 60 seconds / 60 fps; deterministic render queue remains open |
| FluxDesign PDF | Searchable standard-font text, vector shapes and embedded native images; visible fallback report and image-proof option | Font substitution is disclosed; unsupported fonts/glyphs preserve a raster page; no print compliance or font embedding claim |
| FluxAgents branching | Version-2 typed text/boolean steps, conditions, guarded branches, active/all joins, persisted decisions/skips and recovery | Hosted live execution, connectors, media tools, schedules and durable cloud storage remain open |
| Shared documents/assets | Existing browser projects retained | Named multi-document libraries, deduplication, cross-device sync, accounts and shared cloud assets remain open |

## Verification

Meaningful automated checks exercise actual decoded image pixels, generated and decoded audio, editable project persistence, independent PDF extraction/rendering, transfer recovery, official MCP calls with mocked providers, and workflow restart/approval/budget behavior. The full source suite passed 454 tests and all nine browser builds; see [release verification](RELEASE-2026-10-09.md) for browser, export and production evidence. No paid provider generation is part of this batch's automated verification.

No claim of Photoshop, InDesign, Premiere, After Effects, Houdini or Blender feature parity is made. See [the remaining feature gaps](FEATURE-GAPS.md) and [the implementation plan](IMPLEMENTATION-PLAN.md).
