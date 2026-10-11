import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-06",
  scope = [root, "experiments/prose-qr/finder-native"],
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
async function files(p) {
  const all = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    all.push(...(e.isDirectory() ? await files(q) : [q]));
  }
  return all;
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
const verification = JSON.parse(
  await readFile(root + "/verification-final.json", "utf8"),
);
assert.equal(verification.candidates, 39);
assert.equal(verification.fullQrControls, 10);
assert.equal(verification.correctFinderGeometry.length, 0);
const receipt = {
  sealedAt: new Date().toISOString(),
  baseline: "52fa086b970d585e8087db25503114ab55c65c8f",
  milestoneCommit: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  sourceSha256: sha(await readFile(new URL(import.meta.url))),
  scope,
  logicalFileSafeguardBytes: 6_000_000,
  logicalBytesIncludingReceipt: 0,
  excludes:
    "Git object storage; inventory excludes this self-referential receipt; no duplicated local handback directory",
  counts: {
    uniquePlannedNativeCases: 40,
    nativeFinderLayouts: 39,
    sourceWidthRejections: 1,
    intendedOrdinaryLocatorGeometries: 0,
    exactImmediateNativeRepeats: 39,
    fullQrControls: 10,
    passingInitialFullQrControlAttempts: 30,
    solidFinderControls: 10,
    retainedPixelReplayPairs: 59,
    additionalPassingControlAttemptsInReplay: 30,
    passiveRankAuditInputs: 3,
    encodedCandidatePayloads: 0,
    phoneCandidates: 0,
    abortedCaptureBatches: 4,
  },
  prior: verification.prior,
  downloads: verification.downloads,
  inventory,
};
const baseBytes = inventory.reduce((s, r) => s + r.bytes, 0);
let output = "";
for (let i = 0; i < 10; i++) {
  output = await format(JSON.stringify(receipt), { parser: "json" });
  const total = baseBytes + Buffer.byteLength(output);
  if (total === receipt.logicalBytesIncludingReceipt) break;
  receipt.logicalBytesIncludingReceipt = total;
}
assert.equal(
  baseBytes + Buffer.byteLength(output),
  receipt.logicalBytesIncludingReceipt,
);
assert(receipt.logicalBytesIncludingReceipt < 6_000_000);
await writeFile(root + "/custody.json", output, { flag: "wx" });
console.log(
  JSON.stringify({
    files: inventory.length,
    bytes: receipt.logicalBytesIncludingReceipt,
    cap: 6_000_000,
  }),
);
