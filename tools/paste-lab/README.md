# Paste lab

A dev-only measurement harness. It answers one question: which Aqrobat text
outputs survive a real clipboard paste into common web editor engines and
still decode to the exact QR payload?

For each case it writes the clipboard in headless Chrome
(`navigator.clipboard.write`, `text/plain`, plus `text/html` for the rich
format), focuses the editor, presses Cmd/Ctrl+V, and waits for the editor to
settle. Then it records:

- **Structure**: rows in the editor's DOM against the expected rows; visual
  line boxes (wrapping); characters that changed (spaces to no-break spaces,
  lost spaces, editor filler characters, merged rows); white-space mode; the
  fonts Chrome actually used (`CSS.getPlatformFontsForNode`); module size and
  aspect; whether the editor shows the text light-on-dark; and the editor's
  HTML length and a short sample.
- **Decode**: a screenshot of the editor's content element (widened when the
  content overflows), decoded with ZXing (`zxing-wasm`, `tryHarder`) and jsQR.
  Then a **phone simulation**: the screenshot redrawn in Chrome so one module
  is about 4 px, with `blur(0.8px)` and a 20 px white margin, decoded the same
  way. A pass is the exact payload from either decoder; each decoder's result
  is kept too. jsQR runs with `inversionAttempts: "attemptBoth"`. On sharp
  screenshots jsQR fails wherever glyphs leave 1 px white hairlines between
  cells, which ZXing tolerates.

The phone simulation is a rough stand-in for a camera at reading distance.
It is not a phone scan, and passing it does not show that a phone will scan
the result. The destination styles (Gmail-like, Google-Docs-like, Slack-like,
Discord-like, Notion-like, monospace) only approximate those apps' fonts and
line spacing; they are not the real apps.

## Run

```sh
npm install --prefix tools/paste-lab --ignore-scripts
node tools/paste-lab/run.mjs                    # full matrix
node tools/paste-lab/run.mjs quill tiles short  # filtered
node tools/paste-lab/run.mjs ckeditor --shards=2 --limit=20
```

Filter words match an editor, a style, a format id prefix or family
(`tiles`, `blocks`, `rich`, `plain`), a payload (`short`, `long`), or a width
(`w640`, `w1000`). Words of the same kind are ORed; different kinds are ANDed.
`--limit=N` keeps the first N matching cases. `--shards=N` sets the number of
parallel Chrome workers (default 4, or fewer when free memory is under about
500 MB per worker). Pages are rebundled with esbuild into `dist/` when
`pages/` changes. The full matrix is 3,720 cases and takes about 7 minutes on
4 workers, 14 minutes on 2.

Output goes to `test-results/paste-lab/` (gitignored):

- `results.json` (full run) or `results-partial.json` (filtered run): one
  record per case plus run metadata.
- `summary.md`: pass counts by editor, format, and style, with failure labels.
- `<editor>-<style>-w<width>-<format>-<payload>.png`: the sharp screenshot.

It uses installed Google Chrome (`CHROME_PATH` overrides) through Playwright
from the repository root. Each shard runs its own headless Chrome, whose
clipboard is private to that process; the system clipboard is not touched.

## Matrix

- Formats: `tileText` (⬛ and 🟦, 1x1 and 2x1, quiet border passed
  explicitly as 4 and 2, so the function's default does not matter); `blockText`
  (2x1 and 3x1, with and without a Markdown fence); rich HTML from
  `formattedText` (█ 2x1 and # 4x2 at width 328, with `plainText` as
  `text/plain`); legacy `plainText` (# 2x1).
- Payloads: `https://example.com` (version 2) and
  `https://ryanjosephkamp.github.io/aqrobat/?ref=paste-lab-2026` (version 4).
- Editors: textarea; bare contenteditable; ProseMirror with
  `prosemirror-example-setup`; Tiptap StarterKit; Quill 2 (Snow); Lexical
  rich text and plain text; CKEditor 5 classic; Slate. Code-block variants
  for ProseMirror, Tiptap, Quill, and CKEditor paste into an empty code block.
- Widths: 640 and 1000 px of editor content.

## Licenses (dev-only, not shipped)

ProseMirror, Tiptap, Lexical, Slate, React, esbuild, and pngjs are MIT.
Quill is BSD-3-Clause. CKEditor 5 is GPL-2.0-or-later (used here with the
`'GPL'` license key) or commercial. Playwright is Apache-2.0, jsQR is
Apache-2.0, and zxing-wasm is MIT.
