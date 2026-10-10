import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { format } from "prettier";
import { unpackProbe } from "../context-probe-pack/probe-pack.mjs";
const root = "docs/research/prose-qr/session-2026-10-10-c/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = async (p) => JSON.parse(await readFile(p));
const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
assert.equal(process.cwd(), "/Users/noir/Documents/aqrobat");
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
const pr = JSON.parse(
  execFileSync(
    "gh",
    [
      "pr",
      "view",
      "1",
      "--json",
      "state,isDraft,headRefName,headRefOid,baseRefName,url",
    ],
    { encoding: "utf8" },
  ),
);
assert(
  pr.state === "OPEN" &&
    pr.isDraft &&
    pr.headRefName === "codex/aqrobat-foundation" &&
    pr.baseRefName === "main",
);
assert.equal(pr.headRefOid, git("rev-parse", "HEAD"));
assert.equal(
  git("ls-remote", "origin", "refs/heads/codex/aqrobat-foundation").split(
    /\s/,
  )[0],
  pr.headRefOid,
);
const intake = await read(root + "intake.json"),
  prior = intake.receipts,
  phases = [];
for (let n = 64; n <= 69; n++) {
  const path = `docs/research/prose-qr/phase-${n}/custody.json`;
  phases.push({ path, sha256: sha(await readFile(path)) });
}
let entries = 0;
const unique = new Map(),
  records = [],
  catalog = new Map(),
  caps = [];
for (const r of [...prior, ...phases]) {
  const b = await readFile(r.path);
  assert.equal(sha(b), r.sha256, r.path);
  const c = JSON.parse(b);
  records.push([r.path, c]);
  let bytes = b.length;
  for (const f of c.inventory ?? []) {
    const b = await readFile(f.path);
    assert.equal(b.length, f.bytes, f.path);
    assert.equal(sha(b), f.sha256, f.path);
    bytes += b.length;
    entries++;
    unique.set(f.path, f.sha256);
    if (f.path.endsWith(".json")) records.push([f.path, JSON.parse(b)]);
  }
  if (phases.some((p) => p.path === r.path)) {
    assert(bytes < c.cap, r.path);
    caps.push({ path: r.path, logicalBytes: bytes, cap: c.cap });
  }
}
for (const [p, h] of unique) {
  if (!catalog.has(h)) catalog.set(h, p);
  if (p.endsWith(".gz")) {
    const b = await readFile(p);
    if (b.length < 3000000) {
      const h = sha(gunzipSync(b));
      if (!catalog.has(h)) catalog.set(h, p + " (decompressed)");
    }
  }
}
let matching = 0;
const historical = [],
  labels = [];
