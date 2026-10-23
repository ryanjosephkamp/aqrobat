import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-05",
  scope = [root, "experiments/prose-qr/glyph-geometry"],
  sha = (b) => createHash("sha256").update(b).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
async function walk(p) {
  const result = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    result.push(...(e.isDirectory() ? await walk(q) : [q]));
  }
  return result;
}
const inventory = [];
for (const p of (await Promise.all(scope.map(walk))).flat().sort()) {
  const path = relative(process.cwd(), p);
  assert(!path.endsWith("/custody.json"), "Already sealed");
  const b = await readFile(p);
  inventory.push({ path, bytes: (await stat(p)).size, sha256: sha(b) });
}
const baseline = "dbcd32f86830486b4ba2fc99006fcef58691b607",
  changes = git("diff", baseline, "--name-only").split("\n").filter(Boolean);
assert(changes.every((p) => scope.some((s) => p.startsWith(s + "/"))));
const verification = JSON.parse(
  await readFile(root + "/verification-final.json", "utf8"),
);
assert.equal(verification.candidates, 40);
assert.equal(verification.controls, 6);
assert.equal(verification.modelProposals, 384);
assert.equal(verification.exactNativeRepeats, 40);
assert.equal(verification.priorPhaseInventoryUnchanged, 460);
const receipt = {
  sealedAt: new Date().toISOString(),
  baseline,
  milestoneCommit: "ef130c426fd34345008e9a7f5104df307cc53b5f",
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  sourceSha256: sha(await readFile(new URL(import.meta.url))),
  scope,
  logicalFileSafeguardBytes: 12_000_000,
  logicalBytesIncludingReceipt: 0,
  excludes:
    "Git object storage; inventory excludes this self-referential receipt; no duplicated local handback directory",
  counts: {
    nativeCandidates: 40,
    failedPayloadAttempts: 120,
    conventionalControls: 6,
    passingControlAttempts: 18,
    modelProposals: 384,
    nativeImmediateRepeatsExact: 40,
    abortedBatches: 1,
    uncompletedPlannedNativeCases: 4,
  },
  checks: {
    unitTests: "18/18 passed",
    formatting:
      "Repository format check passed; final seal source and receipt checked separately",
    sourceAndPixelCustody: "verification-final.json plus model-audit-01.json",
    priorInventory: "All 460 files unchanged",
    originalDownloads: "All three SHA-256 hashes unchanged",
    handback:
      "390-pixel viewport; exact checkpoint download; diagram switches; simulated blocked-clipboard fallback",
    scope:
      "Only the two listed directories; Git whitespace check required before commit",
  },
  productVersion: "0.4.2",
  npmPrivate: true,
  npmPublication: "none",
  draftPr: "https://github.com/ryanjosephkamp/aqrobat/pull/1",
  browsers:
    "All task-owned capture, model-audit and handback browsers closed; no owner profiles or unrelated jobs stopped",
  newPhoneObservations: "none",
  proseAcceptance: "unsolved; no ordinary-reader or phone candidate",
  replayLimitation:
    "Phase-04 six-of-eight display replay limitation remains preserved and unresolved; phase-05 native immediate repeats are separate",
  inventory,
};
const bytes = inventory.reduce((s, r) => s + r.bytes, 0);
let body;
for (let i = 0; i < 10; i++) {
  body = await format(JSON.stringify(receipt), { parser: "json" });
  const total = bytes + Buffer.byteLength(body);
  if (total === receipt.logicalBytesIncludingReceipt) break;
  receipt.logicalBytesIncludingReceipt = total;
}
body = await format(JSON.stringify(receipt), { parser: "json" });
assert.equal(
  bytes + Buffer.byteLength(body),
  receipt.logicalBytesIncludingReceipt,
);
assert(
  receipt.logicalBytesIncludingReceipt < receipt.logicalFileSafeguardBytes,
);
await writeFile(root + "/custody.json", body, { flag: "wx" });
console.log(
  JSON.stringify({
    files: inventory.length,
    logicalBytesIncludingReceipt: receipt.logicalBytesIncludingReceipt,
  }),
);
