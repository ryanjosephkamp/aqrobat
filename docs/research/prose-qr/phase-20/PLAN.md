# Phase 20 — native text rhythm, same whole words

Exactly three finder-only source typography proposals derived byte-for-byte
from phase 17/run-02's whole-word Monaco source. Native font 14 px, regular 400,
black, no glyph transforms. Source dx 6 px as phase 18/run-04; all three text
fields preserve the same original words and newlines. Compare (leading,
tracking)=(14,0.125), (14.25,0), (14.25,0.125) px. The baseline (14,0) result is
already preserved in phase 18/run-04 and is not regenerated here. Both changes
increase rather than compress native text spacing.

Hypothesis: slight positive spacing changes alter periodic letter texture in
ordinary built-in scale handling. This is source typography, not binarizer or
reader tuning. No pixel modifications, individual-cell fixes, corner hints or
forced extraction. The native bounding envelope may grow vertically by 18 px;
the page margin retains all source letters with no clipping. This is recorded
as source geometry rather than an asserted identical square. Reject any actual
wrap, width overflow, ink overlap, row clearance under 2 px or font substitution.
Record native DOM ranges to verify actual tracking/leading. Owner legibility
and portable text remain untested; these are styled native-layout diagnostics.

One native rendering and immediate repeat per proposal, all outcomes retained.
Unchanged ordinary jsQR/ZXing profiles, separate returnErrors diagnostic. Gate
requires three complete 49-cell finders, twelve balanced rays and nominal
dimension/corners in the reader's actual returned symbol. No full payload or
phone candidate in this phase. A coordinate-only pass remains insufficient.

Fresh proposal-01 and run-01 through run-03. Cap 6,000,000 logical bytes including
source; capture reserve 4,500,000. Preserve source hashes, errors/aborts and
unattempted slots; never reuse existing output directories.
