# Bundled scoring labels and actual directions

Read-only inspection after words-02 found a diagnostic naming limitation. In
the pinned jsQR bundle, the variable `bottomLeftTopRightRun` uses an endpoint
whose x and y are both `min(imageDimension, point.x + point.y) + 1`. It does not
generally trace the geometric negative-slope diagonal. On x = y it traces the
same positive-slope line as the other diagonal, with reversed direction. At
different corners it can trace different slopes. The native scoring records are
accurate records of the actual code; their old `diagonalUp` key is the bundled
variable label, not proof that a true 45-degree opposite diagonal was tested.

This is confirmed in the installed, pinned bundle and the
[upstream locator source opened October 9, 2026](https://raw.githubusercontent.com/cozmo/jsQR/master/src/locator/index.ts).
No dependency or reader will be fixed, tuned or replaced for acceptance. Saved
phase 08 and words-02 records remain unchanged. Source snapshots preserve the
already executed logger. Subsequent passive reports additionally measure true
horizontal, vertical and both 45-degree rays, through actual returned/scored
native candidate points on the ordinary binarized pixels. These independent
diagnostics never enter the locator or an extractor. No coordinates are forced.

The structural gate will require the prior actual bundled-run conditions AND
the true geometric four-axis conditions. This strengthens the existing gate;
it cannot turn a prior failure into success. It is not decoder tuning. The
research objective now explicitly separates native scored runs, true geometric
rays and source-aligned renderer diagnostics. All earlier zero structural
passes remain zero.
