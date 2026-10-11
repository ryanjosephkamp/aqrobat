# Phase 16 — uniform regular faces and source word density

Exactly four native finder-only layouts: Impact and Arial Black, each at pitch
144 and 216. Native font size 20 px, leading 24 px, weight 400 throughout, black
letters, zero tracking, normal untransformed glyphs. No selective bolding or
color modulation. These faces are intrinsically heavy; the font remains uniform.
Three separate finder text fields, each seven modules wide, on a 25-module
page with a five-module white margin. These are structure tests, not prose or
payloads. Larger native pages are bounded at 7560 px and processed one at a time.

Measure the installed native font's advances, ink bounds and ink mass before
source packing. Candidate dark words: BOB BOBBY BEE BODE ODD DEED BED BUD BOO
BOOM mom moon mood wood home minimum mammal; light: i ill it if lit till lilt.
Reject source words with overlapping adjacent native ink bounds. Require at
least one surviving dark and light word; retain all filtered words/reasons.
Use a half-pixel source-position DP, exact glyph advances within each word,
reserved right slack and native justification. Geometry only chooses source
words and supports post-return diagnostics; it never reaches a reader.

Actual native checks: no font substitution, wrap or overflow; row ink clearance
at least 2 px; adjacent letter ink nonoverlap. One immediate native repeat per
layout. Save every rejection, error, abort and unattempted proposal. One ordinary
conventional control replay per layout. Ordinary jsQR, ZXing default and baseline
unchanged; separate returnErrors diagnostic retains the actual returned symbol.
Gate requires intended corners/dimension, three exact 49-cell finders and all
twelve horizontal/vertical/both diagonal 1:1:3:1:1 runs. Coordinate-only passes
do not authorize payloads. Default OpenCV detect replays original native PNGs.
No altered acceptance pixels, thresholds, forced extraction/corners or full-QR
sweep. Agent/owner legibility and native structural evidence remain separate.

Fresh metrics-01, proposal-01 and run-01 through run-04. Cap 10,000,000 logical
bytes including source; capture reserve 8,500,000. No new phone results or
successful candidate claims inferred from this phase.
