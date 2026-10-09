# Native-letter finder isolation — phase 06

**Readable prose QR recovery remains unsolved.** These are finder-only diagnostic
layouts with no encoded payload. They are not phone candidates. Work is confined
to this directory and `experiments/prose-qr/finder-native/`, on
`codex/aqrobat-foundation`, existing draft PR #1. The phase began at clean
`52fa086b970d585e8087db25503114ab55c65c8f`; its first 16-case milestone was pushed
as `e81719e3bc64f7093444e9f22f6ff583a85e20f4`.

## Results

Retain **39 native finder layouts**, zero with the intended ordinary jsQR locator
geometry, and 39 identical immediate native repeat PNGs. Ten conventional full-QR
controls pass jsQR, default ZXing and the retained baseline (30 control attempts).
Ten solid finder triplets return the intended corners. These control types check
different things. Incomplete finder layouts are not failed payload scans.

The unique planned native denominator is 40: 39 captures plus one source-width
rejection before capture. Manifests also retain repeated administrative entries
for exclusive continuations. Four aborted capture batches and all their
uncompleted entries survive; do not add those entries as extra failed scans.
The last completed read-only replay checks all 59 retained PNG/RGBA pairs
(39 native layouts plus 20 controls) and reproduces every saved diagnostic;
all ten full-QR controls again pass three profiles. This is recorded separately
from the original captures and immediate repeats.

| Native batch              | Retained layouts | Intended locator geometry |
| ------------------------- | ---------------: | ------------------------: |
| native-01 / native-02     |            6 + 6 |                         0 |
| touch-02                  |                4 |                         0 |
| cross-01                  |                4 |                         0 |
| cap-01                    |                4 |                         0 |
| feedback-01 / feedback-02 |            2 + 9 |                         0 |
| seam-02                   |                4 |                         0 |

## What changed our understanding

Closing leading improved vertical continuity but left many horizontal breaks.
Impact's capital T top bars offer a different horizontal band from its mid-letter
strokes. Aligning those bars and selecting whole-word replacements using actual
native binarized pixels reduced horizontal fragmentation. Correcting the final
row seams helped both directions. In seam-01, the top-left center horizontal
trace has 35/31/96/30/27/9 pixels (black/white alternating); its vertical trace has
1/32/32/96/33/34 pixels (white/black alternating). Both have six runs, including
edge white space. Locator dimensions are still 93 and 79 instead of 25.
The bottom-left vertical trace still contains a one-pixel interruption, and
corner subpixel placement differs. This is not robust geometry.

A passive audit of three retained PNGs preserves the unchanged locator return
values while snapshotting its candidate pipeline. Cap-02 creates 1,067 scored
points; seam-01 creates 1,071. Near their intended centers, the largest scored
point size is at most 11.67 pixels, versus the expected central size of about
97.86 pixels. Neither has a correctly sized macro candidate there. The solid
control has exactly three scored points, size 72 pixels against an expected 72.
This supports a narrower failure than merely poor final ranking: the intended
large finder candidates are absent from the scored set in these two examples.
It does not establish a universal impossibility or a successful prose QR.

The installed [jsQR locator source](https://github.com/cozmo/jsQR/blob/master/src/locator/index.ts)
checks diagonal run ratios as well as horizontal/vertical ones, and builds
candidates from regions spanning rows. The opened
[binarizer source](https://github.com/cozmo/jsQR/blob/master/src/binarizer/index.ts)
and exact installed 1.4.0 bundle are pinned in the manifests. A center-axis loss
omits relevant two-dimensional structure. The next renderer objective should
address that structure and native legibility before any full-QR sweep.

## Native text and limits

Installed Courier, Monaco and Impact were measured at native 20 pixels, uniform
weight 400 black. Platform faces match the requested names. Impact is naturally
heavy; weight 400 does not establish ordinary body-text appearance. Native
proportional advances and normal single word spaces are preserved. The early
quarter-pixel source model is approximate. Later word feedback selects source
text from actual unchanged native binarized pixels; acceptance-reader parameters
never change. Capital-bar probes include explicitly synthetic T/E/H/F words.
They are not meaningful prose. Very tight rows visibly join stems and impair
letter distinction. The final PNG was visually inspected; the result remains
crowded, repetitive and conspicuous. No owner legibility acceptance is claimed.

Expected geometry enters only rendering objectives and post-probe diagnostics.
It never repairs pixels, supplies corners to the ordinary locator, forces
extraction or tunes acceptance readers. The passive instrumented VM is separately
labeled diagnostic evidence; its snapshots do not count as acceptance results.
Its three locator return values match the ordinary implementation exactly.
No hidden blocks, invisible letters, raster rescaling/compression as a solution,
per-word bolding/color, font download or dependency installation.

## Errors retained, rather than hidden

- native-01 stops after six at a whole-word packing boundary; native-02 executes
  only the remaining six after repair.
- touch-01 stops before its first native case at a fixed-pitch terminal tolerance;
  touch-02 permits a recorded natural ragged end.
- feedback-01 retains two cases, then rejects feedback-03 because its period makes
  the line too wide. That exact source-width rejection is saved; the source is
  not shortened. feedback-02 executes only the other nine proposals.
- seam-01 stops before capture because the inherited dictionary-wide envelope
  exceeds the proposed leading. The frozen source uses fewer glyphs; seam-02
  computes and records that actual visible-character envelope before executing
  the same four cases. The inherited value is retained separately.
- The first pixel replay's deep strict object comparison rejects VM prototypes
  despite matching pixels. Its receipt and source survive. A second replay
  compares complete serialized diagnostic values and passes all 59 inputs.
- The first passive rank audit exceeds its internal uncompressed receipt guard
  after probing; intermediate counts were not saved and remain unknown. The
  second audit preserves all scored points/groups losslessly in gzip JSON for
  the same three inputs. This retention repair is separate from native outcomes.

## Custody and next gate

`verification-01.json` preserves the 16-case milestone; `verification-02.json`
preserves a 35-case interim reconciliation. Read `verification-final.json`,
`pixel-replay-02.json`, `rank-audit-summary-02.json`, the full compressed rank
receipt, `custody.json` and executed source snapshots for the final checkpoint.
All 241 phase-05 and 460 phase-04 inventory entries and the three original
product downloads remain unchanged. Product 0.4.2 stays private/unpublished.
Research uses a fresh 6-MB logical-file cap excluding Git objects.

No new phone, print, Gmail, native clipboard or installed-extension observations.
Ryan's earlier full-PNG failures with both Samsung scanners remain separate,
with exact case count and viewing conditions unspecified. Earlier styled-prose
and uniform-black ASCII/TXT configured-reader proofs remain preserved and do not
establish phone reliability. Splashery, PDF archive, prototypes, profiles, other
tasks and jobs are untouched. No migration, new host, agent/chat, external
message, release, merge or store submission. Keep PR #1 draft.

Next: use a small preregistered native-letter objective for two-dimensional
finder-region geometry, including diagonal continuity and ordinary candidate
formation, with an explicit legibility rejection. Require intended ordinary
finder geometry before a bounded full-QR payload test; then independent ordinary
readers and owner phone acceptance. This checkpoint is incomplete research,
not a completed-prose claim. All task-owned jobs are closed at handback.
