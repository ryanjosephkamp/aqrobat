import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
const root = resolve("docs/research/prose-qr/phase-02");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const families = [];
let raw = 0,
  processed = 0,
  rawJs = 0,
  rawZ = 0,
  diagJs = 0,
  diagZ = 0,
  replays = 0;
const inputHashes = new Set();
for (const family of [
  "batch-01",
  "batch-02",
  "rectangles",
  "word-style",
  "view-sweep",
]) {
  const manifest = JSON.parse(
    await readFile(resolve(root, family, "manifest.json"), "utf8"),
  );
  for (const [name, hash] of Object.entries(manifest.sourceHashes || {})) {
    const source =
      family === "batch-01"
        ? resolve(root, family, name.replace(".mjs", "-executed.mjs.txt"))
        : resolve("experiments/prose-qr/flow", name);
    assert.equal(sha(await readFile(source)), hash, source);
  }
  const rows = (await readFile(resolve(root, family, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  let frames = 0;
  for (const r of rows) {
    const captures = r.raw || [r];
    for (const frame of captures) {
      assert.equal(
        sha(await readFile(resolve(root, family, frame.path))),
        frame.pngSha256,
      );
      inputHashes.add(frame.pngSha256);
      raw++;
      frames++;
      const d = frame.decoders || frame.defaultReaders || frame.baseline;
      rawJs += Number(d.jsQR.exact);
      rawZ += Number(d.zxing.exact);
    }
    for (const d of r.diagnostics || []) {
      if (d.path)
        assert.equal(
          sha(await readFile(resolve(root, family, d.path))),
          d.pngSha256,
        );
      processed++;
      diagJs += Number(d.decoders.jsQR.exact);
      diagZ += Number(d.decoders.zxing.exact);
    }
    if (family !== "view-sweep") {
      const html = gunzipSync(
        await readFile(resolve(root, family, `${r.id}.html.gz`)),
      ).toString("utf8");
      assert(!/<(?:svg|canvas|img|rect|script)\b/i.test(html), r.id);
      assert(!/url\(|https?:/i.test(html), r.id);
      assert(
        html.includes('id="text-body"') || html.includes('id="text-body"'),
      );
      const l = JSON.parse(
        await readFile(resolve(root, family, `${r.id}-layout.json`), "utf8"),
      );
      const lines = l.plainText.split("\n");
      assert(
        lines.every((x) => x.trim() && !/ {2,}/.test(x)),
        r.id,
      );
      assert.equal(l.spec.fontSize, 20);
      assert(l.structural.lineHeightEm >= 1.2);
      replays++;
    }
  }
  families.push({ family, rows: rows.length, frames });
}
assert.equal(replays, 64);
assert.equal(raw, 220);
assert.equal(rawJs, 0);
assert.equal(rawZ, 0);
assert.equal(processed, 136);
assert.equal(diagJs, 6);
assert.equal(diagZ, 15);
const configured = [];
for (const name of [
  "results.json",
  "native-results.json",
  "native-first-batch-results.json",
]) {
  const report = JSON.parse(
    await readFile(resolve(root, "reader-options", name), "utf8"),
  );
  for (const r of report.records) {
    const hash = r.inputPngSha256 || r.pngSha256;
    assert(inputHashes.has(hash), name + " " + JSON.stringify(r).slice(0, 160));
    if (r.exact) assert(r.payloads.includes("AQROBAT-TEST"));
  }
  configured.push({
    name,
    attempts: report.records.length,
    exact: report.records.filter((r) => r.exact).length,
  });
}
const native = JSON.parse(
  await readFile(resolve(root, "reader-options/native-results.json"), "utf8"),
);
assert.equal(native.uniqueSuccessfulFrames, 6);
assert.deepEqual(
  native.records.filter((r) => r.exact).map((r) => r.candidate),
  ["band-003", "band-009", "band-015", "band-021", "band-023", "band-024"],
);
const receipts = JSON.parse(
  await readFile(resolve(root, "calibration/receipts.json"), "utf8"),
);
assert.equal(
  receipts.receipts.filter(
    (r) => r.kind === "successful native HTML replay" && r.exact,
  ).length,
  6,
);
assert.equal(
  receipts.receipts.filter(
    (r) => r.kind === "uniform paragraph negative" && !r.recognized,
  ).length,
  2,
);
let bytes = 0;
async function size(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    if (e.isDirectory()) await size(q);
    else bytes += (await stat(q)).size;
  }
}
await size(root);
const result = {
  verifiedAt: new Date().toISOString(),
  families,
  completedLayouts: replays,
  rawFramesIncludingDisplayViews: raw,
  rawExactJsQR: rawJs,
  rawExactZXing: rawZ,
  processedDiagnostics: processed,
  processedExactJsQR: diagJs,
  processedExactZXing: diagZ,
  configured,
  replayHashesAndControls:
    "6 native successes and 2 ordinary negatives verified by calibration receipt",
  phaseDirectoryBytesBeforeThisReceipt: bytes,
  phone: "not tested",
  status: "passed",
};
await writeFile(
  resolve(root, "verification.json"),
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(JSON.stringify(result));
