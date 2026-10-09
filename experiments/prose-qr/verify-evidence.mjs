import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";

const root = resolve("docs/research/prose-qr/pilot-02");
const sha = (v) => createHash("sha256").update(v).digest("hex");
const json = async (name) =>
  JSON.parse(await readFile(resolve(root, name), "utf8"));
const entries = (await readFile(resolve(root, "results.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map(JSON.parse);
const cases = [...new Map(entries.map((r) => [r.id, r])).values()];
const analysis = await json("final-analysis.json");
assert.equal(entries.length, 159);
assert.equal(cases.length, analysis.caseCount);
assert.equal(cases.length, 158);
let raw = 0;
const counts = { strict: 0, styled: 0 };
const paths = new Set();
for (const row of cases) {
  assert(row.complete, row.id);
  counts[row.spec.track]++;
  assert.deepEqual(
    row.scales.map((s) => s.size).sort((a, b) => a - b),
    [320, 640, 960],
  );
  for (const frame of row.scales) {
    assert(!paths.has(frame.path), frame.path);
    paths.add(frame.path);
    assert.equal(
      sha(await readFile(resolve(root, frame.path))),
      frame.pngSha256,
    );
    for (const decoder of ["jsQR", "zxing"])
      assert.equal(frame.decoders[decoder].exact, false);
    raw++;
  }
}
assert.deepEqual(counts, { strict: 49, styled: 109 });
assert(counts.strict <= 128 && counts.styled <= 128);
assert.equal(raw, analysis.rawRasterCount);
assert.equal(raw, 474);
const manifest = await json("manifest.json");
assert.equal(
  sha(await readFile(resolve(root, "run-executed.mjs.txt"))),
  manifest.sourceSha256["run.mjs"],
);
for (const file of ["layout.mjs", "vocabulary.mjs", "decoders.mjs"])
  assert.equal(
    sha(await readFile(new URL(file, import.meta.url))),
    manifest.sourceSha256[file],
  );
const replayFiles = (await readdir(root)).filter((n) =>
  /^(strict|styled)-.*\.html\.gz$/.test(n),
);
assert.equal(replayFiles.length, 158);
for (const name of replayFiles)
  assert(gunzipSync(await readFile(resolve(root, name))).length > 1000);
const diagnostics = await json("diagnostic-results.json");
assert.equal(diagnostics.length, 16);
assert.equal(diagnostics.filter((r) => r.decoders.jsQR.exact).length, 11);
assert.equal(diagnostics.filter((r) => r.decoders.zxing.exact).length, 12);
const urlControls = await json("url-controls.json");
assert.equal(urlControls.length, 3);
assert(
  urlControls.every((r) => r.decoders.jsQR.exact && r.decoders.zxing.exact),
);
const verification = JSON.parse(
  await readFile(resolve(root, "../review-verification.json"), "utf8"),
);
assert.equal(
  sha(await readFile(resolve(root, "../index.html"))),
  verification.boardSha256,
);
console.log(
  JSON.stringify({
    status: "passed",
    uniqueCases: cases.length,
    receiptLines: entries.length,
    rawPngHashesVerified: raw,
    compressedReplays: replayFiles.length,
    diagnosticCountsVerified: true,
    sourceReceiptVerified: true,
    boardReceiptVerified: true,
    note: "Integrity and retained outcome verification; no new decoder run or phone/print claim",
  }),
);
