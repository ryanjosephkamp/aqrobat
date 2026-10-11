# Broader letter-ink amendment

Batch 05's four two-character corner cases give ordinary jsQR the intended
21-module locator geometry, but all ordinary readers return no payload. Passive
native extraction (zero decoder calls) has 52-57 wrong cells even though the
source-center model has 2-3. Actual sampling moves by about one pixel horizontally
and vertically. Thin strokes are too fragile for that displacement. ZXing also
uses its default downscaling, which is kept unchanged.

Amend the resource ceiling from 10 to 11 for one combined 40px Courier New atlas,
regular and bold with 1.4px foreground stroke. Capture once and repeat exactly;
no reader calls. This is twice the original glyph size, not a resampled image.
Test a fixed set of 48px and 72px pitches, radius-zero and radius-one construction
targets, M/Q redundancy, with the explicit corner glyph pair. Keep source words
in order, real spaces and newlines, no background modules, and no overlap. At
48px pitch the 40px type fills more of each row. Sampling targets use nominal
integer centers, with a predeclared vertical minus-one offset matching observed
corner ink. Software-reader success remains the only scanning evidence.

No other ceiling changes: 64 candidates, 12 controls, 128 MB, experiment cutoff
07:23Z and absolute stop 07:53Z. None of the old negative captures are retried.
