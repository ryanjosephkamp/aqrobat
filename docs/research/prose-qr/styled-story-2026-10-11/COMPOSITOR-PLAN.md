# Native story compositor amendment

The first 12 styled-story candidates and 12 completed ornamented-story candidates
returned no ordinary payload. Batch 02 stopped at source Selection before a
native candidate capture; batch 03 preserves the explicit corrected source.
OpenCV finds intended ornament geometry, while three passive source-aligned
diagnostics expose substantial missing dark-center ink (and some light ink).
These diagnostics did not decode matrices or supply geometry to a reader.

New hypothesis: a deterministic whole-word compositor can preserve the story's
ordered words while choosing readable word spaces, line breaks and vertical
placement so visible letter ink covers dark QR sampling points and avoids light
ones. The ornamented route remains distinct from band-023's all-letter field.
No pixel repair or module background is allowed. Actual native reader recovery,
not model center agreement, remains the acceptance test.

Amend the internal resource-capture ceiling from 8 to 9 for exactly one small
native glyph atlas at the selected 20px Courier New size. It is needed to model
this compositor, rather than repeat a font/gray sweep. Preserve the earlier
resource denominator. No other resource or candidate ceiling changes; maximum
64 native candidates, 12 controls, 128 MB and the original time deadline remain.
The atlas contains each required real character at regular black and bold black
with a 0.7px foreground stroke, in separate labeled cells. Capture once plus
immediate repeat, retain source/face/pixel provenance, and make zero readers calls.

Use fixed native 48px pitch, actual 20px letters, generous line spacing, visible
gray light letters no lighter than RGB180, and the measured square ornament.
Candidate specifications and all DP objectives will be frozen before captures.
A model's center agreement is a construction diagnostic only. Native captures
must validate source words, selection, installed faces, repeats and unchanged
ordinary-reader results. Reject overlap and overflow; do not shorten payloads.

The source will include explicit text separators. An early ornament setup joined
words across absolutely positioned line spans; its failed source is retained and
the amendment uses real newline text nodes. Portable paste is still untested.
