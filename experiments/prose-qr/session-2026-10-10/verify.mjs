import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import { unpackProbe } from "../context-probe-pack/probe-pack.mjs";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/session-2026-10-10/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    }),
  git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
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
      "state,isDraft,headRefName,baseRefName,headRefOid,url",
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
assert.equal(JSON.parse(await readFile("package.json")).private, true);
const baseline = "84cbe12c9eba4bd7cc109b6be500f643e7ceea50";
assert.equal(
  git(
    "diff",
    "--name-only",
    baseline,
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
  "Unexpected dirty path",
);
let verifiedFiles = 0,
  sourceRefs = 0,
  packed = 0;
const verifiedPaths = new Set();
async function verifyInventory(c) {
  for (const f of c.inventory ?? []) {
    const b = await readFile(f.path);
    assert.equal(b.length, f.bytes, f.path);
    assert.equal(sha(b), f.sha256, f.path);
    verifiedFiles++;
    verifiedPaths.add(f.path);
  }
}
const priorPaths = [
    "docs/research/prose-qr/session-2026-10-09/custody.json",
    "docs/research/prose-qr/session-2026-10-09-delivery/custody.json",
  ],
  prior = [];
for (const p of priorPaths) {
  const b = await readFile(p),
    c = JSON.parse(b);
  await verifyInventory(c);
  prior.push({ path: p, sha256: sha(b), entries: c.inventory.length });
}
const previous = JSON.parse(await readFile(priorPaths[0]));
for (const r of [...previous.prior, ...previous.milestones]) {
  const b = await readFile(r.path);
  assert.equal(sha(b), r.sha256, r.path);
  const c = JSON.parse(b);
  await verifyInventory(c);
  prior.push({
    path: r.path,
    sha256: r.sha256,
    entries: c.inventory?.length ?? 0,
  });
}
for (const d of previous.downloads)
  assert.equal(sha(await readFile("downloads/" + d.name)), d.sha256, d.name);
const phases = [];
let newFiles = [];
async function walk(p) {
  const files = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    if (e.isDirectory()) files.push(...(await walk(q)));
    else files.push(q);
  }
  return files;
}
for (let n = 32; n <= 48; n++) {
  const cp = `docs/research/prose-qr/phase-${n}/custody.json`,
    cb = await readFile(cp),
    c = JSON.parse(cb);
  await verifyInventory(c);
  const bytes = c.inventory.reduce((a, f) => a + f.bytes, 0) + cb.length;
  assert(bytes < c.cap, "Phase cap " + n);
  phases.push({
    phase: n,
    path: cp,
    sha256: sha(cb),
    files: c.inventory.length,
    logicalBytes: bytes,
    cap: c.cap,
  });
  newFiles.push(...c.inventory.map((r) => r.path));
}
for (const p of [...new Set(newFiles)].filter((p) => p.endsWith(".json"))) {
  const q = JSON.parse(await readFile(p));
  for (const [s, h] of Object.entries(q.sources ?? {})) {
    if (typeof h !== "string" || !/^[a-f0-9]{64}$/.test(h)) continue;
    assert.equal(sha(await readFile(s)), h, s);
    sourceRefs++;
  }
  if (q.codec === "native-probe-f64-v1" && p.endsWith("-pack.json")) {
    const prefix = p.slice(0, -"-pack.json".length),
      o = unpackProbe(
        await readFile(prefix + "-core.json.gz"),
        await readFile(prefix + "-geometry.f64.gz"),
        q,
      );
    assert.equal(sha(JSON.stringify(o)), q.originalJSONSha256);
    packed++;
    global.gc?.();
  }
}
const pixels = new Map();
for (const p of newFiles.filter((p) => p.endsWith("-pixels.json"))) {
  const q = JSON.parse(await readFile(p));
  if (q.path && q.rgbaSha256) pixels.set(q.path, q);
}
await json(root + "pixel-inputs.json", [...pixels.values()]);
const raw = execFileSync(
  "python3",
  [
    "-c",
    `import cv2,json,hashlib,sys\nrows=json.load(open(sys.argv[1]));out=[]\nfor r in rows:\n b=open(r['path'],'rb').read();assert hashlib.sha256(b).hexdigest()==r['pngSha256']\n a=cv2.imread(r['path']);h=hashlib.sha256(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes()).hexdigest();assert h==r['rgbaSha256']\n out.append({'path':r['path'],'pngSha256':r['pngSha256'],'rgbaSha256':h})\nprint(json.dumps(out))`,
    root + "pixel-inputs.json",
  ],
  { encoding: "utf8", maxBuffer: 1000000 },
);
const pixelChecks = JSON.parse(raw);
await json(root + "pixel-verification.json", pixelChecks);
const analysis = JSON.parse(await readFile(root + "analysis.json"));
assert.equal(analysis.goal, "unsolved");
assert.equal(analysis.phoneTests, 0);
const checks = JSON.parse(
  await readFile(root + "report-check-01/receipt.json"),
);
assert(checks.passed);
const result = {
  at: new Date().toISOString(),
  anchorHead: git("rev-parse", "HEAD"),
  baseline,
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  pr,
  verifiedInventoryEntries: verifiedFiles,
  uniqueVerifiedPaths: verifiedPaths.size,
  sourceRefs,
  losslessPackedTracesVerified: packed,
  fullNativeRGBAInputsVerified: pixelChecks.length,
  prior,
  phases,
  downloads: previous.downloads,
  productTreeUnchangedSince: baseline,
  npmPrivate: true,
  goal: "unsolved",
  phoneTests: 0,
  unitTests: {
    command: "npm test",
    passed: 18,
    evidence:
      "Observed successful tool output this turn; product unchanged afterward",
  },
  formatCheck:
    "Observed successful full-repository check; final staged check required before backup",
  productBrowserExtensionGmailPhonePrint:
    "Not rerun for unchanged product; no new owner acceptance",
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/session-2026-10-10/verify.mjs",
        root + "analysis.json",
        root + "index.html",
        root + "CHECKPOINT.md",
        root + "report-check-01/receipt.json",
        root + "pixel-verification.json",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
};
await json(root + "verification-final.json", result);
console.log(
  JSON.stringify({
    verifiedFiles,
    sourceRefs,
    packed,
    pixelChecks: pixelChecks.length,
    goal: "unsolved",
  }),
);
