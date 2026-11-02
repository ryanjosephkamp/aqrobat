# How character QR works

1. **Encode the exact input.** Project Nayuki's standard QR encoder picks a
   matrix size, adds error correction, and applies a mask. Input outside ASCII
   is encoded as UTF-8 with ECI 26. Emoji in the payload and emoji used as ink
   are separate choices.
2. **Keep the matrix.** Aqrobat keeps four blank squares around every edge, the
   quiet zone readers need. Characters take turns through the dark squares in
   the order you typed them, left to right and top to bottom. Each light square
   is a blank. The corner markers are drawn the same way, unless you give
   their frames, their centers, or the light squares characters of their own
   under Parts.
3. **Measure the font.** Monospace rows use measured font metrics so squares
   stay square. Emoji and mixed characters are placed in fixed cells sized from
   each character's measured bounds. All dark ink is real text; only the white
   background is a rectangle.
4. **Shape it for the destination.** The same characters become formatted
   text, plain text, a code block, or an image, depending on where they are
   going. See [paste formats](text-portability.md).
5. **Scan the result.** A camera has to tell the dark squares from the light
   ones in the artwork it sees. A valid matrix can still fail when the
   characters are thin, small, colorful, or spaced apart. More error correction
   does not fix unreadable corner markers or a broken quiet zone.

## Sizes

QR codes come in versions 1 to 40, from 21 × 21 to 177 × 177 squares, growing
four squares per side at a time. That grid size depends on the input and the
error correction, not on the image size. Image exports can be any width from
200 to 1536 pixels; those are practical limits, not limits of QR codes. Input
is capped at 1024 bytes so text exports stay manageable.
[QR versions (DENSO WAVE)](https://www.qrcode.com/en/about/version.html) ·
[the encoder](https://www.nayuki.io/page/qr-code-generator-library).

"Raise error correction when it fits" moves to a higher level only when that
does not make the matrix bigger. The requested and actual levels are both shown
and saved. Turn it off to keep the level exactly as chosen.

## Characters and emoji

A single emoji can be several code points: skin-tone modifiers, variation
selectors, flag pairs, or joined families. Aqrobat splits input into whole
characters with `Intl.Segmenter`. Repeats and spaces are ignored for drawing.
Control characters, invisible formatting, malformed Unicode, and empty input are
refused. The character list is limited to 4096 bytes and 64 bytes per
character. Font support varies, so new or rare emoji can look different, or not
appear, on other devices. [Unicode emoji](https://www.unicode.org/reports/tr51/).

## Recipes

A recipe stores the exact input and every setting, including the characters as
you typed them, so the same code can be rebuilt anywhere. Older single-character
recipes still load. Recipes with parts are version 3, so an older Aqrobat
refuses them rather than drawing a different code. The theme is a page preference and never changes a code,
its recipe, or its status.

## What it is not

The encoder computes the pattern; nothing guesses it, and no AI is involved in
making a code. A character QR code is decoration, not encryption: any reader can
decode it.
