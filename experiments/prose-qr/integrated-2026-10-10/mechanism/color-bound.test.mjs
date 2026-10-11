import test from "node:test";
import assert from "node:assert/strict";
import { darkestFixedAlphaGray, WHITE_LOCK_THRESHOLD } from "./color-bound.mjs";

test("Reported locked-white threshold remains above128 with rounding slack", () => {
  assert.equal(WHITE_LOCK_THRESHOLD, 219);
  for (let g = WHITE_LOCK_THRESHOLD; g <= 255; g++)
    assert(darkestFixedAlphaGray(g) >= 128);
  assert(darkestFixedAlphaGray(218) < 128);
});

test("Source-over inequality holds without per-glyph independence", () => {
  for (const alpha0 of [0, 0.01, 0.1, 0.5, 1])
    for (const alpha1 of [0, 0.01, 0.1, 0.5, 1])
      for (const gray0 of [0, 90, 180])
        for (const gray1 of [0, 90, 180]) {
          const current =
            gray1 * alpha1 +
            (gray0 * alpha0 + 255 * (1 - alpha0)) * (1 - alpha1);
          const black = 255 * (1 - alpha0) * (1 - alpha1);
          assert(black + 1e-9 >= 255 - (255 * (255 - current)) / 75);
        }
});
