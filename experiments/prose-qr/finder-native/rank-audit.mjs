import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { diagnose, bundleHash } from "../glyph-geometry/diagnostic.mjs";
import { finderMatrix } from "./layout.mjs";
const root = "docs/research/prose-qr/phase-06/",
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  bundle = await readFile(
    createRequire(import.meta.url).resolve("jsqr"),
    "utf8",
  );
assert.equal(hash(bundle), bundleHash);
const patches = [
  [
    "return __webpack_require__(__webpack_require__.s = 3);",
    "globalThis.internals=__webpack_require__; return __webpack_require__(__webpack_require__.s = 3);",
  ],
  [
    "var finderPatternGroups = finderPatternQuads",
    "globalThis.auditQuads = finderPatternQuads; var finderPatternGroups = finderPatternQuads",
  ],
  [
    ".map(function (point, i, finderPatterns) {",
    ".map(function (point, i, finderPatterns) { if(i===0) globalThis.auditPoints = finderPatterns;",
  ],
  [
    "if (finderPatternGroups.length === 0) {",
    "globalThis.auditGroups=finderPatternGroups; if (finderPatternGroups.length === 0) {",
  ],
];
let patched = bundle;
for (const [a, b] of patches) {
  assert.equal(patched.split(a).length - 1, 1);
  patched = patched.replace(a, b);
}
const context = {
  module: { exports: {} },
  exports: {},
  Uint8ClampedArray,
  Uint8Array,
  Int32Array,
  Float64Array,
};
runInNewContext(patched, context);
const inputs = [
    { batch: "cap-01", id: "cap-02" },
    { batch: "seam-02", id: "seam-01" },
    { batch: "seam-02", id: "solid-finder-control", solid: true },
  ],
  results = [],
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
try {
  const page = await browser.newPage();
  for (const input of inputs) {
    const base = root + input.batch + "/",
      r = input.solid
        ? JSON.parse(await readFile(base + "controls.json", "utf8")).solidFinder
        : (await readFile(base + "results.jsonl", "utf8"))
            .trim()
            .split("\n")
            .map(JSON.parse)
            .find((r) => r.id === input.id),
      png = await readFile(base + r.path);
    assert.equal(hash(png), r.pngSha256);
    const v = await page.evaluate(async (s) => {
        const img = new Image();
        img.src = "data:image/png;base64," + s;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const a = ctx.getImageData(0, 0, c.width, c.height).data;
        let raw = "";
        for (let i = 0; i < a.length; i += 32768)
          raw += String.fromCharCode(...a.subarray(i, i + 32768));
        return { width: c.width, height: c.height, data: btoa(raw) };
      }, png.toString("base64")),
      p = { ...v, data: new Uint8ClampedArray(Buffer.from(v.data, "base64")) };
    assert.equal(hash(p.data), r.rgbaSha256);
    const l = input.solid
        ? { unit: 24, quiet: 5, modules: 25, matrix: finderMatrix() }
        : {
            ...JSON.parse(
              await readFile(base + input.id + "-layout.json", "utf8"),
            ),
            matrix: finderMatrix(),
          },
      ordinary = diagnose(p, l),
      bin = context
        .internals(4)
        .binarize(p.data, p.width, p.height, false).binarized;
    context.auditQuads = [];
    context.auditPoints = [];
    context.auditGroups = [];
    const locations = context.internals(12).locate(bin) || [];
    assert.equal(JSON.stringify(locations), JSON.stringify(ordinary.locations));
    const clean = (x) =>
        JSON.parse(
          JSON.stringify(x, (k, v) =>
            typeof v === "number" && !Number.isFinite(v) ? String(v) : v,
          ),
        ),
      points = clean(context.auditPoints),
      groups = clean(context.auditGroups);
    const near = Object.fromEntries(
      Object.entries(ordinary.expected).map(([k, c]) => [
        k,
        points
          .map((q, rank) => ({
            ...q,
            rank,
            distance: Math.hypot(q.x - c.x, q.y - c.y),
            centralSizeRelativeToExpected: q.size / (3 * l.unit),
          }))
          .filter((q) => q.distance < l.unit)
          .sort((a, b) => a.distance - b.distance),
      ]),
    );
    results.push({
      ...input,
      path: base + r.path,
      pngSha256: hash(png),
      rgbaSha256: hash(p.data),
      ordinaryLocations: ordinary.locations,
      instrumentedLocationsMatch: true,
      rawQuadCount: context.auditQuads.length,
      scoredPointCount: points.length,
      groupCount: groups.length,
      allScoredPoints: points,
      allRankedGroups: groups,
      expectedPostProbe: ordinary.expected,
      pointsWithinOneModule: near,
      classification:
        "Passive diagnostic snapshots only; not acceptance-reader results",
    });
  }
} finally {
  await browser.close();
}
const receipt = {
  at: new Date().toISOString(),
  sourceScriptSha256: hash(await readFile(new URL(import.meta.url))),
  bundleSha256: bundleHash,
  patchedDiagnosticSha256: hash(patched),
  patches,
  planSha256: hash(await readFile(root + "RANK-AUDIT-PLAN.md")),
  results,
  newCaptures: 0,
  newPayloadProbes: 0,
};
const output = await format(JSON.stringify(receipt), { parser: "json" });
const compressed = gzipSync(output);
assert(compressed.length < 300_000);
await writeFile(root + "rank-audit-02.json.gz", compressed, { flag: "wx" });
const summary = {
  at: receipt.at,
  sourceScriptSha256: receipt.sourceScriptSha256,
  bundleSha256: bundleHash,
  patchedDiagnosticSha256: receipt.patchedDiagnosticSha256,
  fullReceipt: "rank-audit-02.json.gz",
  gzipSha256: hash(compressed),
  gzipBytes: compressed.length,
  uncompressedBytes: Buffer.byteLength(output),
  newCaptures: 0,
  newPayloadProbes: 0,
  results: results.map((r) => ({
    id: r.id,
    batch: r.batch,
    instrumentedLocationsMatch: r.instrumentedLocationsMatch,
    rawQuadCount: r.rawQuadCount,
    scoredPointCount: r.scoredPointCount,
    groupCount: r.groupCount,
    ordinaryLocations: r.ordinaryLocations,
    pointsWithinOneModule: r.pointsWithinOneModule,
  })),
};
await writeFile(
  root + "rank-audit-summary-02.json",
  await format(JSON.stringify(summary), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    summary.results.map((r) => ({
      id: r.id,
      points: r.scoredPointCount,
      groups: r.groupCount,
      near: Object.fromEntries(
        Object.entries(r.pointsWithinOneModule).map(([k, v]) => [
          k,
          v.slice(0, 3).map((q) => ({
            rank: q.rank,
            size: q.size,
            distance: q.distance,
            score: q.score,
          })),
        ]),
      ),
    })),
  ),
);
