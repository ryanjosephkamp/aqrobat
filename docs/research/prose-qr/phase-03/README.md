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

## Recorded results

The [review page](index.html) keeps readable excerpts separate from exact native
layouts. [verification.json](verification.json) reconciles retained files and
denominators without rerunning experiments. The first verified milestone was
backed up at commit `01d18a1`; follow-ups retain their own manifests and results.

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
- Real-word-only field: eight frames, with words in every internal region, zero
  baseline or primary configured successes. Eight shorter field variants also
  failed. These failures are retained, not substituted with successful fields.

Total: **65 generated native frames**, comprising 22 color/story comparisons
and 43 uniform-black letter/word-choice frames. Both baseline readers failed all 65. Eleven conventional controls in the completed batches passed both baseline
readers and the primary configured reader; the aborted batch's control is separate.

Three explicitly recorded additional option sweeps tested retained, unchanged
native PNGs: 30 inputs × 10 configurations, 12 inputs × 10, and eight compact
inputs × 10, for **500 additional reader attempts**. Seven exact attempts across
three additional frames (`refine-001`, `refine-002`, `refine-004`) occurred in the
first sweep; the other two sweeps had zero. Thus there are **six unique successful
generated frames**, all regular black ASCII, across `AQROBAT-TEST`, `HELLO WORLD`,
and `https://example.com/`. These are configured-reader results, not baseline
passes or six successful phone scans. `https://example.org/a` failed.

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
as a recognized QR.

[txt-varied-proof/receipts.json](txt-varied-proof/receipts.json) verifies the more
varied [refine-001.txt](txt-varied-proof/refine-001.txt). Its configuration is
GlobalHistogram with downscaleThreshold 25 and downscaleFactor 3, rather than
the primary threshold 50/factor 2 used for the other two proofs. All three original
HTML replays **and single-text-node TXT renderings reproduce their original
native PNG hashes exactly**. Lowercasing each source or sorting each line's words
breaks recovery: all six negatives return no configured payload. Those negatives
retain a character block but remove the encoding arrangement.

The reader receives unchanged raster pixels and standard configured options;
it internally downsamples/thresholds. It receives neither the expected payload
nor the source QR matrix. Comparisons happen afterward. Native PNGs and ordinary
TXT-rendered PNGs are retained separately. A browser TXT rendering pass does not
certify TextEdit, email, arbitrary fonts, physical print, or Samsung Camera.

## Same TXT in other recorded font conditions

[portability/results.jsonl](portability/results.jsonl) renders the same two saved
TXT files in four installed fonts at 20/24 pixels, with ordinary 1.2-em line
spacing, one text element, regular weight 400, and uniform black. No words are
regenerated. Actual platform fonts are recorded per frame. Three configured
settings test each unchanged rendering: 16 renderings, 48 attempts, nine exact
attempts across seven renderings; both baseline readers fail all 16.

| Font / size            | AQROBAT TXT | URL TXT     |
| ---------------------- | ----------- | ----------- |
| Menlo 20 / 24 px       | Pass / pass | Pass / pass |
| Monaco 20 / 24 px      | Fail / pass | Fail / pass |
| Courier New 20 / 24 px | Fail / fail | Pass / fail |
| Courier 20 / 24 px     | Fail / fail | Fail / fail |

Pass means at least one of the three specified configurations recovered the
exact payload. This is measured font/geometry portability, not arbitrary paste
acceptance. Even ordinary 1.2-em leading changes pixels relative to the original
1.2041015625-em layout and can require a different configuration.

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
separate. The [plain-ASCII technique](../techniques/plain-ascii/README.md) records
the new method and pinned references as its own deliverable. Product
source/exporters/extension remain version 0.4.2; npm remains
private and unpublished, PR #1 draft. Splashery, the private PDF archive, owner
profiles, jobs, other chats, and sessions are untouched. No agent, new chat,
new host, release, project migration, model training, dependency, or font download.

## Remaining work

The typography is uniformly regular and black, but uppercase/lowercase ink
patterns can still be conspicuous. Current successful text is fabricated and
repetitive. More varied fabricated forms have a TXT success, but real-word-only
output, coherent prose, successful smaller fields, robust typography, and
default-reader/phone reliability remain open. Plain text does retain this signal
in the three demonstrated renderings; destination formatting still determines
its pixels. This does not establish an inconspicuous English paragraph.

The [checkpoint](CHECKPOINT.md) supplies a safe continuation prompt. Exploration
stopped near the authorized hour and retained every attempted outcome; handback,
verification, and Git backup followed. No work is classified complete merely
because the time budget ended. The initial 40-MB incremental file safeguard is
checked in the final custody receipt; installed fonts and evidence binaries are
not duplicated into the local handback.

## Handback verification

`board-checks.json` verifies five cases: exact TXT/HTML download bytes, recipe
payloads and hashes, native selectable text, uniform weight, copy fallback, and
390-pixel viewport layout. No page errors or automatic external requests occurred.
Desktop and phone-width reading screenshots were inspected by the agent; these
are not physical phone observations. Rapid automated download checks timed out
under file and HTTP delivery; the final local HTTP check paced clicks at 500 ms
and passed all 15 exports. This was review-harness behavior, not a QR trial.

Product unit tests pass 18/18 in this turn. Full formatting and Git scope checks
pass at handback. Product build/site/text-browser checks were already verified
in the previous phase's disposable source copy, and are not claimed as newly
rerun here. The final custody check compares all three original product download
hashes with that receipt. Native clipboard, installed extension, actual Gmail,
TextEdit, phone, and print are untested in this phase.
