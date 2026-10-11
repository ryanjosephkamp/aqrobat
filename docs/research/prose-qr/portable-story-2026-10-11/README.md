# Smaller, selectable prose QR

Ryan reports that **both Samsung Camera and Samsung “Scan QR code” scan the smaller mixed-case HTML and PNG, the black-only HTML, and the selectable Letter PDF** on a Galaxy S25 Ultra. The black HTML and PDF needed a suitable viewing distance. Exact displayed phone links and physical print remain unreported.

[Complete visual guide](/Users/noir/Documents/aqrobat/docs/research/prose-qr/portable-story-2026-10-11/index.html) · [Offline generator](/Users/noir/Documents/aqrobat/docs/research/prose-qr/portable-story-2026-10-11/workbench.html) · [Accepted Letter PDF](/Users/noir/Documents/aqrobat/docs/research/prose-qr/portable-story-2026-10-11/examples/page-impact-letter.pdf)

## Practical starting points

| Exact saved example                                                                                  | Text body      | Type                                | Phone evidence                         | Native software evidence                                     |
| ---------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| [Mixed-case Impact HTML](examples/page-impact-mixed.html) / [PNG](batch-01/page-impact-preserve.png) | 600px / 6.25in | 12px = 9pt; 50 rows                 | Both apps, both surfaces               | Vision exact URL; ZXing/jsQR/OpenCV/ZBar negative            |
| [Black-only Avenir HTML](examples/black-weight-mixed.html)                                           | 600px / 6.25in | 10px = 7.5pt; Heavy/UltraLight      | Both apps; distance adjusted           | Vision exact URL; ZXing/jsQR/OpenCV negative                 |
| [Letter selectable PDF](examples/page-impact-letter.pdf)                                             | 450pt / 6.25in | Impact 9pt / 9pt leading            | Both apps on screen; distance adjusted | Vision exact at native96dpi and192dpi; native300dpi negative |
| [Avenir Regular-gray HTML](examples/avenir-regular-gray96.html)                                      | 600px / 6.25in | 7.5pt; black Heavy / gray96 Regular | Not reported                           | Vision exact URL; ZXing/jsQR/OpenCV negative                 |

The original 4,000px story body becomes a 600px body: 6.7 times narrower and about 1/44 of the area. The accepted Impact version contains 1,136 words, sixteen complete copies of the 71-word source, with at most125 characters per row. Its full840px PNG includes white margins; inserted at96px/in that full square is8.75in wide. Use the actual Letter PDF or [editable RTF](examples/page-impact.rtf) for a standard document page.

Smaller Vision positives include a550px field at9pt and a500px field at7.5pt. Neither has phone acceptance. Tested12pt type in a600px field failed; the successful two-line-per-region12pt construction needed800px body width. Readability, width and enough letter ink per QR region compete.

## Fonts, case, ink and words

- Mixed case and lowercase work in saved examples. All caps is unnecessary.
- Impact, Avenir Next Condensed and PT Sans Narrow have native Vision positives. The tested Arial/Helvetica/DIN and several mixed-case Georgia/Arial Black recipes failed. These are recipe-specific results.
- Both requested Impact weights can be Regular400 when color supplies the pattern. Its native face is intrinsically heavy; different CSS weight requests often produced identical pixels.
- In the tested Impact fixture, RGB0/160 read;0/152 and0/144 failed. RGB32/180 read;64/180 failed. These are sample boundaries, not a universal contrast threshold.
- Avenir Heavy/UltraLight worked with both colors black. Heavy/Regular both black failed; Heavy black/Regular gray96 worked. Uniform plaintext removes this intended styling signal.
- Four complete-copy all-black Avenir HTML word streams read in Vision: original, a new story, a narrow-letter-heavy stream and a broad-letter-heavy stream. The comparable Impact generator cases were mixed: four of six new word/payload cases read. Arbitrary prose is still unproven.
- Native resolution changes were nonmonotonic:2× Impact HTML read,3× failed;192dpi PDF read,300dpi failed. None of these changes repaired the three primary-reader negatives.

**No page-sized candidate meets the unchanged two-software-reader promotion rule.** Phone acceptance is recorded independently. The original large story retains ordinary ZXing plus Vision recovery. The one new large comparison also recovers in those two readers; it is not a page-sized result.

