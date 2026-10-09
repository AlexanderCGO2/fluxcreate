# Fluxiffects optimization round

Updated 2026-10-09. The suite-wide backlog is in `FluxCreate/docs/OPTIMIZATIONS.md`.

Implemented in this round:

- Media import captures the destination project and composition before decoding. Switching either rejects the late result; relinking requires an existing asset of the same media type.
- Hosted asset paths cover icons, AE bridge downloads and editable examples. AI requests and suite navigation stay on the deployed origin.
- FluxLab text arrives as an editable layer; image results use the regular media importer. A review dialog waits for workspace recovery before enabling Add. Failed image imports retain the dialog.
- Recent-project metadata is written only after a successful IndexedDB save.
- The existing 3D compositor preserves embedded animation clips, skinned/morph motion and camera animation when importing supported GLB/glTF or Flux3D scenes.

Verification: 89 model/API regression tests; actual hosted text/image transfer, persistence, rejected corrupt media, and bridge/example download checks. Earlier 3D browser/render checks cover frame seeking, looping and export parity.

Next: recovery quarantine for invalid saved sessions; media decode disposal and cache budgets; mask/matte tools; precompositions; Bézier curve editing; render queue and richer AE bridge coverage. Native AEP/AEPX and arbitrary Adobe plugins remain unsupported; use the supplied AE bridge with its conversion report.
