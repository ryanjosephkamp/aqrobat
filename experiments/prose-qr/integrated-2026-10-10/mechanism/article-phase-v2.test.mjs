import test from "node:test";
import assert from "node:assert/strict";
import { layoutPhase } from "./article-phase-v2.mjs";

const options = {
  squareFinder: {
    noScale: true,
    symbol: "▣",
    resourcePath: "synthetic-pure-test-only",
    resourceSha256: "not-empirical",
    font: "ArialUnicodeMS",
    expectedFont: "ArialUnicodeMS",
    size: 400,
    cssOrigin: [64, 32],
    inkBounds: [80, 109, 269.71875, 269.71875],
  },
  alignment: {
    symbol: "⊙",
    resourcePath: "synthetic-pure-test-only",
    resourceSha256: "not-empirical",
    font: "ArialUnicodeMS",
    expectedFont: "ArialUnicodeMS",
    size: 192,
    cssOrigin: [64, 32],
    inkBounds: [75, 108, 132, 131],
  },
  bodyGray: 204,
  stroke: 1,
};

test("Pure phase proposal preserves complete coherent source, canonical target and fixed native phases", () => {
  const { spec, html } = layoutPhase(options);
  assert.equal(spec.target.payload, "https://example.com/");
  assert.equal(spec.target.dataCodewords.length, 22);
  for (let p = 0; p < 3; p++)
    assert.equal(
      spec.glyphs
        .filter((g) => g.p === p)
        .map((g) => g.ch)
        .join(""),
      spec.texts[p],
    );
  assert.equal(spec.glyphs.filter((g) => g.ch === "▣").length, 3);
  assert(spec.texts[0].includes("three square ornaments"));
  assert(spec.texts[2].includes("closing marker: ⊙"));
  for (const g of spec.glyphs.filter((g) => g.role === "body")) {
    const xPhase = (g.x - spec.geometry.origin) / spec.options.advance - 0.75;
    const yPhase =
      (g.y + spec.options.bodyCenterFromTop - spec.geometry.origin) /
      spec.options.nativeLeading;
    assert(Math.abs(xPhase - Math.round(xPhase)) < 1e-8);
    assert(Math.abs(yPhase - Math.round(yPhase)) < 1e-8);
  }
  assert(
    !/<(?:img|svg|canvas)\b|opacity:|clip-path|background-image|linear-gradient/.test(
      html,
    ),
  );
});

test("Unmeasured scaled square resources and unselected ink styles reject", () => {
  assert.throws(
    () =>
      layoutPhase({
        ...options,
        squareFinder: { ...options.squareFinder, noScale: false },
      }),
    /unmeasured/,
  );
  assert.throws(() => layoutPhase({ ...options, stroke: 2 }));
});
