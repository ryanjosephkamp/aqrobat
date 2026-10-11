import { readFile, writeFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const cwd = process.cwd();
const root = resolve("docs/research/prose-qr/styled-story-2026-10-11");
const sourceRoot = resolve("experiments/prose-qr/styled-story-2026-10-11");
const sha = (b) => createHash("sha256").update(b).digest("hex");
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
const save = (n, value) =>
  writeFile(
    resolve(root, n),
    typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : JSON.stringify(value, null, 2) + "\n",
    { flag: "wx" },
  );

await save(
  "seal-source.mjs.txt",
  await readFile(fileURLToPath(import.meta.url)),
);
const originalCloseSource = await readFile(
  resolve(root, "handback-check-source.mjs.txt"),
);
const currentCloseSource = await readFile(
  resolve(sourceRoot, "handback-check.mjs"),
);
const ui = await json(resolve(root, "handback-ui.json"));
assert(ui.browserClosed && ui.rows === 75 && ui.allLetterRows === 33);
assert.deepEqual(ui.network, []);
assert.deepEqual(ui.errors, []);
const failedFormatting = await json(resolve(root, "final-format.json"));
assert.equal(failedFormatting.status, 1);
const sourceNames = (await readdir(sourceRoot))
  .filter((n) => n.endsWith(".mjs"))
  .sort();
const formatArgs = [
  "--check",
  ...sourceNames.map((n) => resolve(sourceRoot, n)),
  resolve(root, "README.md"),
  resolve(root, "index.html"),
];
const formatting = spawnSync(
  resolve("node_modules/.bin/prettier"),
  formatArgs,
  { encoding: "utf8", timeout: 60000 },
);
await save("final-format-02.stdout.txt", formatting.stdout || "");
await save("final-format-02.stderr.txt", formatting.stderr || "");
await save("final-format-02.json", {
  at: new Date().toISOString(),
  args: formatArgs,
  status: formatting.status,
  error: formatting.error?.message ?? null,
  note: "The prior final-format check stopped at one handback-check.mjs line-wrap warning. A second pinned Prettier pass changed that chain's wrapping only; the executed source archive and failed receipt remain. UI checks had already passed and were not repeated. Frozen evidence was not formatted.",
  executedHandbackCheckSha256: sha(originalCloseSource),
  formattedHandbackCheckSha256: sha(currentCloseSource),
});
assert.equal(formatting.status, 0);

const snapshotBytes = await readFile(resolve(root, "evidence-sha256.json"));
const snapshot = JSON.parse(snapshotBytes);
const edits = (await json(resolve(root, "handback-copy-edits.json"))).edits;
const snapshotFailures = [];
for (const f of snapshot.files) {
  const b = await readFile(resolve(root, f.path));
  const edited = edits.find((e) => e.path === f.path);
  if (
    sha(b) !== (edited?.afterSha256 ?? f.sha256) ||
    (!edited && b.length !== f.bytes)
  )
    snapshotFailures.push(f.path);
}
assert.deepEqual(snapshotFailures, []);
const baseline = await json(resolve(root, "baseline-preservation.json"));
for (const f of baseline.files) {
  const b = await readFile(resolve(cwd, f.path));
  assert.equal(b.length, f.bytes, f.path);
  assert.equal(sha(b), f.sha256, f.path);
}
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const branch = execFileSync("git", ["branch", "--show-current"], {
  encoding: "utf8",
}).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], {
  encoding: "utf8",
});
assert.equal(head, baseline.anchor);
assert.equal(branch, "codex/aqrobat-foundation");
assert.deepEqual(
  status.trim().split("\n").sort(),
  [
    "?? AQROBAT-CONTEXT/",
    "?? docs/research/prose-qr/styled-story-2026-10-11/",
    "?? experiments/prose-qr/styled-story-2026-10-11/",
  ].sort(),
);

const files = [];
async function walk(dir) {
  for (const ent of (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = resolve(dir, ent.name);
    if (ent.isDirectory()) await walk(path);
    else {
      const b = await readFile(path);
      files.push({
        path: path.slice(cwd.length + 1),
        bytes: b.length,
        sha256: sha(b),
      });
    }
  }
}
await walk(root);
await walk(sourceRoot);
const evidenceBytes = files.reduce((n, f) => n + f.bytes, 0);
assert(evidenceBytes < 160000000);
assert.equal(files.filter((f) => f.path.endsWith(".png")).length, 201);
const seal = {
  at: new Date().toISOString(),
  head,
  branch,
  gitStatus: status,
  deadline: "2026-10-11T07:53:00Z",
  scientificResult:
    "Exact URL in ordinary ZXing and macOS Vision; phone and print untested",
  initialInventorySha256: sha(snapshotBytes),
  initialSnapshotFiles: snapshot.files.length,
  snapshotFailures,
  editorialChanges: edits,
  protectedFilesVerified: baseline.files.length,
  uiReceipt: "handback-ui.json",
  formatReceipt: "final-format-02.json",
  evidenceAndSourceBytesBeforeSeal: evidenceBytes,
  nativePngFiles: 201,
  excluded:
    "This self-referential final seal only. Initial inventory is a historical snapshot; two editorial files have explicit before/after hashes above.",
  files,
};
const sealBytes = Buffer.from(JSON.stringify(seal, null, 2) + "\n");
assert(evidenceBytes + sealBytes.length < 160000000);
await save("delivery-seal.json", sealBytes);
console.log(
  JSON.stringify({
    closedAt: seal.at,
    files: files.length,
    protectedFiles: baseline.files.length,
    evidenceAndSourceBytes: evidenceBytes + sealBytes.length,
    sealSha256: sha(sealBytes),
    ui: "pass",
    targetedFormat: "pass",
    nativePngFiles: 201,
  }),
);
