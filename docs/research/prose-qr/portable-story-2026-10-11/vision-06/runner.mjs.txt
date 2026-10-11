import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11");
const path = process.argv[2],
  bytes = await readFile(path),
  config = JSON.parse(bytes);
assert(Date.now() < Date.parse("2026-10-11T19:25:49Z"));
const out = resolve(root, config.id);
assert(/^[a-z0-9-]+$/.test(config.id));
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const save = (n, v) =>
  writeFile(
    resolve(out, n),
    typeof v === "string" || Buffer.isBuffer(v)
      ? v
      : JSON.stringify(v, null, 2) + "\n",
    { flag: "wx" },
  );
const swift = "experiments/prose-qr/styled-story-2026-10-11/vision.swift";
await save(
  "runner.mjs.txt",
  await readFile(new URL("vision.mjs", import.meta.url)),
);
await save("reader.swift.txt.gz", gzipSync(await readFile(swift)));
const inputs = [];
for (const s of config.inputs) {
  const b = await readFile(s.path);
  inputs.push({ ...s, pngSha256: sha(b) });
}
await save("manifest.json", {
  at: new Date().toISOString(),
  configPath: path,
  configSha256: sha(bytes),
  ordinaryReaderCalls: inputs.length,
  inputs,
  inputTransforms: "none",
  expectedPayloadNotSuppliedToReader: true,
});
const raw = spawnSync("swift", [swift, ...inputs.map((s) => s.path)], {
  encoding: "utf8",
  timeout: 60000,
  maxBuffer: 12000000,
});
await save("stdout.txt", raw.stdout ?? "");
await save("stderr.txt", raw.stderr ?? "");
await save("process.json", {
  status: raw.status,
  error: raw.error?.message ?? null,
});
assert.equal(raw.status, 0);
const result = JSON.parse(raw.stdout);
for (const [i, r] of result.rows.entries()) {
  const input = inputs[i];
  assert.equal(r.pngSha256, input.pngSha256);
  assert(
    (r.texts ?? []).every((t) => t === input.payload),
    "Wrong payload",
  );
  Object.assign(r, {
    id: input.id,
    expected: input.payload,
    exact: (r.texts ?? []).includes(input.payload),
  });
}
await save("results.json", result);
console.log(
  JSON.stringify(
    result.rows.map((r) => ({
      id: r.id,
      exact: r.exact,
      error: r.error ?? null,
    })),
  ),
);
