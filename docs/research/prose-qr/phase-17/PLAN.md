# Phase 17 — constrain source word banks

Exactly two finder-only layouts at pitch 144, 25 modules, five-module margin,
three seven-module text fields. Impact 20 px/24 px and Monaco 14 px/14 px,
uniform regular weight 400 and black letters. No selective bolding, transformed
glyphs, hidden blocks or reader changes. Measure native metrics for both sizes.
Use the phase 16 source word banks and ink-overlap rejection, except remove
single-letter i from Monaco's light bank (ill it if lit till lilt remain).

New source-only constraint: a word's midpoint must select the matching dark or
light bank from the intended source pattern. Keep signed glyph-ink cost and
eighth-pixel position DP, native justification and width reserve. This avoids
low-density fillers inside dark fields as a general source-packing rule; it
does not repair any observed pixels or pass geometry into a reader. There is
no case-specific sampled-pixel patch. The ordinary readers get only native PNG.

Native repeat and mechanical legibility gates unchanged (2 px row clearance,
no adjacent ink overlap, font substitution/wrap/overflow reject). Retain every
source failure and all native outcomes. Ordinary jsQR and ZXing default/baseline
unchanged. Separate error-reporting diagnostic records actual sampled symbol,
intended corners/dimension, all three 49/49 finder masks and twelve balanced
axial/both diagonal runs. Full native structure, not coordinates alone, is the
gate for considering one subsequent separately planned payload confirmation.
Default OpenCV replay original PNGs plus conventional control. No payload in
this phase, no phone or owner-legibility claim.

Fresh metrics-01, proposal-01, run-01 and run-02. Cap 6,000,000 logical bytes
including source; capture reserve 4,500,000. Do not reuse output directories.
