# Phase 21 — separate styled regular-gray prose control

This is a **styled prose** experiment, separate from uniform-black ASCII and
the preserved bold technique. Exactly two finder-only layouts: Impact and
Arial Black, native 20 px/28 px, uniform regular weight 400, positive 2 px
tracking. Intrinsically heavy font faces are identified explicitly; no selective
bolding. All text is the fixed meaningful sentence sequence in source.txt,
repeated in order only to fill the field, with greedy whole-word line wrapping.
Three seven-module fields, pitch 144, 25-module page, five-module margin.

Native foreground is #000 for dark source regions and visible #767676 for
light regions, assigned at each native character's source midpoint. Every
space/newline and letter remains actual selectable text. Background is plain
white, all spans have transparent backgrounds, no solid modules or invisible
text. CSS color modulation is source styling, not pixel repair. Specified
foreground contrast ratio against white must be at least 4.5; this is a source
color gate, not an assertion about antialiased edge pixels or owner readability.

Measure actual installed-font advances/ink bounds, include positive tracking,
greedily wrap without splitting words, and verify DOM text/native positions.
Reject acceptance on source overflow/wrap, font substitution, adjacent ink
overlap or row ink clearance below 2 px. Native source letters remain 20 px;
no raster/font compression. Save all rejections, repeat results and errors.

Ordinary jsQR/ZXing default/baseline unchanged; separately labeled returnErrors
diagnostic saves actual returned symbols. Require all three complete 49-cell
finders, twelve balanced runs, intended corners/dimension before considering
one separate payload confirmation. No payload here, no coordinate-only gate,
geometry only source rendering/post-return diagnostics. No expected pixels or
corners go to readers. Source native-size visual observation precedes any
subsequent payload experiment. Phone/print and owner legibility stay untested.

Fresh proposal-01 and run-01/run-02. Cap 6,000,000 logical bytes including source;
capture reserve 4,500,000. Keep every outcome and exact denominator. Styled
text is not claimed portable as plain TXT or naturally concealed typography.
