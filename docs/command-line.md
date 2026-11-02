# Command line and API

Aqrobat's core runs in Node 22 or newer with no runtime dependencies. Scripts
can call it directly; nothing has to draw or guess the QR pattern.

## Command line

```sh
node bin/aqrobat.mjs 'https://example.com' [options]
node bin/aqrobat.mjs --recipe qr.json --format svg --out qr.svg
```

| Option              | Meaning                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `--format text`     | Monospace characters and blanks (the default).                         |
| `--format paste`    | The code's own characters as the page copies them for chat and notes.  |
| `--format tiles`    | Emoji squares, ⬛ and ⬜, which line up in any font.                   |
| `--format blocks`   | Full blocks and spaces for monospace destinations.                     |
| `--format markdown` | Blocks inside a Markdown code fence.                                   |
| `--format svg`      | Glyph artwork as SVG. It uses the viewer's fonts.                      |
| `--format recipe`   | A recipe file that rebuilds the same code.                             |
| `--format json`     | The recipe plus the matrix and metadata.                               |
| `--glyph '#'`       | One or more characters or whole emoji; repeats and spaces are ignored. |
| `--corners '⬛'`    | A character for the corner markers' outer frames; empty follows code.  |
| `--centers '⬛'`    | A character for the corner markers' centers; empty follows the code.   |
| `--light '▫️'`      | A character for the light squares and border; empty leaves them blank. |
| `--density 4x2`     | Characters across and rows per square, each from 1 to 4.               |
| `--size 656`        | SVG and recipe size in pixels, 200 to 1536.                            |
| `--ecc M`           | Error correction L, M, Q, or H. `--no-boost` keeps it exact.           |
| `--font Menlo`      | Menlo, Courier New, or monospace.                                      |
| `--thick`           | Thicken the ink.                                                       |
| `--out path`        | Write a new file. An existing file is never replaced.                  |
| `--recipe path`     | Rebuild from a saved recipe.                                           |

Without a payload or recipe, the tool reads up to 1024 bytes from standard
input exactly, including a final newline; use `printf` when you do not want
one. Input is never trimmed or shortened. Oversized input, malformed Unicode,
invisible characters, unknown options, and out-of-range sizes are refused.

## API

```js
import { generate, fromRecipe, toSvg } from "./src/core.mjs";
import { tileText, blockText, pasteText } from "./src/portable.mjs";
import { plainText } from "./src/text.mjs";

const qr = generate("https://example.com", {
  glyph: "#",
  repeatX: 2,
  repeatY: 1,
});
tileText(qr).text; // emoji squares
blockText(qr, { fence: true }).text; // Markdown code block
plainText(qr).text; // monospace characters
toSvg(qr); // glyph SVG
fromRecipe(qr.recipe); // the same code again

// Parts: emoji with ⬛ corners and 🤍 light squares, as pasted text.
const hearts = generate("https://example.com", {
  glyph: "🖤",
  parts: { corners: "⬛", centers: "⬛", light: "🤍" },
});
pasteText(hearts).text;
```

`src/destinations.mjs` lists the destinations the page offers and the format
each one gets. Formatted HTML and RTF need font measurements from a browser
canvas (`textMetrics` in `src/text.mjs`); the other formats do not.

## Limits

A code is decoration, not secrecy: any reader can decode it. A matrix that a
decoder can read in one font may still fail in another, so check the output
where it will be used.
