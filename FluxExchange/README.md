# Flux Exchange

Flux Exchange lets Fluxiffects and Fluxini exchange editable projects in a readable `.flux.md` file. It is a small browser-compatible ES module without runtime dependencies. Both apps use the same codec and conversion rules.

Markdown makes the project brief easy to read, share, and diff. One fenced JSON block with the language `flux-exchange` carries the authoritative data. The brief and handoff notes above that block are readable copies. To edit imported notes by hand, edit their fields inside the JSON block. The importer never evaluates Markdown, HTML, scripts, or expressions.

## Integration

```js
import {
  encodeExchange, decodeExchange, validateExchange,
  toFluxiffects, toFluxini, inspectExchange,
} from '@flux-studio/exchange';

const markdown = encodeExchange({
  app: 'fluxiffects',
  project,
  previous: project.exchange,
  brief: 'Quiet typography with a warm palette.',
  notes: 'Use the title as a particle emitter in Fluxini.',
});

const envelope = decodeExchange(markdown);
const converted = toFluxini(envelope);
// Validate converted.package through Fluxini's normal native importer.
// Save converted.exchange as project metadata, outside its strict graph schema.
// Show converted.warnings in the import report.
```

`encodeExchange` returns Markdown. Its arguments are `{app, project, fonts?, previous?, brief?, notes?, canvas?}`. Fluxini `project` may be a raw schema-v2 project or a complete `{format:'fluxini-project-v1', project, fonts}` package. The current Fluxiffects composition supplies canvas dimensions unless `canvas` is explicit. A prior handoff supplies existing notes and unit settings when those are not provided.

`decodeExchange(markdown)` and `validateExchange(envelope)` return a sanitized envelope with a 16 MB limit. `inspectExchange` returns a compact summary without conversion. `toFluxiffects` returns `{project, warnings, exchange}`. `toFluxini` returns `{package, warnings, exchange}`. Each destination must validate its converted result with its own native validator before saving.

## Envelope

```json
{
  "format": "flux-exchange",
  "version": 1,
  "sourceApp": "fluxiffects",
  "name": "Orbit title",
  "brief": "Quiet typography with a warm palette.",
  "notes": "Use the title as an emitter in Fluxini.",
  "canvas": { "width": 1920, "height": 1080, "pixelsPerUnit": 100 },
  "snapshots": {
    "fluxiffects": { "format": "fluxiffects", "version": 1 },
    "fluxini": { "format": "fluxini-project-v1", "project": {}, "fonts": [] }
  }
}
```

The abbreviated snapshots above illustrate their location; real snapshots contain complete native projects. `snapshots[sourceApp]` is the current document. At most one snapshot per app is retained. Every export refreshes the exporting studio's snapshot with its current document and retains the other studio's most recent snapshot. This is not an immutable archive of the first project: after repeated conversions, an earlier feature may exist only in an earlier handoff file. Keep earlier files when historical source recovery matters. Exports remove each native project's `exchange` metadata before storing a snapshot, preventing recursive growth. Native AE metadata and creative brief fields remain intact.

Returning a document converts the **latest source** by default. It does not silently reopen a stale original. Calling a converter with `{restoreOriginal:true}` explicitly recovers a saved native snapshot and reports that later edits in the other app are excluded. Apps should offer this as a separately named action.

Creative briefs are limited to 6,000 characters, matching Fluxiffects' native project limit. Handoff notes may contain up to 12,000 characters. These limits are validated when encoding or importing a handoff, before an editor replaces its current work.

## What transfers

| Direction | Editable conversion | Reported limitations |
| --- | --- | --- |
| Fluxiffects → Fluxini | Active composition; text; rectangles/solids as thin boxes; ellipses as spheres; position, color, opacity; Z rotation through a transform node; compatible position, color, opacity, rotation keys | A 3D scene changes shading and framing. Outline fonts approximate system fonts. Gradients, effects, strokes, blend modes, custom anchors, parents, media, layer in/out timing, and other animation tracks stay in the source snapshot. |
| Fluxini → Fluxiffects | Connected simple text, shape, and primitive branches; static transform/material wrappers; projected position, scale, color, opacity, rotation and directly supported keys | A flat projection is not a camera render. Physical shading and 3D geometry are approximated. Procedural character motion, wrapper animation, depth, cameras, lights, simulations and other procedural branches stay in the source snapshot. |
| Same app | Its native project and bundled font data | Session-scoped blob URLs become explicit missing media references because they cannot travel between browsers. |

Coordinates use a centered canvas and 100 pixels per scene unit by default, with inverted Y. Time is always seconds. Easing names map between the two apps. Their color interpolation spaces differ, so color-animation transfers report that intermediate colors may differ.

Fluxini's constraints are enforced: 64 nodes including the output, 128 tracks, and 24 keys per track. Capacity overflow rejects the conversion with actionable guidance. Text over 48 characters, multiline text, unsupported numerical ranges, short duration, and frame rates outside integer 12–60 fps are adjusted with warnings. The unmodified source snapshot remains available.

Only branches feeding Scene output are projected. A text node used solely as a particle emitter or collider does not become a fake visible title. Cycles, excessive expansion, malformed data and missing referenced nodes reject conversion.

## Footage and assets

Fluxiffects native asset records already carry embedded `src` data URLs and external `path`/missing-media references. Those records travel inside its snapshot. Keep the entire handoff below 16 MB. For larger footage, send the media files alongside the Markdown and relink them in the destination. Paths are references; this module never reads local files or fetches network resources.

Fluxini fonts travel inside its native project package. The first version does not convert system font files into outline fonts, import GLB into Fluxiffects, or create image/video planes in Fluxini.

For faithful procedural appearance, use Fluxini's PNG or WebM renderer, then import the render as media into Fluxiffects. Keep the Markdown handoff alongside it for editable source recovery. A future `.fluxpack` archive can bundle the Markdown, rendered plates, media, and font files without changing the scene model.

## Validation

Run `node --test tests/*.test.mjs`. Tests exercise the shared format, both applications' actual native validators, bidirectional transfers, explicit original recovery, repeated round-trips, font preservation, unsupported simulation reports, resource limits, malformed fences, and prototype-key rejection. Application-validator tests expect the sibling `Fluxiffects` and `Haidini` directories.

Custom Fluxiffects cubic Bézier controls remain exact in the native snapshot and explicit original restore. Converting motion to Fluxini uses linear interpolation with an explicit warning because its current animation model has preset easing only. A portable source snapshot is not a claim of identical destination motion.
