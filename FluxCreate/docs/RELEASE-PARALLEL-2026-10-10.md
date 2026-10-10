# Second parallel gap continuation — 2026-10-10

Baseline production: suite 2f0d045, documented in [the first parallel release](RELEASE-PARALLEL-2026-10-09.md). **Status: scoped app sources implemented, frozen, assembled and verified; publication and deployment pending.** The first production release remains active. No new production commit, deployment ID or live pass count is claimed here.

## Delivered source slices

| App | Source-verified increment | Unit/API count | New browser groups |
|---|---|---:|---:|
| Fluxfoto | Per-photo RGB Levels/source histogram, photo replacement/relink and original download | 39 | 9 Levels + 5 photo-source |
| FluxDesign | Per-edge margins/columns, nonprinting guides, alignment and snapping | 33 | 5 layout |
| Fluximiére | Measured-source, rate-aware numeric/frame/drag slip | 40 | 6 slip |
| Fluxiffects | One-property/layer multi-key move/delete and committed-state gesture/export isolation | 100 | 8 key-selection |
| Flux3D | Explicit primitive conversion and bounded vertex selection/local offsets | 51 | 6 vertex |
| Fluxini | Temporary multi-node/upstream selection, atomic layout/duplicate/delete | 109 | 5 graph-organization |
| FluxLab | Protected independent unsent draft and reviewed bounded recipe JSON import | 69 | 9 draft/import |
| FluxAgents | Named local library, immutable versions and optimistic revision checks | 29 | 10 library |

The app source counts sum to 470. With 18 Exchange and 48 shared-suite checks, the assembled matrix passed **all 536 tests, with zero failures or skips**. All nine browser app builds plus MCP/server pass. All 36 assembled hosted browser checks and six packaged official MCP checks pass, with no browser runtime errors or missing resources. Fluxini standalone source is committed as 83c13d0; this does not identify a new assembled or deployed suite version.

## Source review and evidence

- Fluxfoto: nine Levels groups include exact fresh exported-PNG comparison for neutral/disabled adjustments. The earlier discrepancy was isolated to Canvas readback backend behavior; export evidence verifies the actual output. Source/alpha preservation, explicit Apply, native/portable/PSD output and five photo-source checks pass.
- Design: all 33 units, five layout groups, 19 existing editor checks and six independent PDF groups pass. Tiny fit zoom retains six screen pixels of snap tolerance; clamped bounds do not show unreached guides. Arrow shortcuts during a pointer gesture cannot commit preview geometry; Escape restores the original. Guide-only edits leave artwork/PDF unchanged.
- Miére: source ranges use actual measured duration and playback rate. Six slip groups and existing editing checks include pointer isolation/cancellation, locks, undo/reload and independently decoded synchronized stereo/video export.
- Effects: eight key-selection groups include collision/lock validation, one-step history, pointer cancellation and native/PNG/WebM output. Duplicate/split and exports during an active drag read committed state. Existing editor and custom-curve/export checks pass; real-time recording is not represented as deterministic encoding.
- 3D: six vertex groups check literal positions/normals/UVs, seam selection, immutable originals, degeneracy rejection, native reopen, independent GLB decode and marker-free PNG output. Existing editor/multi-object/source regressions pass.
- Fluxini: five organization groups plus existing graph-authoring/editor/design groups pass, with TypeScript/build checks. Selection does not change revision; copying preserves parameters, animation and retained source while remapping internal wires. Oversized patches and protected nodes reject without partial edits.
- Lab: nine draft/import groups plus 12 studio, nine media/recovery and eight recipe/filter groups pass. Cross-tab/deleted-record conflicts, quota failures, unreadable records, missing-download guidance, bounded malformed imports and late cancelled file reads are covered. Restore/import never sends generation requests.
- Agents: ten library groups plus six editor, five draft-recovery, six branching and eight start-recovery groups pass. Immutable versions, quota rollback, stale/deleted records and delayed opens preserve exact exported drafts, pinned SQLite run graphs and full unresolved-start records. No library action starts or restarts a run.

Tests used local fixtures and injected services. **No paid provider generation was performed.** Detailed limits and app evidence are linked from [the batch plan](PARALLEL-GAP-BATCH-2.md) and [feature-gap index](FEATURE-GAPS.md). Advanced editing, full native-product fidelity, cloud ownership and hosted durable execution remain open.

## Remaining release gates

Assembly, all builds, the combined 536-test matrix, 36 hosted browser checks and six packaged MCP checks are complete. The remaining steps are:

1. Commit/push the assembled release and record its revision.
2. Deploy under the existing protected production configuration.
3. Record deployment identity/URL and protected live verification, including exact deployed bundle matches and continued disabled hosted-live workflow execution.

Until these gates complete, production remains suite 2f0d045. Assembled verification is not a deployment claim or a claim that every feature gap is closed.
