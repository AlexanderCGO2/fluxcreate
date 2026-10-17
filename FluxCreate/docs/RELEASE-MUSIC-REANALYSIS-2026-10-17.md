# Music analysis and cut-anchor recovery

The reported “Add manual beat anchors or analyze a song with a clear beat first” error came from storyboard creation. Detection could find many clear transients, but multiplying every transient's confidence by global tempo confidence made all of them fail the storyboard threshold when rhythm varied. A regression using irregular, clearly audible hits reproduced that rejection before the fix.

Local onset confidence is now independent of confidence in one global tempo. Storyboards still cut on measured or manually approved anchors; the fix does not manufacture a grid. Silence, sparse coverage and genuinely weak events still require manual timing. The music map reports how many detected candidates are usable cut anchors, and the empty-anchor error gives the actual recovery controls.

Analyze music remains available in the header at every stage, becomes Analyze music again after a measurement, and reports completion visibly. Reanalysis advances its revision, preserves manual range corrections and existing shots, and discards stale director proposals. Changed anchor identities or timing still invalidate incompatible old storyboards through the existing timing checks.

For an existing saved map: refresh the deployed page, reopen Music Video Studio, click Analyze music again, then Create beat storyboard. Re-uploading the song is unnecessary. Locked/reviewed boards retain their existing rebuild protection.

Verification before release: failing-then-passing irregular-rhythm regression; 25 analysis/timing tests; browser upload, repeated analysis, storyboard-stage analysis, reopen, manual-anchor preservation, replacement-song analysis and successful irregular-rhythm storyboard. Release-wide and live results will be recorded after deployment. No paid model calls.

Limits: onset-based heuristics are not a fully qualified beat tracker or semantic music understanding. The user's exact audio file was unavailable; the reproduced rejection mechanism and browser flows were tested with synthetic PCM fixtures.

## Release checks

Initial verification: all 763 suite tests and both strict TypeScript checks passed. Nine browser apps, hosted server and MCP UI built. Packaged reanalysis and storyboard browser flows passed, along with adaptive pacing and long-song upload/fade/original-download tests. Hosted suite browser checks (36) and bundled MCP checks (6) passed. No paid generation requests were made.

Final review found that overlapping manual corrections split anchor records while existing shots keep the original beat identities. Reanalysis now preserves those retained manual beat identities too. A failing-then-passing regression verifies that the saved storyboard still compiles after refreshing a split manual grid. Final checks include this additional regression.

The requested separate uploaded-footage mode is specified in [Autoedit plan](AUTOEDIT-PLAN.md); it is not part of this bug-fix runtime.

## Production verification

Runtime commit: `d30e20e4c1caa109a00535529313546e74135314`. Deployment: `dpl_7wUGkhY76W363UrG3rZss266ErUx`, READY under Flux AI at 2026-10-17T00:38:39.487Z. [Open Fluximiére](https://fluxcreate.vercel.app/fluximiere/).

Final verification passed all 764 suite tests, both strict TypeScript checks, production builds and the packaged reanalysis browser regression. Live verification passed 32 suite checks plus three music worker/route checks; exact deployed browser bundles and the music-analysis worker match the tested build. Authentication remains enabled on every deployment. No paid model requests.

Refresh the page, reopen Music Video Studio, choose **Analyze music again**, then **Create beat storyboard**. Existing media and manual corrections remain saved.
