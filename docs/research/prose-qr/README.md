# Prose-QR first pilot

October 8, 2026. Codex built this bounded experiment on
`codex/aqrobat-foundation`, starting from
`e32e4971b7d2eb50af0ddfa55939c2631b866ed9`. The existing Aqrobat generator,
exporters, extension, and original handoffs were not changed.

**The first pilot is complete; the prose goal is still open.** None of the 474
unchanged word-layout screenshots decoded in either software reader. Some
processed images did decode, which is a useful structural lead, not a phone scan
or a readable-paragraph result. No coherent paragraph was attempted.

Open [the self-contained review board](index.html) for six examples, original
screenshots, selectable-word replays, separate diagnostics, and observation
export/import. Start with its conventional QR controls, then one original word
image. Record Samsung Camera and the dedicated scanner independently. Review
word legibility and how conspicuous the pattern is. A resized image, a live
replay on another device, a copied text block, and a physical print are different
conditions; the board records them separately.

## Results

| Track                     | Unique candidates | Raw screenshots | Exact jsQR | Exact ZXing |
| ------------------------- | ----------------: | --------------: | ---------: | ----------: |
| Uniform strict text       |                49 |             147 |          0 |           0 |
| Typography-assisted words |               109 |             327 |          0 |           0 |
| Total                     |               158 |             474 |          0 |           0 |

The initial fixed grid contained 48 strict and 108 assisted candidates. One URL
follow-up per track was added after processed diagnostics recovered the short
payload. Every candidate was evaluated at 320, 640, and 960 px. Exact recovery
means the returned string equals the expected `AQROBAT-TEST` or
`https://example.com`; recognition of another payload would not count.

Eight cases selected at the first storage pause produced 16 whole-image
diagnostics. jsQR recovered the exact payload in **11/16** and ZXing in
**12/16**. These images were blurred and then downsampled or thresholded. No
known-matrix reconstruction, module repair, crop, or hidden QR underlay was used.
They are not raw-output passes. Selection came from the initial subset, not an
exhaustive ranking of the final grid. The URL follow-ups had no raw recovery;
no processed URL word-layout diagnostics were run.

Conventional QR positive controls for both payloads passed both readers at all
three sizes: six positive images total. Six ordinary-text negative images were
unrecognized by both. Controls are separate from the 474 candidate denominator.
All phone, actual Gmail, recipient email, native-app, and physical-print outcomes
remain **untested in this pilot**. Previous owner observations of Aqrobat symbol
QRs do not establish prose-QR performance.

## What the visible text actually is

Both tracks contain original, real English words drawn from a small curated list.
Examples include `NO`, `MOM`, `WORM`, `ill`, and `life`. Words need not spell the
encoded payload. An ordinary QR matrix determines where dark and light word
tiles go; the words' actual ink is the complete visible candidate.

Strict text uses one standard font, uniform size, weight, color, and line spacing
per candidate. Its variables are word length, font/weight, line packing, and
whether light regions contain low-ink words or spaces. Assisted text uses actual
selectable word spans, with recorded size and spacing differences between
regions. Neither uses custom fonts, deformed glyphs, solid corner substitutions,
color variation, images pretending to be text, or a solid QR beneath the words.

These are repeated word blocks, **not grammatical sentences or coherent prose**.
Blank light regions often leave an obvious QR shape. Word-filled variants remain
highly structured. Tight packing can overlap letters and impair reading. Real-word
membership was checked programmatically; human readability and ordinary-prose
appearance have not been accepted.

Menlo and Courier New were the installed macOS fonts. Canvas measurements record
word/glyph advance, ascent/descent, baseline, ink mass, and cell coverage. Chrome
DevTools font reports confirmed Menlo-Regular, Menlo-Bold, CourierNewPSMT, and
CourierNewPS-BoldMT. Font files were hashed, not redistributed; font version
strings were not queried. Raw renders used Chrome 155.0.8059.39, device scale 1.
Other fonts, platforms, browser scaling, paste destinations, and screen distances
can change the result.

