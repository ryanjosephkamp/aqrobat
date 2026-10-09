# Ordinary-reader and phone feasibility

October 9, 2026. **The prose QR goal remains unsolved.** Ryan reports that the
previous full PNG examples fail both Samsung Camera and Samsung's dedicated
Scan QR code tool. The individual cases, attempt counts, viewing dimensions,
and distances are unspecified. This is an owner-reported negative, not a new
109-case phone test. The prior styled-prose and plain-ASCII results remain
separate configured-software feasibility results.

This phase tests unchanged output pixels using jsQR 1.4.0 and ZXing WASM 3.1.5.
The main ZXing probe supplies only `formats: ["QRCode"]`; it leaves binarizer,
downscale, and other settings at defaults. The earlier baseline probe is also
retained separately. None of the three probes recovered a candidate payload.
Expected content is compared after decoding; readers receive neither source
matrices nor expected content. The software screen does not establish phone
behavior, but a failed screen prevents another premature phone-ready handback.

## Results

[verification-final.json](verification-final.json) reconciles hashes, recipes, dimensions,
executed source versions, counts, and original product downloads. The
[status page](index.html) is a self-contained reading handback, not a successful
prose generator or a request to scan more failed examples.

| Batch        | Planned | Retained and decoded | Change                                                                     |
| ------------ | ------: | -------------------: | -------------------------------------------------------------------------- |
| contrast-01  |      24 |                   24 | Story text; gray, modest blur, and display size                            |
| dense-01     |      22 |                   22 | Natural proportional advances; Impact/Arial Black; mixed/upper case        |
| lowpass-01   |      24 |                   17 | Explicit strong blur; native and smaller presentation                      |
| tight-01     |       6 |                    6 | Regular black fabricated words; tighter leading, glyph-height filter       |
| serif-01     |       6 |                    6 | Further regular black font/density combinations                            |
| decorated-01 |       4 |                    0 | Source-line assertion stopped before capture                               |
| decorated-02 |       4 |                    4 | Visible underline/overline/strike styles; corrected preformatted container |
| single-01    |       8 |                    8 | Native 20-pixel text, one line per QR region                               |
| quiet-ink-01 |       8 |                    3 | Faint gray 238/246; persistence reserve stopped case 4                     |
| stroke-01    |       4 |                    4 | Visible outlines around dark glyphs; readability regressed                 |
| small-01     |       6 |                    6 | Actual small browser text presentation, 70–280 pixels                      |
| display-01   |       8 |                    8 | Browser-resampled views of two prior retained plain-ASCII PNGs             |
| justified-01 |       1 |                    1 | Ordinary line justification; natural word-space expansion                  |

There are **101 new text renderings and eight PNG display views: 109 candidate
views, 327 decoder attempts, zero exact recoveries**. Fourteen conventional
controls recover their exact payloads with all three probes (42 control attempts).
Controls include two payloads; candidate text batches use `https://example.com/`,
and the PNG display probe also uses `AQROBAT-TEST`. No successful or failed case
was deleted. The 16 planned but uncompleted text cases are not decoder failures.

Native, scaled, blurred, and styled views are distinct. Small views have effective
font sizes down to fractions of a pixel; they are not evidence of legible letters.
The proportional track uses weight 400 everywhere, but Impact and Arial Black
are intrinsically heavy font faces. That is not proof of the ordinary regular
black-text goal. Light gray 246 is a substantial visibility compromise.

## What the diagnostics establish

The [first locator diagnostic](locator-diagnostic/receipts.json) exposes the
installed jsQR binarizer/locator read-only, without modifying its algorithms or
inputs. The conventional control locates the correct 25-module geometry; the
text samples produce unrelated locations/dimensions. Binarized diagnostic images
are not candidates and are never counted as decoded output. Its
[errata](locator-diagnostic/ERRATA.md) corrects one gray-value label while retaining
the original receipt.

The [geometry diagnostic](geometry-diagnostic/receipts.json) narrows the problem:
in quiet-3, only 2.3% of pixels in intended light regions become black, but intended
dark regions contain only 44.1% black pixels. Only 64.2% of intended dark module
centers land on black pixels. Outlining in stroke-2 raises dark coverage to 59.6%
and dark center coverage to 82.5%, yet the locator still returns the wrong geometry
and all independent probes fail. The intended geometry is 25 modules; returned
dimensions are 29/29 and 37/33 respectively, with wrong finder positions.

