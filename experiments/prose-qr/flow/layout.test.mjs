import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build, specs, DICTIONARY } from "./layout.mjs";
const root = new URL("../../../docs/research/prose-qr/", import.meta.url);
const metrics = JSON.parse(
  await readFile(new URL("pilot-02/metrics.json", root), "utf8"),
);
test("paragraph lines retain full-sized native letters, whole words and single spaces", () => {
  for (const spec of specs()) {
    const layout = build(spec, metrics);
    assert.equal(layout.lines.length, layout.modules);
    assert.equal(layout.spec.fontSize, 20);
    assert.equal(layout.structural.emptyLines, 0);
    assert.equal(layout.structural.multipleInternalSpaces, 0);
    assert(layout.structural.lineHeightEm >= 1.2);
    assert(layout.structural.maxOpticalHeightToLineHeight < 1);
    assert(layout.lines.every((line) => line.length >= layout.columns - 8));
    assert(!/<(?:svg|canvas|rect|img)\b/i.test(layout.markup));
    assert(!/letter-spacing:-|background:(?!white)/.test(layout.markup));
    if (spec.content === "dictionary") {
      assert(
        layout.plainText
          .match(/[a-z]+/gi)
          .every((w) => DICTIONARY.includes(w.toLowerCase())),
      );
    }
  }
});
test("two/three ordinary lines occupy each QR region without empty module tiles", () => {
  for (const charsPerModule of [4, 6]) {
    const spec = {
      ...specs().find(
        (s) =>
          s.font === "Menlo" &&
          s.content === "dictionary" &&
          s.track === "weight",
      ),
      charsPerModule,
      linesPerModule: charsPerModule / 2,
    };
    const l = build(spec, metrics);
    assert.equal(l.lines.length, l.modules * spec.linesPerModule);
    assert(
      l.structural.lineHeightEm >= 1.2 &&
        l.structural.maxOpticalHeightToLineHeight < 1,
    );
    for (let y = 0; y < l.modules; y++)
      for (let x = 0; x < l.modules; x++) {
        const text = l.lines
          .slice(y * spec.linesPerModule, (y + 1) * spec.linesPerModule)
          .map((line) =>
            line.slice(x * charsPerModule, (x + 1) * charsPerModule),
          )
          .join("");
        assert(/[a-z]/i.test(text), `Unexpected blank region ${x},${y}`);
      }
  }
});
test("first aborted batch retains its exact executed sources and failure denominator", async () => {
  const base = new URL("phase-02/batch-01/", root);
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", base), "utf8"),
  );
  for (const name of ["layout.mjs", "run.mjs"]) {
    const bytes = await readFile(
      new URL(name.replace(".mjs", "-executed.mjs.txt"), base),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      manifest.sourceHashes[name],
    );
  }
  const rs = (await readFile(new URL("results.jsonl", base), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(rs.length, 32);
  assert.equal(rs.flatMap((r) => r.raw).length, 64);
  assert(
    rs
      .flatMap((r) => r.raw)
      .every((r) => !r.decoders.jsQR.exact && !r.decoders.zxing.exact),
  );
});
