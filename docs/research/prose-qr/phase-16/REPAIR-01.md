# Source width rejection and correction

The half-pixel packing model accumulated enough rounding error to exceed the
actual native width on its first Impact/144 proposal. The assertion rejected
it before any source config or native image. Preserve executed producer v1,
error receipt and measured font data; aborted partial DP rows were not saved.
Four initial planned layout slots were not rendered. A prematurely launched
capture then failed while reading the missing config, before browser launch or
output-directory creation; preserve that checker error separately.

Fresh proposal-02 uses eighth-pixel source-position steps with the same 20 px
right reserve and actual native width rejection. This reduces quantization
drift; it does not alter native glyphs, reader settings or acceptance pixels.
All four revised proposals must retain their outcomes. Original source attempt
and capture-launch error remain in the denominator, not silently retried away.
