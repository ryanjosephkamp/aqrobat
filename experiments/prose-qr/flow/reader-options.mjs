import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
import { readBarcodes } from "zxing-wasm/reader";
import { DECODER_PROVENANCE } from "../decoders.mjs";
const root = resolve("docs/research/prose-qr/phase-02"),
  out = resolve(root, "reader-options");
await mkdir(out);
const frames = (
  await readFile(resolve(root, "view-sweep/results.jsonl"), "utf8")
)
  .trim()
  .split("\n")
  .map(JSON.parse);
const options = [
  { binarizer: "GlobalHistogram" },
  { binarizer: "LocalAverage", downscaleThreshold: 50, downscaleFactor: 2 },
  { binarizer: "GlobalHistogram", downscaleThreshold: 50, downscaleFactor: 2 },
];
const records = [],
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
try {
  const page = await browser.newPage();
  for (const frame of frames) {
    const png = await readFile(resolve(root, "view-sweep", frame.path));
    assert.equal(
      createHash("sha256").update(png).digest("hex"),
      frame.pngSha256,
    );
    const p = await page.evaluate(async (base64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + base64;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height).data;
      let s = "";
      for (let i = 0; i < data.length; i += 32768)
        s += String.fromCharCode(...data.subarray(i, i + 32768));
      return { data: btoa(s), width: c.width, height: c.height };
    }, png.toString("base64"));
    const data = new Uint8ClampedArray(Buffer.from(p.data, "base64"));
    for (const o of options) {
      const config = {
        formats: ["QRCode"],
        tryHarder: true,
        maxNumberOfSymbols: 1,
        ...o,
      };
      const results = await readBarcodes(
        { data, width: p.width, height: p.height },
        config,
      );
      records.push({
        candidate: frame.candidate,
        mode: frame.mode,
        size: frame.size,
        inputPngSha256: frame.pngSha256,
        options: config,
        payloads: results.map((r) => r.text),
        exact: results.some((r) => r.text === frame.payload),
      });
    }
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(out, "results.json"),
  await format(
    JSON.stringify({
      testedAt: new Date().toISOString(),
      decoder: DECODER_PROVENANCE,
      classification:
        "New reader-option tests on retained unchanged raw PNGs; not defaults or phone acceptance",
      inputViews: frames.length,
      configurationCount: options.length,
      attempts: records.length,
      exact: records.filter((r) => r.exact).length,
      records,
    }),
    { parser: "json" },
  ),
);
console.log(
  JSON.stringify({
    attempts: records.length,
    exact: records.filter((r) => r.exact).length,
    successes: records.filter((r) => r.exact),
  }),
);
