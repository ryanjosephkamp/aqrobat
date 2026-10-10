import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-07",
  scope = [root, "experiments/prose-qr/finder-span"],
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
async function files(p) {
  const list = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    list.push(...(e.isDirectory() ? await files(q) : [q]));
  }
  return list;
}
const inventory = [];
for (const p of (await Promise.all(scope.map(files))).flat().sort()) {
  if (p === resolve(root, "custody.json")) continue;
  const b = await readFile(p);
  inventory.push({
    path: relative(process.cwd(), p),
    bytes: b.length,
    sha256: sha(b),
  });
}
const v = JSON.parse(await readFile(root + "/verification.json", "utf8"));
assert.equal(v.nativeFinderLayouts, 5);
assert.equal(v.intendedOrdinaryLocatorGeometries, 0);
assert.equal(v.readOnlyPixelReplay.passed, 11);
assert.equal(v.readOnlyPixelReplay.failed, 0);
const receipt = {
  sealedAt: new Date().toISOString(),
  baseline: "80f1b54a024cfb456f287078f2af7edb7e2579f8",
  sealedFromHead: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  scope,
  logicalFileSafeguardBytes: 1_500_000,
  logicalBytesIncludingReceipt: 0,
  excludes:
    "Git object storage; inventory excludes this self-referential receipt",
  counts: {
    uniquePlannedNativeCases: 6,
    nativeFinderLayouts: 5,
    intendedOrdinaryLocatorGeometries: 0,
    sourceWidthRejections: 1,
    exactImmediateNativeRepeats: 5,
    fullQrControls: 3,
    initialPassingControlAttempts: 9,
    solidFinderControls: 3,
    readOnlyPixelReplayPairs: 11,
    additionalPassingControlAttempts: 9,
    encodedCandidatePayloads: 0,
    phoneCandidates: 0,
    abortedCaptureBatches: 1,
  },
  prior: v.prior,
  downloads: v.downloads,
  inventory,
};
const base = inventory.reduce((n, r) => n + r.bytes, 0);
let output = "";
for (let i = 0; i < 10; i++) {
  output = await format(JSON.stringify(receipt), { parser: "json" });
  const total = base + Buffer.byteLength(output);
  if (total === receipt.logicalBytesIncludingReceipt) break;
  receipt.logicalBytesIncludingReceipt = total;
}
assert.equal(
  base + Buffer.byteLength(output),
  receipt.logicalBytesIncludingReceipt,
);
assert(receipt.logicalBytesIncludingReceipt < 1_500_000);
await writeFile(root + "/custody.json", output, { flag: "wx" });
console.log(
  JSON.stringify({
    files: inventory.length,
    bytes: receipt.logicalBytesIncludingReceipt,
    cap: 1_500_000,
  }),
);
