# Paste formats

A text QR code only works if the app you paste into keeps its shape: every row
the same width, every square roughly square. Apps disagree about fonts, line
spacing, and what they keep from the clipboard, so Aqrobat shapes the copy for
the destination you pick. Every format carries the characters you chose; the
destination decides only the wrapper.

## The formats

| Format         | What is pasted                                                                                                                                                    | Where it holds up                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Formatted text | Your characters with their font, size, and line spacing as HTML, plus plain text for apps that drop HTML.                                                         | Email and word processors that keep formatting.                                                       |
| Plain text     | Emoji, one per square: squares with ⬜ blanks, other emoji with ▫️ blanks and ⬛ corners unless the parts say otherwise; or letters, two per square, with spaces. | Emoji: almost anywhere, since every emoji in a font is the same width. Letters: only monospace fonts. |
| Code block     | The same plain text inside a Markdown fence, or without the fence for an existing code block.                                                                     | Markdown sources and code blocks, which keep a monospace font and every space.                        |
| Image          | The PNG artwork.                                                                                                                                                  | Anywhere that takes a picture.                                                                        |

## Tested characters

Two choices passed the paste tests described below: **emoji squares** (⬛, 🟦,
🟪, 🟫, 🟥, or 🟩, with ⬜ for light squares) for email, documents, notes, and
chat, and **full blocks** (`█`) in code blocks. Emoji squares pasted into Gmail
have also scanned on a real phone. Any other characters still paste exactly as
chosen, but the page marks them experimental and offers the tested choice in
one tap.

## Gmail

On a phone, Gmail pastes plain text, and it changes that text in ways that
matter for a code. Codes sent through Gmail from a phone and scanned from a
large screen showed them, and the
[Gmail view simulator](../tools/gmail-sim/README.md) reproduces all seven
results so far:

- **Runs of spaces collapse to one**, so letter codes lose their shape. No
  plain-text layout of letters tried in the simulator scanned, including
  full-width characters and no-break spaces. Letters need formatted text,
  pasted on a computer, or an image.
- **Emoji become Google's images,** all the same size, so emoji rows line up.
  But Gmail draws ⬜ as a light gray tile about as bright as most emoji, and
  most emoji leave white around themselves, so a camera cannot tell the dark
  squares from the light ones. Squares scanned; grapes and smileys did not.

So emoji other than the squares now paste with ▫️, which is mostly white, in
the light squares, and with ⬛ for the dark squares of the three corner
markers, which a camera looks for first. In the simulator this took grapes from
0 to 9 of 12 camera trials, and on October 29, 2026, grape and black-heart
codes laid out this way scanned from Gmail on a phone. Emoji that are mostly
light, such as 🙂 or 🐱, still fail, and the page warns about them.

### Parts

The page's **Parts** give the corner markers' outer frames, their centers, and
the light squares their own characters. In the simulator:

- **Corners need solid squares.** Grapes without ⬛ corners passed 0 of 12
  trials; with 🟪 or 🟥 corners, 8 or 9. Black hearts without corners passed 6.
  Frames or centers alone were not enough.
- **Light squares need near white.** ⬛ on 🤍 passed 9 of 12, like ▫️. ⬛ on
  🟨 passed 5, and on 🙂 only 1: a face's eyes and mouth look like dark
  squares to a camera.

None of these part choices has been tried on a phone yet.

### Clipboard size on Android

A copy for Gmail carries formatted HTML beside the plain text, one table cell
per square. Android passes a copy to the system in one message of at most
about 1 MB, two bytes per character, and Chrome reports success even when the
system refuses it. On October 29, 2026, a Samsung phone refused a 25 × 25
code with emoji light squares, about 860 KB, while codes with the default
light squares, about 580 KB at that size, copied. On Android the page now leaves the HTML
out of any copy over 200,000 characters, which Gmail on a phone does not use,
and says so.

The plain monospace text (TXT) and RTF exports are still available under More.
Plain text keeps its shape only in the same monospace font with every space
kept; RTF carries its own font and spacing into word processors.

## How the formats were chosen

Each format was pasted with the real clipboard into common editor engines: a
plain text field, a bare editable page area, ProseMirror, Tiptap, Quill,
Lexical, CKEditor 5, and Slate, plus the code blocks of several of them. Each ran
under simulated destination styles (fonts and line spacing like Gmail, Google
Docs, Slack, Discord, and Notion) at 640 and 1000 pixels wide, with a short and
a longer link. Each result was screenshotted and read with two software
decoders, ZXing and jsQR, both as captured and after a blur and shrink that
roughly imitates a phone camera. These are simulations of the apps' styles, not
the apps themselves, and software reading a screenshot is not a phone scan.

What the 3,720 cases showed:

- **Emoji squares survive pasting everywhere.** In all 1,984 emoji-square cases
  the rows arrived intact. Read through the phone simulation, the format with a
  two-square border passed 36 of 36 Gmail-style cases and 27 of 36 for each of
  the Google Docs, Slack, and Discord styles. With a four-square border, the
  same tests passed 106 of 216 instead of 147, because the wider code wrapped in
  narrow editors.
- **Loose line spacing defeats emoji squares.** Notion-style 1.5 spacing passed
  11 of 36, because the gaps between rows break up the squares. Notion gets
  code-block text instead: make a code block there first, then paste into it.
- **Formatted text depends on the editor.** Only the bare editable area kept
  its inline styles; there formatted `█` read in all 24 cases and formatted `#`
  at four by two in all 24 through the phone simulation. ProseMirror, Tiptap,
  and Quill turn it into a code block without its size and line spacing, yet
  formatted `█` still read in 20, 18, and 17 of 24. Lexical, CKEditor, and Slate
  strip it entirely (0 of 24 each). Email composers such as Gmail's are plain
  editable areas of this kind; the real apps are still to be checked.
- **Blocks need a monospace font.** Full blocks and spaces passed in code
  blocks (21 of 32) and failed in every rich text editor (0 of 192), where the
  font is proportional, so a block and a space differ in width. None of the
  editor engines turned a pasted Markdown fence into a code block; the fence
  is for Markdown sources such as GitHub comments and READMEs.
- **Sharp software reading is harsh.** jsQR read none of the 3,720 sharp
  screenshots and ZXing few, mostly because of thin white gaps between
  characters. Blurring as a camera does closed those gaps. That is why every
  code is checked with a phone before it counts.

Raw screenshots, per-decoder results, and the harness are in
[tools/paste-lab](../tools/paste-lab/README.md).

## Tips

- **Rows wrapping** is the most common failure. Make the font smaller in the
  app, widen the window, or use a shorter link, which makes a smaller code.
- **Line spacing** of 1.15 to 1.4 works best for emoji squares.
- **Dark mode:** emoji squares keep their colors, so they still read as a light
  code with dark squares. Code blocks in dark themes show light blocks on a dark
  background, an inverted code that some phone readers do not accept.
- **Scan the result** where it will be seen, before you send it. Every new code
  starts untested.
