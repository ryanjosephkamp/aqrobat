import assert from "node:assert/strict";
import test from "node:test";
import { layoutArticle, texts } from "./article-v3.mjs";
import { resourceSources } from "./continuous.mjs";
const measurements = {
  finder: {
    resourcePath: "synthetic-test-only",
    resourceSha256: "not-a-measurement",
    font: "AppleSymbols",
    expectedFont: "AppleSymbols",
    symbol: "◉",
    size: 192,
    cssOrigin: [64, 32],
    inkBounds: [64, 32, 192, 192],
  },
  alignment: {
    resourcePath: "synthetic-test-only",
    resourceSha256: "not-a-measurement",
    font: "AppleSymbols",
    expectedFont: "AppleSymbols",
    symbol: "⊙",
    size: 192,
    cssOrigin: [64, 32],
    inkBounds: [64, 32, 192, 192],
  },
};
test("Ten frozen resource proposals use exact genuine native source text", () => {
  const r = resourceSources();
  assert.equal(r.length, 10);
  for (const s of r) {
    assert(s.html.includes("background:white"));
    assert(
      !/<(?:img|svg|canvas)\b|opacity:|clip-path|background-image|linear-gradient|::before|::after/.test(
        s.html,
      ),
    );
    assert(s.expectedSelection);
    assert(s.expectedFonts.length === 1);
  }
});
test("Complete continuous source and exact target ownership, no tile graphics", () => {
  const { html, spec } = layoutArticle(measurements);
  assert.equal(spec.payloadTrial, true);
  assert.equal(spec.target.payload, "https://example.com/");
  assert.deepEqual(spec.glyphs.map((g) => g.ch).join(""), texts.join(""));
  assert.equal(
    spec.glyphs.filter((g) => g.role.startsWith("section-ornament")).length,
    3,
  );
  assert.equal(
    spec.glyphs.filter((g) => g.role === "named-alignment-marker").length,
    1,
  );
  assert.equal(spec.target.map.flat().length, 625);
  assert.equal(spec.target.dataCodewords.length, 28);
  assert(spec.rows.every((row) => row.text.length <= row.capacity));
  assert(
    !/<(?:img|svg|canvas)\b|opacity:|clip-path|linear-gradient|background-image|::before|::after/.test(
      html,
    ),
  );
  for (const g of spec.glyphs.filter((g) => g.role === "body"))
    assert([0, 180].includes(g.gray));
});
test("Invalid version and hidden source choices reject", () => {
  assert.throws(
    () => layoutArticle({ ...measurements, version: 1 }),
    /assert|false|true/i,
  );
  assert.throws(
    () => layoutArticle({ ...measurements, bodyGray: 255 }),
    /No white/,
  );
  assert.throws(() => layoutArticle({}), /Supply full native/);
});
