# Native finder span and joins — phase 07

**The readable prose QR goal remains unsolved.** This phase follows the sealed
39-case phase-06 finder investigation. It begins clean at
`80f1b54a024cfb456f287078f2af7edb7e2579f8` on `codex/aqrobat-foundation`, existing
draft PR #1. Work stays only in this directory and
`experiments/prose-qr/finder-span/`, with a fresh 1.5-MB logical-file cap.
No product, download, extension, other repository, prototype or profile edits.

## Fixed outcomes

Six unique native cases are planned: two font sizes and four adaptive source-row
guards. Five are captured; one exact synthetic row is rejected for source width
before native capture. All five return incorrect ordinary jsQR locator geometry,
and all five immediate same-HTML native repeat PNG hashes match. These are
incomplete finder triplets with **no encoded payload** and no phone candidates.
They are not failed link scans. Three conventional full-QR controls pass three
fixed profiles (nine attempts); three solid finder triplets locate correctly.
Each batch's unchanged 20-pixel seed native replay matches its retained PNG.

| Case     | Native change                            | Intended locator       | Returned dimensions |
| -------- | ---------------------------------------- | ---------------------- | ------------------- |
| span-01  | 24-pixel native CSS letters              | fail                   | 33, 31              |
| span-02  | 32-pixel native CSS letters              | fail                   | 41, 49              |
| guard-01 | source row 6 copied from row 5           | fail                   | 131, 67             |
| guard-02 | synthetic e-word row                     | source-width rejection | no native capture   |
| guard-03 | source row 6 becomes three I-word groups | fail                   | 95, 67              |
| guard-04 | source rows 6 and 8 become I-word groups | fail                   | 109, 79             |

Font sizes are native CSS, with proportional layout/leading/tracking, DPR 1 and
actual installed Impact. No CSS transform or raster resampling. Actual glyph
metrics, width/overflow, three exact single-text-node outputs, platform font faces
and final unmodified PNGs are retained. Weight is uniformly 400 black; Impact is
naturally heavy. Source-row guards change only the declared visible lines.

## The span hypothesis was insufficient

The fixed ordinary locator discards quads shorter than three rows. We tested
whether larger native T bars would address this. A passive four-input audit
finds three consecutive qualifying horizontal rows in the fixed center window
for the 20- and 24-pixel cases, and four or five for 32 pixels. The diagnostic
row window is not a recovered quad or a decode. None has a correctly sized
scored candidate near its expected centers. The larger native output still
fails, so a too-short bar alone does not explain or solve these examples.

## A concrete join failure

A second passive audit follows just the retained 20-pixel seed and solid control.
At the seed's top-left corner, the ordinary wide scan at y=277 is 96 pixels
(start x=229, end x=325). It joins an older active quad whose top at y=270 spans
only x=298..302, four pixels. That quad later ends with width five at y=279.
The scored point size averages top width, bottom width and height:
(4 + 5 + 10) / 3 = 6.33 pixels. The wide intermediate span does not become a
stable large finder region. Its calculated center is (266.75, 275), and the
corresponding small scored point is retained. Other corners show related
endpoint contraction. These are local observations, not a universal causal proof.

The solid control maintains top, intermediate and bottom widths of 72 pixels,
height 72, computed size 72, and the correct center. The unchanged
[jsQR locator source](https://github.com/cozmo/jsQR/blob/master/src/locator/index.ts)
shows its overlapping-row joins, endpoint/height size summary and diagonal score.
The opened [binarizer source](https://github.com/cozmo/jsQR/blob/master/src/binarizer/index.ts)
and exact installed bundle hash are preserved. Both passive VM audits return
exactly the same locations as the ordinary implementation. Their snapshots are
separate diagnostic evidence, never acceptance-reader results.

This gives the next source objective: stable two-dimensional native finder
spans across rows, including their diagonal structure and start/end geometry,
with readable letter distinction. A clean center cross and larger font are
insufficient in these cases. Never change the acceptance reader to favor them.

## Legibility and errors

Agent inspection of the 32-pixel output and final I-word guard finds heavy,
joined, repetitive lettering. I rows resemble stripes. These are diagnostic
relaxations and do not establish ordinary paragraph appearance, meaningful
language, legibility acceptance or scannable prose. Expected geometry is used
only in rendering and post-probe diagnostics; no repaired pixels, hidden blocks,
invisible letters, forced corners, per-word weights/colors or tuned readers.

The guard e-word row is 247.6796875 pixels against a 228.34765625-pixel field.
It is rejected without shortening. Guard-01 stops after its first native case at
that guard; the two remaining eligible cases execute in exclusive guard-02.
Original manifest entries, the abort and source versions survive. Administrative
re-entry is not an extra native failure.

A passive audit initially has a missing helper import and stops before a browser
or input probe. The corrected execution saves its complete four-input gzip
receipt and compact summary, then a console-only field lookup fails after the
browser closes. All data is retained; no probe retry is needed. Its executed
source is archived, and the current source fixes only that console projection.
The join audit and read-only analysis complete. These harness errors are distinct
from native locator outcomes.

## Verification and continuation

Read `verification.json`, `analysis.json`, the lossless span/join audit receipts,
`custody.json`, batch manifests and source snapshots. The final read-only replay
checks all 11 retained phase-07 PNG/RGBA pairs (five native, six controls), repeats
all ordinary diagnostics and adds nine separately recorded passing control
payload attempts. All 284 phase-06, 241 phase-05 and 460 phase-04 inventoried
files and all three original product downloads are unchanged.

No new phone, print, Gmail, clipboard or installed-extension observations. The
previous full-PNG failures with both Samsung scanners remain separate evidence;
exact count and conditions are unknown. Earlier styled-prose and uniform-black
ASCII/TXT proofs remain separate. No full-QR sweep, new host, migration,
agent/chat, messages, release, merge, dependency/font install, npm publication or
store submission. npm remains private and PR #1 remains draft. All task-owned
jobs are closed at handback. The project goal is incomplete.
