import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { passive, passiveHash } from "./passive.mjs";
import {
  root,
  source,
  sha,
  read,
  save,
  json,
  sources,
  strict,
  checkTime,
} from "./common.mjs";
checkTime();
const out = root + "/audit-01",
  rows = [];
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  slots: 5,
  passiveHash,
  sources: await sources([
    source + "/audit.mjs",
    source + "/common.mjs",
    source + "/passive.mjs",
    out + "/PLAN.md",
    "experiments/prose-qr/finder-runs/probe.mjs",
    "experiments/prose-qr/context-letter-counters/geometry.mjs",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
    "node_modules/jsqr/dist/jsQR.js",
  ]),
});
for (const id of [
  "pill",
  "rill",
  "bill",
  "control-normal",
  "control-inverted",
]) {
  const control = id.startsWith("control"),
    d = "docs/research/prose-qr/phase-74/run-01/" + id;
  const pix = await read(d + "/pixels.json"),
    old = await read(d + "/jsqr.json");
  assert.equal(sha(await readFile(pix.path)), pix.pngSha256);
  const data = execFileSync(
    "python3",
    [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      pix.path,
    ],
    { maxBuffer: 16000000, timeout: 10000 },
  );
  assert.equal(sha(data), pix.rgbaSha256);
  const p = {
    data: new Uint8ClampedArray(data),
    width: pix.width,
    height: pix.height,
  };
  const c = control ? null : await read(d + "/capture.json");
  const geometry = control
    ? {
        unit: 12,
        dimension: 25,
        counters: [
          { x: 90, y: 90 },
          { x: 306, y: 90 },
          { x: 90, y: 306 },
        ],
      }
    : { unit: c.unit, dimension: c.dimension, counters: c.native.counters };
  const result = jsQR(p.data, p.width, p.height, {
    inversionAttempts: "attemptBoth",
  });
  assert.deepEqual(result, old.result);
  const trace = passive(p, result, geometry);
  await save(
    out + "/" + id + "-passive.json.gz",
    gzipSync(JSON.stringify(trace)),
  );
  const recipe = control ? null : await read(d + "/recipe.json"),
    resource = control ? null : await read(d + "/resource-profile.json");
  rows.push({
    id,
    pixels: pix,
    savedStockReturnMatches: true,
    passiveReturnMatches: trace.passiveReturnsMatch,
    stockPayload: result?.data ?? null,
    sourceGeometry: geometry,
    sourceResource: resource
      ? {
          point: resource.point,
          completeRunPitch: resource.unit,
          counterOnlyPitch: recipe.modelUnit,
          completeRunDimensionEstimate: recipe.distance / resource.unit + 7,
          letterAdvancesInModules: Object.fromEntries(
            Object.entries(recipe.sourceMetrics).map(([k, v]) => [
              k,
              (v.advance + recipe.tracking) / geometry.unit,
            ]),
          ),
          leadingInModules: recipe.leading / geometry.unit,
        }
      : null,
    branches: trace.scans.map((s) => ({
      branch: s.branch,
      first: s.selectedFirstLocation,
      strictPass: strict(s),
      dimensionComputations: s.dimensionComputations,
      decodeAttempts: s.ordinaryDecodeAttempts,
      intended: s.postReturnIntendedGeometry,
      selected: s.selected,
    })),
  });
}
await json(out + "/results.json", {
  at: new Date().toISOString(),
  newNativeRenders: 0,
  newPayloads: 0,
  stockAuditSlots: 5,
  completedAuditSlots: rows.length,
  passiveAuditProfiles: rows.length,
  rows,
});
console.log(
  JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      payload: r.stockPayload,
      source: r.sourceGeometry.dimension,
      resource: r.sourceResource,
      branches: r.branches.map((s) => ({
        branch: s.branch,
        dimension: s.first?.dimension,
        strictPass: s.strictPass,
        scales: s.dimensionComputations.map((d) => d.moduleSize),
        trueWorst: Math.max(
          ...Object.values(s.selected).map((v) => v.geometric.worstRMS),
        ),
      })),
    })),
    null,
    2,
  ),
);
