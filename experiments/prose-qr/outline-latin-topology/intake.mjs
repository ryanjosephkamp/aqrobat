import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const out = "docs/research/prose-qr/phase-70/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(process.cwd(), "/Users/noir/Documents/aqrobat");
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
assert.equal(
  git("rev-parse", "HEAD"),
  "f028c72870572a942d6d978d4df93d194e751442",
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
const base = "docs/research/prose-qr/session-2026-10-10-c/",
  prior = JSON.parse(await readFile(base + "custody.json"));
const receipts = [
  {
    path: base + "custody.json",
    sha256: sha(await readFile(base + "custody.json")),
  },
  ...prior.prior,
  ...prior.phases,
];
let entries = 0,
  matching = 0;
const unique = new Map(),
  records = [],
  catalog = new Map();
for (const row of receipts) {
  const b = await readFile(row.path);
  assert.equal(sha(b), row.sha256, row.path);
  const c = JSON.parse(b);
  records.push([row.path, c]);
  for (const f of c.inventory ?? []) {
    const b = await readFile(f.path);
    assert.equal(b.length, f.bytes, f.path);
    assert.equal(sha(b), f.sha256, f.path);
    entries++;
    unique.set(f.path, f.sha256);
    if (f.path.endsWith(".json")) records.push([f.path, JSON.parse(b)]);
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
      assert(catalog.has(h), "Missing executed snapshot: " + p);
      historical.push({
        record: origin,
        path: p,
        executedSha256: h,
        retainedSnapshot: catalog.get(h),
      });
    }
  }
}
for (const d of prior.downloads)
  assert.equal(sha(await readFile("downloads/" + d.name)), d.sha256, d.name);
assert.equal(JSON.parse(await readFile("package.json")).private, true);
assert.equal(
  git(
    "diff",
    "--name-only",
    "f028c72870572a942d6d978d4df93d194e751442",
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
const result = {
  at: new Date().toISOString(),
  baseline: git("rev-parse", "HEAD"),
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  pr,
  initialDirtyState: "clean, verified before edits in tool output",
  currentDirtyPaths: dirty,
  receipts,
  verifiedInventoryEntries: entries,
  uniqueInventoryPaths: unique.size,
  sourceReferencesCurrentlyMatching: matching,
  historicalSourceReferences: historical,
  nonPathSourceLabels: labels,
  downloads: prior.downloads,
  npmPrivate: true,
  productUnchanged: true,
  goal: "unsolved",
  newPhoneResults: 0,
  preliminaryReadOnlyCheckerEvents: [],
  intakeTiming:
    "Read-only custody verification preceded phase70 edits; this persisted check precedes new captures. Earlier checker errors remain preserved.",
  sources: {
    "experiments/prose-qr/outline-latin-topology/intake.mjs": sha(
      await readFile(new URL(import.meta.url)),
    ),
  },
};
await writeFile(
  out + "intake.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    entries,
    unique: unique.size,
    matching,
    historical: historical.length,
    receipts: receipts.length,
    downloads: "match",
    prDraft: pr.isDraft,
  }),
);
