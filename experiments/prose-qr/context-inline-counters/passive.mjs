import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import assert from "node:assert/strict";
import { sha } from "./common.mjs";
import { bundleHash } from "../glyph-geometry/diagnostic.mjs";
import { runMetric } from "../finder-runs/probe.mjs";
import { geometricRuns } from "../context-letter-counters/geometry.mjs";
const bundle = await readFile(
  createRequire(import.meta.url).resolve("jsqr"),
  "utf8",
);
assert.equal(sha(bundle), bundleHash);
let patched = bundle;
for (const [a, b] of [
  [
    "function scan(matrix) {",
    "function scan(matrix) { globalThis.activeScan={matrix:matrix,runs:[],quads:[],locations:null}; globalThis.scans.push(globalThis.activeScan);",
  ],
  [
    "var locations = locator_1.locate(matrix);",
    "var locations = locator_1.locate(matrix); globalThis.activeScan.locations=JSON.parse(JSON.stringify(locations||[]));",
  ],
  [
    "var finderPatternGroups = finderPatternQuads",
    "globalThis.activeScan.quads=JSON.parse(JSON.stringify(finderPatternQuads)); var finderPatternGroups = finderPatternQuads",
  ],
  [
    "var horzError = scoreBlackWhiteRun(horizontalRun, ratios);",
    "if(ratios.length===5)globalThis.activeScan.runs.push(JSON.parse(JSON.stringify({point:point,horizontal:horizontalRun,vertical:verticalRun,diagonalDown:topLeftBottomRightRun,diagonalUp:bottomLeftTopRightRun}))); var horzError = scoreBlackWhiteRun(horizontalRun, ratios);",
  ],
]) {
  assert.equal(patched.split(a).length - 1, 1, a);
  patched = patched.replace(a, b);
}
export const passiveHash = sha(patched);
const ctx = {
  module: { exports: {} },
  exports: {},
  Uint8ClampedArray,
  Uint8Array,
  Int32Array,
  Float64Array,
};
runInNewContext(patched, ctx);
export function passive(p, baseline, sourceGeometry = null) {
  ctx.scans = [];
  const returned = ctx.module.exports(p.data, p.width, p.height, {
    inversionAttempts: "attemptBoth",
  });
  assert.equal(
    JSON.stringify(returned),
    JSON.stringify(baseline),
    "Passive return changed",
  );
  const scans = ctx.scans.map((s, index) => {
    const locations = JSON.parse(JSON.stringify(s.locations)),
      first = locations[0] ?? null,
      selected = {};
    if (first)
      for (const k of ["topLeft", "topRight", "bottomLeft"]) {
        const point = first[k],
          scoring = { x: Math.round(point.x), y: Math.round(point.y) };
        const records = s.runs.filter(
          (r) => r.point.x === scoring.x && r.point.y === scoring.y,
        );
        const quad =
          s.quads
            .map((q) => ({
              q,
              top: q.top.endX - q.top.startX,
              bottom: q.bottom.endX - q.bottom.startX,
              height: q.bottom.y - q.top.y + 1,
              x:
                (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) /
                4,
              y: (q.top.y + q.bottom.y + 1) / 2,
            }))
            .find((q) => q.x === point.x && q.y === point.y) ?? null;
        let stable = 0,
          total = 0;
        if (sourceGeometry)
          for (
            let y = Math.ceil(point.y - 1.5 * sourceGeometry.unit);
            y < Math.floor(point.y + 1.5 * sourceGeometry.unit);
            y++
          ) {
            total++;
            const x = scoring.x;
            if (!s.matrix.get(x, y)) continue;
            let left = x,
              right = x;
            while (left > 0 && s.matrix.get(left - 1, y)) left--;
            while (right < p.width - 1 && s.matrix.get(right + 1, y)) right++;
            if (right - left + 1 >= 0.8 * 3 * sourceGeometry.unit) stable++;
          }
        const spans = quad ? [quad.top, quad.bottom, quad.height] : [];
        selected[k] = {
          point,
          scoring,
          records: records.map((r) => ({ ...r, metric: runMetric(r) })),
          quad,
          quadBalance: quad ? Math.min(...spans) / Math.max(...spans) : 0,
          geometric: runMetric(geometricRuns(s.matrix, scoring)),
          nominalSpanFraction:
            sourceGeometry && quad
              ? Math.min(...spans) / (3 * sourceGeometry.unit)
              : null,
          stableRows: sourceGeometry
            ? {
                stable,
                total,
                fraction: total ? stable / total : 0,
                classification:
                  "Actual selected point, source nominal span used only for post-return diagnostic denominator",
              }
            : null,
        };
      }
    const sourceAligned = sourceGeometry
      ? sourceGeometry.counters.map((c) => ({
          sourcePoint: c,
          nativeBranchBit: !!s.matrix.get(Math.round(c.x), Math.round(c.y)),
        }))
      : [];
    const intended = sourceGeometry
      ? locations
          .map((l) => ({
            location: l,
            dimensionMatches: l.dimension === (sourceGeometry.dimension ?? 25),
            pointDeltas: Object.fromEntries(
              ["topLeft", "topRight", "bottomLeft"].map((k, i) => [
                k,
                Math.hypot(
                  l[k].x - sourceGeometry.counters[i].x,
                  l[k].y - sourceGeometry.counters[i].y,
                ),
              ]),
            ),
          }))
          .map((l) => ({
            ...l,
            intendedGeometry:
              l.dimensionMatches &&
              Object.values(l.pointDeltas).every(
                (d) => d < sourceGeometry.unit,
              ),
          }))
      : [];
    return {
      branch:
        index === 0 ? "normal-stock-first-scan" : "inverted-stock-second-scan",
      locations,
      selectedFirstLocation: first,
      selected,
      allScoredRuns: s.runs,
      allQuads: s.quads,
      sourceAlignedCounterSamples: sourceAligned,
      postReturnIntendedGeometry: intended,
      classification:
        "Actually executed stock scan branch; selected native runs separate from source-aligned counter samples",
    };
  });
  ctx.scans = [];
  ctx.activeScan = null;
  return {
    passiveReturnsMatch: true,
    stockOptions: { inversionAttempts: "attemptBoth" },
    stockBranchesActuallyExecuted: scans.length,
    scans,
    returnedPayload: returned?.data ?? null,
  };
}