for (const [origin, j] of records) {
  if (
    !j ||
    Array.isArray(j) ||
    typeof j.sources !== "object" ||
    Array.isArray(j.sources)
  )
    continue;
  for (const [p, h] of Object.entries(j.sources)) {
    if (typeof h !== "string" || !/^[a-f0-9]{64}$/.test(h)) continue;
    if (!p.includes("/")) {
      labels.push({ record: origin, label: p, sha256: h });
      continue;
    }
    let actual = null;
    try {
      actual = sha(await readFile(p));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (actual === h) matching++;
    else {
      assert(catalog.has(h), "Missing executed snapshot " + p);
      historical.push({
        record: origin,
        path: p,
        executedSha256: h,
        retainedSnapshot: catalog.get(h),
      });
    }
  }
}
let passiveProfiles = 0,
  stockBranches = 0,
  captureReceipts = 0,
  exactRepeats = 0;
for (const [p, j] of records) {
  if (!/^docs\/research\/prose-qr\/phase-(6[4-9])\//.test(p)) continue;
  if (p.endsWith("/passive-summary.json")) {
    const raw = JSON.parse(
      gunzipSync(
        await readFile(
          p.replace("passive-summary.json", "passive-full.json.gz"),
        ),
      ),
    );
    assert(j.passiveReturnsMatch && raw.passiveReturnsMatch);
    assert.equal(j.scans.length, raw.scans.length);
    for (let i = 0; i < j.scans.length; i++) {
      assert.deepEqual(j.scans[i].selected, raw.scans[i].selected);
      assert.deepEqual(j.scans[i].locations, raw.scans[i].locations);
      assert.equal(j.scans[i].scoredRuns, raw.scans[i].allScoredRuns.length);
      assert.equal(j.scans[i].quads, raw.scans[i].allQuads.length);
    }
    passiveProfiles++;
    stockBranches += j.scans.length;
  }
  if (p.endsWith("/capture.json") && j.pngPath) {
    assert.equal(sha(await readFile(j.pngPath)), j.pngSha256);
    captureReceipts++;
    if (j.repeatExact) {
      assert.equal(j.repeatSha256, j.pngSha256);
      exactRepeats++;
    }
  }
}
const unpacked = 0;
for (const d of intake.downloads)
  assert.equal(sha(await readFile("downloads/" + d.name)), d.sha256, d.name);
assert.equal((await read("package.json")).private, true);
assert.equal(
  git(
    "diff",
    "--name-only",
    intake.baseline,
    "--",
    ".",
    ":(exclude)docs/research/prose-qr",
    ":(exclude)experiments/prose-qr",
  ),
  "",
);
const dirty = git("status", "--porcelain");
assert(
  dirty
    .split("\n")
    .filter(Boolean)
    .every((l) =>
      /^.{3}(docs\/research\/prose-qr\/|experiments\/prose-qr\/)/.test(l),
    ),
);
const aggregate = await read(root + "analysis.json");
assert.equal(aggregate.totals.nativeCaptureAttempts, 14);
assert.equal(aggregate.totals.nativeExactImmediateRepeats, 14);
assert.equal(aggregate.totals.uniqueNativePNGHashes, 11);
assert.equal(aggregate.totals.plannedPrimaryReaderSlots, 90);
assert.equal(aggregate.totals.completedPrimaryReaderSlots, 72);
assert.equal(aggregate.totals.unattemptedPrimaryReaderSlots, 18);
assert.equal(aggregate.totals.strictNativePasses, 0);
assert.equal(passiveProfiles, 24);
assert.equal(stockBranches, 43);
const browser = await read(root + "report-check-01/receipt.json"),
  pixels = await read(root + "pixel-verification.json");
assert(browser.passed && pixels.passed);
for (const r of [browser, pixels, aggregate])
  for (const [p, h] of Object.entries(r.sources))
    assert.equal(sha(await readFile(p)), h, p);
const sources = {};
for (const p of [
  "analysis.json",
  "README.md",
  "CHECKPOINT.md",
  "HARNESS-NOTES.md",
  "ERRATA.md",
  "index.html",
  "report-check-01/receipt.json",
  "pixel-verification.json",
])
  sources[root + p] = sha(await readFile(root + p));
for (const name of await readdir("experiments/prose-qr/session-2026-10-10-c")) {
  const p = "experiments/prose-qr/session-2026-10-10-c/" + name;
  sources[p] = sha(await readFile(p));
}
const result = {
  at: new Date().toISOString(),
  passed: true,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  anchorHead: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  pr,
  dirtyResearchOnly: true,
  prior,
  phases,
  caps,
  verifiedInventoryEntries: entries,
  uniqueInventoryPaths: unique.size,
  sourceReferencesCurrentlyMatching: matching,
  historicalSourceReferences: historical,
  nonPathSourceLabels: labels,
  passiveProfilesChecked: passiveProfiles,
  actualStockBranchesChecked: stockBranches,
  individualNativeCaptureReceiptsChecked: captureReceipts,
  individualRepeatReceiptsChecked: exactRepeats,
  packedTracesReconstructed: unpacked,
  phase67ExactOnePixelDownwardTranslation:
    pixels.phase67ExactOnePixelDownwardTranslation,
  pngRGBAPairs: pixels.pngRGBAPairs,
  downloads: intake.downloads,
  productUnchanged: true,
  npmPrivate: true,
  reportBrowser: browser.results,
  checksNotRepeated: [
    "Product build/browser/extension/Gmail/native paste/phone/print; research-only changes.",
  ],
  sources,
};
await writeFile(
  root + "verification-final.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    passed: true,
    entries,
    unique: unique.size,
    matching,
    historical: historical.length,
    passiveProfiles,
    stockBranches,
    unpacked,
    pngRGBAPairs: pixels.pngRGBAPairs,
    productUnchanged: true,
    prDraft: pr.isDraft,
  }),
);
