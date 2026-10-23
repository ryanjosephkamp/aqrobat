# Single-glyph topology diagnostic

The independent default OpenCV replay detected quadrangles in six of 34 new
completed native images and one of three prior native images. Those quadrangles
are not payload decodes, and their positions differ from the nominal QR field.
All three conventional payload controls decode; all three solid finder controls
are detected. No acceptance claim follows from these detections.

The next bounded test asks whether an ordinary native character with enclosed
strokes can form a more complete finder than a small Latin word. Exactly ten
single-glyph triplets: PingFang SC with `回 固 國 圍 器 噩 @ 8` (eight separate
proposals), plus Arial Black with `@ 8` (two). The six Chinese characters form a
separate script/topology diagnostic; they are not English prose and this test
claims neither semantic meaning nor Chinese reading acceptance. `@` and `8`
are punctuation/number controls. No symbol-only success will be presented as
the prose goal.

Use native 20 px, weight 400, 24 px leading, pitch 3, nominal 21 px source field,
centered single line, source x offset 0, y offset -1.5, modules 25, quiet 5. The
installed-font inventory establishes PingFang SC's platform family as `蘋方-簡`;
accept that exact recorded localized family, not arbitrary fallback. Preserve
source-width or ink-clearance rejections. No overlaps, new fonts, custom glyphs,
hidden rectangles, forced corners, pixel modifications or acceptance tuning.

Actual selected/all-scored bundled runs, true geometric rays, balanced native
quads and the same structural gate remain mandatory. Full/solid/blank controls,
one prior seed replay and immediate native repeats accompany glyphs-01. Retain
all ten outcomes. This is a small finder diagnostic, never a full-QR sweep.
