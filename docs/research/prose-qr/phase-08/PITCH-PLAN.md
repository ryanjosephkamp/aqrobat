# Additive pitch preregistration

Registered after run-01 completed, before pitch-01 generation. Its sixteen
outcomes remain intact. The region scores improve by less than 0.003 in either
font; all central stable-row fractions remain zero. The fixed 48 px module
pitch may be inappropriate for native 20 px letter strokes. This is a bounded
scale hypothesis, not permission to compress or blur letters.

Eight new fixed finder-only native layouts, no adaptive substitution:
Impact and Monaco; module pitches 6, 8, 12 and 24 px. Keep native font 20 px,
leading 24 px, tracking zero, weight 400, black; region objective and ordinary
dictionary words of length >=2. Number of source lines = ceil(7\*unit/24)+1.
This changes source geometry and word proposals, not captured pixels or decoder
parameters. The smallest source field is 42 px. Overflow or packing failures
are source rejections, retained without shortening or rerunning. Continue the
same explicit native legibility gates and ordinary geometry test. Store fresh
exclusive pitch-01. No payloads or full-QR sweep. No selection of an expected
location inside the reader. All eight native repeats, sources and errors survive.

The total phase cap remains 3,000,000 bytes. Capture guard rises to 2,800,000
only for this additive batch, reserving at least 200,000 bytes for final receipts.
If this reserve stops the batch, retain its abort and unattempted case IDs.
Previous source files and executed versions are unchanged.
