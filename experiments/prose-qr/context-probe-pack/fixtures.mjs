import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { packProbe } from "./probe-pack.mjs";
const root = "docs/research/prose-qr/phase-37/",
  out = root + "fixtures-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(out);
const inputs = [
  "docs/research/prose-qr/phase-32/run-01/native-stroke-probe.json.gz",
  "docs/research/prose-qr/phase-32/run-02/native-stroke-probe.json.gz",
  "docs/research/prose-qr/phase-33/run-01/native-stroke-probe.json.gz",
  "docs/research/prose-qr/phase-34/replay-01/native-probe.json.gz",
];
const json = async (p, v) =>
  writeFile(out + p, await format(JSON.stringify(v), { parser: "json" }), {
    flag: "wx",
  });
await json("manifest.json", {
  at: new Date().toISOString(),
  planned: 4,
  nativeGenerations: 0,
  inputs,
  sources: Object.fromEntries(
    await Promise.all(
      [
        "experiments/prose-qr/context-probe-pack/fixtures.mjs",
        "experiments/prose-qr/context-probe-pack/probe-pack.mjs",
        "experiments/prose-qr/finder-runs/probe.mjs",
        root + "PLAN.md",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
});
let attempted = 0;
try {
  for (const [index, path] of inputs.entries()) {
    attempted++;
    const b = await readFile(path),
      q = JSON.parse(gunzipSync(b)),
      packed = packProbe(q);
    await json(`fixture-${index + 1}.json`, {
      input: path,
      inputArchiveSha256: sha(b),
      ...packed.descriptor,
    });
    console.log(
      JSON.stringify({
        fixture: index + 1,
        exact: packed.descriptor.fullReconstructionExact,
        packedBytes: packed.coreGzip.length + packed.geometryGzip.length,
        originalArchiveBytes: b.length,
      }),
    );
  }
  await json("done.json", {
    planned: 4,
    attempted,
    exactRoundtrips: 4,
    nativeGenerations: 0,
  });
} catch (e) {
  await json("error.json", {
    at: new Date().toISOString(),
    attempted,
    error: e.stack,
  });
  throw e;
}
