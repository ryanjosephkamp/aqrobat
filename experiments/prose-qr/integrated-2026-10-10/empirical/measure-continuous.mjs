import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { sha } from "./common.mjs";
import { ordinaryBinarize, bundleHash } from "./diagnostic.mjs";
const [dir, specPath] = process.argv.slice(2);
const root = "docs/research/prose-qr/integrated-2026-10-10/empirical/";
assert(dir.startsWith(root));
const specRaw = await readFile(specPath),
  spec = JSON.parse(specRaw);
const png = await readFile(dir + "/input.png");
const domRaw = await readFile(dir + "/dom.json"),
  dom = JSON.parse(domRaw).dom;
const raw = spawnSync(
  "python3",
  [
    "-c",
    "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
    dir + "/input.png",
  ],
  { timeout: 10000, maxBuffer: 10000000 },
);
await writeFile(dir + "/ledger-rgba.stderr.txt", raw.stderr ?? "", {
  flag: "wx",
});
await writeFile(
  dir + "/ledger-rgba.process.json",
  JSON.stringify(
    {
      status: raw.status,
      signal: raw.signal,
      error: raw.error?.message,
      stdoutBytes: raw.stdout?.length,
      stdoutSha256: sha(raw.stdout ?? ""),
      stderrSha256: sha(raw.stderr ?? ""),
    },
    null,
    2,
  ) + "\n",
  { flag: "wx" },
);
await writeFile(
  dir + "/ledger-rgba.stdout.bin.gz",
  gzipSync(raw.stdout ?? ""),
  { flag: "wx" },
);
assert.equal(raw.status, 0);
const { width, height, geometry: g, target } = spec;
assert.equal(raw.stdout.length, width * height * 4);
const data = new Uint8ClampedArray(raw.stdout);
const bin = ordinaryBinarize({ data, width, height });
const samples = [],
  quiet = [];
for (let y = -4; y < g.dimension + 4; y++)
  for (let x = -4; x < g.dimension + 4; x++) {
    const px = Math.floor(g.origin + (x + 0.5) * g.unit),
      py = Math.floor(g.origin + (y + 0.5) * g.unit);
    assert(px >= 0 && px < width && py >= 0 && py < height);
    const gray = data[(py * width + px) * 4],
      literal = +(gray < 128),
      adaptive = +bin.get(px, py);
    const inside = x >= 0 && y >= 0 && x < g.dimension && y < g.dimension;
    const row = {
      x,
      y,
      px,
      py,
      gray,
      literal,
      adaptive,
      target: inside ? target.matrix[y][x] : 0,
    };
    if (inside) {
      row.ownership = target.map[y][x];
      samples.push(row);
    } else quiet.push(row);
  }
const summarize = (mode) => {
  const mismatches = samples.filter((a) => a[mode] !== a.target),
    functionRows = mismatches.filter((a) => a.ownership.kind === "function");
  return {
    moduleMismatches: mismatches.length,
    functionMismatches: functionRows.length,
    functionByRole: Object.fromEntries(
      [...new Set(functionRows.map((a) => a.ownership.role))].map((role) => [
        role,
        functionRows.filter((a) => a.ownership.role === role).length,
      ]),
    ),
    blocks: target.ownership.blocks.map((b) => ({
      block: b.block,
      radius: Math.floor(b.eccLength / 2),
      wrongSymbolIndices: [
        ...new Set(
          mismatches
            .filter(
              (a) =>
                a.ownership.block === b.block &&
                a.ownership.streamByte !== undefined,
            )
            .map((a) => a.ownership.streamByte),
        ),
      ].sort((a, b) => a - b),
    })),
    quietDark: quiet.filter((a) => a[mode]).length,
    quietTotal: quiet.length,
  };
};
const bounds = dom.glyphs
  .filter((a) => a.ch.trim())
  .map((a) => {
    const baseline =
      a.rect.y +
      (a.rect.height - a.fontAscent - a.fontDescent) / 2 +
      a.fontAscent;
    const shadowPadding = a.role === "body" ? 5 : 1;
    return {
      id: a.id,
      ch: a.ch,
      role: a.role,
      x0: a.rect.x - a.left - shadowPadding,
      x1: a.rect.x + a.right + shadowPadding,
      y0: baseline - a.ascent - shadowPadding,
      y1: baseline + a.descent + shadowPadding,
      shadowPadding,
      classification:
        "Conservative canvas envelope including5px body shadow allowance; not pixel ownership proof",
    };
  });
const ornaments = bounds.filter((a) => a.role !== "body");
const ornamentInk = ornaments.map((b) => {
  const coords = [];
  for (
    let y = Math.max(0, Math.floor(b.y0));
    y < Math.min(height, Math.ceil(b.y1));
    y++
  )
    for (
      let x = Math.max(0, Math.floor(b.x0));
      x < Math.min(width, Math.ceil(b.x1));
      x++
    )
      if (data[(y * width + x) * 4] < 245) coords.push([x, y]);
  return {
    ...b,
    visibleGray245InkBounds: coords.length
      ? [
          Math.min(...coords.map((a) => a[0])),
          Math.min(...coords.map((a) => a[1])),
          Math.max(...coords.map((a) => a[0])),
          Math.max(...coords.map((a) => a[1])),
        ]
      : null,
    inkPixels: coords.length,
    potentialBodyEnvelopeIntersections: bounds
      .filter(
        (a) =>
          a.role === "body" &&
          a.x1 > b.x0 &&
          a.x0 < b.x1 &&
          a.y1 > b.y0 &&
          a.y0 < b.y1,
      )
      .map((a) => a.id),
    note: "Measured crop contains complete conservative native ornament envelope; visual review must reject actual overlap or missing ink. No ink is clipped or removed.",
  };
});
const result = {
  schema: "aqrobat.integrated.continuous-native-ledger.v1",
  atUtc: new Date().toISOString(),
  pngSha256: sha(png),
  specSha256: sha(specRaw),
  domSha256: sha(domRaw),
  rgbaSha256: sha(raw.stdout),
  jsqrBundleSha256: bundleHash,
  width,
  height,
  deviceScaleFactor: 1,
  css: spec.options,
  polarity: "Normal raw black QR1, white QR0; no image transform",
  samplePolicy:
    "floor(origin+(index+.5)*unit), every symbol cell and full external4module ring",
  samples,
  quiet,
  literal: summarize("literal"),
  adaptive: summarize("adaptive"),
  ornamentInk,
  outOfViewportInkEnvelopes: bounds.filter(
    (a) => a.x0 < 0 || a.y0 < 0 || a.x1 > width || a.y1 > height,
  ),
  classification:
    "One declared full-source pixel/binarizer diagnostic; source centers never supplied to ordinary readers. Assignment of foreground colors is not measured QR bits. Ideal-grid error counts do not establish reader recovery or strict eligibility.",
};
await writeFile(
  dir + "/actual-ledger.json",
  JSON.stringify(result, null, 2) + "\n",
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    pngSha256: result.pngSha256,
    samples: samples.length,
    quiet: quiet.length,
    literal: result.literal,
    adaptive: result.adaptive,
    ornamentInk,
    outOfViewportInkEnvelopes: result.outOfViewportInkEnvelopes,
  }),
);
