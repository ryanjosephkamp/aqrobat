# Phase 10: readable native density at an ordinary detector's scales

October 9, 2026. Baseline is the phase 09 milestone commit, verified live before
capture. New combined source/evidence cap: 6,000,000 logical bytes, native
capture reserve 4,500,000. At most two finder-only native proposals in run-01.
One task-owned browser at a time. Stop capture on resource errors; retain
partial files, errors and all outcomes. Do not touch other jobs or profiles.

The first proposal uses Monaco 20 px, weight 400, 24 px leading, zero tracking,
ordinary single spaces and native glyph advances. Each nominal module is 144
px wide/high: six native rows, three three-letter words per row. Choose `MUM`
for dark source modules and `ill` for light source modules. Second proposal
uses `mum` / `ill`, otherwise identical. Words fill both light and dark areas;
no hidden shape or invisible text. Three finder-only source blocks, 42 rows ×
21 words each, nominal QR dimension 25 and quiet 5, full native image 5040 px.
No payload is encoded. Source words are deliberately repetitive, not meaningful
prose or a product deliverable. Native letters remain 20 px and readable at
their original scale; no externally compressed raster is an acceptance input.

The change in objective is explicit: the prior full-resolution jsQR structural
gate remains intact and will still be reported. Independently test an unchanged
native PNG with default OpenCV `QRCodeDetector.detect`, no settings or input
transformations. Its ordinary implementation has internal scale handling:
[OpenCV 4.13.0 source opened October 9](https://raw.githubusercontent.com/opencv/opencv/4.13.0/modules/objdetect/src/qrcode.cpp).
Installed ZXing likewise defaults to internal downscaling; its acceptance
profiles remain unchanged. This is a source-rendering scale hypothesis, not a
claim of recovery. Expected geometry is consulted only after ordinary returns.

Record native source width, letter/row ink clearance, platform font, full PNG
and RGBA hashes, exact immediate repeat, and all failures. Each batch includes
a conventional control through the three existing profiles, a solid finder
control, blank negative, and the old native seed replay. Native image size is
bounded at 5040 × 5040, serial capture. Do not retain raw RGBA files on disk.

A separate post-probe diagnostic may reproduce the documented OpenCV
resize/threshold operations with the installed OpenCV functions and defaults.
Such intermediate images are explicitly diagnostic, unreadable at text scale,
and never acceptance inputs or claimed prose successes. No expected geometry
may repair these pixels. Actual ordinary locator outputs on a diagnostic
intermediate can be measured for runs/spans, but this does not establish an
observed internal OpenCV pixel identity or authorize a full-QR sweep. No full QR
is scheduled; if substantial structure appears, preregister a narrowly justified
next step before generation. Keep all outcomes and exact denominators.
