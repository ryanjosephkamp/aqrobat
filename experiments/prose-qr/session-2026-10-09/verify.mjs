import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { format } from "prettier";
const root = "docs/research/prose-qr/session-2026-10-09/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  plan = JSON.parse(await readFile(root + "verification-inputs.json")),
  index = new Map(),
  errors = [],
  sourceRefs = [];
for (const f of plan.files) {
  const b = await readFile(f.path);
  assert.equal(b.length, f.bytes);
  assert.equal(sha(b), f.sha256);
  index.set(f.sha256, f.path);
  if (f.path.endsWith(".gz") && !f.path.endsWith(".tar.gz")) {
    try {
      index.set(sha(gunzipSync(b)), f.path + " (decompressed exact bytes)");
    } catch {}
  }
}
for (const r of plan.sourceRefs) {
  let b;
  try {
    b = await readFile(r.path);
  } catch {}
  const preserved = b && sha(b) === r.expected ? r.path : index.get(r.expected);
  sourceRefs.push({ ...r, preserved: preserved ?? null });
  if (!preserved) errors.push({ kind: "missing executed source", ...r });
}
const prior = [];
for (const n of ["04", "05", "06", "07", "08"]) {
  const p = `docs/research/prose-qr/phase-${n}/custody.json`,
    b = await readFile(p),
    c = JSON.parse(b);
  for (const f of c.inventory) {
    const a = await readFile(f.path);
    assert.equal(a.length, f.bytes);
    assert.equal(sha(a), f.sha256);
  }
  prior.push({ path: p, sha256: sha(b), entries: c.inventory.length });
}
assert.equal(
  prior.reduce((n, r) => n + r.entries, 0),
  1268,
);
const milestones = [];
for (const n of ["09", "14"]) {
  const p = `docs/research/prose-qr/phase-${n}/milestone.json`,
    b = await readFile(p),
    c = JSON.parse(b);
  for (const f of c.inventory ?? []) {
    const a = await readFile(f.path);
    assert.equal(a.length, f.bytes);
    assert.equal(sha(a), f.sha256);
  }
  milestones.push({
    path: p,
    sha256: sha(b),
    entries: c.inventory?.length ?? 0,
  });
}
const c8 = JSON.parse(
    await readFile("docs/research/prose-qr/phase-08/custody.json"),
  ),
  downloads = [];
for (const d of c8.downloads) {
  const h = sha(await readFile("downloads/" + d.name));
  assert.equal(h, d.sha256);
  downloads.push({ ...d, unchanged: true });
}
const scopeBytes = plan.scopes.map((s) => ({
  ...s,
  bytes: plan.files
    .filter((f) => s.paths.some((p) => f.path.startsWith(p + "/")))
    .reduce((n, f) => n + f.bytes, 0),
}));
for (const s of scopeBytes) assert(s.bytes < s.cap);
const shell = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim(),
  branch = shell("branch", "--show-current"),
  remote = shell("remote", "get-url", "origin");
assert.equal(branch, "codex/aqrobat-foundation");
assert.equal(remote, "https://github.com/ryanjosephkamp/aqrobat.git");
assert.equal(JSON.parse(await readFile("package.json")).private, true);
const changed = shell(
  "diff",
  "--name-only",
  "d932bcefeebfd19d85ec3339c3e7fc5086210341",
)
  .split("\n")
  .filter(Boolean);
assert(
  changed.every(
    (p) =>
      p.startsWith("docs/research/prose-qr/") ||
      p.startsWith("experiments/prose-qr/"),
  ),
);
const pixels = JSON.parse(await readFile(root + "verification-pixels.json"));
assert.equal(pixels.planned, plan.plannedPNGFiles);
assert.equal(pixels.completed, pixels.planned);
assert.equal(pixels.errors, 0);
const result = {
  at: new Date().toISOString(),
  head: shell("rev-parse", "HEAD"),
  branch,
  remote,
  npmPrivate: true,
  prior,
  milestones,
  downloads,
  scopeBytes,
  sourceRefs,
  sourceErrors: errors,
  verified: errors.length === 0,
  fileHashes: plan.files.length,
  PNGFiles: pixels.completed,
  RGBAWithPriorReceipt: pixels.withPriorRGBAReceipt,
  newlyObservedRGBA: pixels.newlyObservedRGBA,
  productTreeUnchangedSince: "d932bcefeebfd19d85ec3339c3e7fc5086210341",
  sources: {
    verifier: sha(await readFile(new URL(import.meta.url))),
    inputs: sha(await readFile(root + "verification-inputs.json")),
    pixels: sha(await readFile(root + "verification-pixels.json")),
  },
};
await writeFile(
  root + "verification.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    verified: result.verified,
    priorEntries: 1268,
    fileHashes: result.fileHashes,
    sourceRefs: sourceRefs.length,
    sourceErrors: errors.length,
    pngs: result.PNGFiles,
  }),
);
if (errors.length) console.log(JSON.stringify(errors));
assert(result.verified);
