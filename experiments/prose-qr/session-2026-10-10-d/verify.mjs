import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { execFileSync as ex } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/session-2026-10-10-d/",
  source = "experiments/prose-qr/session-2026-10-10-d/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  read = async (p) => JSON.parse(await readFile(p)),
  git = (...a) => ex("git", a, { encoding: "utf8" }).trim(),
  base = "f028c72870572a942d6d978d4df93d194e751442",
  priorPath = "docs/research/prose-qr/session-2026-10-10-c/custody.json";
assert.equal(process.cwd(), "/Users/noir/Documents/aqrobat");
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
assert.equal(git("rev-parse", "HEAD"), base);
const pr = JSON.parse(
  ex(
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
  pr.isDraft &&
    pr.state === "OPEN" &&
    pr.headRefName === "codex/aqrobat-foundation" &&
    pr.baseRefName === "main",
);
assert.equal(pr.headRefOid, base);
assert.equal(
  git("ls-remote", "origin", "refs/heads/codex/aqrobat-foundation").split(
    /\s/,
  )[0],
  base,
);
const prior = await read(priorPath),
  phases = await read(root + "phase-receipts.json"),
  receipts = [
    { path: priorPath, sha256: sha(await readFile(priorPath)) },
    ...prior.prior,
    ...prior.phases,
    ...phases,
  ];
const files = new Map(),
  catalog = new Map(),
  refs = [];
let entries = 0,
  matching = 0;
const collect = (origin, j) => {
  if (j && j.sources && !Array.isArray(j.sources))
    for (const [p, h] of Object.entries(j.sources))
      if (p.includes("/") && typeof h === "string" && /^[a-f0-9]{64}$/.test(h))
        refs.push({ origin, path: p, sha256: h });
};
for (const r of receipts) {
  const b = await readFile(r.path);
  assert.equal(sha(b), r.sha256, r.path);
  const c = JSON.parse(b);
  collect(r.path, c);
  let logical = b.length;
  for (const f of c.inventory ?? []) {
    const b = await readFile(f.path);
    assert.equal(b.length, f.bytes, f.path);
    assert.equal(sha(b), f.sha256, f.path);
    entries++;
    logical += b.length;
    files.set(f.path, f.sha256);
    if (f.path.endsWith(".json")) collect(f.path, JSON.parse(b));
  }
  if (phases.some((p) => p.path === r.path)) {
    assert(logical < c.cap, r.path);
    assert.equal(logical, r.logicalBytes);
  }
}
for (const [p, h] of files) {
  catalog.set(h, p);
  if (p.endsWith(".gz")) {
    const b = await readFile(p);
    if (b.length < 3000000)
      catalog.set(sha(gunzipSync(b)), p + " (decompressed)");
  }
}
const history = [];
for (const r of refs) {
  let actual;
  try {
    actual = sha(await readFile(r.path));
  } catch {}
  if (actual === r.sha256) matching++;
  else {
    assert(catalog.has(r.sha256), r.path);
    history.push({ ...r, retainedSnapshot: catalog.get(r.sha256) });
  }
}
for (const d of prior.downloads)
  assert.equal(sha(await readFile("downloads/" + d.name)), d.sha256, d.name);
assert.equal((await read("package.json")).private, true);
assert.equal(
  git(
    "diff",
    "--name-only",
    base,
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
const summary = await read(root + "analysis.json");
assert.deepEqual(summary.totals, {
  plannedNativeProfileSlots: 17,
  nativeCaptures: 15,
  nativeExactRepeats: 15,
  plannedPrimaryReaderSlots: 87,
  completedPrimaryReaderSlots: 75,
  unattemptedPrimaryReaderSlots: 12,
  passiveProfiles: 25,
  actualStockBranches: 45,
  nativeFirstIntendedBranches: 2,
  nativeStrictSelectedPasses: 0,
  controlSlots: 30,
  controlExactSlots: 25,
  uniqueNativePNGHashes: 15,
});
let profiles = 0,
  branches = 0,
  native = 0;
for (let n = 70; n <= 74; n++) {
  const a = await read(`docs/research/prose-qr/phase-${n}/analysis.json`);
  for (const c of a.cases) {
    if (!c.control) {
      const saved = await read(c.capturePath);
      assert.equal(sha(await readFile(c.pngPath)), c.pngSha256);
      assert(saved.repeatExact);
      assert.equal(saved.repeatSha256, saved.pngSha256);
      assert(saved.native.platformFonts.length);
      assert(
        saved.native.platformFonts.every(
          (f) => f.postScriptName === saved.postscript,
        ),
      );
      assert(
        c.localVisualReview.reviewed &&
          c.localVisualReview.recognizableDistinctLetters &&
          !c.localVisualReview.ownerAcceptance,
      );
      native++;
      if (n === 72) {
        assert(saved.native.originDrifts.every((d) => d === 0));
        assert.equal(saved.native.style.background, "rgb(0, 0, 0)");
        assert.equal(saved.native.style.strokeColor, "rgb(255, 255, 255)");
        assert.equal(
          saved.native.text,
          await readFile(saved.base + "native.txt", "utf8"),
        );
      } else {
        for (const f of [
          "resource-fonts.json",
          ...(n >= 73 ? ["filled-resource-fonts.json"] : []),
        ]) {
          const p = await read(saved.dir + f);
          assert(
            p.fonts.length &&
              p.fonts.every((f) => f.postScriptName === saved.postscript),
          );
        }
      }
    }
    if (c.scans) {
      profiles++;
      const path = c.control
        ? `docs/research/prose-qr/phase-${n}/${n === 72 ? "run-02" : "run-01"}/${c.id}/`
        : c.capturePath.replace("capture.json", "");
      const p = await read(path + "passive-summary.json"),
        full = JSON.parse(
          gunzipSync(await readFile(path + "passive-full.json.gz")),
        ),
        j = await read(path + "jsqr.json");
      assert(p.passiveReturnsMatch && full.passiveReturnsMatch);
      assert.deepEqual(full.returnedPayload, j.result?.data ?? null);
      assert.deepEqual(
        p.scans.map((s) => s.selected),
        full.scans.map((s) => s.selected),
      );
      assert.deepEqual(
        p.scans.map((s) => s.locations),
        full.scans.map((s) => s.locations),
      );
      branches += p.scans.length;
    }
  }
}
assert.equal(native, 15);
assert.equal(profiles, 25);
assert.equal(branches, 45);
const aborted = await read(
  "docs/research/prose-qr/phase-72/run-01/capture-error.json",
);
assert.equal(aborted.completedCaptures, 0);
assert(
  (await readdir("docs/research/prose-qr/phase-72/run-01/arial-outline-dark"))
    .length === 0,
);
const m = await read("docs/research/prose-qr/phase-72/run-01/manifest.json");
assert.equal(
  sha(await readFile("docs/research/prose-qr/phase-72/PLAN.initial.md")),
  m.sources["docs/research/prose-qr/phase-72/PLAN.md"],
);
const pixels = await read(root + "pixel-verification.json");
assert(pixels.passed && pixels.pairs === 38);
for (const r of pixels.rows)
  assert.equal(sha(await readFile(r.path)), r.pngSha256);
const report = await read(root + "report-check-01/receipt.json");
assert(report.passed && report.results.length === 2);
assert.equal(
  sha(await readFile(root + "index.html")),
  report.sources[root + "index.html"],
);
assert.equal((await read(root + "test.json")).status, 0);
assert.equal((await read(root + "format-check.json")).status, 0);
const sources = {};
for (const f of await readdir(source)) {
  sources[source + f] = sha(await readFile(source + f));
}
const result = {
  at: new Date().toISOString(),
  passed: true,
  goal: "unsolved",
  phoneTests: 0,
  phoneCandidates: 0,
  anchorHead: base,
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  pr,
  dirtyResearchOnly: true,
  prior: receipts.filter((r) => !phases.some((p) => p.path === r.path)),
  phases,
  inventoryEntries: entries,
  uniqueInventoryPaths: files.size,
  sourceReferencesCurrentlyMatching: matching,
  historicalSourceReferences: history,
  passiveProfiles: profiles,
  stockBranches: branches,
  pixelReceiptPairs: pixels.pairs,
  totals: summary.totals,
  downloads: prior.downloads,
  npmPrivate: true,
  productUnchanged: true,
  tests:
    "18/18 unit tests and full formatting check pass; product build/browser/extension and phone/print not rerun",
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
    unique: files.size,
    matching,
    historical: history.length,
    profiles,
    branches,
    pixels: pixels.pairs,
    private: true,
    prDraft: true,
  }),
);
