/** Lossless storage of diagnostic logs. Never changes pixels or reader calls. */
import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { runMetric } from "../finder-runs/probe.mjs";
const axes = ["horizontal", "vertical", "diagonalDown", "diagonalUp"];
const sha = (b) => createHash("sha256").update(b).digest("hex");

export function unpackProbe(coreGzip, geometryGzip, descriptor) {
  assert.equal(descriptor.codec, "native-probe-f64-v1");
  assert.equal(sha(coreGzip), descriptor.coreGzipSha256);
  assert.equal(sha(geometryGzip), descriptor.geometryGzipSha256);
  const core = JSON.parse(gunzipSync(coreGzip)),
    raw = gunzipSync(geometryGzip);
  assert.equal(raw.length, descriptor.points * 20 * 8);
  assert.equal(core.allScoredRuns.length, descriptor.points);
  const metrics = core.allScoredRuns.map((r, i) => {
    const runs = Object.fromEntries(
      axes.map((name, a) => [
        name,
        Array.from({ length: 5 }, (_, k) =>
          raw.readDoubleLE((i * 20 + a * 5 + k) * 8),
        ),
      ]),
    );
    return { point: r.point, ...runMetric(r), geometric: runMetric(runs) };
  });
  const object = Object.fromEntries(
    descriptor.rootKeys.map((k) => [
      k,
      k === "allScoredMetrics" ? metrics : core[k],
    ]),
  );
  const b = JSON.stringify(object);
  assert.equal(Buffer.byteLength(b), descriptor.originalJSONBytes);
  assert.equal(sha(b), descriptor.originalJSONSha256);
  return object;
}

export function packProbe(q) {
  assert.equal(q.allScoredMetrics.length, q.allScoredRuns.length);
  const rootKeys = Object.keys(q),
    core = Object.fromEntries(
      rootKeys.filter((k) => k !== "allScoredMetrics").map((k) => [k, q[k]]),
    ),
    raw = Buffer.alloc(q.allScoredMetrics.length * 20 * 8);
  for (const [i, r] of q.allScoredMetrics.entries())
    for (const [a, name] of axes.entries()) {
      const runs = r.geometric.axes[name].runs;
      assert.equal(runs.length, 5);
      for (const [k, value] of runs.entries()) {
        assert(Number.isFinite(value));
        raw.writeDoubleLE(value, (i * 20 + a * 5 + k) * 8);
      }
    }
  const original = JSON.stringify(q),
    coreGzip = gzipSync(JSON.stringify(core)),
    geometryGzip = gzipSync(raw);
  const descriptor = {
    codec: "native-probe-f64-v1",
    rootKeys,
    points: q.allScoredRuns.length,
    axes,
    numericFormat: "IEEE754 float64 little-endian; 20 values per scored point",
    originalJSONBytes: Buffer.byteLength(original),
    originalJSONSha256: sha(original),
    coreGzipSha256: sha(coreGzip),
    geometryGzipSha256: sha(geometryGzip),
    coreGzipBytes: coreGzip.length,
    geometryGzipBytes: geometryGzip.length,
    fullReconstructionExact: false,
  };
  unpackProbe(coreGzip, geometryGzip, descriptor);
  descriptor.fullReconstructionExact = true;
  return { coreGzip, geometryGzip, descriptor };
}
