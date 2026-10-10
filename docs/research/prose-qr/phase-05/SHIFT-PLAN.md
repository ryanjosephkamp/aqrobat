# Half-line phase probe

Preregistered after the first 16 candidates: zero independent recoveries and
zero correct jsQR finder geometries. Twelve native cases have zero intended dark
module centers on black pixels. Even line counts place the QR center on a line
boundary; the glyph-height/baseline filter leaves that boundary clear. The two
Menlo 700 tracking -2 cases have some center ink, but still fail decoding.

Run eight fresh native candidates: Menlo/Courier New × uniform 400/700 × mass/
geometry objective, fixed -2-pixel tracking. Shift the text field upward by half
a line height relative to the target QR origin and add one complete text line
so the bottom field is covered. Keep ordinary whole words, single spaces, clear
native 20-pixel glyphs, fixed typography and black ink. The nominal five-region
border remains; text extends at most a quarter region above/below its nominal
field. This layout choice is explicit, not a crop or repaired image.

The geometric objective additionally emphasizes the small neighborhood of intended
module centers. Source positions guide glyph generation only; do not pass source
geometry or forced locations to any acceptance decoder. Diagnose actual centers
and locator positions only afterward. Keep source model approximation distinct
from final native pixels. Record repeat hashes, exact payload probes, controls,
all failures and readability limitations. Earlier outputs remain untouched.
