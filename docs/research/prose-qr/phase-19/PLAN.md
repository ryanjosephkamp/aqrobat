# Phase 19 — continuous words with a locator-aid control

Exactly two nonpayload structural layouts, native Monaco 14/14, regular 400,
black, zero tracking, pitch 144, 25-module field, five-module margin, dx 6 px.
One continuous pre of whole words/newlines across the full field; no isolated
single-letter i tokens. Same measured phase 17 metrics and source midpoint bank
constraint. Baseline target has only three finders. Controlled second target
adds the standard alternating timing row/column between finders, a 5 by 5
alignment target centered at module 18/18, and fixed dark module 8/17. No format
bits, data, URL or encoded payload are generated. These are native word fields,
never solid target blocks behind text.

Hypothesis: missing normal structural aids can destabilize the reader's own
sampling. The pinned [ordinary sampler](https://raw.githubusercontent.com/zxing-cpp/zxing-cpp/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/qrcode/QRDetector.cpp)
searches an alignment pattern and uses it when forming the sampling transform.
That does not establish the cause of the earlier one-cell errors. This is a
small source-geometry control, not a full-QR payload sweep or forced extraction.
The reader receives only unchanged native PNG and all normal profiles remain
unchanged. No expected corners, masks or geometry enter decoder calls.

Record actual returned symbol, all three 49/49 finder masks, twelve balanced
axial/both diagonal runs, nominal dimension/corners, source readability checks
and native repeat. Complete finder structure is still required before considering
one separate payload confirmation; neither an error-return result nor coordinate
pass is payload acceptance. Default OpenCV detects original PNGs separately.
No new phone tests. Preserve both outcomes, source rejections/errors/aborts and
exact denominators, including accidental returned text without opening it.

Fresh proposal-01, run-01 and run-02. Cap 10,000,000 logical bytes including source;
capture reserve 8,500,000. Source generation uses exclusive creation. The wider
paragraph and repetitive words remain limitations, not a solved natural prose claim.
