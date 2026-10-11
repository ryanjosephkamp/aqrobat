# Close-leading diagnostic probe

Preregistered after 32 candidate captures. All acceptance probes fail and controls
pass. Corridor-05 and corridor-07 have **625/625** correct binarized target center
samples, but no correctly located QR and no payload recovery. Their finder-axis
runs remain fragmented: 44–62 runs rather than the control's five. A perfect
source-aligned center score is not a successful QR code.

Run **four** fresh native Courier New cases: uniform 400/700 × tracking -3.3/-3.6
pixels. Keep 20-pixel native letters, three advances across/two lines per region,
half-line shift, raw spatial objective, and free alphabetic fabricated whole words.
No mixed styles, grayscale, blur, overlays, raster shrinking, or decoder changes.

Relax the requirement that each glyph stay inside its CSS line box, while
requiring the largest allowed ascent plus largest allowed descent to fit the
actual line height. Limit descent to 0.6 pixels so deep descenders cannot collide
with the following line's capitals. Native glyphs may protrude from a line box;
the pre and artifact remain unclipped. Record the measured global ink envelope
and the explicit position. This is ordinary source typography, not pixel repair.

This deliberately closes the leading gap implicated by the actual binarized
finder-axis runs. Negative tracking may merge neighboring letters; this is a
diagnostic boundary test, not presumed readable prose. Reject unreadable output
even if decoding passes. Keep 700 separate from regular weight. Retain all
outcomes, controls, source versions and replay hashes in an exclusive fresh
directory, under the same 12-MB cap. Do not offer failed grids for phone review.
