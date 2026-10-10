import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildLedger } from "./ledger.mjs";
const spec = JSON.parse(
  await readFile(
    "docs/research/prose-qr/integrated-2026-10-10/mechanism/candidate-01/source-spec.json",
  ),
);

test("The source-envelope ledger includes every matrix/function and quiet center exactly once", () => {
  const r = buildLedger(spec);
  assert.equal(r.totalCenterDenominator, 1089);
  assert.equal(r.matrixCenterDenominator, 625);
  assert.equal(r.quietCenterDenominator, 464);
  assert.equal(new Set(r.centers.map((c) => `${c.x},${c.y}`)).size, 1089);
  assert.equal(
    Object.values(r.byRole).reduce((a, c) => a + c.total, 0),
    1089,
  );
  assert.equal(r.actualSourceGlyphDenominator, spec.texts.join("").length);
  for (const c of r.centers.filter((c) => c.region === "matrix")) {
    assert.deepEqual(c.metadata, spec.target.map[c.y][c.x]);
    assert.equal(c.target, spec.target.matrix[c.y][c.x]);
  }
});

test("Moving all prose away cannot silently remove white holes or quiet-region risk", () => {
  const moved = structuredClone(spec);
  for (const g of moved.glyphs) {
    g.x += 5000;
    if (g.nominalInkBounds) g.nominalInkBounds.left += 5000;
  }
  const r = buildLedger(moved);
  assert.equal(r.matrixCovered, 0);
  assert(r.outsideCanvasEnvelopes.length > 0);
  assert.equal(r.byRole.quiet.total, 464);
});
