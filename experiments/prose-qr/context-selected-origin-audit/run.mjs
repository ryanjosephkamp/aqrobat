import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
import { ordinaryBinarize } from "../glyph-geometry/diagnostic.mjs";
import { geometricRuns } from "../context-letter-counters/geometry.mjs";
import { runMetric } from "../finder-runs/probe.mjs";
const root = "docs/research/prose-qr/phase-66/",
  out = root + "audit-01/";
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const read = async (p) => JSON.parse(await readFile(p));
const sources = {};
for (const p of [
  root + "PLAN.md",
  "experiments/prose-qr/context-selected-origin-audit/run.mjs",
  "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  "experiments/prose-qr/context-letter-counters/geometry.mjs",
  "experiments/prose-qr/finder-runs/probe.mjs",
])
  sources[p] = sha(await readFile(p));
const rows = [];
for (const id of ["hiragino", "hiragino-gb", "heiti-sc", "heiti-tc"]) {
  const b = `docs/research/prose-qr/phase-65/run-01/${id}/`;
  for (const n of [
    "native.png",
    "capture.json",
    "recipe.json",
    "resource-profile.json",
    "pixels.json",
    "passive-summary.json",
  ])
    sources[b + n] = sha(await readFile(b + n));
  const c = await read(b + "capture.json"),
    r = await read(b + "recipe.json"),
    resource = await read(b + "resource-profile.json"),
    p = await read(b + "pixels.json"),
    s = (await read(b + "passive-summary.json")).scans.find(
      (x) => x.branch === "inverted-stock-second-scan",
    );
  const data = execFileSync(
    "python3",
    [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      b + "native.png",
    ],
    { maxBuffer: 12000000 },
  );
  assert.equal(sha(data), p.rgbaSha256);
  const bin = ordinaryBinarize({
      width: p.width,
      height: p.height,
      data: new Uint8ClampedArray(data),
    }),
    inv = { width: p.width, height: p.height, get: (x, y) => !bin.get(x, y) };
  const metric = (point) => ({
    point,
    rounded: { x: Math.round(point.x), y: Math.round(point.y) },
    metric: runMetric(geometricRuns(inv, point)),
  });
  const points = ["topLeft", "topRight", "bottomLeft"].map((name, i) => {
    const actual = metric(s.selected[name].point);
    assert.deepEqual(actual.metric, s.selected[name].geometric);
    const origin = c.native.targetOrigins[i];
    return {
      name,
      actualSelected: actual,
      sourcePointDiagnostic: metric(c.native.counters[i]),
      translatedResourceDiagnostic: metric({
        x: origin.left - r.glyphRect.left + resource.point.x,
        y: origin.top - r.glyphRect.top + resource.point.y,
      }),
      secondActuallyReturnedDiagnostic: s.locations[1]
        ? metric(s.locations[1][name])
        : null,
      acceptanceChanged: false,
    };
  });
  rows.push({
    id,
    resourcePoint: resource.point,
    resourceMetric: resource.metric,
    points,
  });
}
const result = {
  at: new Date().toISOString(),
  goal: "unsolved",
  newReaderCalls: 0,
  newNativeSources: 0,
  phoneCandidates: 0,
  phoneTests: 0,
  savedInputs: 4,
  selectedPoints: 12,
  sourcePoints: 12,
  translatedResourcePoints: 12,
  secondReturnedPoints: rows
    .flatMap((r) => r.points)
    .filter((p) => p.secondActuallyReturnedDiagnostic).length,
  classification:
    "Post-return diagnostic only; actual first selection remains the acceptance gate.",
  rows,
  sources,
};
await writeFile(
  out + "analysis.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      points: r.points.map((p) => ({
        name: p.name,
        actual: p.actualSelected.metric.worstRMS,
        source: p.sourcePointDiagnostic.metric.worstRMS,
        translated: p.translatedResourceDiagnostic.metric.worstRMS,
        second: p.secondActuallyReturnedDiagnostic?.metric.worstRMS,
      })),
    })),
  ),
);
