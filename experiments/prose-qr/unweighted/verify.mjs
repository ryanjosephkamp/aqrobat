import assert from "node:assert/strict";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { gunzipSync } from "node:zlib";
import { format } from "prettier";
import { sha } from "./capture.mjs";

const root = resolve("docs/research/prose-qr/phase-03");
const batches = [
  "color-01",
  "plain-02",
  "refine-01",
  "font-color-01",
  "words-01",
  "compact-01",
];
async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await files(path)));
    else out.push(path);
  }
  return out;
}
const inventory = [];
for (const dir of [
  root,
  resolve("experiments/prose-qr/unweighted"),
  resolve("docs/research/prose-qr/techniques"),
]) {
  for (const path of await files(dir)) {
    if (/\/verification(?:-final)?\.json$/.test(path)) continue;
    const bytes = await readFile(path);
    inventory.push({
      path: relative(process.cwd(), path),
      bytes: bytes.length,
      sha256: sha(bytes),
    });
  }
}
const hashes = new Set(inventory.map((x) => x.sha256));
const all = [];
let controls = 0;
const summary = [];
for (const batch of batches) {
  const dir = resolve(root, batch);
  const manifest = JSON.parse(
    await readFile(resolve(dir, "manifest.json"), "utf8"),
  );
  assert.equal(
    sha(await readFile("docs/research/prose-qr/pilot-02/metrics.json")),
    manifest.metricsSha256,
  );
  for (const [path, hash] of Object.entries(manifest.sourceHashes)) {
    const current = sha(await readFile(resolve(path)));
    assert(
      current === hash || hashes.has(hash),
      `Executed source missing: ${path} ${hash}`,
    );
  }
  const rows = (await readFile(resolve(dir, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  for (const r of rows) {
    assert.equal(sha(await readFile(resolve(dir, r.path))), r.pngSha256);
    const gzip = await readFile(resolve(dir, `${r.id}.html.gz`));
    assert.equal(sha(gzip), r.htmlGzipSha256);
    assert(gunzipSync(gzip).toString("utf8").includes('id="text-body"'));
    assert.equal(r.computedStyle.bodyWeight, "400");
    assert.deepEqual(r.computedStyle.glyphWeights, ["400"]);
    if (r.spec.track === "plain-black") {
      assert.equal(r.computedStyle.bodyColor, "rgb(0, 0, 0)");
      assert.deepEqual(r.computedStyle.glyphColors, ["rgb(0, 0, 0)"]);
      const l = JSON.parse(
        await readFile(resolve(dir, `${r.id}-layout.json`), "utf8"),
      );
      assert(/^[A-Za-z .,\n]+$/.test(l.plainText));
      assert(!l.plainText.includes("  "), "No artificial internal space runs");
      assert(l.plainText.split("\n").every((x) => x.trim().length));
    }
    assert(!r.baseline.jsQR.exact && !r.baseline.zxing.exact);
    assert.equal(
      r.configured.exact,
      r.configured.payloads.includes(r.spec.payload),
    );
    all.push({ ...r, batch });
  }
  const cs = JSON.parse(await readFile(resolve(dir, "controls.json"), "utf8"));
  for (const r of cs) {
    assert.equal(sha(await readFile(resolve(dir, r.path))), r.pngSha256);
    assert(
      r.baseline.jsQR.exact && r.baseline.zxing.exact && r.configured.exact,
    );
  }
  controls += cs.length;
  summary.push({
    batch,
    completed: rows.length,
    baselineExact: 0,
    primaryConfiguredExact: rows.filter((r) => r.configured.exact).length,
  });
}
assert.equal(all.length, 65);
assert.equal(all.filter((r) => r.spec.track === "plain-black").length, 43);
const success = new Set(
  all.filter((r) => r.configured.exact).map((r) => r.batch + "/" + r.id),
);
const sweeps = [];
for (const name of [
  "reader-options.json",
  "followup-reader-options.json",
  "compact-reader-options.json",
]) {
  const data = JSON.parse(await readFile(resolve(root, name), "utf8"));
  assert.equal(data.attempts, data.records.length);
  for (const r of data.records) {
    const input = all.find((x) => x.batch === r.batch && x.id === r.id);
    assert.equal(r.inputPNGSha256, input.pngSha256);
    assert.equal(r.exact, r.payloads.includes(input.spec.payload));
    if (r.exact) success.add(r.batch + "/" + r.id);
  }
  sweeps.push({
    file: name,
    inputs: data.inputFrames,
    attempts: data.attempts,
    exactAttempts: data.exactAttempts,
    uniqueSuccessfulFrames: data.uniqueSuccessfulFrames,
  });
}
assert.equal(success.size, 6);
const proofs = [];
for (const [dir, id] of [
  ["txt-proof", "plain-003"],
  ["txt-url-proof", "refine-005"],
  ["txt-varied-proof", "refine-001"],
]) {
  const p = JSON.parse(
    await readFile(resolve(root, dir, "receipts.json"), "utf8"),
  );
  assert.equal(
    sha(await readFile(resolve(root, dir, id + ".txt"))),
    p.sourceTXTSha256,
  );
  assert.equal(
    sha(await readFile(resolve(root, dir, id + "-from-txt.html"))),
    p.sourceHTMLSha256,
  );
  for (const r of p.receipts)
    assert.equal(
      sha(await readFile(resolve(root, dir, r.kind + ".png"))),
      r.pngSha256,
    );
  const [replay, txt, lower, sorted] = p.receipts;
  assert(replay.configuredExact && txt.configuredExact);
  assert.equal(replay.pngSha256, p.originalNativePNG);
  assert.equal(txt.pngSha256, p.originalNativePNG);
  assert(!lower.configuredExact && !sorted.configuredExact);
  assert.deepEqual(lower.configuredPayloads, []);
  assert.deepEqual(sorted.configuredPayloads, []);
  proofs.push({
    dir,
    id,
    originalAndTXTMatch: true,
    exact: true,
    negativesWithNoPayload: 2,
  });
}
const portability = (
  await readFile(resolve(root, "portability/results.jsonl"), "utf8")
)
  .trim()
  .split("\n")
  .map(JSON.parse);
for (const r of portability) {
  assert.equal(
    sha(await readFile(resolve(root, "portability", r.path))),
    r.pngSha256,
  );
  assert.equal(
    sha(await readFile(resolve(root, r.spec.path))),
    r.TXTSourceSha256,
  );
  assert.equal(r.fontWeight, 400);
  assert.equal(r.ink, "black");
  assert(!r.baseline.jsQR.exact && !r.baseline.zxing.exact);
  for (const reader of r.readers)
    assert.equal(reader.exact, reader.payloads.includes(r.spec.payload));
}
assert.equal(portability.length, 16);
const styleDir = resolve("docs/research/prose-qr/techniques/styled-prose");
const styled = JSON.parse(
  await readFile(resolve(styleDir, "manifest.json"), "utf8"),
);
for (const r of [...styled.references, styled.source])
  assert.equal(sha(await readFile(resolve(styleDir, r.path))), r.sha256);
const product = JSON.parse(await readFile("package.json", "utf8"));
const pm = JSON.parse(
  await readFile(resolve(root, "portability/manifest.json"), "utf8"),
);
assert(
  hashes.has(pm.sourceScriptSha256),
  "Executed portability source present",
);
const aborted = JSON.parse(
  await readFile(resolve(root, "plain-01/manifest.json"), "utf8"),
);
for (const hash of Object.values(aborted.sourceHashes))
  assert(hashes.has(hash), "Aborted batch source retained");
const plainDir = resolve("docs/research/prose-qr/techniques/plain-ascii");
const plainManifest = JSON.parse(
  await readFile(resolve(plainDir, "manifest.json"), "utf8"),
);
for (const r of plainManifest.references)
  assert.equal(sha(await readFile(resolve(plainDir, r.path))), r.sha256);
assert.equal(product.version, "0.4.2");
assert.equal(product.private, true);
const output = {
  verifiedAt: new Date().toISOString(),
  method: "Read-only evidence reconciliation; no experiment reruns",
  completedGeneratedFrames: all.length,
  primaryConfiguredExact: all.filter((r) => r.configured.exact).length,
  uniqueConfiguredSuccessfulGeneratedFrames: [...success],
  completedBatchConventionalControls: controls,
  summary,
  sweeps,
  proofs,
  portability: {
    frames: portability.length,
    configuredAttempts: portability.reduce((n, r) => n + r.readers.length, 0),
    configuredExact: portability.reduce(
      (n, r) => n + r.readers.filter((x) => x.exact).length,
      0,
    ),
    successfulFrames: portability.filter((r) => r.readers.some((x) => x.exact))
      .length,
    baselineExact: 0,
  },
  styledReferencesUnchanged: true,
  product: { version: product.version, private: product.private },
  inventoryBytes: inventory.reduce((n, r) => n + r.bytes, 0),
  inventory,
};
await writeFile(
  resolve(root, process.argv[2] || "verification.json"),
  await format(JSON.stringify(output), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    completed: all.length,
    successes: [...success],
    controls,
    bytes: output.inventoryBytes,
  }),
);
