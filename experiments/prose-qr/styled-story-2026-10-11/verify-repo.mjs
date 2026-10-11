import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  copyFile,
  cp,
  symlink,
  rm,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = process.cwd();
const relative = "docs/research/prose-qr/styled-story-2026-10-11";
const sourceRelative = "experiments/prose-qr/styled-story-2026-10-11";
const out = resolve(relative, "verification");
await mkdir(out);
const temp = await mkdtemp(join(tmpdir(), "aqrobat-styled-story-verify-"));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (n, b) =>
  writeFile(
    resolve(out, n),
    typeof b === "string" || Buffer.isBuffer(b)
      ? b
      : JSON.stringify(b, null, 2) + "\n",
    { flag: "wx" },
  );
const source = await readFile(new URL("verify-repo.mjs", import.meta.url));
await save("source.mjs.txt", source);
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
await save("manifest.json", {
  at: new Date().toISOString(),
  originalCwd: root,
  temporaryCwd: temp,
  head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceSha256: sha(source),
  copyRule:
    "all tracked working files plus the two new source/evidence directories; exclude this active verification output; installed node_modules read by symlink; no owner context copy",
  trackedFiles: tracked.length,
  deadline: "2026-10-11T07:53:00Z",
  commands: [
    "npm run format:check (tracked baseline)",
    "npm test",
    "npm run build",
    "npm run test:browser",
    "npm run test:text-browser",
    "node --test research layout.test.mjs",
    "npm run format:check (full new scope)",
    "pinned prettier --check current new mjs",
  ],
});
const rows = [];
function run(id, command, args) {
  assert(
    Date.now() < Date.parse("2026-10-11T07:50:00Z"),
    "Verification stop reserve",
  );
  const started = Date.now();
  const r = spawnSync(command, args, {
    cwd: temp,
    encoding: "utf8",
    timeout: 120000,
    maxBuffer: 12000000,
    detached: true,
  });
  try {
    process.kill(-r.pid, "SIGTERM");
  } catch {}
  return {
    id,
    command,
    args,
    started: new Date(started).toISOString(),
    elapsedMs: Date.now() - started,
    status: r.status,
    error: r.error?.message || null,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}
async function record(r) {
  await save(r.id + ".stdout.txt", r.stdout);
  await save(r.id + ".stderr.txt", r.stderr);
  const row = {
    ...r,
    stdoutSha256: sha(r.stdout),
    stderrSha256: sha(r.stderr),
  };
  delete row.stdout;
  delete row.stderr;
  rows.push(row);
  await save(r.id + ".json", row);
  console.log(
    JSON.stringify({
      id: row.id,
      status: row.status,
      error: row.error,
      elapsedMs: row.elapsedMs,
    }),
  );
}
try {
  for (const p of tracked) {
    const target = resolve(temp, p);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(resolve(root, p), target);
  }
  await symlink(
    resolve(root, "node_modules"),
    resolve(temp, "node_modules"),
    "dir",
  );
  await record(run("format-baseline", "npm", ["run", "format:check"]));
  await cp(resolve(root, sourceRelative), resolve(temp, sourceRelative), {
    recursive: true,
  });
  await cp(resolve(root, relative), resolve(temp, relative), {
    recursive: true,
    filter: (p) => p !== out && !p.startsWith(out + "/"),
  });
  for (const [id, args] of [
    ["unit", ["test"]],
    ["build", ["run", "build"]],
    ["browser", ["run", "test:browser"]],
    ["text-browser", ["run", "test:text-browser"]],
  ])
    await record(run(id, "npm", args));
  await record(
    run("research-layout", process.execPath, [
      "--test",
      sourceRelative + "/layout.test.mjs",
    ]),
  );
  await record(run("format-current", "npm", ["run", "format:check"]));
  const mjs = (await readdir(resolve(temp, sourceRelative)))
    .filter((p) => p.endsWith(".mjs"))
    .map((p) => sourceRelative + "/" + p);
  await record(
    run("format-new-source", process.execPath, [
      resolve(root, "node_modules/prettier/bin/prettier.cjs"),
      "--check",
      ...mjs,
    ]),
  );
  await save("results.json", {
    finishedAt: new Date().toISOString(),
    rows,
    originalGeneratedFilesTouched: false,
    temporaryCopyRemoved: "pending finally",
    nativePaste: "not run for research candidate",
    phone: "not run",
    physicalPrint: "not run",
    installedExtension: "not run; optional, product unchanged",
  });
} finally {
  assert(temp.startsWith(join(tmpdir(), "aqrobat-styled-story-verify-")));
  await rm(temp, { recursive: true, force: true });
  await save("cleanup.json", {
    at: new Date().toISOString(),
    temporaryCwd: temp,
    removed: true,
    processGroups:
      "only test-owned detached command groups terminated after each command; browsers/servers run in the disposable copy",
  });
}
