# Styled-prose QR technique

Recorded October 9, 2026, as a separate deliverable from the uniform-weight
investigation. Ryan accepted the October 8 iteration as a major visual step
toward the intended paragraph structure. Intensive phone review is still pending.

## Exact method

An ordinary QR matrix determines the intended average ink density across a
continuous paragraph. Each region contains actual letters, including light
regions. Dark-region letters are black and bold (weight 700); light-region letters
are regular (weight 400) and gray. Natural font advances, single word spaces,
20-pixel native type, and at least 1.2-em line spacing preserve legibility.
Two or three ordinary text lines can fall within one QR region.

The successful implementation styles **individual letters**, including different
letters within a word. Calling it "bold text" is useful shorthand, but the
confirmed mechanism combines weight and gray color. Whole-word emphasis was
tested separately and did not decode in those four trials. Pure black weight-only
text also did not decode in the recorded trials. Neither should be presented as
the successful mechanism.

The strongest readable story, band-023, uses Courier New, six characters across
and three ordinary lines per QR region, black bold / RGB 120 regular ink, M error
correction without boosting, and a nominal five-module white outer margin. It
has 63 lines, up to 126 characters per line, 1,490 words, and a 2233-pixel native
frame. The original story repeats to fill the field and can end mid-sentence.
No solid QR blocks, invisible images, vector modules, or distorted letter shapes
are behind the text. Generation is deterministic, with no runtime AI or service.

## Retained deliverables

- [Text-first interactive demo](../../phase-02/index.html), including lossless
  styled HTML and unchanged-word TXT downloads.
- [Recorded strongest native frame](../../phase-02/batch-02/raw/band-023-2233.png).
- [Original compressed styled HTML](../../phase-02/batch-02/band-023.html.gz).
- [Exact recipe and text](../../phase-02/batch-02/band-023-layout.json).
- [Native configured-reader results](../../phase-02/reader-options/native-results.json).
- [Export-fidelity and controls](../../phase-02/calibration/receipts.json).
- [Renderer source](../../../../../experiments/prose-qr/flow/layout.mjs).
- [Frozen summary and limits](../../phase-02/README.md).

Existing assets remain at their original locations. [manifest.json](manifest.json)
pins their hashes and the six successful native frames without copying the dataset.
The new uniform-weight experiments do not replace this method or its results.

## Evidence and limits

Configured ZXing 3.1.5 recovered `AQROBAT-TEST` from six unchanged native frames:
band-003, band-009, band-015, band-021, band-023, and band-024. Both baseline
readers failed those frames. The successful settings are GlobalHistogram,
downscaleThreshold 50, and downscaleFactor 2, with QRCode-only formats and
tryHarder enabled. See the
[pinned reader option definitions](https://github.com/Sec-ant/zxing-wasm/blob/v3.1.5/src/bindings/readerOptions.ts).
ZXing performs its own thresholding and downscaling internally; no external
blur, repair, crop, source matrix, or expected payload is supplied to it.
Expected-string comparison happens after independent decoding.

Exported HTML reproduces all six native PNG hashes and decoded payloads exactly
in the recorded Mac/Chrome environment. Two ordinary paragraph controls with
QR-dependent styling removed do not decode. These controls support the encoding
mechanism; they do not establish arbitrary-payload or device reliability.

The style pattern remains visible, the successful text field is large, and only
the short payload `AQROBAT-TEST` is demonstrated. Fonts and fixed line geometry
matter. TXT drops weight/color, so this technique is styled text rather than a
portable plain-text QR. Reflowed reading excerpts have no assigned scan result.
No new phone, physical print, Gmail, or native clipboard acceptance is claimed.
