import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { format } from "prettier";
import { sha, root } from "./capture.mjs";
const baseline = "c02509e26c0f0822313a9c0aa740f3498e453abb";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("rev-parse", "HEAD"), baseline);
assert.equal(git("branch", "--show-current"), "codex/aqrobat-foundation");
assert.equal(
  git("remote", "get-url", "origin"),
  "https://github.com/ryanjosephkamp/aqrobat.git",
);
const paths = git("diff", "--cached", "--name-only")
  .split("\n")
  .filter(Boolean);
assert(
  paths.every(
    (p) =>
      p.startsWith("docs/research/prose-qr/phase-04/") ||
      p.startsWith("experiments/prose-qr/phone-readability/"),
  ),
);
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(packageJson.private, true);
assert.equal(packageJson.version, "0.4.2");
const page = await readFile(resolve(root, "index.html"), "utf8");
const needle = 'download="aqrobat-prose-checkpoint-2026-10-09.md"';
const tail = page.slice(page.indexOf(needle));
const href = tail.match(/href="data:text\/markdown;base64,([^"]+)"/)[1];
const originalCheckpoint = Buffer.from(href, "base64");
await writeFile(
  resolve(root, "source-versions/handback-checkpoint.md.txt"),
  originalCheckpoint,
  { flag: "wx" },
);
async function walk(p) {
  const all = [];
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    if (e.isDirectory()) all.push(...(await walk(q)));
    else all.push(q);
  }
  return all;
}
const files = [
  ...(await walk(root)),
  ...(await walk(resolve("experiments/prose-qr/phone-readability"))),
].sort();
const inventory = await Promise.all(
  files.map(async (p) => ({
    path: p.slice(process.cwd().length + 1),
    bytes: (await stat(p)).size,
    sha256: sha(await readFile(p)),
  })),
);
const baseBytes = inventory.reduce((n, x) => n + x.bytes, 0);
const receipt = {
  sealedAt: new Date().toISOString(),
  baseline,
  branch: git("branch", "--show-current"),
  remote: git("remote", "get-url", "origin"),
  stagedFilesBeforeReceipt: paths.length,
  stagedScopeAllowed: true,
  logicalFileSafeguardBytes: 40_000_000,
  logicalBytesIncludingReceipt: 0,
  excludes: "Git object storage; no duplicate local handback folder created",
  unitTests: "18/18 passed",
  formatCheck:
    "Passed after preserving and formatting eight display HTML files; final receipt format checked before commit",
  productVersion: packageJson.version,
  npmPrivate: packageJson.private,
  originalDownloads:
    "All three match phase-02 hashes in verification-final.json",
  browsers:
    "All task-owned sequential browser runs completed/closed; no owner profiles or unrelated jobs stopped",
  newPhoneObservations: "none",
  proseAcceptance: "unsolved; no default-reader candidate recovery",
  handback: {
    path: "docs/research/prose-qr/phase-04/index.html",
    sha256: sha(page),
    embeddedCheckpointSha256: sha(originalCheckpoint),
    note: "Embedded checkpoint is the preserved pre-replay-note version; latest CHECKPOINT.md and README add the replay limitation. Both direct continuation prompts require reading current repository evidence.",
  },
  replayLimitation:
    "Six of eight formatted display replays reproduce captured PNG hashes; original HTML/setContent equivalence unresolved, no new decoding trials",
  inventory,
};
let content;
for (let i = 0; i < 3; i++) {
  content = await format(JSON.stringify(receipt), { parser: "json" });
  receipt.logicalBytesIncludingReceipt = baseBytes + Buffer.byteLength(content);
}
content = await format(JSON.stringify(receipt), { parser: "json" });
assert(
  baseBytes + Buffer.byteLength(content) < 40_000_000,
  "Logical-file safeguard",
);
await writeFile(resolve(root, "custody.json"), content, { flag: "wx" });
console.log(
  JSON.stringify({
    files: inventory.length,
    logicalBytes: baseBytes + Buffer.byteLength(content),
    allNewPathsAllowed: true,
  }),
);
