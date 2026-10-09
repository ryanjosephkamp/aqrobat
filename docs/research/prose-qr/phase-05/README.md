# Native glyph geometry — phase 05

**The prose QR goal remains unsolved.** No new phone test or accepted candidate.
This phase begins at clean `dbcd32f86830486b4ba2fc99006fcef58691b607` on
`codex/aqrobat-foundation`, existing draft PR #1. All phase-04 inventoried evidence
was checked before editing. No product, extension, download or prior evidence
changes. npm remains private and unpublished; the PR remains a draft.

## Current milestone

Four preregistered batches retain **36 unchanged native text renderings**:
16 initial glyph/mass comparisons, eight half-line shifts, eight thresholded
glyph/corner-corridor probes, and four closer-leading probes. Every candidate
fails jsQR, ordinary-default ZXing, and the separately retained baseline probe.
Four conventional controls pass all three probes. These are two algorithm
families and three option profiles, not three independent decoder algorithms.
All 36 same-HTML repeats match their original PNG hashes. This does not repair
phase 04's separate six-of-eight small-image display replay limitation.

The target payload is exactly `https://example.com/`. The normal readers receive
only the unchanged final pixels; expected content is compared afterward. Source
QR geometry guides letter selection and post-probe diagnostics, never decoder
extraction, matrix repair or forced corners. Uniform black weight 400 and uniform
700 are separate typography conditions. Neither is accepted readable prose.

## What the measurements establish

Two lines per QR region originally placed the intended module centers in the
gap between lines. Twelve of 16 cases had no dark target centers on black pixels.
A half-line source-layout shift improves that alignment. In the later raw-pixel
Courier New 700 cases, **all 625 target module centers are correct** after the
ordinary binarizer, yet no reader recovers the payload. This is a renderer
diagnostic, not decoded data or evidence of phone reliability.

The three finder center axes show why center sampling is inadequate. The
perfect-center cases have 44–62 alternating runs along their six axes; the
conventional control has five. Their longest uninterrupted central black runs
cover only about 9–11% of the intended central band; the control covers about
99%. Letter counters, character gaps and leading fragment the broad pattern.
Closing the leading further does not solve the tested cases. The glyph-tile
thresholded objective can perform worse than the raw-pixel objective: local
tile thresholding is a poor proxy for the final paragraph's neighborhood.

The installed [jsQR locator](https://github.com/cozmo/jsQR/blob/master/src/locator/index.ts)
looks for black/white runs with a 1:1:3:1:1 proportion. Its
[binarizer](https://github.com/cozmo/jsQR/blob/master/src/binarizer/index.ts)
classifies local pixel neighborhoods. These opened upstream references explain
the diagnostic; the exact installed 1.4.0 bundle hash is pinned in each manifest.
Diagnostics expose unmodified binarizer/locator functions through the bundle's
module loader, without changing either algorithm or any acceptance reader.

## Reading and custody limits

The output has fabricated whole words, single spaces, punctuation, and complete
fixed lines. It is not semantically coherent or inconspicuous prose. Tight
tracking and leading can crowd letters; native 20-pixel size alone does not
establish human legibility. No failed grid is offered for phone acceptance.
The prior styled-prose and configured-reader uniform-black ASCII/TXT techniques
remain separate preserved feasibility results.

`PLAN.md`, `SHIFT-PLAN.md`, `CORRIDOR-PLAN.md`, and `CLOSE-PLAN.md` precede their
respective batches. Each exclusive directory retains exact TXT, gzipped HTML,
native PNG, layout, source hashes, all probe outcomes, controls and repeats.
`font-metrics.json` records native installed Menlo/Courier New faces, DOM baselines
and canvas glyph pixels. Approximate glyph models are distinguished from final
browser pixels. Executed sources superseded by later edits survive in
`source-versions/`. Verification reconciles these hashes and preserves all 460
files from phase 04. The phase safeguard is 12 MB of logical source/evidence/
handback files; Git objects are excluded. No fonts or dependencies were installed.

Research remains incomplete. The next useful objective must measure sustained
finder runs in the final paragraph's ordinary binarization, while preserving
readable spacing. Merely improving average density or target-center accuracy is
insufficient in these measured cases. This is not a proof that every possible
font or prose construction is impossible.