Those measurements use the source matrix **only after binarization for diagnosis**.
They never force corners, repair pixels, or give the source matrix to a decoder.
They are an observation about two renderings, not a universal impossibility
result or a description of Samsung's implementation.

Local thresholding was a useful hypothesis: both the opened
[ZXing C++ reference](https://raw.githubusercontent.com/zxing-cpp/zxing-cpp/v2.3.0/core/src/HybridBinarizer.cpp)
and [jsQR source](https://github.com/cozmo/jsQR/blob/master/src/binarizer/index.ts)
show eight-pixel regions and a dynamic-range constant of 24. The jsQR diagnostic
actually uses the installed 1.4.0 bundle and records its hash; the linked jsQR
source is a current reference, not a pinned 1.4.0 source tag. The C++ reference
is v2.3.0, not a claim about the exact C++ revision inside the installed WASM.
Faint text largely avoids light-region noise in the measured case, but does not
solve the fragmented dark pattern. The next objective should include finder
geometry and actual thresholded glyph structure, rather than only average ink
mass. Font size, line spacing, spaces, and stroke geometry remain coupled.

Natural whole-word wrapping also leaves unused space at right edges. The final
justified-01 case expands ordinary word spaces to fill each line, then maps glyph
colors using those actual advances. This keeps single source spaces and the same
story, face, size, and weight. It removes that ragged edge but still fails all
three probes; filling the line alone is not sufficient. The per-line expansion
is recorded in the layout receipt. This styled layout is not a plain TXT proof.

The earlier [verification.json](verification.json) is preserved as the checkpoint
before this final one-case probe; it records 108 views and 13 controls. The final
receipt adds the justified case without rewriting earlier trial evidence.

## Custody and limits

Fresh batch directories retain manifests, gzipped native HTML, recipes, PNGs,
raw decoder outputs, controls, and abort receipts. The strong-blur batch reached
the evidence reserve before case 18's PNG could be saved or decoded. Cases 19–24
were unattempted. The faint-text batch similarly stopped before retaining or
decoding case 4; cases 5–8 were unattempted. The first decoration batch failed
source-line fidelity before its first raster capture. A fresh preformatted
container fixes the harness; it does not convert that aborted batch into scans.

Executed source snapshots retain earlier capture budgets, line-fidelity checks,
and leading implementations when the source changed. Installed font metrics
record actual platform faces. No font files or dependencies were downloaded.
The source/evidence/reading handback are checked against a 40-MB logical-file
safeguard, excluding Git object storage. One task-owned headless browser ran
at a time; each browser was closed. No owner profile or other job was stopped.

Product unit tests pass 18/18. Product source, extension, version 0.4.2, all three
original downloads, previous experiments, and original prototypes are unchanged.
Earlier product build/site/text-browser checks remain earlier disposable-copy
checks, not new runs in this phase. Native clipboard, Gmail, TextEdit, physical
print, and new phone observations were not collected. npm remains private and
unpublished; PR #1 remains draft. No migration, release, new host, new chat/agent,
messages to others, merge, Splashery or PDF archive edits.

## Next bounded investigation

The status handback passes export-byte checks, has no page errors or automatic
external requests, and has no page overflow at 390 pixels. Desktop and phone-width
reading screenshots were inspected; these are browser views, not phone scans.
Formatting checks normalized eight small PNG-display replay documents while
preserving their original executed HTML snapshots. The subsequent
[replay check](replay-checks.json) reproduces six of eight captured PNG hashes
using the original 800-pixel viewport; the raw `setContent` comparison does not
establish stable equivalence. The initial assertion failure and executed source
are retained. This remains a replay-harness limitation, not a new scan result;
the retained PNGs and original HTML snapshots remain authoritative evidence.
No new decoder attempts are counted for those replays.

The next promising step is to measure glyphs through the ordinary binarizer and
optimize whole-word placement around finder geometry, with a frozen font and
native readable size. Keep a separate styled-prose lane and uniform-black ASCII
lane. Do not compensate by adding hidden QR blocks, invisible letters, forced
decoder corners, special reader settings, or unreadable compressed text.

Use a small preregistered batch with ordinary controls, preserve every outcome,
and show a phone candidate only after its unchanged, readable output passes
independent default readers. A pass would still need Ryan's exact-payload phone
review. Meaningful coherent prose, inconspicuous appearance, normal phone scans,
and portable text remain open. The [checkpoint](CHECKPOINT.md) preserves a safe
continuation; the goal is not complete because this research block ended.
