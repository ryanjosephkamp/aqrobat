import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { chromium } from "playwright";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { format } from "prettier";
import qrcodegen from "../../../vendor/qrcodegen.mjs";
import { root, sha } from "./capture.mjs";
const bundle = await readFile(
  createRequire(import.meta.url).resolve("jsqr"),
  "utf8",
);
const needle = "return __webpack_require__(__webpack_require__.s = 3);";
assert(bundle.includes(needle));
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
const binarize = context.internals(4).binarize,
  locate = context.internals(12).locate;
const out = resolve(root, "geometry-diagnostic");
await mkdir(out);
const inputs = [
  { batch: "quiet-ink-01", id: "quiet-3" },
  { batch: "stroke-01", id: "stroke-2" },
];
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  records = [];
try {
  const page = await browser.newPage();
  for (const s of inputs) {
    const base = resolve(root, s.batch),
      l = JSON.parse(
        await readFile(resolve(base, s.id + "-layout.json"), "utf8"),
      ),
      png = await readFile(resolve(base, "raw", s.id + ".png"));
    const p = await page.evaluate(async (b) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let str = "";
      for (let i = 0; i < d.length; i += 32768)
        str += String.fromCharCode(...d.subarray(i, i + 32768));
      return { width: c.width, height: c.height, data: btoa(str) };
    }, png.toString("base64"));
    const { binarized } = binarize(
        new Uint8ClampedArray(Buffer.from(p.data, "base64")),
        p.width,
        p.height,
        false,
      ),
      locations = locate(binarized) || [];
    const qr = qrcodegen.QrCode.encodeSegments(
      qrcodegen.QrSegment.makeSegments(l.spec.payload),
      qrcodegen.QrCode.Ecc.QUARTILE,
      1,
      40,
      -1,
      false,
    );
    assert.equal(qr.size, l.modules);
    assert.equal(l.side, p.width);
    const tally = {
      dark: { black: 0, total: 0, centerBlack: 0, modules: 0 },
      light: { black: 0, total: 0, centerBlack: 0, modules: 0 },
    };
    const pad = l.spec.quiet * l.unit;
    for (let y = 0; y < qr.size; y++)
      for (let x = 0; x < qr.size; x++) {
        const t = tally[qr.getModule(x, y) ? "dark" : "light"];
        t.modules++;
        t.centerBlack += binarized.get(
          Math.floor(pad + (x + 0.5) * l.unit),
          Math.floor(pad + (y + 0.5) * l.unit),
        )
          ? 1
          : 0;
        for (
          let py = Math.ceil(pad + y * l.unit);
          py < pad + (y + 1) * l.unit;
          py++
        )
          for (
            let px = Math.ceil(pad + x * l.unit);
            px < pad + (x + 1) * l.unit;
            px++
          ) {
            t.total++;
            t.black += binarized.get(px, py) ? 1 : 0;
          }
      }
    const expected = {
      topLeft: { x: pad + 3.5 * l.unit, y: pad + 3.5 * l.unit },
      topRight: { x: pad + (qr.size - 3.5) * l.unit, y: pad + 3.5 * l.unit },
      bottomLeft: { x: pad + 3.5 * l.unit, y: pad + (qr.size - 3.5) * l.unit },
    };
    const matchesExpectedFinder = locations.some(
      (a) =>
        a.dimension === qr.size &&
        ["topLeft", "topRight", "bottomLeft"].every(
          (k) =>
            Math.hypot(a[k].x - expected[k].x, a[k].y - expected[k].y) < l.unit,
        ),
    );
    records.push({
      ...s,
      inputPNGSha256: sha(png),
      locations,
      expectedFinderCenters: expected,
      matchesExpectedFinder,
      intendedModuleDiagnostic: Object.fromEntries(
        Object.entries(tally).map(([k, t]) => [
          k,
          {
            ...t,
            blackFraction: t.black / t.total,
            centerBlackFraction: t.centerBlack / t.modules,
          },
        ]),
      ),
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(out, "receipts.json"),
  await format(
    JSON.stringify({
      testedAt: new Date().toISOString(),
      sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
      installedJsQRBundleSha256: sha(bundle),
      classification:
        "Diagnostic only. The source QR matrix is used after binarization to measure where ink landed, never as an input to independent decoding or as a pixel repair. Locator hypotheses are not payload recoveries. Samsung internals unknown.",
      records,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    records.map((r) => ({
      id: r.id,
      matchesExpectedFinder: r.matchesExpectedFinder,
      ink: r.intendedModuleDiagnostic,
      dimensions: r.locations.map((x) => x.dimension),
    })),
  ),
);
