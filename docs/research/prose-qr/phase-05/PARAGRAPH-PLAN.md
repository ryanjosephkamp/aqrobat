# Full-paragraph binarizer feedback

Preregistered after the backed-up 36-case milestone. No successful ordinary
reader result. The isolated glyph-threshold model performs poorly; use the full
paragraph neighborhood as a renderer objective instead of assuming tile
thresholds compose correctly.

Four final native candidates: Courier New 400/700 × tracking -3/-3.6 pixels.
Use the recorded source layout, raw geometric seed, free alphabetic whole words,
native 20-pixel type, and the half-line shift. The -3.6 cases retain the close
leading/global ink envelope filter. No decoder tuning, filters, hidden blocks,
changed ink, glyph outlines or raster compression.

For each candidate, paint a full native-resolution canvas text model using the
same installed font, tracking and recorded baseline. Apply the unmodified pinned
jsQR binarizer to this entire model. Greedily test exactly 96 deterministic
whole-word substitutions, accepting only reduced loss. Loss measures actual
black/white agreement along the six intended finder axes and module centers.
Geometry guides the renderer objective, never an acceptance decoder. Preserve
word lengths, existing single-space boundaries, punctuation, line count and
uniform typography. Words remain fabricated and can be repetitive.

Record every model proposal, loss, acceptance, text hash, and pixel hash in a
reconstructable trace; retain initial and final model PNGs. These 384 optimizer
evaluations are model evaluations, not native DOM captures or decoding trials.
No model is probed for payload recovery. Compare the final model and actual DOM
pixel hashes rather than claiming they match. Capture only the four selected
final single-text-node DOM outputs for independent ordinary-reader testing and
native repeat checks. Keep actual readability and phone acceptance open.

Use one fresh task-owned browser, exclusive `paragraph-01`, and the same 12-MB
phase cap, reserving 1 MB for final documentation/custody. Do not expand the batch
if all four fail or start a new capture sweep during the handoff. Preserve all
outcomes; no failed grid is handed over as a successful phone candidate.
