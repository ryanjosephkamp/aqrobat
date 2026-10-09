# Continuous prose QR: second investigation

October 8, 2026. This continuation follows Ryan's rejection of the first pilot's
word tiles, internal holes, and hard-to-read letters. See [OWNER-REVIEW.md](OWNER-REVIEW.md).

There is now a stronger feasibility result: **six unchanged native browser PNGs
with 20-pixel letters recover `AQROBAT-TEST` using configured ZXing 3.1.5**.
The paragraphs contain real selectable characters, ordinary word spaces, and
continuous lines. Ink weight and gray foreground color carry the QR pattern;
there are no solid QR blocks behind the text. This is an experiment, not an
accepted inconspicuous paragraph or a phone-compatible product feature.

## What changed

The new renderer gives every part of the QR field actual letters rather than
leaving light modules empty. It uses natural font advances, at least 1.2-em line
spacing, 20-pixel native type, and whole words. A later batch uses two or three
ordinary text lines per QR region. It tests fabricated words, dictionary words,
and an original story repeated to fill the field. Story repetition and endings
mid-sentence remain limitations; semantic quality has not been accepted.

The most useful successful example is **band-023**: Courier New, a fixed story,
black bold dark regions and RGB 120 regular light regions. Its source has 63
lines of up to 126 characters; the full frame is 2233 pixels square. That is
readable native typography, but a large text block. Smaller, more usual paragraph
layouts remain unsuccessful. Pure black typography also remains unsuccessful.

## Evidence so far

| Family                                             | Completed layouts | Unchanged frames | Baseline jsQR exact | Baseline ZXing exact |
| -------------------------------------------------- | ----------------: | ---------------: | ------------------: | -------------------: |
| Initial continuous text                            |                32 |               64 |                   0 |                    0 |
| Two/three lines per QR region                      |                24 |               72 |                   0 |                    0 |
| Ordinary rectangular paragraphs                    |                 4 |                8 |                   0 |                    0 |
| Extra display conditions for four retained layouts |             0 new |               72 |                   0 |                    0 |

There are 60 completed layouts, 144 initial raw frames, and 72 additional
display views. Extra views are not new paragraphs. Baseline options are frozen
in the manifests; they are not every possible setting of either library.

| Separate investigation                         | Inputs / attempts | Exact result           |
| ---------------------------------------------- | ----------------- | ---------------------- |
| Configured ZXing on native second-batch frames | 24 / 72           | 6 attempts; 6 frames   |
| Configured ZXing on small additional views     | 72 / 216          | 13 attempts; 12 frames |
| Configured ZXing on native first-batch frames  | 32 / 96           | 0                      |
| Configured ZXing on rectangular frames         | 8 / 8             | 0                      |
| External blur/downsample/threshold diagnostics | 136 probes        | jsQR 6; ZXing 15       |

All six native successes use grayscale typography: band-003, band-009,
band-015, band-021, band-023, and band-024. The successful native configuration is:

```js
{
  formats: ["QRCode"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
  binarizer: "GlobalHistogram",
  downscaleThreshold: 50,
  downscaleFactor: 2
}
```

These are standard [pinned reader options](https://github.com/Sec-ant/zxing-wasm/blob/v3.1.5/src/bindings/readerOptions.ts).
The decoder receives the unchanged raster, then performs its own thresholding
and downscaling internally. The expected payload is compared **after** decoding;
the decoder receives neither the expected string nor the source QR matrix.
This result is separate from externally processed diagnostic images and from
baseline reader results. It is **not** evidence of Samsung Camera scanning.

[Calibration receipts](calibration/receipts.json) show that exported gzip HTML
reproduces all six native successful PNGs byte-for-byte and recovers the payload.
Conventional positive controls at 640 and 960 pixels pass. Two matching ordinary
paragraph controls with QR-dependent styling removed produce no QR result.

The first batch stopped before flow-033 capture because a natural Courier New
bold glyph overhang of 0.5078125 pixels exceeded a conservative 0.5-pixel gate.
The other 19 cases were not attempted. This is a conservative structural
rejection, not a failed decoder trial or proof that naturally spaced letters
overlap. The executed first-batch sources are archived alongside its manifest.

## Limits and custody

No owner scan, physical print, native clipboard, Gmail, or received-email test was
performed for this continuation. Ryan's expectation that the old samples would
scan is not recorded as a pass. Font-specific browser captures establish only
their recorded environment. Plain text loses the gray and weight styling;
reflowing or pasting into another font changes the encoded field.

Existing product source, extension, private npm package, earlier prototypes,
first-pilot evidence, Splashery, and the private PDF archive are preserved. New
work is confined to this directory and `experiments/prose-qr/flow/`. One fresh
task-owned browser runs at a time. No new dependencies, agents, chats, font
downloads, release, migration, or additional host were used. PR #1 stays draft.

## Next work

Shorter ordinary line lengths, less conspicuous typography, black-only contrast,
font portability, and independent default-reader/phone recovery remain open.
The prose goal is not complete. A readable text-first handback and verification
receipt are being added to this milestone; retained experiment outputs will not
be replaced.
