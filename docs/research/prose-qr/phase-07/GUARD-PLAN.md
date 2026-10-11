# Native source-row guard probe — four adaptive cases

Preregistered after two enlarged native cases fail and a retained-pixel join
audit observes wide bands joining older letter-stroke quads. In the 20-pixel
seed's top-left corner, the 96-pixel row at y=277 joins a quad whose top at y=270
is only four pixels wide. The solid control maintains a 72-pixel width through
its rows. This is a local observation, not proof of a universal cause.

Render four exact native 20-pixel seed variants in fresh guard-01. Keep all other
seed geometry, font, leading, tracking, offsets and reader parameters unchanged.
Only the specified complete source rows change in all three text nodes:

1. Replace zero-based row 6 with the seed's row 5 (already retained complete words).
2. Replace row 6 with `eeee me eeee me eeee me eeee` (explicit synthetic e words).
3. Replace row 6 with three groups of fourteen capital I letters, single spaces.
4. Replace both rows 6 and 8 with that same three-word capital-I string.

Preflight complete text advances and reject overflow. Synthetic I/E rows are
boundary diagnostics and cannot establish natural prose or letter-distinction
acceptance. Preserve exact text/HTML/PNG, metrics, controls, native fit, immediate
repeats and ordinary locator outputs. No hidden artwork, source masks, per-line
DOM elements, changed weights, cropping, raster scaling or reader tuning.
The objective is correctly sized ordinary finder-region formation; do not use
improved axis scores as acceptance. No full QR or phone candidate. Stay inside
the existing 1.5-MB phase cap, reserving 400 KB for reporting and custody.
