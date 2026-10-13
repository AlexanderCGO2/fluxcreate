# Replace and relink photo sources

Implemented and locally verified in the second parallel batch. Select an ordinary photo layer and use Replace photo; a missing source instead offers Relink photo. Choose PNG, JPEG, WebP, GIF or SVG within 45 MB, 32 megapixels and 16,384 pixels per side. GIF/SVG become the browser-decoded appearance; this does not add animation or vector editing.

The layer keeps its name, frame, position, rotation, mask, opacity, blend and appearance controls, including Levels. New source pixels fit the existing frame even when their aspect ratio differs; this behavior is stated beside the control. Replacement is one history entry, and Undo restores the byte-identical previous source. Save original photo downloads the current embedded source independently of its rendered effects.

Reading/decoding can be cancelled, has a 20-second timeout, and is discarded on a committed document change or unmount/selection change. A final document/selection fingerprint guard rejects stale results. Failed or oversized files preserve the current document. Locked layers cannot replace sources. Retained-source studio objects continue to use their dedicated Replace source flow so the rendered preview and recoverable original cannot diverge.

Verification: three model/limit tests and five browser groups cover exact source/state preservation, adjusted/masked pixels, undo/redo, original download bytes, invalid decode, delayed decode after explicit cancel/concurrent edit, missing-image repair, native reload and lock guards. This does not solve shared media identity, cloud relinking, pre-decode image header inspection or decoded-image cache budgeting.

Photo paint/erase recipes also remain attached during source replacement/relink. Their local coordinates follow the retained frame; painted marks and erased areas apply to the new image. Clear photo paint or Undo removes them. Original-photo download returns the source bytes without paint, masks or adjustments. See [Photo painting](PHOTO-PAINT.md).
