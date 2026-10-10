import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
const bundle = await readFile(
  createRequire(import.meta.url).resolve("jsqr"),
  "utf8",
);
const needle = "return __webpack_require__(__webpack_require__.s = 3);";
if (!bundle.includes(needle)) throw Error("Pinned internal bundle changed");
const context = {
  module: { exports: {} },
  exports: {},
  Uint8ClampedArray,
  Uint8Array,
  Int32Array,
  Float64Array,
};
runInNewContext(
  bundle.replace(needle, "globalThis.internals=__webpack_require__; " + needle),
  context,
);
export const bundleHash = createHash("sha256").update(bundle).digest("hex");
export function ordinaryBinarize(p) {
  return context.internals(4).binarize(p.data, p.width, p.height, false)
    .binarized;
}
export function thresholdedGlyph(g) {
  const data = new Uint8ClampedArray(32 * 32 * 4).fill(255);
  for (const [x, y, a] of g.ink) {
    const i = ((y + 22) * 32 + x + 2) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.round(255 * (1 - a));
  }
  const bin = ordinaryBinarize({ data, width: 32, height: 32 }),
    ink = [];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++)
      if (bin.get(x, y)) ink.push([x - 2, y - 22, 1]);
  return ink;
}
export function diagnose(p, l) {
  const binarized = ordinaryBinarize(p),
    locations = context.internals(12).locate(binarized) || [];
  const pad = l.unit * (l.quiet ?? 5),
    n = l.modules;
  const expected = {
    topLeft: { x: pad + 3.5 * l.unit, y: pad + 3.5 * l.unit },
    topRight: { x: pad + (n - 3.5) * l.unit, y: pad + 3.5 * l.unit },
    bottomLeft: { x: pad + 3.5 * l.unit, y: pad + (n - 3.5) * l.unit },
  };
  const correctFinder = locations.some(
    (a) =>
      a.dimension === n &&
      ["topLeft", "topRight", "bottomLeft"].every(
        (k) =>
          Math.hypot(a[k].x - expected[k].x, a[k].y - expected[k].y) < l.unit,
      ),
  );
  let dark = 0,
    darkCentersBlack = 0,
    light = 0,
    lightCentersBlack = 0;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const bit = binarized.get(
        Math.floor(pad + (x + 0.5) * l.unit),
        Math.floor(pad + (y + 0.5) * l.unit),
      );
      if (l.matrix[y][x]) {
        dark++;
        if (bit) darkCentersBlack++;
      } else {
        light++;
        if (bit) lightCentersBlack++;
      }
    }
  const corridors = Object.fromEntries(
    Object.entries(expected).map(([key, center]) => {
      const axes = {};
      for (const axis of ["horizontal", "vertical"]) {
        const bits = [],
          targets = [];
        const start =
          (axis === "horizontal" ? center.x : center.y) - 3.5 * l.unit;
        for (let i = 0; i < Math.round(7 * l.unit); i++) {
          const position = Math.floor(start + i),
            fixed = Math.floor(axis === "horizontal" ? center.y : center.x);
          bits.push(
            Boolean(
              axis === "horizontal"
                ? binarized.get(position, fixed)
                : binarized.get(fixed, position),
            ),
          );
          const m = Math.floor(i / l.unit);
          targets.push(m === 0 || m === 6 || (m >= 2 && m <= 4));
        }
        const runs = [];
        let last = null;
        for (let i = 0; i < bits.length; i++) {
          if (bits[i] !== last) {
            runs.push({ black: bits[i], pixels: 1 });
            last = bits[i];
          } else runs.at(-1).pixels++;
        }
        let longest = 0,
          run = 0;
        for (let i = Math.ceil(2 * l.unit); i < Math.floor(5 * l.unit); i++) {
          run = bits[i] ? run + 1 : 0;
          longest = Math.max(longest, run);
        }
        axes[axis] = {
          pixels: bits.length,
          agreement:
            bits.filter((b, i) => b === targets[i]).length / bits.length,
          runs,
          longestCentralBlackFraction: longest / (3 * l.unit),
        };
      }
      return [key, axes];
    }),
  );
  return {
    classification:
      "Renderer diagnostic after independent decoding, not payload recovery. Expected finder/matrix never given to acceptance readers.",
    correctFinder,
    locations,
    expected,
    corridors,
    centerCoverage: { dark, darkCentersBlack, light, lightCentersBlack },
  };
}
