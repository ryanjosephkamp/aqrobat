# Text that keeps its shape

Aqrobat 0.3.0 has two text paths. Both use actual characters, without an image or
hidden solid QR behind them. Image exports and the image comparison grid remain.

**Copy text** writes HTML and plain text to the clipboard. Rich text editors can
retain the inline font, weight, spacing, and cell layout; plain-only editors
receive the improved TXT representation. **Plain text** explicitly copies only
that representation. Clipboard permission or unsupported formats can block
copying; TXT, Text HTML, and RTF downloads remain available.
[ClipboardItem formats](https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem).

## Choose the output for the destination

| Destination        | Start with                        | What to verify                                                             |
| ------------------ | --------------------------------- | -------------------------------------------------------------------------- |
| Website            | Copy website HTML / Text HTML     | Inline styles survive, rows stay aligned, exact payload scans              |
| Blog / Substack    | Copy text into a rich text editor | The editor may strip styles; actual saved post needs testing               |
| TextEdit           | RTF document                      | Font fallback, alignment, paper/page size; scan the opened document        |
| Plain TextEdit TXT | Menlo; emoji at 30 pt or larger   | Preserve all blanks/newlines, disable wrapping, provide enough width       |
| PDF document       | Print the Text HTML file to PDF   | Code fits the page, characters remain selectable where supported, scan PDF |
| Email              | Copy text into rich text compose  | Test both sent and received messages; clients may remove styling           |

No receiving editor is forced to honor clipboard HTML. Plain TXT cannot carry
font, bold weight, line height, character-specific font sizes, or outline ink.
It cannot reproduce every image identically across arbitrary fonts and editors.
Aqrobat's text acceptance remains open for Ryan's real destination tests.

## What changed in plain text

The image renderer positions glyphs on a square canvas. Earlier TXT repeated each
glyph with ordinary spaces, which broke rows when an emoji occupied more width
than a space. Ordinary 1×1 letters also looked tall with normal document line
spacing. The separate `aqrobat-text-v1` packing now uses:

- Narrow palettes: at least two characters across for each row per module.
- Wide palettes: U+3000 full-width spaces, with horizontal repetition adapted
  to the selected density and normal line spacing.
- Mixed palettes: five narrow characters or three wide characters per module,
  with three rows, scaled for higher density. This approximates the measured
  Menlo ratio of 0.602 em for narrow characters to 1 em for wide characters.

Whitespace and whole emoji sequences are preserved. Packing changes text density,
not the QR matrix or the image's density. The UI displays the actual text packing.
The wide-glyph classification is approximate, not a Unicode width guarantee;
receiving fonts still determine the shape, especially outside ASCII and emoji.

In this Mac's native AppKit measurement, Menlo at 15 pt gave a rocket a 20 pt
advance and U+3000 a 15 pt advance; at 30 pt both advanced 30 pt. This nonlinear
small-emoji behavior is why plain TextEdit emoji TXT should start at 30 pt.
That is local evidence, not a claim about all Macs or fonts.

## Formatted text and RTF

Formatted narrow text uses explicit font and line spacing. Emoji/mixed HTML uses
fixed table cells with actual text spans. Font sizes come from the unchanged
canvas renderer, measured in a scratch canvas that is never embedded in output.
Inline HTML styles improve website/editor transfer, but stroke styles and fonts
may be removed or substituted. Text HTML prints at 150 mm including quiet space;
the on-screen file retains the chosen export width and may scroll horizontally.

RTF stores Unicode characters, bold weight, exact line spacing, and fixed tab
positions (or narrow text rows). It reserves extra space for macOS's small-emoji
font fallback. RTF does not reproduce canvas outline ink. Its page can be larger
than ordinary paper for large codes; use the Text HTML print layout for a normal
page. Font substitution and mixed palettes need destination-specific review.

The full plain-text box now fits its complete contents automatically and uses
the selected font. A separate optional text comparison grid uses actual text
nodes with normal 1.2 line spacing. Text scan observations include output kind
and layout version. Old observations without an output kind remain image results;
no previous image scan passes are assigned to text.

## Package and CLI

```js
import { generate } from "aqrobat";
import { plainText } from "aqrobat/text";
const qr = generate("https://example.com", { glyph: "🤣.☄️1:a" });
console.log(plainText(qr).text);
```

The CLI `--format text` uses improved packing. `qr.rows` and `qr.text` from the
core remain the legacy image-row serialization for compatibility; use
`plainText(qr)` for new copyable output. The text module has no runtime dependency.
Only `textMetrics(qr)` needs a browser Canvas; HTML/RTF helpers take metrics as an
explicit argument. No AI is involved in encoding or arranging the characters.

## Keeping your work

Changing the recipe or recording a scan observation attaches an unsaved-work
warning. Export Recipe clears recipe changes; Export results clears observation
changes. Exporting an image or TXT does not save the recipe. Payloads/results
are not silently stored. Browsers choose the warning's wording, and some mobile
exit paths do not fire it; export before leaving.
[Browser beforeunload behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).
