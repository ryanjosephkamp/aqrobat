import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright";
import { format } from "prettier";
import assert from "node:assert/strict";
import { diagnose, bundleHash } from "../glyph-geometry/diagnostic.mjs";
import { solidTriplet } from "../finder-native/layout.mjs";
const root = "docs/research/prose-qr/phase-08/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
const bundle = await readFile(
  createRequire(import.meta.url).resolve("jsqr"),
  "utf8",
);
assert.equal(sha(bundle), bundleHash);
let patched = bundle;
for (const [a, b] of [
  [
    "return __webpack_require__(__webpack_require__.s = 3);",
    "globalThis.internals=__webpack_require__; return __webpack_require__(__webpack_require__.s = 3);",
  ],
  [
    "var horzError = scoreBlackWhiteRun(horizontalRun, ratios);",
    "if(ratios.length===5)globalThis.runs.push(JSON.parse(JSON.stringify({point:point,horizontal:horizontalRun,vertical:verticalRun,diagonalDown:topLeftBottomRightRun,diagonalUp:bottomLeftTopRightRun}))); var horzError = scoreBlackWhiteRun(horizontalRun, ratios);",
  ],
]) {
  assert.equal(patched.split(a).length - 1, 1);
  patched = patched.replace(a, b);
}
const ctx = {
  module: { exports: {} },
  exports: {},
  Uint8ClampedArray,
  Uint8Array,
  Int32Array,
  Float64Array,
};
runInNewContext(patched, ctx);
const rows = (await readFile(root + "placement-01/results.jsonl", "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse),
  control = JSON.parse(await readFile(root + "placement-01/controls.json"));
const inputs = [
    ...rows.map((r) => ({ r, l: null })),
    {
      r: { ...control.solid, id: "solid-control" },
      l: { ...solidTriplet(), lines: [], offset: 0, lineHeight: 24 },
    },
  ],
  all = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage();
  for (const { r, l: fixed } of inputs) {
    const png = await readFile(root + "placement-01/" + r.path);
    assert.equal(sha(png), r.pngSha256);
    const v = await page.evaluate(async (b) => {
      const i = new Image();
      i.src = "data:image/png;base64," + b;
      await i.decode();
      const c = document.createElement("canvas");
      c.width = i.width;
      c.height = i.height;
      const g = c.getContext("2d");
      g.drawImage(i, 0, 0);
      const a = g.getImageData(0, 0, c.width, c.height).data;
      let s = "";
      for (let n = 0; n < a.length; n += 32768)
        s += String.fromCharCode(...a.subarray(n, n + 32768));
      return { width: c.width, height: c.height, data: btoa(s) };
    }, png.toString("base64"));
    const p = {
      ...v,
      data: new Uint8ClampedArray(Buffer.from(v.data, "base64")),
    };
    assert.equal(sha(p.data), r.rgbaSha256);
    const l =
      fixed ||
      JSON.parse(
        await readFile(root + "placement-01/" + r.id + "-layout.json"),
      );
    const plain = diagnose(p, l),
      bin = ctx
        .internals(4)
        .binarize(p.data, p.width, p.height, false).binarized;
    ctx.runs = [];
    const locations = ctx.internals(12).locate(bin) || [];
    assert.equal(JSON.stringify(locations), JSON.stringify(plain.locations));
    const first = locations.find((loc) => loc.dimension === 25),
      selected = {};
    for (const k of ["topLeft", "topRight", "bottomLeft"]) {
      const point = first[k];
      selected[k] = {
        ordinaryPoint: point,
        roundedScoringPoint: { x: Math.round(point.x), y: Math.round(point.y) },
        runRecords: JSON.parse(
          JSON.stringify(
            ctx.runs.filter(
              (a) =>
                a.point.x === Math.round(point.x) &&
                a.point.y === Math.round(point.y),
            ),
          ),
        ),
      };
    }
    all.push({
      id: r.id,
      pngSha256: r.pngSha256,
      rgbaSha256: r.rgbaSha256,
      ordinaryReturnsMatch: true,
      ordinaryLocations: plain.locations,
      scoredRunRecords: JSON.parse(JSON.stringify(ctx.runs)),
      selected,
    });
  }
} finally {
  await browser.close();
}
const data = {
  at: new Date().toISOString(),
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  bundleHash,
  passiveHash: sha(patched),
  inputs: all,
  newCaptures: 0,
  newPayloadProbes: 0,
};
const zipped = gzipSync(JSON.stringify(data));
await writeFile(root + "score-audit.json.gz", zipped, { flag: "wx" });
await writeFile(
  root + "score-audit-summary.json",
  await format(
    JSON.stringify({
      ...data,
      fullReceiptSha256: sha(zipped),
      inputs: all.map(({ scoredRunRecords, ...r }) => ({
        ...r,
        scoreRecordCount: scoredRunRecords.length,
      })),
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify({ inputs: 4, ordinaryReturnsMatch: 4, bytes: zipped.length }),
);
