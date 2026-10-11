import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { chromium } from "playwright";
import { format } from "prettier";
import { resolve } from "node:path";
import { sha, root } from "./capture.mjs";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url),
  bundle = await readFile(require.resolve("jsqr"), "utf8");
const needle = "return __webpack_require__(__webpack_require__.s = 3);";
assert(bundle.includes(needle));
// Read-only instrumentation exposes installed internals for failure localization.
// This never participates in the independent acceptance decoder or edits its input.
const patched = bundle.replace(
  needle,
  "globalThis.internals=__webpack_require__; " + needle,
);
const context = {
  module: { exports: {} },
  exports: {},
  Uint8ClampedArray,
  Uint8Array,
  Int32Array,
  Float64Array,
};
runInNewContext(patched, context);
const binarize = context.internals(4).binarize,
  locate = context.internals(12).locate;
const out = resolve(root, "locator-diagnostic");
await mkdir(out);
const inputs = [
  { batch: "contrast-01", path: "raw/control-1.png", id: "positive-control" },
  {
    batch: "contrast-01",
    path: "raw/contrast-07.png",
    id: "sharp-Menlo-gray220",
  },
  {
    batch: "dense-01",
    path: "raw/dense-07.png",
    id: "sharp-Impact-uppercase-gray220",
  },
  {
    batch: "lowpass-01",
    path: "raw/lowpass-10.png",
    id: "native-Menlo-gray220-blur4",
  },
  {
    batch: "lowpass-01",
    path: "raw/lowpass-12.png",
    id: "native-Menlo-gray220-blur7",
  },
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
    const png = await readFile(resolve(root, s.batch, s.path));
    const p = await page.evaluate(async (b) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let str = "";
      for (let i = 0; i < data.length; i += 32768)
        str += String.fromCharCode(...data.subarray(i, i + 32768));
      return { width: c.width, height: c.height, data: btoa(str) };
    }, png.toString("base64"));
    const { binarized } = binarize(
      new Uint8ClampedArray(Buffer.from(p.data, "base64")),
      p.width,
      p.height,
      false,
    );
    const locations = locate(binarized);
    const base64 = Buffer.from(binarized.data).toString("base64");
    const binary = await page.evaluate(
      ({ base64, width, height }) => {
        const bits = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
          c = document.createElement("canvas");
        c.width = width;
        c.height = height;
        const ctx = c.getContext("2d"),
          im = ctx.createImageData(width, height);
        for (let i = 0; i < bits.length; i++) {
          const v = bits[i] ? 0 : 255;
          im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
          im.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(im, 0, 0);
        return c.toDataURL("image/png").split(",")[1];
      },
      { base64, width: p.width, height: p.height },
    );
    const bytes = Buffer.from(binary, "base64");
    await writeFile(resolve(out, s.id + "-binary.png"), bytes, { flag: "wx" });
    records.push({
      ...s,
      inputPNGSha256: sha(png),
      binarySha256: sha(bytes),
      locations: locations || [],
      stage: locations?.length
        ? "Location hypotheses exist; not a decoded payload"
        : "No location hypotheses",
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
      sourceScriptSha256: sha(
        await readFile(new URL("locate.mjs", import.meta.url)),
      ),
      installedBundleSha256: sha(bundle),
      instrumentation:
        needle + " exposed as globalThis.internals; no algorithm/input changes",
      classification:
        "Failure localization only. Binarized PNGs are diagnostics, never counted as candidate or phone successes",
      records,
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    records.map((x) => ({
      id: x.id,
      stage: x.stage,
      locations: x.locations.map((l) => ({
        dimension: l.dimension,
        topLeft: l.topLeft,
        topRight: l.topRight,
        bottomLeft: l.bottomLeft,
      })),
    })),
  ),
);
