# Use Aqrobat with an agent

Ask your agent to call the deterministic CLI/API, choose a palette of visible symbols or whole emoji sequences, keep the input exact, and report the recipe and scan evidence.
No model integration, subscription, MCP server, or external API is required.

Example instruction:

> Use Aqrobat to encode https://example.com with thickened hash characters,
> 4 across by 2 rows per module, Menlo, 700 px, and high error correction.
> Save a recipe and glyph SVG under new filenames. Do not claim it scans until
> that exact rendered output recovers the expected payload in a recorded test.

```sh
node bin/aqrobat.mjs 'https://example.com' --glyph '🤣.☄️1:a' --density 4x2 \
  --size 700 --font Menlo --ecc H --thick --format recipe --out sample.json
node bin/aqrobat.mjs --recipe sample.json --format svg --out sample.svg
```

Formats: `text`, `recipe`, `json` (matrix + recipe + metadata), `svg`.
Unknown options, malformed Unicode, invisible/control glyphs, oversized input,
and out-of-range sizes are rejected. Existing output files are preserved.
The API exports `generate`, `fromRecipe`, `toSvg`, and validation helpers.
The separate `aqrobat/render` module needs a browser Canvas context.

Plain text preserves characters but not font metrics. PNG is produced by the
browser page. SVG is a separate font-dependent renderer and may differ from
the canvas. Emoji choices are experimental. Do not treat failure by one decoder
as proof that every phone will fail, or one phone success as broad compatibility.

Palettes use first-seen unique graphemes, cycling through dark modules in row
order. Repeats and whitespace are ignored for drawing; each chosen symbol is
repeated within its module at the selected density. No random placement or AI
is involved. `parsePalette` exposes the same segmentation and deduplication.
Keep the original `options.glyph` string in recipes; joining deduplicated
regional indicators can change Unicode grapheme boundaries. New recipes use
`aqrobat-recipe-v2`; `fromRecipe` still reads v1 single-symbol recipes without
changing their schema/key. UI regeneration writes v2. Shape/font differences
still need independent rendered-output testing.
