import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
const root = resolve("docs/research/prose-qr/phase-05"),
  hash = (b) => createHash("sha256").update(b).digest("hex");
async function files(p) {
  const result = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    result.push(...(e.isDirectory() ? await files(q) : [q]));
  }
  return result;
}
const list = await files(root),
  archives = new Map();
for (const p of list.filter((p) => p.endsWith(".mjs.txt")))
  archives.set(hash(await readFile(p)), relative(process.cwd(), p));
const batches = [],
  sources = [],
  wins = { jsQR: [], ordinaryZXing: [], baselineZXing: [] };
let candidates = 0,
  controls = 0,
  replays = 0,
  modelProposals = 0;
async function png(base, r) {
  const b = await readFile(resolve(base, r.path));
  assert.equal(hash(b), r.pngSha256);
  assert.equal(b.readUInt32BE(16), r.width);
  assert.equal(b.readUInt32BE(20), r.height);
}
for (const manifestPath of list
  .filter((p) => p.endsWith("/manifest.json"))
  .sort()) {
  const base = resolve(manifestPath, ".."),
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const [p, sha] of Object.entries(manifest.sourceHashes)) {
    const same = hash(await readFile(p)) === sha,
      archived = archives.get(sha);
    assert(same || archived, `Lost executed source: ${p}`);
    sources.push({
      batch: relative(root, base),
      path: p,
      sha256: sha,
      preservedAt: same ? p : archived,
    });
  }
  let rows = [],
    aborted = null;
  try {
    rows = (await readFile(resolve(base, "results.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  try {
    aborted = JSON.parse(await readFile(resolve(base, "aborted.json"), "utf8"));
    assert.equal(aborted.completed, rows.length);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (!aborted) assert.equal(rows.length, manifest.specs.length);
  assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
  for (const r of rows) {
    assert.deepEqual(
      r.spec,
      manifest.specs.find((s) => s.id === r.id),
    );
    await png(base, r);
    const gzip = await readFile(resolve(base, r.id + ".html.gz")),
      txt = await readFile(resolve(base, r.id + ".txt"));
    assert.equal(hash(gzip), r.gzipSha256);
    assert.equal(hash(txt), r.txtSha256);
    assert(gunzipSync(gzip).toString().includes('id="text-body"'));
    const l = JSON.parse(
      await readFile(resolve(base, r.id + "-layout.json"), "utf8"),
    );
    assert.equal(txt.toString(), l.plainText);
    assert(!l.plainText.includes("  "));
    assert(l.plainText.split("\n").every((s) => s.trim()));
    assert.equal(r.style.childElements, 0);
    if (r.structural.closeLeading)
      assert(r.structural.globalInkEnvelope <= l.lineHeight);
    if (r.structural.fullParagraphModel) {
      const t = JSON.parse(
          await readFile(resolve(base, r.id + "-model-trace.json"), "utf8"),
        ),
        lines = t.seedText.split("\n");
      assert.equal(t.trace.length, 96);
      for (const trial of t.trace) {
        const before = lines[trial.row];
        assert.equal(
          before.slice(trial.col, trial.col + trial.length),
          trial.old,
        );
        assert.equal(trial.candidate.length, trial.length);
        lines[trial.row] =
          before.slice(0, trial.col) +
          trial.candidate +
          before.slice(trial.col + trial.length);
        assert.equal(hash(lines.join("\n")), trial.textSha256);
        if (!trial.accepted) lines[trial.row] = before;
      }
      assert.equal(lines.join("\n"), t.finalText);
      assert.equal(t.finalText, l.plainText);
      assert(t.finalLoss <= t.initialLoss);
      for (const [name, sha] of [
        ["initial", t.initialPngSha256],
        ["final", t.finalPngSha256],
      ])
        assert.equal(
          hash(
            await readFile(
              resolve(base, "raw/" + r.id + "-model-" + name + ".png"),
            ),
          ),
          sha,
        );
      assert.equal(r.model.actualDomRgbaSha256, r.rgbaSha256);
      assert.equal(r.model.modelFinalRgbaSha256, t.finalRgbaHash);
      modelProposals += t.trace.length;
    }
    if (r.replay.repeatMatches) {
      assert.equal(r.replay.repeatedPNGHash, r.pngSha256);
      replays++;
    } else {
      const b = await readFile(resolve(base, "raw/" + r.id + "-repeat.png"));
      assert.equal(hash(b), r.replay.repeatedPNGHash);
    }
    for (const [k, v] of Object.entries({
      jsQR: r.baseline.jsQR.exact,
      ordinaryZXing: r.ordinaryZXing.exact,
      baselineZXing: r.baseline.zxing.exact,
    }))
      if (v) wins[k].push(relative(root, base) + "/" + r.id);
  }
  const c = JSON.parse(await readFile(resolve(base, "controls.json"), "utf8"));
  for (const r of c) {
    await png(base, r);
    assert(
      r.baseline.jsQR.exact && r.baseline.zxing.exact && r.ordinaryZXing.exact,
    );
  }
  candidates += rows.length;
  controls += c.length;
  batches.push({
    batch: relative(root, base),
    planned: manifest.specs.length,
    retained: rows.length,
    controls: c.length,
    unattempted: manifest.specs
      .filter((s) => !rows.some((r) => r.id === s.id))
      .map((s) => s.id),
    aborted,
  });
}
const old = JSON.parse(
  await readFile("docs/research/prose-qr/phase-04/custody.json", "utf8"),
);
for (const r of old.inventory) {
  const b = await readFile(r.path);
  assert.equal(b.length, r.bytes);
  assert.equal(hash(b), r.sha256);
}
const oldVerification = JSON.parse(
    await readFile(
      "docs/research/prose-qr/phase-04/verification-final.json",
      "utf8",
    ),
  ),
  downloads = [];
for (const r of oldVerification.downloads) {
  const sha = hash(await readFile("downloads/" + r.name));
  assert.equal(sha, r.sha256);
  downloads.push({ ...r, unchanged: true });
}
const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(pkg.private, true);
assert.equal(pkg.version, "0.4.2");
let bytes = 0;
for (const p of [
  ...list,
  ...(await files(resolve("experiments/prose-qr/glyph-geometry"))),
])
  bytes += (await stat(p)).size;
assert(bytes < 12_000_000);
const receipt = {
  verifiedAt: new Date().toISOString(),
  sourceScriptSha256: hash(await readFile(new URL(import.meta.url))),
  scopeBaseline: "dbcd32f86830486b4ba2fc99006fcef58691b607",
  batches,
  candidates,
  modelProposals,
  controls,
  wins,
  exactNativeRepeats: replays,
  priorPhaseInventoryUnchanged: old.inventory.length,
  downloads,
  sourceCustody: sources,
  phaseBytesBeforeReceipt: bytes,
  logicalFileSafeguardBytes: 12_000_000,
  npmPrivate: pkg.private,
  productVersion: pkg.version,
  newPhoneObservations: "none",
  proseAcceptance: "unsolved",
  note: "Read-only hashes/counts/provenance reconciliation; no new decoding trials or native replays. Older phase-04 six-of-eight display replay limitation remains unchanged.",
};
const output = process.argv[2] || "verification-01.json";
assert(/^[a-z0-9-]+\.json$/.test(output));
await writeFile(
  resolve(root, output),
  await format(JSON.stringify(receipt), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    candidates,
    controls,
    wins,
    exactNativeRepeats: replays,
    phaseBytesBeforeReceipt: bytes,
    priorPhaseInventoryUnchanged: old.inventory.length,
  }),
);
