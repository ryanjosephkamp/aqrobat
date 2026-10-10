import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { sha } from "./common.mjs";
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical";
const source = "experiments/prose-qr/integrated-2026-10-10/empirical";
const out = root + "/source-custody";
await mkdir(out, { recursive: true });
const records = [];
for (const name of (await readdir(source)).sort()) {
  const path = source + "/" + name;
  if (!(await stat(path)).isFile()) continue;
  const bytes = await readFile(path),
    snapshot = out + "/" + name + ".gz";
  await writeFile(snapshot, gzipSync(bytes));
  records.push({
    path,
    sha256: sha(bytes),
    bytes: bytes.length,
    gzipSnapshot: snapshot,
    gzipSha256: sha(await readFile(snapshot)),
    livePathPreserved: true,
  });
}
const original = await readFile(
  "experiments/prose-qr/astra-2026-10-10/common.mjs",
  "utf8",
);
const copied = await readFile(source + "/common.mjs", "utf8");
const gate = (x) =>
  x
    .slice(
      x.indexOf("export const strict ="),
      x.indexOf("\nexport function checkTime") > 0
        ? x.indexOf("\nexport function checkTime")
        : undefined,
    )
    .trim();
assert.equal(gate(original), gate(copied));
const pinnedPaths = [
  "vendor/qrcodegen.mjs",
  "vendor/README.md",
  "package.json",
  "package-lock.json",
  "node_modules/jsqr/dist/jsQR.js",
  "node_modules/zxing-wasm/package.json",
  "node_modules/playwright/package.json",
];
const pinned = [];
for (const path of pinnedPaths) {
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    pinned.push({ path, unavailable: true });
    continue;
  }
  pinned.push({ path, sha256: sha(bytes), bytes: bytes.length });
}
const receipt = {
  schema: "aqrobat.integrated.empirical-source-custody.v1",
  atUtc: new Date().toISOString(),
  sourceSnapshots: records,
  originalStrictGatePath: "experiments/prose-qr/astra-2026-10-10/common.mjs",
  strictGateExactBytes: true,
  strictGateSha256: sha(gate(original)),
  pinned,
  formatPolicy:
    "Executed and preregistered live source bytes remain unchanged. Locked original-byte formatting exceptions are preserved rather than silently replacing evidence. New V5 prepare/sample scripts and verification/custody/report builders were formatted before execution.",
  note: "Exact gzip snapshots and hashes aid reproducibility; they do not authorize executing old frozen batches or stale deadlines. Browser/capture reruns require a fresh batch and remaining authorized allocation.",
};
await writeFile(
  out + "/manifest.json",
  JSON.stringify(receipt, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    sourceFiles: records.length,
    strictGateExactBytes: true,
    manifest: out + "/manifest.json",
  }),
);
