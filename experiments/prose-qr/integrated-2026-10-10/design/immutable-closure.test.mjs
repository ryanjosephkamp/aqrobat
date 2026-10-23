import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { construct, PAYLOAD, immutablePrefixBound } from "./padding-solver.mjs";
import { immutableClosureBound } from "./immutable-closure.mjs";
function native(b) {
  return {
    schema: "aqrobat.native-module-constraints.v1",
    payload: PAYLOAD,
    version: b.code.version,
    ecc: "H",
    mask: b.code.mask,
    padding: "post-terminator-affine",
    complete: true,
    groups: [],
    samples: b.matrix.flatMap((r, y) => r.map((base, x) => ({ x, y, base }))),
  };
}
test("V5H fixed block data imply fixed22 parity words each", () => {
  const b = construct(5, "H", 2),
    input = { ...native(b), mask: 2 };
  const a = b.canonical.data.slice();
  for (let i = b.canonical.prefixBytes; i < a.length; i++)
    a[i] ^= (i * 31) & 255;
  const changed = construct(5, "H", 2, a);
  for (let y = 0; y < b.code.size; y++)
    for (let x = 0; x < b.code.size; x++) {
      const m = b.map[y][x];
      if (m.kind === "ecc" && m.block < 2)
        assert.equal(changed.matrix[y][x], b.matrix[y][x]);
    }
  const bound = immutableClosureBound(input);
  assert.deepEqual(bound.wholeFixedDataBlocks, [0, 1]);
  assert.equal(bound.suppliedImmutableCodewords, 66);
  assert(bound.blocks.every((v) => v.unavoidableImmutableSymbolErrors === 0));
  const eccPoint = input.samples.find(
    (s) => b.map[s.y][s.x].kind === "ecc" && b.map[s.y][s.x].block === 0,
  );
  eccPoint.base ^= 1;
  assert.equal(
    immutablePrefixBound(input).blocks[0].unavoidablePrefixSymbolErrors,
    0,
  );
  assert.equal(
    immutableClosureBound(input).blocks[0].unavoidableImmutableSymbolErrors,
    1,
  );
});
test("V5L/M partial prefix blocks do not incorrectly mark all parity fixed", () => {
  for (const ecc of ["L", "M"]) {
    const b = construct(5, ecc, 0),
      r = immutableClosureBound({ ...native(b), ecc, mask: 0 });
    assert.deepEqual(r.wholeFixedDataBlocks, []);
    assert(r.blocks.every((v) => v.immutableParityCodewords === 0));
  }
});
test("Changed native source serializes each coherent paragraph exactly once", async () => {
  const p = JSON.parse(
    await readFile(
      "docs/research/prose-qr/integrated-2026-10-10/design/v5-short-prose/source-spec.json",
      "utf8",
    ),
  );
  assert.equal(p.sourceCharacters, 106);
  assert.equal(p.fullTextCharacters, 110);
  assert.equal(p.specs.length, 2);
  for (const s of p.specs) {
    const html = await readFile(s.htmlPath, "utf8");
    assert(!/<(?:img|svg|canvas|script)\b/i.test(html));
    assert(
      !/clip|opacity|visibility|display\s*:\s*none|font-size\s*:\s*0/i.test(
        html,
      ),
    );
    for (let i = 0; i < p.texts.length; i++) {
      const g = s.glyphs.filter((g) => g.p === i);
      assert.equal(g.map((g) => g.ch).join(""), p.texts[i]);
      assert.equal(new Set(g.map((g) => g.index)).size, g.length);
    }
    assert.equal(s.glyphs.filter((g) => g.role.startsWith("finder")).length, 3);
    assert.equal(s.glyphs.filter((g) => g.role === "alignment-o").length, 1);
  }
});