The layout reserves a **nominal four-module border**. Measuring actual pixels
darker than luminance 128 found a minimum below exactly four modules in 452/474
rasters, with a minimum of 3.625 modules. Pixel rounding and glyph overflow both
matter; this count is not a claim that all 452 codes are categorically invalid.
Some original input labels say “clear four-module border”; that label was an
intent, not verified geometry. Use `border-metrics.json` and the board's measured
values. DENSO WAVE calls for a clear four-module margin.
[Official margin guidance](https://www.qrcode.com/en/howto/code.html).

## Decoder provenance

The existing [jsQR](https://github.com/cozmo/jsQR) is pinned at 1.4.0. The new
development-only [ZXing WASM](https://github.com/Sec-ant/zxing-wasm) reader is
pinned at 3.1.5 in the lockfile. The wrapper is MIT; the project documents
Apache-2.0 C++ and BSD-3-Clause zint license layers. The reader's WASM is loaded
from the local installed package, without a CDN or QR service.
`dependencies.json` records package integrity, license hash, and the C++ commit.
The 966,895-byte reader WASM has SHA-256
`aecc1876de036c62c8419f67a5e1a16b1698a325bcd190aa84810d516e263931`.

Both readers received the actual full DOM raster. ZXing uses QRCode format,
`tryHarder: true`, and one-symbol maximum; jsQR attempts both polarities. Passing
these two implementations would still not establish Samsung or print acceptance.
No AI, server, font download, training, or GPU job was used for candidate generation.

## Evidence and repairs

- `pilot-01/` preserves the first calibration failure. Fractional SVG module edges
  left thin seams: jsQR failed the 640-px conventional control while ZXing passed.
  Integer-pixel boundaries fixed the control fixture. No word candidates ran
  before calibration passed.
- `pilot-02/manifest.json` and `metrics.json` preserve inputs (including font file hashes)
  and environment. `run-executed.mjs.txt` is the exact initial runner source;
  its hash matches that manifest. The current runner later fixed final-report
  storage accounting and compresses new replay HTML from the start.
- `results.jsonl` retains 159 receipts for **158 unique candidates**. One partial
  candidate's already-tested 320/640-px frames were reused; only its unattempted
  960-px frame was added. Existing raw PNGs were never selectively rerun or deleted.
- The original runner reached its conservative storage reserve before the full
  grid and could not write its final summary. Each attempted case had already
  been flushed. Replay HTML was then losslessly gzip-archived, verified by
  decompression and hashes, and only duplicate uncompressed files created by this
  task were removed. `replay-archives.json` records those exact-byte checks.
  Continuation completed previously unattempted cases only.
- `analysis.json` is a historical partial summary. **`final-analysis.json` is
  the full-grid summary.** `diagnostic-results.json`, `url-controls.json`,
  `border-metrics.json`, and all raw/diagnostic PNGs retain individual outcomes.
  Formatting calibration JSON changed whitespace only; raw images and archived
  replay-byte custody are preserved.

The pilot stayed below 128 candidates per track and the 60-minute execution /
50-MB evidence limits. Candidate capture used one fresh test browser at a time. The grid finished
about 18 minutes after the start; analysis, board, verification, and handback
are included in the final checkpoint's accounting. No owner browser profile,
other process, original prototype, Splashery file, or private PDF archive was
modified. No new chat, agent, host, Site, publication, or merge occurred.

## What follows only after review

Processed recovery suggests that spatial averaging may help these word layouts;
that is an inference worth testing at different viewing distances, not evidence
that a phone will scan them. Review the raw examples first. If they fail both
Samsung apps, a sensible next structural pilot would enforce measured clear
borders and non-overlapping words before trying new wording. If ordinary-camera
recovery and acceptable reading emerge, a later bounded phase could try sentences.
The current result gives no basis to jump directly to a hidden coherent paragraph.

The project remains on draft PR #1 with npm private and unpublished. Existing
copy/paste and Gmail acceptance, emoji atlas, and migration are separate lanes.
This execution stops at the first-pilot handback. Use the board's exported notes
and reply prompt to select a next step; it does not automatically start one.
