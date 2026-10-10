# Seam guard correction before exclusive restart

Seam-01 stops before its first native proposal at the glyph-envelope guard.
Its passing controls, manifest and abort survive; no candidate pixels exist.
The inherited envelope 16.142578125 describes every eligible dictionary glyph,
including unused letters. The frozen seed text actually uses a smaller glyph
set with maximum ascent 15.810546875 and maximum descent 0.234375. Its envelope
is 16.044921875, exactly the proposed minimum line height. The original claim
about the seed allowed set was imprecise; use the actual frozen source set.

Compute and record the envelope from every visible character in the exact seed,
including punctuation, then assert it fits each planned height. Record the
inherited dictionary envelope separately. Change no text, gap, phase, reader or
pixel. Execute only the same four proposals in fresh exclusive seam-02 after
this source correction. Preserve the aborted four-entry denominator separately.
No extra parameter search, full QR, phone claim or budget increase.
