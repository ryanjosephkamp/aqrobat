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
const bundle = await readFile(
  createRequire(import.meta.url).resolve("jsqr"),
  "utf8",
);
const hash = (b) => createHash("sha256").update(b).digest("hex");
assert.equal(hash(bundle), bundleHash);
let patched = bundle;
for (const [a, b] of [
  [
    "return __webpack_require__(__webpack_require__.s = 3);",
    "globalThis.internals=__webpack_require__; return __webpack_require__(__webpack_require__.s = 3);",
  ],
  [
    "var finderPatternGroups = finderPatternQuads",
    "globalThis.savedQuads=JSON.parse(JSON.stringify(finderPatternQuads)); var finderPatternGroups = finderPatternQuads",
  ],
  [
    ".map(function (point, i, finderPatterns) {",
    ".map(function (point, i, finderPatterns) { if(i===0)globalThis.savedPoints=JSON.parse(JSON.stringify(finderPatterns));",
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
function longest(bits) {
  let n = 0,
    m = 0;
  for (const b of bits) {
    n = b ? n + 1 : 0;
    m = Math.max(m, n);
  }
  return m / bits.length;
}
export function probe(p, l) {
  const ordinary = diagnose(p, l),
    bin = ordinaryBinarize(p);
  ctx.savedQuads = [];
  ctx.savedPoints = [];
  const locations = ctx.internals(12).locate(bin) || [];
  assert.equal(JSON.stringify(locations), JSON.stringify(ordinary.locations));
  const quads = ctx.savedQuads,
    points = ctx.savedPoints;
  const corners = {};
  for (const [name, c] of Object.entries(ordinary.expected)) {
    let match = 0,
      total = 0;
    const origin = { x: c.x - 3.5 * l.unit, y: c.y - 3.5 * l.unit };
    for (let y = 0; y < Math.floor(7 * l.unit); y++)
      for (let x = 0; x < Math.floor(7 * l.unit); x++) {
        const mx = Math.floor(x / l.unit),
          my = Math.floor(y / l.unit);
        const target =
          mx === 0 ||
          mx === 6 ||
          my === 0 ||
          my === 6 ||
          (mx >= 2 && mx <= 4 && my >= 2 && my <= 4);
        match += Number(
          Boolean(
            bin.get(Math.floor(origin.x + x), Math.floor(origin.y + y)),
          ) === target,
        );
        total++;
      }
    const continuity = {};
    for (const [key, dx, dy] of [
      ["horizontal", 1, 0],
      ["vertical", 0, 1],
      ["diagonalDown", 1, 1],
      ["diagonalUp", 1, -1],
    ]) {
      continuity[key] = [-0.5, 0, 0.5].map((offset) => {
        const bits = [];
        for (let t = -1.5 * l.unit; t < 1.5 * l.unit; t++)
          bits.push(
            Boolean(
              bin.get(
                Math.floor(c.x + dx * t + (dy !== 0 ? offset * l.unit : 0)),
                Math.floor(c.y + dy * t + (dy === 0 ? offset * l.unit : 0)),
              ),
            ),
          );
        return longest(bits);
      });
    }
    let stableRows = 0,
      rows = 0;
    for (
      let y = Math.floor(c.y - 1.5 * l.unit);
      y < Math.floor(c.y + 1.5 * l.unit);
      y++
    ) {
      const center = Math.floor(c.x);
      rows++;
      if (!bin.get(center, y)) continue;
      let left = center,
        right = center;
      while (left > origin.x && bin.get(left - 1, y)) left--;
      while (right < origin.x + 7 * l.unit && bin.get(right + 1, y)) right++;
      if (right - left + 1 >= 0.8 * 3 * l.unit) stableRows++;
    }
    const nearQuads = quads
      .map((q) => {
        const top = q.top.endX - q.top.startX,
          bottom = q.bottom.endX - q.bottom.startX,
          height = q.bottom.y - q.top.y + 1;
        const x =
            (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4,
          y = (q.top.y + q.bottom.y + 1) / 2;
        return {
          quad: q,
          x,
          y,
          top,
          bottom,
          height,
          balance: Math.min(
            1,
            top / (3 * l.unit),
            bottom / (3 * l.unit),
            height / (3 * l.unit),
          ),
          distance: Math.hypot(x - c.x, y - c.y),
        };
      })
      .filter(
        (q) =>
          q.distance < l.unit &&
          points.some(
            (p) =>
              p.x === q.x &&
              p.y === q.y &&
              p.size === (q.top + q.bottom + q.height) / 3,
          ),
      )
      .sort((a, b) => b.balance - a.balance);
    const nearPoints = points
      .map((q, rank) => ({
        ...q,
        rank,
        distance: Math.hypot(q.x - c.x, q.y - c.y),
      }))
      .filter((q) => q.distance < l.unit);
    const axisMean =
      Object.values(continuity)
        .flat()
        .reduce((a, b) => a + b, 0) / 12;
    corners[name] = {
      agreement: match / total,
      continuity,
      axisMean,
      stableRows,
      rows,
      stableFraction: stableRows / rows,
      bestBalancedQuad: nearQuads[0] || null,
      balancedFraction: nearQuads[0]?.balance || 0,
      nearPoints,
    };
  }
  const values = Object.values(corners);
  const components = Object.fromEntries(
    ["agreement", "axisMean", "stableFraction", "balancedFraction"].map((k) => [
      k,
      values.reduce((a, v) => a + v[k], 0) / 3,
    ]),
  );
  // Rank source rows only after the unmodified ordinary locator returned.
  const c = ordinary.expected.topLeft,
    origin = { x: c.x - 3.5 * l.unit, y: c.y - 3.5 * l.unit };
  const rowErrors = l.lines
    .map((_, row) => {
      let error = 0,
        total = 0;
      const y0 = Math.max(
          origin.y + 2 * l.unit,
          origin.y + l.offset + row * l.lineHeight,
        ),
        y1 = Math.min(
          origin.y + 5 * l.unit,
          origin.y + l.offset + (row + 1) * l.lineHeight,
        );
      for (let y = Math.ceil(y0); y < y1; y++)
        for (
          let x = Math.ceil(origin.x + 2 * l.unit);
          x < origin.x + 5 * l.unit;
          x++
        ) {
          error += Number(!bin.get(x, y));
          total++;
        }
      return { row, error: total ? error / total : -1, pixels: total };
    })
    .filter((r) => r.pixels)
    .sort((a, b) => b.error - a.error || a.row - b.row);
  return {
    ordinary,
    passiveReturnsMatch: true,
    scoredPointCount: points.length,
    corners,
    components,
    objective: Object.values(components).reduce((a, b) => a + b, 0),
    rowErrors,
  };
}
