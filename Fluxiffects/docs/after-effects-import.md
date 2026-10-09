# Import an After Effects project

Fluxiffects imports editable project data through the included **Export to Fluxiffects** script. Open your `.aep` or `.aepx` in After Effects, export the JSON bridge file, then import that JSON in Fluxiffects. An installed copy of After Effects is required for this conversion.

## Workflow

1. In Fluxiffects, download `Export-to-Fluxiffects.jsx` from the After Effects import dialog. The same script is included in `public/bridge/Export-to-Fluxiffects.jsx`.
2. Open the original project in After Effects. Resolve missing footage there if possible.
3. Enable **Allow Scripts to Write Files and Access Network** in **Edit → Preferences → Scripting & Expressions** on Windows, or **After Effects → Settings → Scripting & Expressions** on macOS. The bridge writes only the JSON file selected in the save dialog; it makes no network calls and does not change or save your AE project.
4. Choose **File → Scripts → Run Script File…**, select the downloaded `.jsx`, and choose an output JSON file.
5. Import that JSON file in Fluxiffects. Review the compatibility notes, switch among the imported compositions, and relink the original media files when prompted.
6. Save a Fluxiffects project after reviewing the result. Keep the original AE project and source media.

Browser security prevents a web app from opening a local media path simply because the path appeared in a project file. Use the media relink picker to grant access to each source file. The JSON contains local paths and names, not media bytes; consider those paths before sharing the JSON.

## What the bridge transfers

| Feature | Transfer behavior |
| --- | --- |
| Compositions | Names, dimensions, frame rate, duration, background; all compositions are exported |
| Layers | Names, topmost-first ordering, in/out points, visibility, locks, parent relationships |
| Transforms | Position, anchor point, independent X/Y scale, Z rotation, opacity; static values and keyframes |
| Animation | Linear and hold keyframes; Bezier timing approximated with easing presets, original handles retained |
| Text | Editable time-zero text, a single font style, size, fill/stroke, tracking, alignment |
| Solids | Editable dimensions and fill color |
| Images, video, audio | Source references and dimensions; forward playback speed and source offset; mute state; files must be relinked |
| Blend modes | Normal, multiply, screen, overlay; other modes fall back to normal with a note |
| Expressions, effects and masks | Original property data retained under `aeMetadata`; expressions are not executed in Fluxiffects |
| Shape layers, nested comps, cameras, lights | Named null placeholders with compatibility notes; nested source compositions are exported separately |

This is an initial interchange bridge, not a pixel-identical AE renderer. Curved spatial paths become straight segments, custom temporal handles become easing presets, and missing browser fonts change text layout. Mixed text styles, animated source text, text animators, masks, track mattes, adjustment effects, 3D perspective, motion blur, reverse media and audio levels need review or rebuilding. Forward playback speeds from 0.1 to 16 and nonnegative source offsets up to 24 hours are transferred. Time-remap keys and unsupported properties remain metadata when captured; they are not rendered. Render an image/video in AE when preserving an unsupported appearance is more important than editability.

The bridge does not parse binary `.aep` files directly. Adobe describes `.aep` as binary and `.aepx` as XML containing some hexadecimal binary data. Readable XML names and paths alone do not constitute a reliable editable composition importer. Selecting an AE project directly in Fluxiffects opens the bridge workflow.

## Interchange schema 1

```json
{
  "format": "fluxiffects-ae",
  "version": 1,
  "name": "Project name",
  "compositions": [],
  "assets": [],
  "warnings": [],
  "aeMetadata": {}
}
```

Each composition contains `id`, `name`, `width`, `height`, `fps`, `duration`, `background` (a CSS hex color), and `layers`. Arrays preserve AE ordering: layer 1 is topmost. `aeMetadata.index` records the original layer index. All time values use seconds in composition time; `displayStartTime` is retained as metadata and is not added to keyframe times.

Layers use stable IDs derived from AE item and layer IDs, falling back to the layer index for older AE versions. `parentId` references another layer within the same composition. `x` and `y` position the anchor in its parent's coordinates (or composition coordinates without a parent). `anchorX` and `anchorY` are pixels from the layer's top-left bound. Text bounds and child positions relative to text/shape parents are adjusted from AE's `sourceRectAtTime`. Scale factors and opacity use `1` for 100%; rotation is degrees. `start` and `end` are layer in/out times. Media `playbackRate` is `100 / stretch` and `sourceIn` is `(inPoint - startTime) * playbackRate` when those values fall in the supported range. AE source start time and stretch also remain in `aeMetadata`.

Animated numeric channels are stored under `keyframes`, for example:

```json
"keyframes": {
  "x": [
    { "id": "layer-x-1", "time": 0, "value": 100, "easing": "ease-in-out" },
    { "id": "layer-x-2", "time": 2, "value": 500, "easing": "linear" }
  ]
}
```

The easing on a key controls the outgoing segment. Supported names are `linear`, `hold`, `ease-in`, `ease-out`, `ease-in-out`. Original interpolation types, temporal ease, spatial tangents and expression source are stored in transform metadata. Expressions are data, never browser code.

Media assets contain `id`, `name`, `type`, `path`, `width`, `height`, and `duration`; layer `assetId` connects them. A missing `src` is expected until the user relinks the file. The bundled `public/examples/after-effects-sample.json` is a hand-authored schema example for testing the importer. It is not evidence of a live AE export.

## Sources and validation

- [Adobe: project types and XML limitations](https://helpx.adobe.com/after-effects/desktop/work-with-projects/after-effects-projects/projects.html)
- [Adobe: running scripts and enabling file writing](https://helpx.adobe.com/ca/after-effects/desktop/automate-in-after-effects/automate-animation/scripts.html)
- [Adobe-linked scripting guide: properties and keyframes](https://ae-scripting.docsforadobe.dev/property/property/)
- [Adobe-linked scripting guide: text documents](https://ae-scripting.docsforadobe.dev/text/textdocument/)

The script uses ES3-compatible syntax and a private JSON serializer, so it does not depend on `JSON.stringify` being installed in the AE scripting engine. The actual After Effects runtime export still needs validation in an installed AE version; the project fixture can exercise the browser import independently.
