# Reconsideration: one conditional rearrangement, L2

The parent correctly identified that translating context-04 was not an adequate source-layout redesign attempt. **L2 supplies one changed flow with internally checkable regions and exact logical text, conditional on explicit untested glyph and typography bounds.** L1 remains a valid rejected retained construction only. All nineteen previous files and hashes are preserved. This addendum supersedes their broad no-layout conclusion; it establishes no native acceptance.

## Actual rearrangement

Use the actual first `O` in P1 at the upper-left (index 0), the actual lowercase `o` ending `to` in P2's first phrase `Our first duty is to` at the upper-right (index 19), and the actual lowercase `o` beginning P3's final words `ordinary scan.` at the bottom-left (index 198). Case and all source characters remain unchanged and occur once. These are genuine prose characters, never duplicated or hidden initials. P2 and P3's opening capitals become ordinary body letters.

P1 flows right/down from its first-letter finder. P2's first natural phrase ends at its right finder, and subsequent prose wraps inward below it. P3's prefix appears above a final line beginning at its bottom-left finder, so prose no longer flows below that corner. This changes finder roles and actual text flow rather than retaining three paragraph boxes. The target visual reading map is upper-left P1 → upper-right P2 → lower-left P3, matching logical source paragraph order. Owner readability/order, P2's unusual first-line indentation and enlarged internal lowercase o remain untested. No new native HTML/SVG or artwork is supplied.

## Coordinate geometry

Dimension **177**, nominal pitch **33/7px**, symbol origin **(64,64)**, side **834.428571px**, far edge **898.428571px**. Four-module quiet outer bounds are **[45.142857,917.285714]** in each axis. Dimension is a design choice; pitch is a comparison target borrowed from saved calibration, not a measured pitch for an available new O/o. No matrix or payload is constructed.

| Region    | Source-coordinate bounds                                    | Real text role                                     |
| --------- | ----------------------------------------------------------- | -------------------------------------------------- |
| TL finder | [64,97] × [64,97], center (80.5,80.5)                       | P1 O, index 0                                      |
| TR finder | [865.428571,898.428571] × [64,97], center (881.928571,80.5) | P2 o, index 19                                     |
| BL finder | [64,97] × [865.428571,898.428571], center (80.5,881.928571) | P3 o, index 198                                    |
| P1 region | (64,64), 360×360                                            | First letter then ordinary rows                    |
| P2 region | (468.428571,64), 430×360                                    | First phrase ends at right finder; remainder below |
| P3 region | (64,538.428571), 360×360                                    | Prefix above last `ordinary scan.` line            |

Reserve one module of white inner separator beside each finder plus 0.25px additional body clearance. The 33×33 boxes are **requirements for native ink envelopes**, not solid QR modules or drawings. No qualifying actual glyph is supplied. Saved Copperplate-Bold O exceeds that envelope and fails the fixed gate; it cannot be silently reused. No saved lowercase-o resource proves the requirement. **Native glyph availability is the central unresolved blocker**, visible in the specification rather than hidden in a drawing.

## Explicit bounds and checks

Reflow ordinary ArialMT 18px / tracking 1 / no kerning or ligatures. Use each saved `capture.json#/dom/paragraphs/*/glyphs/*/rect/width` plus 1px slack as an **assumed** ordinary advance upper bound. The newly ordinary O in P2/P3 has an unmeasured ≤20px bound. Target native finder advance is 33px; ordinary ink vertical bounds relative to baseline are assumed −17..+5px, and body baseline on a finder row is center y+10px. These are design assumptions, not new font measurements. Any violated bound rejects the layout; clipping or changing text is forbidden.

Word-packing arithmetic yields P1 **7 rows**, P2 **one corner phrase plus 5 rows**, and P3 **6 prefix rows plus its final line**. Full strings, exact source indices, width sums and baselines are in reconsideration.json. P2's prefix bound is 173.265625px; its first x is 687.198661, within its region. Its first phrase ends `to`, keeping normal left-to-right word order at the right corner. P3's final remainder starts at x=101.964286 and fits its region.

Normal baseline steps are 27px. The special top first-to-second step is 32px; the bottom penultimate-to-final step is 40px. With the declared vertical bounds, these clear the one-module inner separators. All region boxes, row bounds, final text tails and finder envelopes fit inside the symbol, and the paragraph regions do not overlap. The external quiet ring is empty **conditionally on actual ink respecting those bounds**; no pixels were rendered or recounted.

Static concatenation reproduces each original paragraph exactly. Soft wrapping authorizes no inserted/deleted source characters. The original finder code points stay at indices 0,19,198, and logical order stays P1/P2/P3. This is **not** rendered Range selection, whole-document separator evidence, styled/plain clipboard, native-app paste, phone or physical-print acceptance. A future local selection failure must not be normalized away.

## Conditional coherence versus native acceptance

The request allows explicit untested design assumptions. The source-region allocation, row bounds and logical text assembly are coherent under those assumptions. L1's retained opening-capital roles, intact old boxes, old glyph and dimension 85 were chosen retention assumptions, not user constraints. L2 changes them while preserving exact text and declared honest nominal finder geometry.

This does not establish an actual native O/o with the required envelope or isotropic pitch, a readable rendered article, ordinary detection, intended first-selected geometry or fixed-gate pass. The gate remains unchanged: three selected points with intended first geometry; each balance/span/stability ≥0.8; a nonempty scored set with **every** record having four complete axes and worst RMS ≤0.35; four complete true axes with worst RMS ≤0.35. A fitting envelope or conventional D1 recovery is never a native gate pass. No known native construction is promoted to acceptance.

Actual lowercase glyphs, advance/baseline bounds, wrap behavior, exact selection and owner readability/order remain separate blockers. No timing/alignment/data matrix, encoded payload, field density, capacity or scan success is claimed. The separate body-only coupling counts are not transferred. Changed placement may change every locator branch; no historical metric is presented as a prediction.

## One current NEXT proposal: R1, unchanged and unselected

The original visible prompt and [CONTINUE.txt](CONTINUE.txt) remain exactly unchanged. R1 is still a twelve-minute, one-MB saved-resource envelope/evidence-gap closure over seven families/fourteen filled-outline receipts, with zero new sources, captures or readers. It must mark missing lowercase-o/first-word/copy-order evidence unknown; it cannot validate L2. No revised-next-prompt.txt is needed and no next phase is executed. The parent will present this conditional specification together with the single current R1 proposal, preserving the earlier report as a prior rejected construction record.

## Verification and custody

The additive receipt records **68 passing assertions**, including nineteen old hashes, exact text assembly, width/vertical bounds and separator clearance. Only RECONSIDERATION.md and reconsideration.json are added. Installed Prettier and repository format-check results will be recorded in that receipt. A first index formula selected the space after `to` and was rejected before any file write; the corrected exact source index is 19. The ensuing missing-new-file formatter messages are retained there. No native source, render, reader/locator/binarizer, clipboard, app/phone/print test, Git mutation or new clock occurs.
