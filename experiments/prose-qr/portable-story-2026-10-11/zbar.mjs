import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11"),
  path = process.argv[2],
  bytes = await readFile(path),
  config = JSON.parse(bytes);
assert(Date.now() < Date.parse("2026-10-11T19:25:49Z"));
assert(/^[a-z0-9-]+$/.test(config.id));
const out = resolve(root, config.id);
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
const sources = [];
for (const [i, p] of [
  "experiments/prose-qr/portable-story-2026-10-11/zbar.mjs",
  "experiments/prose-qr/portable-story-2026-10-11/zbar-reader.mjs",
  "docs/research/prose-qr/phase-26/package-01/main.cjs.txt",
  "docs/research/prose-qr/phase-26/package-01/zbar.wasm",
].entries()) {
  const b = await readFile(p);
  sources.push({ path: p, sha256: sha(b) });
  await save(`source-${i + 1}.txt.gz`, gzipSync(b));
}
const inputs = [];
for (const s of config.inputs)
  inputs.push({ ...s, pngSha256: sha(await readFile(s.path)) });
await save("manifest.json", {
  at: new Date().toISOString(),
  configPath: path,
  configSha256: sha(bytes),
  ordinaryReaderCalls: inputs.length,
  inputs,
  sources,
  expectedPayloadNotSuppliedToReader: true,
});
const rows = [];
for (const input of inputs) {
  const raw = spawnSync(
    process.execPath,
    [
      "experiments/prose-qr/portable-story-2026-10-11/zbar-reader.mjs",
      input.path,
    ],
    { encoding: "utf8", timeout: 45000, maxBuffer: 12000000 },
  );
  await save(input.id + ".stdout.txt", raw.stdout ?? "");
  await save(input.id + ".stderr.txt", raw.stderr ?? "");
  let r = null;
  try {
    r = JSON.parse(raw.stdout);
  } catch {}
  const row = {
    id: input.id,
    path: input.path,
    pngSha256: input.pngSha256,
    status: raw.status,
    error: raw.error?.message ?? null,
    texts: r?.texts ?? null,
    exact: r ? r.texts.includes(input.payload) : null,
  };
  assert(!r || r.texts.every((t) => t === input.payload), "Wrong payload");
  if (r) assert.equal(r.pngSha256, input.pngSha256);
  rows.push(row);
  console.log(JSON.stringify(row));
}
await save("results.json", { at: new Date().toISOString(), rows });
