# Large native glyph / small finder scale

All ten single-glyph topology outputs failed the intended structural gate. Nine
had no four-axis selected structure, while `國` produced ordinary tiny candidates
with poor proportions; none is a payload or prose result.

The earlier nominal central spans were often much wider than any clear native
letter stroke. Test scale explicitly without shrinking, compressing or repairing
letters: exactly twelve single-glyph triplets, native 80 px with 96 px leading.
Three already installed faces (`GillSans-UltraBold`, `Arial Black`,
`HelveticaNeue-CondensedBlack`) × `@`, `g`, `e`, `B`. CoreText's read-only
PostScript-name inventory reports both new aliases. Validate actual platform
families Gill Sans, Arial Black and Helvetica Neue in Chrome. These are globally
heavy faces, not ordinary body text or selective word-weight encoding.

Nominal pitch 8, modules 61, quiet 20; finder centers are separated by 432 px.
Source text containers are 192 px wide, deliberately larger than the nominal
56 px finder field. Centered native lines, x offset -68 and y offset -20 align
their line boxes near the nominal center. Keep full source text bounds inside
the 808 px artifact. This tests a potential finder inside a large readable
glyph, not a finder made from a paragraph. Do not treat it as a prose solution.

The structural gate, ordinary readers and true-ray diagnostic are unchanged.
Retain all twelve outputs and exact immediate repeats, controls and seed replay
in a fresh scale-01 directory. Capture source overflow/overlap rejections. No
new font, new host, pixel transform, forced corner or full-QR sweep. Even a
structural glyph pass would still require readable paragraph embedding before
any payload experiment or phone candidate.
