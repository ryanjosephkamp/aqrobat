import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-48/",
  out = root + "run-01/",
  source = "experiments/prose-qr/context-vision-replay/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
await mkdir(out);
const sources = Object.fromEntries(
  await Promise.all(
    [
      source + "run.mjs",
      source + "vision.swift",
      root + "PLAN.md",
      "docs/research/prose-qr/phase-46/vision-01/error.json",
    ].map(async (p) => [p, sha(await readFile(p))]),
  ),
);
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  plannedCalls: 2,
  order: ["control", "native"],
  timeoutMs: 180000,
  sources,
});
for (const id of ["control", "native"]) {
  const dir = out + id + "/";
  await mkdir(dir);
  const receiptPath = `docs/research/prose-qr/phase-45/run-01/${id}-pixels.json`,
    receipt = JSON.parse(await readFile(receiptPath));
  assert.equal(sha(await readFile(receipt.path)), receipt.pngSha256);
  await json(dir + "attempt.json", {
    at: new Date().toISOString(),
    id,
    receiptPath,
    receiptSha256: sha(await readFile(receiptPath)),
    ...receipt,
  });
  try {
    const raw = execFileSync("swift", [source + "vision.swift", receipt.path], {
      timeout: 180000,
      maxBuffer: 1000000,
    });
    await writeFile(dir + "result.json.raw.gz", gzipSync(raw), { flag: "wx" });
    const row = JSON.parse(raw);
    assert.equal(row.pngSha256, receipt.pngSha256);
    await json(dir + "result.json", row);
    console.log(
      JSON.stringify({
        id,
        exact: row.exact,
        observations: row.observations?.length,
        error: row.error,
      }),
    );
  } catch (e) {
    await json(dir + "error.json", {
      at: new Date().toISOString(),
      id,
      error: e.stack,
      code: e.code,
      signal: e.signal,
      stdout: e.stdout?.toString(),
      stderr: e.stderr?.toString(),
      classification: "Unknown result, no retry",
    });
    console.log(JSON.stringify({ id, error: e.code ?? e.message }));
  }
}
