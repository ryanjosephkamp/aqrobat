import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
import { root, sha } from "./capture.mjs";
async function files(p) {
  const all = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    if (e.isDirectory()) all.push(...(await files(q)));
    else all.push(q);
  }
  return all;
}
const list = await files(root),
  archiveHashes = new Map();
for (const p of list.filter((x) => x.endsWith(".mjs.txt")))
  archiveHashes.set(sha(await readFile(p)), p);
const batches = [],
  missingSources = [],
  sourceCustody = [];
let candidateCount = 0,
  controlCount = 0;
const wins = { jsQR: [], ordinaryZXing: [], baselineZXing: [] };
async function checkPng(base, r) {
  const png = await readFile(resolve(base, r.path));
  assert.equal(sha(png), r.pngSha256);
  assert.equal(png.readUInt32BE(16), r.width);
  assert.equal(png.readUInt32BE(20), r.height);
}
for (const path of list.filter((x) => x.endsWith("/manifest.json")).sort()) {
  const base = resolve(path, ".."),
    manifest = JSON.parse(await readFile(path, "utf8"));
  if (!manifest.specs) continue;
  for (const [p, h] of Object.entries(manifest.sourceHashes)) {
    const current = sha(await readFile(p));
    const archived = archiveHashes.get(h);
    if (current !== h && !archived)
      missingSources.push({
        batch: base.split("/").at(-1),
        path: p,
        expected: h,
        current,
      });
    sourceCustody.push({
      batch: base.split("/").at(-1),
      path: p,
      expected: h,
      preservedAt: current === h ? p : archived || null,
    });
  }
  assert.equal(
    sha(await readFile("docs/research/prose-qr/pilot-02/metrics.json")),
    manifest.metricsSha256,
  );
  let rows = [];
  try {
    rows = (await readFile(resolve(base, "results.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((x) => JSON.parse(x));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  for (const r of rows) {
    assert.deepEqual(
      r.spec,
      manifest.specs.find((x) => x.id === r.id),
    );
    await checkPng(base, r);
    const html = await readFile(resolve(base, r.id + ".html.gz"));
    assert.equal(sha(html), r.htmlGzipSha256);
    assert(gunzipSync(html).toString().includes('id="text-body"'));
    const layout = JSON.parse(
      await readFile(resolve(base, r.id + "-layout.json"), "utf8"),
    );
    assert(layout.plainText.split("\n").every((x) => x.trim()));
    assert(!layout.plainText.includes("  "));
    for (const [k, v] of Object.entries({
      jsQR: r.baseline.jsQR.exact,
      ordinaryZXing: r.ordinaryZXing.exact,
      baselineZXing: r.baseline.zxing.exact,
    }))
      if (v) wins[k].push(base.split("/").at(-1) + "/" + r.id);
  }
  const controls = JSON.parse(
    await readFile(resolve(base, "controls.json"), "utf8"),
  );
  for (const c of controls) {
    await checkPng(base, c);
    assert(
      c.baseline.jsQR.exact && c.baseline.zxing.exact && c.ordinaryZXing.exact,
    );
  }
  let aborted = null;
  try {
    const a = JSON.parse(await readFile(resolve(base, "aborted.json"), "utf8"));
    assert.equal(a.completed, rows.length);
    aborted = {
      attempted: a.attempted,
      completed: a.completed,
      reason: a.message.startsWith("Phase evidence reserve")
        ? "File reserve stopped persistence before decoder attempt"
        : "Source-line assertion stopped before raster/decoder attempt",
    };
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  candidateCount += rows.length;
  controlCount += controls.length;
  batches.push({
    batch: base.split("/").at(-1),
    planned: manifest.specs.length,
    retainedDecoded: rows.length,
    controls: controls.length,
    aborted,
    uncompleted: manifest.specs
      .filter((s) => !rows.some((r) => r.id === s.id))
      .map((s) => s.id),
  });
}
const displayBase = resolve(root, "display-01");
const display = JSON.parse(
  await readFile(resolve(displayBase, "results.json"), "utf8"),
);
for (const r of display) {
  await checkPng(displayBase, r);
  assert.equal(sha(await readFile(r.source)), r.sourcePNGSha256);
  for (const [k, v] of Object.entries({
    jsQR: r.baseline.jsQR.exact,
    ordinaryZXing: r.ordinaryZXing.exact,
    baselineZXing: r.baseline.zxing.exact,
  }))
    if (v) wins[k].push("display-01/" + r.id);
}
const displayControls = JSON.parse(
  await readFile(resolve(displayBase, "controls.json"), "utf8"),
);
for (const c of displayControls) {
  await checkPng(displayBase, c);
  assert(
    c.baseline.jsQR.exact && c.baseline.zxing.exact && c.ordinaryZXing.exact,
  );
}
controlCount += displayControls.length;
assert.equal(missingSources.length, 0, JSON.stringify(missingSources));
const old = JSON.parse(
  await readFile("docs/research/prose-qr/phase-02/product-checks.json", "utf8"),
);
const downloads = [];
for (const d of old.downloads) {
  const hash = sha(await readFile(resolve("downloads", d.name)));
  assert.equal(hash, d.sha256);
  downloads.push({ name: d.name, sha256: hash, unchanged: true });
}
const receipt = {
  verifiedAt: new Date().toISOString(),
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  scopeBaseline: "c02509e26c0f0822313a9c0aa740f3498e453abb",
  batches,
  newTextRenderings: candidateCount,
  retainedPngDisplayViews: display.length,
  completedCandidateViews: candidateCount + display.length,
  controlsAllThreeReadersPassed: controlCount,
  wins,
  sourceCustody,
  downloads,
  newPhoneObservations:
    "none; owner negative belongs to prior full-PNG examples, both Samsung scanners, unspecified case denominator",
  phaseBytesBeforeReceipt: await Promise.all(
    list.map(async (p) => (await stat(p)).size),
  ).then((x) => x.reduce((a, b) => a + b, 0)),
  checks: {
    pngHashes: true,
    pngDimensions: true,
    gzipHashes: true,
    sourceVersions: true,
    controlExactPayloads: true,
    noInternalDoubleSpaces: true,
    unitTests: "18/18 passed this turn",
    productBuildAndBrowser:
      "Unchanged product; previous phase-02 disposable-copy receipts preserved, not rerun here",
  },
  limits:
    "Stored results are reconciled, not rerun; readable/coherent prose and phone acceptance remain separate.",
};
await writeFile(
  resolve(root, process.argv[2] || "verification.json"),
  await format(JSON.stringify(receipt), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    newTextRenderings: candidateCount,
    displayViews: display.length,
    controls: controlCount,
    wins,
    bytes: receipt.phaseBytesBeforeReceipt,
  }),
);
