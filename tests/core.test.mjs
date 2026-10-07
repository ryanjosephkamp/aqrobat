import test from "node:test";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import {
  generate,
  fromRecipe,
  validateGlyph,
  toSvg,
  recipeKey,
} from "../src/core.mjs";
import { htmlSheet, render } from "../src/render.mjs";

function decode(qr) {
  const scale = 8,
    width = qr.totalModules * scale,
    data = new Uint8ClampedArray(width * width * 4).fill(255);
  qr.matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy++)
        for (let dx = 0; dx < scale; dx++) {
          const i =
            (((y + qr.quiet) * scale + dy) * width +
              (x + qr.quiet) * scale +
              dx) *
            4;
          data[i] = data[i + 1] = data[i + 2] = 0;
        }
    }),
  );
  return jsQR(data, width, width)?.data;
}

test("independent decoder recovers exact ASCII/Unicode payloads at every ECC", () => {
  for (const payload of [
    "https://example.com/a?b=1&c=two#frag",
    "01234567890123456789",
    "Café / 東京 / 🍇",
    " spaced\ntext ",
  ])
    for (const ecc of ["L", "M", "Q", "H"])
      assert.equal(decode(generate(payload, { ecc, boost: false })), payload);
});
test("boost is explicit and exact requested ECC is honored when disabled", () => {
  for (const ecc of ["L", "M", "Q", "H"])
    assert.equal(generate("hello", { ecc, boost: false }).actualEcc, ecc);
  const qr = generate("hello", { ecc: "L", boost: true });
  assert.equal(qr.requestedEcc, "L");
  assert.equal(qr.actualEcc, "H");
  assert.equal(qr.scanStatus, "untested");
});
test("recipes round trip matrix, complete emoji sequences, and exact text", () => {
  for (const glyph of ["#", "█", "⚫️", "👨‍👩‍👧‍👦", "🇺🇸", "👍🏽"]) {
    const qr = generate("x", { glyph, width: 701, repeatX: 1, repeatY: 1 });
    const restored = fromRecipe(JSON.parse(JSON.stringify(qr.recipe)));
    assert.deepEqual(restored, qr);
    assert.equal(recipeKey(restored.recipe), recipeKey(qr.recipe));
    assert.equal(decode(qr), "x");
  }
});
test("invalid Unicode, invisible glyphs, typos, bounds, and byte overflow reject", () => {
  for (const glyph of [
    "",
    "ab",
    " ",
    "\n",
    "\u200b",
    "\u200d",
    "\u2060",
    "\u202e",
    "\u0301",
    "\ud800",
  ])
    assert.throws(() => validateGlyph(glyph));
  for (const options of [
    { width: 199 },
    { width: 1537 },
    { width: 200.5 },
    { repeatX: 5 },
    { repeatY: 0 },
    { ecc: "Z" },
    { boost: 1 },
    { stroke: 1 },
    { font: "anything" },
    { typo: true },
  ])
    assert.throws(() => generate("hi", options));
  assert.throws(() => generate(""));
  assert.throws(() => generate("\ud800"));
  assert.throws(() => generate("🍇".repeat(257)));
  assert.equal(generate("a".repeat(1024)).utf8Bytes, 1024);
});
test("four-module quiet border remains clear, including repeated emoji rows", () => {
  const qr = generate("https://example.com", {
    glyph: "🐱",
    repeatX: 3,
    repeatY: 4,
  });
  assert.equal(qr.rows.length, qr.totalModules * 4);
  assert(qr.rows.slice(0, 16).every((row) => /^ +$/.test(row)));
  assert(qr.rows.slice(-16).every((row) => /^ +$/.test(row)));
  assert(
    qr.rows.every(
      (row) => row.startsWith(" ".repeat(12)) && row.endsWith(" ".repeat(12)),
    ),
  );
});
test("untrusted payload/glyph cannot inject markup into SVG or HTML", () => {
  const qr = generate("<img src=x onerror=alert(1)>", { glyph: "<" });
  const svg = toSvg(qr),
    html = htmlSheet(qr, "data:image/png;base64,AAAA");
  assert(!svg.includes('<text x="0"'));
  assert(svg.includes("&lt;</text>"));
  assert(!html.includes("<img src=x"));
  assert(html.includes("&lt;img"));
  assert.throws(() => htmlSheet(qr, "javascript:alert(1)"));
  assert.equal((svg.match(/<rect /g) || []).length, 1);
  assert(svg.includes('fill="white"'));
});
test("canvas dark content uses font glyphs, never module rectangles", () => {
  const calls = [];
  const ctx = {
    measureText: () => ({
      width: 60,
      fontBoundingBoxAscent: 80,
      fontBoundingBoxDescent: 20,
      actualBoundingBoxAscent: 80,
      actualBoundingBoxDescent: 20,
    }),
    fillRect(...args) {
      calls.push(["rect", this.fillStyle, ...args]);
    },
    fillText() {
      calls.push(["text"]);
    },
    strokeText() {
      calls.push(["stroke"]);
    },
  };
  for (const glyph of ["#", "🐱"]) {
    calls.length = 0;
    render({ getContext: () => ctx }, generate("hello", { glyph }));
    assert.deepEqual(
      calls.filter((c) => c[0] === "rect"),
      [["rect", "white", 0, 0, 656, 656]],
    );
    assert(calls.some((c) => c[0] === "text"));
  }
});
