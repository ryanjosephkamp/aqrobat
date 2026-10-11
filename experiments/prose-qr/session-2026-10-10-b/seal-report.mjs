import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/session-2026-10-10-b",
  source = "experiments/prose-qr/session-2026-10-10-b",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  verificationPath = root + "/verification-final.json",
  verification = JSON.parse(await readFile(verificationPath));
assert.equal(verification.goal, "unsolved");
assert.equal(verification.phoneTests, 0);
for (const [p, h] of Object.entries(verification.sources))
  assert.equal(sha(await readFile(p)), h, p);
for (const r of [...verification.prior, ...verification.phases])
  assert.equal(sha(await readFile(r.path)), r.sha256, r.path);
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
await walk(root);
await walk(source);
inventory.sort((a, b) => a.path.localeCompare(b.path));
const custody = {
  at: new Date().toISOString(),
  anchorHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  cap: 1000000,
  goal: "unsolved",
  phoneTests: 0,
  sources: {
    [verificationPath]: sha(await readFile(verificationPath)),
    [source + "/seal-report.mjs"]: sha(
      await readFile(source + "/seal-report.mjs"),
    ),
  },
  prior: verification.prior,
  phases: verification.phases,
  downloads: verification.downloads,
  inventory,
};
const content = await format(JSON.stringify(custody), { parser: "json" }),
  bytes =
    inventory.reduce((n, r) => n + r.bytes, 0) + Buffer.byteLength(content);
assert(bytes < custody.cap);
await writeFile(root + "/custody.json", content, { flag: "wx" });
console.log(
  JSON.stringify({
    sealed: true,
    files: inventory.length,
    logicalBytes: bytes,
    cap: custody.cap,
    goal: "unsolved",
  }),
);
