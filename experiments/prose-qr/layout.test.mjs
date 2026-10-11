import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { WORDS } from "./vocabulary.mjs";
import { makeSpecifications, buildLayout } from "./layout.mjs";
const dataRoot = new URL(
  "../../docs/research/prose-qr/pilot-02/",
  import.meta.url,
);
const metrics = JSON.parse(
  await readFile(new URL("metrics.json", dataRoot), "utf8"),
);
const vocabulary = new Set(
  Object.values(WORDS).flatMap((w) => [...w.dark, ...w.light]),
);
test("bounded specs have unique IDs and their palette contains complete real-word tokens", () => {
  const specs = makeSpecifications();
  assert.equal(new Set(specs.map((s) => s.id)).size, specs.length);
  for (const track of ["strict", "styled"])
    assert(specs.filter((s) => s.track === track).length <= 128);
  for (const spec of specs) {
    const layout = buildLayout(spec, metrics, 320);
    const tokens = layout.plainText.match(/[A-Za-z]+/g);
    assert(tokens.length > 0);
    assert(
      tokens.every((t) => vocabulary.has(t)),
      spec.id,
    );
    assert(!/<(?:svg|rect|canvas|img)\b/i.test(layout.markup), spec.id);
  }
});
test("the text stream preserves nominal quiet rows and columns without word fragments", () => {
  for (const spec of makeSpecifications().filter((s) => s.track === "strict")) {
    const layout = buildLayout(spec, metrics, 320),
      rows = layout.plainText.slice(0, -1).split("\n");
    const cols = layout.qr.totalModules * (spec.length + 1),
      quietRows = layout.qr.quiet * layout.rows,
      quietCols = layout.qr.quiet * (spec.length + 1);
    assert(rows.slice(0, quietRows).every((r) => !r.trim()));
    for (const r of rows) {
      assert.equal(r.length, cols);
      assert.equal(r.slice(0, quietCols).trim(), "");
      assert.equal(r.slice(-quietCols).trim(), "");
    }
  }
});
test("lossless replay archives recover the recorded original HTML bytes", async () => {
  const archive = JSON.parse(
    await readFile(new URL("replay-archives.json", dataRoot), "utf8"),
  );
  for (const item of archive.archived) {
    const recovered = gunzipSync(
      await readFile(new URL(item.archive, dataRoot)),
    );
    assert.equal(recovered.length, item.originalBytes);
    assert.equal(
      createHash("sha256").update(recovered).digest("hex"),
      item.originalSha256,
    );
  }
});
test("both calibrated decoders recover exact positive payloads and reject text negatives", async () => {
  const controls = JSON.parse(
    await readFile(new URL("controls.json", dataRoot), "utf8"),
  );
  for (const c of controls) {
    if (c.kind.includes("positive")) {
      assert(c.jsQR.exact);
      assert(c.zxing.exact);
      assert.equal(c.jsQR.payload, "AQROBAT-TEST");
      assert.equal(c.zxing.payload, "AQROBAT-TEST");
    } else {
      assert.equal(c.jsQR.found, false);
      assert.equal(c.zxing.found, false);
    }
  }
});
