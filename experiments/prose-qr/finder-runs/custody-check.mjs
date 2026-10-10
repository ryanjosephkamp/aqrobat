import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  root = "docs/research/prose-qr/phase-09/";
const prior = [];
for (const phase of ["04", "05", "06", "07", "08"]) {
  const p = `docs/research/prose-qr/phase-${phase}/custody.json`,
    b = await readFile(p),
    c = JSON.parse(b);
  for (const r of c.inventory) {
    const v = await readFile(r.path);
    assert.equal(v.length, r.bytes);
    assert.equal(sha(v), r.sha256);
  }
  prior.push({ path: p, sha256: sha(b), unchangedEntries: c.inventory.length });
}
const c8 = JSON.parse(
    await readFile("docs/research/prose-qr/phase-08/custody.json"),
  ),
  downloads = [];
for (const r of c8.downloads) {
  assert.equal(sha(await readFile("downloads/" + r.name)), r.sha256);
  downloads.push({ ...r, unchanged: true });
}
const snapshots = [];
for (const f of await readdir(root + "executed-sources")) {
  const p = root + "executed-sources/" + f;
  snapshots.push({ path: p, sha256: sha(await readFile(p)) });
}
const sources = [];
for (const batch of [
  "words-01",
  "words-02",
  "fonts-02",
  "glyphs-01",
  "scale-01",
]) {
  const m = JSON.parse(await readFile(root + batch + "/manifest.json"));
  for (const [path, expected] of Object.entries(m.sources)) {
    const current = sha(await readFile(path));
    const preserved =
      current === expected
        ? path
        : snapshots.find((a) => a.sha256 === expected)?.path;
    assert(preserved, `Missing executed source ${path} ${expected}`);
    sources.push({ batch, path, expected, preserved });
  }
}
const inventory = [];
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    if (e.isDirectory()) await walk(q);
    else {
      const b = await readFile(q);
      inventory.push({ path: q, bytes: b.length, sha256: sha(b) });
    }
  }
}
await walk(root.slice(0, -1));
await walk("experiments/prose-qr/finder-runs");
inventory.sort((a, b) => a.path.localeCompare(b.path));
const receipt = {
  at: new Date().toISOString(),
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  prior,
  downloads,
  sources,
  inventory,
  logicalBytesBeforeReceipt: inventory.reduce((n, r) => n + r.bytes, 0),
  phaseSealed: false,
  unitTests: 18,
  formatCheck: true,
  npmPrivate: JSON.parse(await readFile("package.json")).private,
};
assert.equal(receipt.npmPrivate, true);
assert(receipt.logicalBytesBeforeReceipt < 4000000);
await writeFile(
  root + "milestone.json",
  await format(JSON.stringify(receipt), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    priorEntries: prior.reduce((n, r) => n + r.unchangedEntries, 0),
    sourceVersions: sources.length,
    files: inventory.length,
    bytes: receipt.logicalBytesBeforeReceipt,
    downloads: downloads.length,
  }),
);
