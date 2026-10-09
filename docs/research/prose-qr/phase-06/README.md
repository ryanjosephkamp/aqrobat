# Finder isolation — phase 06

**The prose QR goal remains unsolved.** This milestone isolates three corner
patterns using native letters. The layouts contain no encoded payload and are
not phone candidates. Source baseline is clean
`52fa086b970d585e8087db25503114ab55c65c8f`, branch `codex/aqrobat-foundation`,
existing draft PR #1. npm stays private and unpublished.

## Current milestone

Sixteen native finder layouts are retained: twelve frozen font/leading/objective
combinations and four tighter capital-stroke layouts. None returns the intended
corner geometry through the unmodified ordinary jsQR binarizer/locator. All
sixteen immediate native repeat PNG hashes match. Four full-QR controls pass
jsQR, default ZXing and the retained baseline; four solid finder triplets return
correct corner geometry. These two control types establish different checks.
Finder-only outputs are not counted as failed payload scans.

Installed Courier, Monaco and Impact were measured at 20 pixels. Actual platform
faces match the requested names. All use uniform weight 400 and black ink; Impact
is naturally heavy, so its weight value is not evidence of body-font appearance.
Words use native proportional advances, normal single spaces and punctuation.
They are real words but do not form meaningful sentences. Quarter-pixel renderer
optimization is approximate; the final native pixels are the diagnostic input.

Closing the leading helps one direction. Impact touch-03 has only six vertical
runs and about 92–94% uninterrupted central-band coverage; its three horizontal
axes still have 47 runs. It still has incorrect locator geometry. The zero-gap
rows visibly join vertical stems and threaten letter distinction. Native type
size and a better diagnostic metric do not establish acceptable legibility.
No failed grid is handed over as a successful phone candidate.

## Custody and limits

The initial batch stops after six completed cases at a word-packing boundary;
the remaining six execute in a fresh directory after a source fix. Touch-01
stops before its first native case when fixed-pitch widths cannot meet the narrow
terminal tolerance. Touch-02 preserves normal words with a wider ragged-end
allowance and records actual widths. Both aborts, manifests, controls, source
versions and per-batch uncompleted lists survive. Uncompleted cases are not
failed scans and do not enlarge the retained-native denominator.

All prior phase-04/05 inventoried files and original product downloads are checked
unchanged. New files stay only in `experiments/prose-qr/finder-native/` and this
phase-06 directory, under a fresh 6-MB logical-file cap excluding Git objects.
No product, extension, font/dependency install, migration, agent/chat, new host,
release, merge, npm publication, store submission or external message.

Plans precede their batches. `verification-01.json` reconciles source hashes,
native PNG/HTML/TXT hashes, control outcomes, repeats and prior custody. Any
further adaptive finder test needs a specific new plan and exclusive directory.
Ordinary payload decoding and phone acceptance remain later gates. No full-QR
sweep is authorized by a finder diagnostic alone.

The opened [jsQR locator source](https://github.com/cozmo/jsQR/blob/master/src/locator/index.ts)
and [binarizer source](https://github.com/cozmo/jsQR/blob/master/src/binarizer/index.ts)
explain the run-based diagnostic. The exact installed 1.4.0 bundle is pinned in
the manifests. Source geometry guides rendering and post-probe assessment only;
it never supplies corners to a decoder, repairs pixels or creates hidden blocks.
