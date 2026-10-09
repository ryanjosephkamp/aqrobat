# Actual native-pixel word feedback — bounded plan

Preregistered after 24 retained finder diagnostics. Cap-01 reduces horizontal
fragmentation but no intended locator geometry is recovered. Use cap-02 as one
fixed seed (Impact 20 px, weight 400, gap 0.5, tracking -0.5, global phase +7).
Require an exact unchanged seed HTML replay PNG before any proposals. No full QR.

Run exactly twelve native proposals in fresh exclusive `feedback-01`:

1. Four whole center-row replacements, each with single spaces:
   `TTTT me TTTTTTTTTTT me TTT`,
   `TTTT we TTTTTTTTTTT we TTTT`,
   `TTTT me TTTTTTTTTTTT me TTT`,
   `TTTT we TTTTTTTTTTTT we TTT`.
   These explicitly synthetic T words are a diagnostic relaxation.
2. Choose the lowest actual native objective among the seed and first four
   proposals, keeping the seed/earliest case on ties. From that source text,
   replace the first whole word in zero-based rows 2, 3, 10 and 11 with each of
   WEB, WELL, WILL, BEE, HEM, EAR, HERE, BE (eight proposals). Keep all other
   source text and typography unchanged. This tests actual-space alignment in
   the two intended light intervals along the vertical axis. It is not semantic
   prose generation; source words remain readable at native size subject to
   separate visual inspection.

The renderer objective is the sum over all six native binarized axis traces of
binary target disagreements plus twice max(0, run count minus five). This is
source selection using the fixed ordinary binarizer's output, not acceptance
reader tuning. Run the unchanged ordinary locator for every complete native PNG
and retain its output whether or not the objective improves. Expected geometry
is only a renderer objective and post-probe diagnostic; never pass it to the
locator, force extraction, repair pixels, change thresholds, crop or rescale.
Retain every proposal, parent, exact text/HTML/PNG, score, controls, fit and repeat.

Reject source/native width overflow rather than shortening. Two distinct
controls remain conventional full-QR payload recovery and solid-finder location.
All proposals are finder-only; no encoded candidate payloads, phone candidates
or full-QR sweep. A lower trace objective is not QR recovery or legibility
acceptance. Preserve all prior evidence and the current 6-MB logical-file cap.
