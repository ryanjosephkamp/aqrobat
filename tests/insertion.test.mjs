import test from "node:test";
import assert from "node:assert/strict";
import { generate } from "../src/core.mjs";
import { readLibrary, addRecipe } from "../src/library.mjs";
import { calibratedText } from "../src/spacing.mjs";
const id = "00000000-0000-4000-8000-000000000000";
test("saved recipe library validates payloads, IDs, names and limits without changing input", () => {
  const recipe = generate("https://example.com/?x=two%20words", {
    glyph: "🤣.☄️1:a",
  }).recipe;
  const entries = addRecipe([], " Mixed recipe ", recipe, id);
  assert.equal(entries[0].name, "Mixed recipe");
  assert.equal(readLibrary(entries)[0].recipe.payload, recipe.payload);
  assert.equal(
    readLibrary(entries)[0].recipe.options.glyph,
    recipe.options.glyph,
  );
  assert.throws(() => addRecipe(entries, "Repeated ID", recipe, id));
  assert.throws(() =>
    addRecipe(entries, " ", recipe, "10000000-0000-4000-8000-000000000000"),
  );
  assert.throws(() =>
    readLibrary([{ ...entries[0], recipe: { ...recipe, payload: "" } }]),
  );
  const full = Array.from({ length: 20 }, (_, i) => ({
    ...entries[0],
    id: `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`,
  }));
  assert.throws(() =>
    addRecipe(full, "Too many", recipe, "ffff0000-0000-4000-8000-000000000000"),
  );
  assert.equal(full.length, 20);
  assert.equal(entries.length, 1);
});
test("field packing keeps square modules and aligns mixed emoji with measured blanks", () => {
  const qr = generate("https://example.com", {
    glyph: "🚀#",
    repeatX: 1,
    repeatY: 1,
  });
  const before = JSON.stringify(qr.matrix);
  const widths = new Map([
    ["🚀", 16],
    ["#", 7.2],
    [" ", 7.2],
    ["\u00a0", 7.2],
    ["\u2009", 2.4],
    ["\u200a", 1.2],
    ["\u3000", 12],
  ]);
  const measure = (s) =>
    Array.from(
      new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s),
    ).reduce((n, g) => n + (widths.get(g.segment) ?? 7.2), 0);
  const packed = calibratedText(qr, measure, 14.4);
  assert.equal(packed.cell, 28.8);
  assert(Math.abs(packed.gridWidth - packed.height) < 0.001);
  assert(packed.maxError < 1);
  assert.equal(JSON.stringify(qr.matrix), before);
  for (const row of packed.rows)
    assert(Math.abs(measure(row) - packed.gridWidth) < 1);
  // Quiet-zone rows contain only whitespace; no solid underlay is introduced.
  for (const row of packed.rows.slice(0, 8)) assert.equal(row.trim(), "");
  assert(packed.text.includes("🚀") && packed.text.includes("#"));
});
