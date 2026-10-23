import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import {
  diagnose,
  bundleHash,
  ordinaryBinarize,
} from "../glyph-geometry/diagnostic.mjs";
import { probe as regionProbe } from "../finder-region/probe.mjs";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const bundle = await readFile(
  createRequire(import.meta.url).resolve("jsqr"),
  "utf8",
);
assert.equal(hash(bundle), bundleHash);
let patched = bundle;
for (const [a, b] of [
  [
    "return __webpack_require__(__webpack_require__.s = 3);",
    "globalThis.internals=__webpack_require__; return __webpack_require__(__webpack_require__.s = 3);",
  ],
  [
    "var finderPatternGroups = finderPatternQuads",
    "globalThis.quads=JSON.parse(JSON.stringify(finderPatternQuads)); var finderPatternGroups = finderPatternQuads",
  ],
  [
    "var horzError = scoreBlackWhiteRun(horizontalRun, ratios);",
    "if(ratios.length===5)globalThis.runs.push(JSON.parse(JSON.stringify({point:point,horizontal:horizontalRun,vertical:verticalRun,diagonalDown:topLeftBottomRightRun,diagonalUp:bottomLeftTopRightRun}))); var horzError = scoreBlackWhiteRun(horizontalRun, ratios);",
  ],
]) {
  assert.equal(patched.split(a).length - 1, 1);
  patched = patched.replace(a, b);
}
export const passiveHash = hash(patched);
const ctx = {
  module: { exports: {} },
  exports: {},
  Uint8ClampedArray,
  Uint8Array,
  Int32Array,
  Float64Array,
};
runInNewContext(patched, ctx);
export function runMetric(runs) {
  const axes = {};
  for (const k of ["horizontal", "vertical", "diagonalDown", "diagonalUp"]) {
    const a = runs[k],
      scale = a.reduce((s, x) => s + x, 0) / 7;
    axes[k] = {
      runs: a,
      complete: a.length === 5 && a.every((x) => x > 0),
      scale,
      normalizedRMS:
        scale > 0
          ? Math.sqrt(
              a.reduce(
                (s, x, i) => s + (x / scale - [1, 1, 3, 1, 1][i]) ** 2,
                0,
              ) / 5,
            )
          : null,
    };
  }
  const spans = Object.values(axes).map(
    (a) =>
      a.runs[2] /
      (a === axes.diagonalDown || a === axes.diagonalUp ? Math.SQRT2 : 1),
  );
  return {
    axes,
    completeAxes: Object.values(axes).filter((a) => a.complete).length,
    worstRMS: Math.max(
      ...Object.values(axes).map((a) => a.normalizedRMS ?? Infinity),
    ),
    centralSpanBalance: Math.min(...spans) / Math.max(...spans),
  };
}
function geometricRuns(bin, point) {
  const x = Math.round(point.x),
    y = Math.round(point.y),
    result = {};
  for (const [k, dx, dy] of [
    ["horizontal", 1, 0],
    ["vertical", 0, 1],
    ["diagonalDown", 1, 1],
    ["diagonalUp", 1, -1],
  ]) {
    if (!bin.get(x, y)) {
      result[k] = [0, 0, 0, 0, 0];
      continue;
    }
    const ray = (sign) => {
      const lengths = [0, 0, 0];
      let state = 0;
      for (let t = 0; t < Math.max(bin.width, bin.height) * 2; t++) {
        const px = x + sign * dx * t,
          py = y + sign * dy * t;
        if (px < 0 || py < 0 || px >= bin.width || py >= bin.height) break;
        const b = Boolean(bin.get(px, py));
        if (b !== (state % 2 === 0)) {
          state++;
          if (state === 3) break;
        }
        lengths[state]++;
      }
      return lengths;
    };
    const a = ray(-1),
      b = ray(1),
      scale = Math.hypot(dx, dy);
    result[k] = [a[2], a[1], a[0] + b[0] - 1, b[1], b[2]].map((v) => v * scale);
  }
  return result;
}
export function probe(p, l) {
  const ordinary = diagnose(p, l),
    bin = ordinaryBinarize(p);
  ctx.runs = [];
  ctx.quads = [];
  const locations = ctx.internals(12).locate(bin) || [];
  assert.equal(JSON.stringify(locations), JSON.stringify(ordinary.locations));
  const runs = JSON.parse(JSON.stringify(ctx.runs)),
    quads = JSON.parse(JSON.stringify(ctx.quads));
  const first =
    locations.find((a) => a.dimension === l.modules) || locations[0] || null;
  const region = regionProbe(p, l);
  const selected = {};
  if (first)
    for (const k of ["topLeft", "topRight", "bottomLeft"]) {
      const point = first[k],
        scoring = { x: Math.round(point.x), y: Math.round(point.y) };
      const records = runs.filter(
        (a) => a.point.x === scoring.x && a.point.y === scoring.y,
      );
      const q = quads
        .map((q) => ({
          q,
          top: q.top.endX - q.top.startX,
          bottom: q.bottom.endX - q.bottom.startX,
          height: q.bottom.y - q.top.y + 1,
          x: (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4,
          y: (q.top.y + q.bottom.y + 1) / 2,
        }))
        .find((q) => q.x === point.x && q.y === point.y);
      const spans = q ? [q.top, q.bottom, q.height] : [];
      selected[k] = {
        point,
        scoring,
        records: records.map((a) => ({ ...a, metric: runMetric(a) })),
        quad: q || null,
        quadBalance: q ? Math.min(...spans) / Math.max(...spans) : 0,
        nominalSpanFraction: q ? Math.min(...spans) / (3 * l.unit) : 0,
        stableWideRowFraction: region.corners[k].stableFraction,
        geometric: runMetric(geometricRuns(bin, scoring)),
      };
    }
  const allSelected = Object.values(selected);
  const structurePass =
    ordinary.correctFinder &&
    allSelected.length === 3 &&
    allSelected.every(
      (a) =>
        a.quadBalance >= 0.8 &&
        a.nominalSpanFraction >= 0.8 &&
        a.stableWideRowFraction >= 0.8 &&
        a.records.length > 0 &&
        a.records.every(
          (r) => r.metric.completeAxes === 4 && r.metric.worstRMS <= 0.35,
        ) &&
        a.geometric.completeAxes === 4 &&
        a.geometric.worstRMS <= 0.35,
    );
  return {
    ordinary,
    passiveReturnsMatch: true,
    selected,
    allScoredRuns: runs,
    allQuads: quads,
    allScoredMetrics: runs.map((a) => ({
      point: a.point,
      ...runMetric(a),
      geometric: runMetric(geometricRuns(bin, a.point)),
    })),
    regionComponents: region.components,
    structurePass,
  };
}
