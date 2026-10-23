import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-09/",
  source = "experiments/prose-qr/session-2026-10-09",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  plan = JSON.parse(await readFile(root + "verification-inputs.json")),
  verified = JSON.parse(await readFile(root + "verification.json"));
assert(verified.verified);
for (const f of plan.files) {
  const b = await readFile(f.path);
  assert.equal(b.length, f.bytes);
  assert.equal(sha(b), f.sha256);
}
const report = JSON.parse(
  await readFile(root + "report-check-03/receipt.json"),
);
assert(
  report.promptExact &&
    report.clipboardDeniedFallback &&
    report.errors.length === 0 &&
    report.externalRequests.length === 0,
);
for (const [p, h] of Object.entries(report.sources))
  assert.equal(sha(await readFile(p)), h);
const pr = JSON.parse(await readFile(root + "pr-state-before-seal.json"));
assert(
  pr.isDraft &&
    pr.state === "OPEN" &&
    pr.headRefName === "codex/aqrobat-foundation" &&
    pr.baseRefName === "main",
);
const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim(),
  head = git("rev-parse", "HEAD");
assert.equal(head, pr.headRefOid);
assert.equal(head, git("rev-parse", "origin/codex/aqrobat-foundation"));
for (const d of verified.downloads)
  assert.equal(sha(await readFile("downloads/" + d.name)), d.sha256);
assert.equal(JSON.parse(await readFile("package.json")).private, true);
const final = {
  at: new Date().toISOString(),
  anchorHead: head,
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  verified: true,
  preHandbackFileHashes: verified.fileHashes,
  recordedSourceEvidenceRefs: verified.sourceRefs.length,
  PNGFiles: 137,
  exactPriorRGBAReceiptMatches: 116,
  firstObservedRGBAHashes: 21,
  priorCustodyEntries: 1268,
  productDownloads: 3,
  productTreeUnchangedSince: verified.productTreeUnchangedSince,
  nativeCompleted: 96,
  nativeExactImmediateRepeats: 96,
  partialNativeAttempts: 2,
  fullPayloadSources: 2,
  ordinaryNativeProfileChecks: 14,
  exactNativeReturns: 2,
  successfulReaderImplementations: 1,
  ordinaryControlChecks: 14,
  exactControlReturns: 14,
  phoneTests: 0,
  phoneCandidates: 0,
  unitTests: {
    command: "npm test",
    passed: 18,
    evidence:
      "Observed tool output this turn; product code unchanged afterward",
  },
  formatCheck:
    "Passed full repository check; final staged check required before commit",
  reportChecks: {
    attempts: 3,
    passed: 1,
    failed: 2,
    passingReceipt: root + "report-check-03/receipt.json",
    nativeClipboard: "untested",
  },
  goal: "unsolved",
  sources: Object.fromEntries(
    await Promise.all(
      [
        root + "verification.json",
        root + "verification-inputs.json",
        root + "verification-pixels.json",
        root + "analysis.json",
        root + "report-check-03/receipt.json",
        root + "CHECKPOINT.md",
        root + "index.html",
        source + "/seal.mjs",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
};
await writeFile(
  root + "verification-final.json",
  await format(JSON.stringify(final), { parser: "json" }),
  { flag: "wx" },
);
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
for (const s of plan.scopes) for (const p of s.paths) await walk(p);
await walk(root.slice(0, -1));
await walk(source);
inventory.sort((a, b) => a.path.localeCompare(b.path));
const scopes = plan.scopes.map((s) => ({
  ...s,
  logicalBytes: inventory
    .filter((f) => s.paths.some((p) => f.path.startsWith(p + "/")))
    .reduce((n, f) => n + f.bytes, 0),
}));
for (const s of scopes) assert(s.logicalBytes < s.cap);
const sessionBytes = inventory
  .filter((f) => f.path.startsWith(root) || f.path.startsWith(source + "/"))
  .reduce((n, f) => n + f.bytes, 0);
const receipt = {
  sealedAt: new Date().toISOString(),
  anchorHead: head,
  branch: final.branch,
  remote: final.remote,
  goal: "unsolved",
  scope:
    "Phases09–31 and this session report/source; prior phases remain separate sealed custody",
  prior: verified.prior,
  milestones: verified.milestones,
  downloads: verified.downloads,
  counts: {
    nativeComplete: 96,
    exactImmediateRepeats: 96,
    partialNativeAttempts: 2,
    fullPayloadSources: 2,
    phoneTests: 0,
    phoneCandidates: 0,
  },
  phaseBudgets: scopes,
  sessionCap: 3000000,
  sessionLogicalBytesIncludingReceipt: 0,
  totalLogicalBytesIncludingReceipt: 0,
  excludes:
    "Git objects; inventory excludes only this self-referential custody receipt",
  inventory,
};
let content;
for (let i = 0; i < 10; i++) {
  content = await format(JSON.stringify(receipt), { parser: "json" });
  const a = sessionBytes + Buffer.byteLength(content),
    b = inventory.reduce((n, f) => n + f.bytes, 0) + Buffer.byteLength(content);
  if (
    receipt.sessionLogicalBytesIncludingReceipt === a &&
    receipt.totalLogicalBytesIncludingReceipt === b
  )
    break;
  receipt.sessionLogicalBytesIncludingReceipt = a;
  receipt.totalLogicalBytesIncludingReceipt = b;
}
assert(receipt.sessionLogicalBytesIncludingReceipt <= receipt.sessionCap);
assert.equal(
  sessionBytes + Buffer.byteLength(content),
  receipt.sessionLogicalBytesIncludingReceipt,
);
await writeFile(root + "custody.json", content, { flag: "wx" });
console.log(
  JSON.stringify({
    sealed: true,
    files: inventory.length,
    logicalBytes: receipt.totalLogicalBytesIncludingReceipt,
    sessionBytes: receipt.sessionLogicalBytesIncludingReceipt,
    capsPassed: scopes.length,
    anchorHead: head,
  }),
);
