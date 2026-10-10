import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-08",
  scope = [root, "experiments/prose-qr/finder-region"],
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
const v = JSON.parse(await readFile(root + "/verification-final.json")),
  a = JSON.parse(await readFile(root + "/analysis.json")),
  b = JSON.parse(await readFile(root + "/browser-check.json"));
assert.equal(v.replay.pairs, 35);
assert.equal(v.replay.native, 27);
assert.equal(a.ordinaryCoordinateDimensionPasses, 3);
assert.equal(a.layoutsWithAnyStableCentralRow, 0);
assert.equal(a.sourcePackingRejections, 2);
assert.equal(v.npmPrivate, true);
assert(b.promptExact && b.checkpointDownloadExact);
for (const old of v.prior) {
  const bytes = await readFile(old.path);
  assert.equal(sha(bytes), old.sha256);
  for (const e of JSON.parse(bytes).inventory) {
    const bytes = await readFile(e.path);
    assert.equal(bytes.length, e.bytes);
    assert.equal(sha(bytes), e.sha256);
  }
}
for (const d of v.downloads)
  assert.equal(sha(await readFile("downloads/" + d.name)), d.sha256);
const repair = JSON.parse(await readFile(root + "/handback-repair.json"));
assert.equal(
  sha(
    gunzipSync(
      await readFile(
        root + "/source-versions/handback-before-token-repair.html.gz",
      ),
    ),
  ),
  repair.originalHTMLSha256,
);
assert.equal(
  sha(await readFile("experiments/prose-qr/finder-region/report.py")),
  a.sourceScriptSha256,
);
assert.equal(
  sha(await readFile("experiments/prose-qr/finder-region/repair-handback.py")),
  repair.sourceSha256,
);
async function files(p) {
  const rows = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    rows.push(...(e.isDirectory() ? await files(q) : [q]));
  }
  return rows;
}
const inventory = [];
for (const path of (await Promise.all(scope.map(files))).flat().sort()) {
  if (path === resolve(root, "custody.json")) continue;
  const bytes = await readFile(path);
  inventory.push({
    path: relative(process.cwd(), path),
    bytes: bytes.length,
    sha256: sha(bytes),
  });
}
const c = {
  sealedAt: new Date().toISOString(),
  baseline: "3bead571699cc767d03d5f96e829c0c85f694dd4",
  sealedFromHead: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  scope,
  logicalFileSafeguardBytes: 3000000,
  logicalBytesIncludingReceipt: 0,
  excludes: "Git objects; inventory excludes this self-referential receipt",
  counts: {
    sourceProposals: 29,
    nativeFinderLayouts: 27,
    sourcePackingRejections: 2,
    ordinaryCoordinateDimensionPasses: 3,
    stableCentralSpanLayouts: 0,
    automaticLegibilityRejections: 8,
    exactImmediateRepeats: 27,
    exactOldSeedReplays: 4,
    initialFullControls: 4,
    initialPassingProfileAttempts: 12,
    solidControls: 4,
    finalReadOnlyPairs: 35,
    finalAdditionalControlProfileAttempts: 12,
    earlierReadOnlyPairs: 26,
    earlierAdditionalControlProfileAttempts: 6,
    passiveScoreAuditInputs: 4,
    verifierDenominatorFailures: 1,
    payloads: 0,
    phoneCandidates: 0,
    phoneTests: 0,
  },
  prior: v.prior,
  downloads: v.downloads,
  goal: "unsolved",
  inventory,
};
const bytes = inventory.reduce((n, e) => n + e.bytes, 0);
let output = "";
for (let i = 0; i < 10; i++) {
  output = await format(JSON.stringify(c), { parser: "json" });
  const size = bytes + Buffer.byteLength(output);
  if (size === c.logicalBytesIncludingReceipt) break;
  c.logicalBytesIncludingReceipt = size;
}
assert.equal(bytes + Buffer.byteLength(output), c.logicalBytesIncludingReceipt);
assert(c.logicalBytesIncludingReceipt < 3000000);
await writeFile(root + "/custody.json", output, { flag: "wx" });
console.log(
  JSON.stringify({
    entries: inventory.length,
    logicalBytes: c.logicalBytesIncludingReceipt,
    cap: 3000000,
  }),
);