## Use the generator

Open [workbench.html](workbench.html) locally. It is one offline file using the unchanged pinned local encoder and license, with no AI or server at runtime. Enter exact payload and prose, choose an installed font and starting recipe, generate, save the recipe/source, then scan the actual exported output.

The renderer keeps complete words, order, punctuation and case. Repetition is explicit and uses complete source copies only. One exact1,136-word nonrepeated input also reproduced the accepted native PNG. Short paragraphs do not fill this fifty-row layout without repetition; the tool rejects insufficient fill, overflow, unavailable fonts, excessive word spacing and vertical overlap instead of silently changing the input. It supports Latin letters, precomposed accents, digits and punctuation, and rejects other scripts or combining marks.

Raw source TXT and recipe retain input whitespace, including imported CRLF. Displayed/selected text normalizes whitespace into wrapped whole-word rows. HTML, RTF, original TXT, wrapped TXT and recipe are separate exports. A new generated output is explicitly labeled untested.

Actual TextEdit opening of the original RTF showed9pt Impact and exact9pt line spacing. HTML transfer through CUA changed font size or leading. A receiver-specific9px CSS profile restored9pt and fifty rows, but its native render still failed all tested readers. [Native-app notes](TEXTEDIT-NOTES.json) retain the failures. Word, Google Docs, other operating systems and physical printing were not tested.

## Denominator and checks

[Candidate JSON](candidate-ledger.json), [CSV](candidate-ledger.csv), [all reader calls](reader-ledger.json), and [identical-image groups](duplicate-native-groups.json) reconcile130 planned candidate slots,105 captured candidate slots,95 distinct candidate native PNGs,25 slots without images,8 conventional controls and113 exact candidate/control repeats. One stable iframe screenshot was rejected before readers. Different requested Impact weights sometimes rendered identical pixels; actual calls remain counted without treating duplicates as independent image evidence.

There are432 ordinary research calls:109 each in ZXing, jsQR and OpenCV,97 in Vision and8 in ZBar. No reader receives an expected payload, supplied corners or externally transformed pixels. Exact payload comparison happens afterward. All returned payloads in this run are exact; empty returns remain failures. The Vision subset leaves untested cells explicit. Required product regression checks add at most39 calls, conservatively471/480 combined. Controls recover in their tested readers.

`npm test`, `npm run build`, `npm run test:browser` and `npm run test:text-browser` pass in a disposable copy. Full `format:check` reports641 warning paths at that snapshot:321 historical,320 current research/evidence paths. Exact raw evidence was preserved. The maintained workbench source passes its separate formatting check. [Results](repository-checks/results.json) and [format analysis](repository-checks/format-analysis.json) are retained; optional installed-extension and native product-text checks were not run.

The [final tool check](workbench-final-check-05/summary.json) compares all twelve prior HTML exports exactly, checks two UI presets, selectable popup, raw CRLF source/payload import, input edits, MIME exports with a test-owned clipboard stub, stale exports and five rejection paths. It makes no new image captures or reader calls. Prior setup failures and UI-check repairs remain in [method notes](METHOD-NOTES.md).

## Acceptance and custody

[Initial acceptance](OWNER-ACCEPTANCE.json), [device details](OWNER-ACCEPTANCE-DETAILS.json), [small HTML/PNG acceptance](OWNER-SMALL-ACCEPTANCE.json), and [black/PDF acceptance](OWNER-BLACK-PDF-ACCEPTANCE.json) preserve the owner's exact words and identify the saved bytes. There are ten positive app/surface cells and one negative across six surfaces. No repeated-attempt rate or independent algorithm count is inferred. The original HTML's Samsung Camera failure remains recorded.

The run began16:55:49Z October11,2026, with absolute stop19:55:49Z and no renewed allowance. The initial backup checkpoint is`a0f441c8bc94c0c9569b992989cc09b669267517`. [Final custody](custody.json), [delivery seal](delivery-seal.json), and [final backup receipt](backup-final.json) record closure. Continue`codex/aqrobat-foundation` and OPEN draft PR#1; npm remains private. No Site/deployment/audience, agent, chat or messaging action occurred. Owner context and old evidence stay intact. Future work requires the owner's selection; no automation or continuation was created.
