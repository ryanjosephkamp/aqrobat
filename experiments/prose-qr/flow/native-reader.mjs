import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { format } from "prettier";
import { readBarcodes } from "zxing-wasm/reader";
import { DECODER_PROVENANCE } from "../decoders.mjs";
const root = resolve("docs/research/prose-qr/phase-02");
const batch = process.argv[2] || "batch-02";
assert(["batch-01", "batch-02"].includes(batch));
const cases = (await readFile(resolve(root, batch, "results.jsonl"), "utf8"))
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
  for (const row of cases) {
    const frame = row.raw[0],
      png = await readFile(resolve(root, batch, frame.path));
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
        candidate: row.id,
        font: row.spec.font,
        content: row.spec.content,
        gray: row.spec.gray,
        nativeFontSize: 20,
        inputPngSha256: frame.pngSha256,
        options: config,
        payloads: results.map((r) => r.text),
        exact: results.some((r) => r.text === row.spec.payload),
      });
    }
    console.log(
      JSON.stringify({
        candidate: row.id,
        exact: records.slice(-3).map((r) => r.exact),
      }),
    );
  }
} finally {
  await browser.close();
}
const receipt = {
  testedAt: new Date().toISOString(),
  decoder: DECODER_PROVENANCE,
  classification:
    "Standard configured ZXing on unchanged native 20px paragraph PNGs; decoder internal downscaling; no external blur/threshold/crop or matrix repair; phone untested",
  inputFrames: cases.length,
  attempts: records.length,
  exact: records.filter((r) => r.exact).length,
  uniqueSuccessfulFrames: new Set(
    records.filter((r) => r.exact).map((r) => r.candidate),
  ).size,
  records,
};
await writeFile(
  resolve(
    root,
    "reader-options",
    batch === "batch-01"
      ? "native-first-batch-results.json"
      : "native-results.json",
  ),
  await format(JSON.stringify(receipt), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    inputs: receipt.inputFrames,
    attempts: receipt.attempts,
    exact: receipt.exact,
    uniqueSuccessfulFrames: receipt.uniqueSuccessfulFrames,
  }),
);
