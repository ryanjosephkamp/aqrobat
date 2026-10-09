# Uniform-weight prose QR investigation

October 9, 2026. Ryan accepted the prior continuous-text appearance as a major
step forward, while reserving intensive phone scanning for later. The prior
[styled-prose technique](../techniques/styled-prose/README.md) is recorded as a
separate deliverable and its evidence is unchanged.

There is a new plain-text feasibility result: **regular-weight black ASCII text
can carry an independently decoded QR signal through letter and word choices**.
The native successful frames contain no bold, gray, variable font, per-glyph
styling, or QR blocks. They use naturally denser uppercase word forms and lighter
lowercase forms, with normal single spaces, punctuation, fixed lines, and natural
monospaced font advances. The words are fabricated; meaningful prose is not yet
demonstrated. Default/baseline readers and phones are separate open questions.

## First verified milestone

- Color-only text at weight 400: 18 unchanged native frames, zero recoveries with
  either baseline reader or the previous successful configured ZXing setting.
  This includes two uniform-black ordinary-story negatives and four URL cases.
- Initial plain-black letter-choice batch: 16 unchanged native frames, zero
  baseline recoveries, one configured ZXing recovery (plain-003).
- Refinement: 11 of 15 planned frames completed, zero baseline recoveries, two
  configured recoveries: refine-005 (`https://example.com/`) and refine-006
  (`HELLO WORLD`). A different URL, refined fake-word forms, dictionary words,
  and regular Monaco/Courier letter-choice cases failed that setting.
- Four remaining regular Monaco/Courier color-only cases were subsequently run
  with a corrected fresh manifest; all four failed the baseline and previous
  configured setting.

The primary plain-black setting uses Menlo at 20 pixels, four characters across
and two ordinary lines per QR region, Q error correction without boosting,
weight 400 everywhere, black ink everywhere, and a five-module nominal white
outer margin. Its source is ASCII letters, ordinary spaces, periods, commas,
and LF line breaks. Word capitalization and character choices carry the ink
contrast; no text formatting varies across the field.

## TXT evidence

[txt-proof/receipts.json](txt-proof/receipts.json) verifies the saved
[plain-003.txt](txt-proof/plain-003.txt) in a **single ordinary preformatted text
element** with one uniform font/weight/color and no child glyph or line elements.
The unchanged text still recovers `AQROBAT-TEST` with configured ZXing.

[txt-url-proof/receipts.json](txt-url-proof/receipts.json) performs the same check
for [refine-005.txt](txt-url-proof/refine-005.txt), recovering
`https://example.com/`. The decoded URL is compared exactly, not merely counted
as a recognized QR. Original HTML replays reproduce the native PNG hashes.
Lowercasing each source or sorting each line's words breaks recovery in these
proofs. Those negatives retain a readable character block but remove the
encoding arrangement.

The reader receives unchanged raster pixels and standard configured options;
it internally downsamples/thresholds. It receives neither the expected payload
nor the source QR matrix. Comparisons happen afterward. Native PNGs and ordinary
TXT-rendered PNGs are retained separately. A browser TXT rendering pass does not
certify TextEdit, email, arbitrary fonts, physical print, or Samsung Camera.

## Method

The deterministic optimizer evaluates natural glyph ink coverage in the recorded
font. It fits complete word forms and single spaces across continuous lines,
favoring heavier character combinations in dark QR regions and lighter ones in
light regions. Capitalization applies to whole word forms. The renderer emits
actual text at one weight and color; generation requires no runtime AI or server.

Additional regular Monaco/Courier metrics are measured from installed fonts,
with natural advance widths, actual platform font names, and font-file hashes
recorded in [font-metrics.json](font-metrics.json). Font files are not copied or
redistributed. The optimizer's per-region ink measurements are renderer
diagnostics; the source matrix is never supplied to a decoder.

The source QR retains a clear outer margin. DENSO documents the
[four-module quiet-zone requirement](https://www.qrcode.com/en/howto/code.html).
The experiment uses a nominal five-module margin; this is not permission to
assume another destination preserves it. Reader configurations are ordinary
[pinned ZXing options](https://github.com/Sec-ant/zxing-wasm/blob/v3.1.5/src/bindings/readerOptions.ts).

## Deviations and custody

The first plain batch stopped before its first raster/decoder attempt because
HTML formatting inserted newlines inside long text spans. Its original manifest,
source snapshots, generated replay, recipe, and conventional controls are kept
in `plain-01/`. A semantic preformatted container repaired that problem before
the fresh `plain-02/` capture. No failed scan was erased or selectively retried.

The refinement stopped before refine-012 rendering when an omitted `boost:false`
was rejected by the existing core. Its 11 completed trials and original source
remain intact. Only the four unattempted color/font cases received corrected
parameters in `font-color-01/`. The first font calibration attempt lacked CSS
domain enablement; it produced no metric file. The corrected calibration confirms
the actual requested fonts. These are harness issues, not decoder passes.

Keep the prior styled method, this uniform-weight track, and original prototypes
separate. Product source/exporters/extension remain version 0.4.2; npm remains
private and unpublished, PR #1 draft. Splashery, the private PDF archive, owner
profiles, jobs, other chats, and sessions are untouched. No agent, new chat,
new host, release, project migration, model training, dependency, or font download.

## Remaining work

The typography is uniformly regular and black, but uppercase/lowercase ink
patterns can still be conspicuous. Current successful text is fabricated and
repetitive. More varied word forms, real-word-only output, coherent prose,
smaller fields, ordinary-font portability, and independent/default-reader/phone
reliability remain open. New reader-option and real-word trials are recorded as
separate follow-ups to this milestone, not silently substituted for these results.
