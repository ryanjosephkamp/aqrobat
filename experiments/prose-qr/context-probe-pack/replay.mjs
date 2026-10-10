import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
import { probe, passiveHash } from "../finder-runs/probe.mjs";
import { packProbe } from "./probe-pack.mjs";
import { solidTriplet } from "../finder-native/layout.mjs";
const root = "docs/research/prose-qr/phase-37/",
  source = "experiments/prose-qr/context-probe-pack/",
  out = root + "replay-01/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
async function bytes(p) {
  let n = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    n += e.isDirectory() ? await bytes(q) : (await stat(q)).size;
  }
  return n;
}
async function save(p, b) {
  assert(
    (await bytes(root)) + (await bytes(source)) + Buffer.byteLength(b) <
      4300000,
    "Replay reserve reached",
  );
  await writeFile(out + p, b, { flag: "wx" });
  return sha(b);
}
const json = async (p, v) =>
  save(p, await format(JSON.stringify(v), { parser: "json" }));
const checks = JSON.parse(await readFile(root + "fixtures-01/done.json"));
assert.equal(checks.exactRoundtrips, 4);
await mkdir(out);
const receipt = "docs/research/prose-qr/phase-35/run-01/native-pixels.json",
  config = "docs/research/prose-qr/phase-35/run-01.json",
  spec = JSON.parse(await readFile(config)).specs[0];
await json("manifest.json", {
  at: new Date().toISOString(),
  nativeGenerations: 0,
  plannedSavedNativeReplays: 1,
  plannedSolidCalls: 1,
  cap: 5000000,
  passiveHash,
  sources: Object.fromEntries(
    await Promise.all(
      [
        source + "replay.mjs",
        source + "probe-pack.mjs",
        root + "fixtures-01/done.json",
        root + "PLAN.md",
        receipt,
        config,
        "docs/research/prose-qr/phase-35/run-01/capture.json",
        "docs/research/prose-qr/phase-35/run-01/aborted.json",
        "experiments/prose-qr/finder-runs/probe.mjs",
        "experiments/prose-qr/finder-region/probe.mjs",
        "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
});
try {
  for (const [id, r, l] of [
    [
      "native",
      JSON.parse(await readFile(receipt)),
      {
        unit: spec.unit,
        quiet: 5,
        modules: 25,
        matrix: spec.matrix,
        lines: spec.lines,
        offset: 0,
        lineHeight: spec.leading,
      },
    ],
    ["solid", null, null],
  ]) {
    let record = r,
      layout = l;
    if (id === "solid") {
      const base = "docs/research/prose-qr/phase-10/dense-02/",
        sc = JSON.parse(await readFile(base + "controls.json")).solid;
      record = { ...sc, path: base + sc.path };
      layout = { ...solidTriplet(), lines: [], offset: 0, lineHeight: 24 };
    }
    assert.equal(sha(await readFile(record.path)), record.pngSha256);
    const data = execFileSync(
      "python3",
      [
        "-c",
        "import cv2,sys; i=cv2.imread(sys.argv[1]); sys.stdout.buffer.write(cv2.cvtColor(i,cv2.COLOR_BGR2RGBA).tobytes())",
        record.path,
      ],
      { maxBuffer: 250000000 },
    );
    assert.equal(sha(data), record.rgbaSha256);
    assert.equal(data.length, record.width * record.height * 4);
    const q = probe(
      {
        data: new Uint8ClampedArray(data),
        width: record.width,
        height: record.height,
      },
      layout,
    );
    let trace;
    if (id === "native") {
      const packed = packProbe(q);
      await save(id + "-probe-core.json.gz", packed.coreGzip);
      await save(id + "-probe-geometry.f64.gz", packed.geometryGzip);
      const descriptorSha256 = await json(
        id + "-probe-pack.json",
        packed.descriptor,
      );
      trace = {
        kind: "lossless packed diagnostic JSON",
        descriptorSha256,
        originalJSONSha256: packed.descriptor.originalJSONSha256,
        fullReconstructionExact: true,
      };
    } else {
      trace = {
        kind: "full JSON gzip",
        traceSha256: await save(
          id + "-probe.json.gz",
          gzipSync(JSON.stringify(q)),
        ),
      };
    }
    await json(id + "-summary.json", {
      classification:
        "First retained read-only full-resolution trace; no native regeneration",
      input: record.path,
      pngSha256: record.pngSha256,
      rgbaSha256: record.rgbaSha256,
      trace,
      structurePass: q.structurePass,
      correctFinder: q.ordinary.correctFinder,
      locations: q.ordinary.locations,
      selected: q.selected,
      regionComponents: q.regionComponents,
      scoredRunCount: q.allScoredRuns.length,
      quadCount: q.allQuads.length,
      passiveReturnsMatch: q.passiveReturnsMatch,
    });
    if (id === "solid") assert(q.structurePass, "Strict solid control failed");
    console.log(
      JSON.stringify({
        id,
        structurePass: q.structurePass,
        correctFinder: q.ordinary.correctFinder,
      }),
    );
  }
  await json("done.json", {
    nativeReplays: 1,
    solidReplays: 1,
    nativeGenerations: 0,
    goal: "unsolved",
    phoneTests: 0,
  });
} catch (e) {
  await json("aborted.json", { at: new Date().toISOString(), error: e.stack });
  throw e;
}
