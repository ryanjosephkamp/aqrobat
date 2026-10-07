# How character QR works

1. **Encode the exact payload.** Nayuki's standard QR encoder chooses a matrix,
   adds error correction, and applies a mask. Non-ASCII payloads use UTF-8 with
   ECI 26. Emoji in the payload and emoji used as ink are separate choices.
2. **Preserve the matrix.** Aqrobat keeps four clear modules around every edge.
   Each dark module is drawn with the selected character repeated across and
   down; each light module uses spaces. This includes the corner markers.
3. **Measure the font.** ASCII/block rows use measured monospace metrics to
   reproduce the earlier prototype layout. Other glyphs use measured bounds
   and fixed cell positions on Canvas. All dark ink comes from `fillText` and
   optional `strokeText`; only the white background is a rectangle.
4. **Observe the image.** A scanner must recognize the light/dark module pattern
   from the rendered artwork. The matrix can be valid while its presentation
   fails. More error correction does not repair illegible corner markers or a
   broken quiet border.

The standard has versions 1–40, from 21×21 to 177×177 modules, in steps of four
per side. That is separate from export pixel width. The page allows any integer
width from 200–1536; these are resource/UX limits, not limits of the QR format.
The former three sizes were convenient test points. Payloads are capped at
1024 UTF-8 bytes to keep text and SVG exports bounded. [DENSO WAVE](https://www.qrcode.com/en/about/version.html),
[Nayuki library](https://www.nayuki.io/page/qr-code-generator-library).

Boosting ECC raises the actual level only when it fits without increasing the
chosen matrix size. Both requested and actual levels are shown and stored.
Disable boost for an exact requested level. Increasing ECC can otherwise require
more modules, which makes each module smaller at a fixed output size.

A whole emoji may contain multiple Unicode code points: modifiers, variation
selectors, a flag pair, or a joined family. `Intl.Segmenter` validates one
grapheme, with control/spacing safeguards. This is not a promise that an installed
font can draw that sequence or that its artwork scans. [Unicode emoji specification](https://www.unicode.org/reports/tr51/).

**Portability:** PNG preserves the generated pixels. The HTML print sheet embeds
that PNG and includes selectable text. TXT can change shape when fonts, emoji
widths, line spacing, or wrapping change. SVG uses glyph positions and a font
approximation without embedding fonts; it is not pixel-identical to Canvas.
An SVG or pasted-text result needs its own scan test.

No AI draws the matrix. Models can describe a desired style, choose parameters,
call the CLI, and analyze test records. This helps usability; it does not give
the model the ability to guarantee scanning. Glyph artwork is decoration, not
secrecy: its standard QR payload can still be decoded by software.
