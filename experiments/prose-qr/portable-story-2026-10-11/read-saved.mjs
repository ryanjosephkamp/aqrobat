import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const root = resolve("docs/research/prose-qr/portable-story-2026-10-11"),
  p = process.argv[2],
  bytes = await readFile(p),
  config = JSON.parse(bytes);
assert(Date.now() < Date.parse("2026-10-11T19:25:49Z"));
assert(/^[a-z0-9-]+$/.test(config.id));
const out = resolve(root, config.id);
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex"),
  save = (n, v) =>
    writeFile(
      resolve(out, n),
      typeof v === "string" || Buffer.isBuffer(v)
        ? v
        : JSON.stringify(v, null, 2) + "\n",
      { flag: "wx" },
    );
const sources = [];
for (const [i, path] of [
  "experiments/prose-qr/portable-story-2026-10-11/read-saved.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
  "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
].entries()) {
  const b = await readFile(path);
  sources.push({ path, sha256: sha(b) });
  await save(`source-${i + 1}.txt.gz`, gzipSync(b));
}
const inputs = [];
for (const s of config.inputs)
  inputs.push({ ...s, pngSha256: sha(await readFile(s.path)) });
await save("manifest.json", {
  at: new Date().toISOString(),
  configPath: p,
  configSha256: sha(bytes),
  ordinaryReaderCalls: inputs.length * 3,
  inputs,
  sources,
  inputTransforms: "none",
  expectedPayloadNotSuppliedToReader: true,
});
const rows = [];
for (const input of inputs) {
  const readings = [];
  for (const engine of ["zxing", "jsqr", "opencv"]) {
    const args =
      engine === "opencv"
        ? [
            "-B",
            "experiments/prose-qr/styled-story-2026-10-11/opencv.py",
            input.path,
          ]
        : [
            "experiments/prose-qr/styled-story-2026-10-11/reader.mjs",
            engine,
            input.path,
          ];
    const raw = spawnSync(
      engine === "opencv" ? "python3" : process.execPath,
      args,
      { encoding: "utf8", timeout: 45000, maxBuffer: 12000000 },
    );
    await save(`${input.id}-${engine}.stdout.txt`, raw.stdout ?? "");
    await save(`${input.id}-${engine}.stderr.txt`, raw.stderr ?? "");
    let r = null;
    try {
      r = JSON.parse(raw.stdout);
    } catch {}
    const reading = {
      engine,
      status: raw.status,
      error: raw.error?.message ?? null,
      texts: r?.texts ?? null,
      exact: r ? r.texts.includes(input.payload) : null,
    };
    assert(!r || r.texts.every((t) => t === input.payload), "Wrong payload");
    if (r) assert.equal(r.pngSha256, input.pngSha256);
    readings.push(reading);
  }
  rows.push({ ...input, readings });
  console.log(
    JSON.stringify({
      id: input.id,
      readings: readings.map((r) => [r.engine, r.exact]),
    }),
  );
}
await save("results.json", { at: new Date().toISOString(), rows });
