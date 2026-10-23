# All-letter styled-story result

The exact URL **https://example.com/** is recovered from the unchanged native all-letter PNG by ordinary **ZXing 3.1.5** and ordinary **macOS Vision revision 4**. jsQR 1.4.0 and OpenCV 4.13.0 return no URL. The short AQROBAT-TEST case also recovers in ZXing and Vision. This meets the run's two-reader software promotion rule. No camera or print acceptance is claimed.

[Visual handback](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/index.html) · [Selectable standalone HTML](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/story.html) · [Native PNG](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/batch-15/story-url.png) · [Source TXT](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/batch-15/story-url.txt)

## What changed

The original band-023 mixed-case Courier 20px field is 2,233px square and about 1,490 words. In this run its saved PNG recovers only with the historical configured ZXing call; the three ordinary primary readers remain negative. The earlier phase 14 ordinary ZXing success is separately reproduced, but its repetitive BOB/i word bank is not natural prose.

The new all-letter version uses native 20px Impact, all capitals, 20px leading, light gray (RGB 180) letters, whole-word justification and 160px QR cells. Its 5,600px page contains a 4,000px text field, 200 lines and 17,040 words: 240 ordered repetitions of the original 71-word paragraph. It ends at the paragraph's final “US.” These are actual selectable characters. The captured/exported document has 91,162 visible elements, no images/canvas/SVG, no dark backgrounds, no shadows, no filters and no invisible duplicate layer. Generation uses the existing pinned local encoder and measured local fonts, with no server or AI at runtime.

The evidence suggests that heavier native letter ink and more letters per QR cell let the ordinary reader's scaling preserve the overall QR pattern. This is an inference from the controlled size/font comparisons, not an internal trace of every reader stage. The cost is a much larger, denser, all-capital field. Letters are readable at their native 20px size; fitting the entire page on a small display makes them tiny. The original mixed-case Courier appearance remains unqualified under ordinary settings.

## Ordinary reader evidence

| Input                      | ZXing        | macOS Vision | jsQR       | OpenCV     |
| -------------------------- | ------------ | ------------ | ---------- | ---------- |
| All-letter short, 4,960px  | AQROBAT-TEST | AQROBAT-TEST | no payload | no payload |
| All-letter URL, 5,600px    | exact URL    | exact URL    | no payload | no payload |
| Standalone-file URL replay | exact URL    | exact URL    | no payload | no payload |

ZXing uses readBarcodes(image) with the options argument omitted. jsQR uses jsQR(rgba,width,height) with options omitted. OpenCV uses a default QRCodeDetector. Vision uses a default VNDetectBarcodesRequest and URL handler. Readers receive no expected strings or supplied corners; exact strings are compared after return. Native input PNGs are losslessly decoded, with no external resampling, blur, thresholding or crop. The one detail crop is inspection-only and was never decoded.

Raw native URL receipts: [ZXing](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/batch-15/story-url-zxing.stdout.txt), [Vision](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/vision-03/results.json), [jsQR](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/batch-15/story-url-jsqr.stdout.txt), [OpenCV](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/batch-15/story-url-opencv.stdout.txt). ZXing reports UEC 0.90 for the URL and 1.00 for the short case. The pinned upstream code defines UEC as the unused correction fraction, so a larger value means more correction capacity remained in that decode; it is not a cross-device reliability measurement. See [ReedSolomon.h](https://github.com/zxing-cpp/zxing-cpp/blob/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/ReedSolomon.h#L35-L46) and [the implementation](https://github.com/zxing-cpp/zxing-cpp/blob/2ecec3f5be0ee803f6e14a5a2c7028c0cfe525b4/core/src/ReedSolomon.cpp#L45-L54).

## Standalone-file replay

The exported HTML bytes exactly match the captured HTML archive, and browser Selection exactly matches the 90,959-character TXT. A fresh file-origin replay and its repeat agree byte-for-byte with each other. They differ from the earlier setContent native PNG at 24 antialiased pixels, maximum channel difference 15, at x799 just outside the text field. The initial exact-PNG assertion stopped; its source and outputs are retained in [ERRATA](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/export-verification/ERRATA.md). No pixel repair was made. The unchanged replay separately recovers the exact URL in ordinary ZXing and Vision; jsQR/OpenCV remain negative. The detail crop matches the corresponding primary pixels exactly. Portable styled paste, native-app reflow and other font/platform environments remain untested.

## Full denominator and limits

There are 75 unique completed native candidates: 33 all-letter and 42 ornamented, each with an exact immediate repeat; 12 native resource captures and 12 conventional captures each also repeat exactly. One source Selection failure stopped an earlier 12-slot batch before its first candidate PNG: one setup failed and 11 further slots were unused. The corrected source is a separately frozen batch. All failures and unused slots remain. The standalone verification adds one full replay plus repeat, and one inspection crop. There are 291 recorded reader calls: 290 ordinary and one historical configured baseline. Passive binarizer/locator/extractor diagnostics made no decoder calls and are separate from this denominator.

The initial 64-candidate/128MB limits were amended prospectively for the recorded hypotheses to 75 candidates/160MB, retaining the original clock deadline. The resource ceiling progressed 8→9→10→11→12. All plans and exact invoked source archives remain. No unchanged failed native decoder input was selectively retried. A [75-row ledger](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/index.html#ledger) exposes negative results alongside successes. The clearer ornamented fallback [HTML](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/ornamented-story.html) and [PNG](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/batch-13/final-2.png) recover in ZXing and jsQR but visibly add square glyph ornaments. The all-letter result is the primary handback.

Phone camera, Samsung Scan QR, physical print, fit-to-screen sizes, arbitrary paste destinations and independent owner aesthetic acceptance remain open. The earlier owner-reported Samsung failures have unspecified case/attempt counts and are preserved as earlier evidence, not generalized to this new image.

## Verification and custody

Repository unit tests, build, browser checks, text-browser checks and three research layout invariants pass in a disposable copy. Current new JavaScript formatting passes. Full format checking reports 207 original warnings and 313 at the verification snapshot; 106 additions are frozen evidence/configuration/protocol bytes that were preserved. No formatter was run on captured HTML, frozen JSON or original evidence. Optional installed-extension and native-app paste checks were not run for this research candidate. [Check receipts](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/verification/results.json) and [temporary-copy cleanup](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/verification/cleanup.json) are retained.

All 11,013 protected files (389,103,197 bytes) retain their original SHA256 and size. HEAD remains a7ceea7345cbac6d1dec05a9042510508a3dc07a, branch codex/aqrobat-foundation, draft PR #1 remains OPEN and draft at the same head, npm private:true remains, and no commit/push/deployment/Site/audience action occurred. Owner context, prior evidence, original generated artifacts and Site identity records remain intact. No agents, new chats or messages were started. [Audit](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/audit.json) and [final file hashes](/Users/noir/Documents/aqrobat/docs/research/prose-qr/styled-story-2026-10-11/delivery-seal.json) bind the handback to its evidence.

The initial evidence inventory remains a historical snapshot. Final handback copy edits, UI checks and current hashes are recorded separately in delivery-seal.json. The native images, HTML, text, frozen protocols, configurations and raw reader receipts were not edited.
