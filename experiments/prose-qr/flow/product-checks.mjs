// Run existing product build/browser checks in a disposable, task-owned copy.
// Preserve the owner's existing dist/extension and downloads byte-for-byte.
import {
  cp,
  readFile,
  writeFile,
  mkdtemp,
  symlink,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = resolve(".");
const scratch = await mkdtemp(resolve(tmpdir(), "aqrobat-phase02-check-"));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const names = [
  "aqrobat-extension.zip",
  "aqrobat-offline.html",
  "aqrobat-insertion-practice.html",
];
const before = Object.fromEntries(
  await Promise.all(
    names.map(async (name) => [
      name,
      sha(await readFile(resolve(root, "downloads", name))),
    ]),
  ),
);
const checks = [];
try {
  for (const name of [
    "web",
    "src",
    "vendor",
    "extension",
    "tools",
    "tests",
    "bin",
    "index.html",
    "LICENSE",
    "NOTICE.md",
    "package.json",
    "package-lock.json",
  ])
    await cp(resolve(root, name), resolve(scratch, name), { recursive: true });
  await symlink(
    resolve(root, "node_modules"),
    resolve(scratch, "node_modules"),
  );
  for (const script of ["build", "test:browser", "test:text-browser"]) {
    const output = execFileSync("npm", ["run", script], {
      cwd: scratch,
      encoding: "utf8",
      maxBuffer: 4_000_000,
    });
    checks.push({
      script,
      status: "passed",
      output: output.trim().slice(-3000),
    });
    console.log(JSON.stringify({ script, status: "passed" }));
  }
  const downloads = [];
  for (const name of names) {
    const after = sha(await readFile(resolve(root, "downloads", name)));
    assert.equal(before[name], after, "Owner download changed");
    const built = sha(await readFile(resolve(scratch, "downloads", name)));
    assert.equal(
      built,
      after,
      "Scratch build differs from preserved product artifact",
    );
    downloads.push({
      name,
      sha256: after,
      unchanged: true,
      scratchBuildIdentical: true,
    });
  }
  await writeFile(
    resolve(root, "docs/research/prose-qr/phase-02/product-checks.json"),
    await format(
      JSON.stringify({
        testedAt: new Date().toISOString(),
        method:
          "Existing checks in a fresh disposable source copy. Same installed dependencies; no owner profile or artifact replaced.",
        checks,
        downloads,
        phone: "not tested",
        installedOwnerExtension: "not tested",
        nativeClipboardOrGmail: "not tested",
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
} finally {
  // This exact directory was freshly created above for this check alone.
  await rm(scratch, { recursive: true, force: true });
}
