import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-46/",
  out = root + "vision-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (name, value) =>
    writeFile(
      out + name,
      await format(JSON.stringify(value), { parser: "json" }),
      { flag: "wx" },
    );
await mkdir(out);
const inputs = [];
for (const id of ["native", "control"]) {
  const receiptPath = `docs/research/prose-qr/phase-45/run-01/${id}-pixels.json`,
    receipt = JSON.parse(await readFile(receiptPath));
  assert.equal(sha(await readFile(receipt.path)), receipt.pngSha256);
  inputs.push({
    id,
    receiptPath,
    receiptSha256: sha(await readFile(receiptPath)),
    ...receipt,
  });
}
await json("manifest.json", {
  at: new Date().toISOString(),
  planned: 2,
  inputs,
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/context-other-readers/run-vision.mjs",
        "experiments/prose-qr/context-other-readers/vision.swift",
        root + "PLAN.md",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
});
try {
  const raw = execFileSync(
    "swift",
    ["experiments/prose-qr/context-other-readers/vision.swift"],
    { maxBuffer: 1000000, timeout: 60000 },
  );
  await writeFile(out + "result.json.raw.gz", gzipSync(raw), { flag: "wx" });
  const result = JSON.parse(raw);
  assert.equal(result.results.length, 2);
  for (const row of result.results)
    assert.equal(
      row.pngSha256,
      inputs.find((r) => r.path === row.input).pngSha256,
    );
  await json("result.json", result);
  console.log(
    JSON.stringify({
      results: result.results.map((r) => ({
        input: r.input,
        exact: r.exact,
        error: r.error,
        observations: r.observations?.length,
      })),
    }),
  );
} catch (e) {
  await json("error.json", {
    at: new Date().toISOString(),
    error: e.stack,
    stdout: e.stdout?.toString(),
    stderr: e.stderr?.toString(),
  });
  throw e;
}
