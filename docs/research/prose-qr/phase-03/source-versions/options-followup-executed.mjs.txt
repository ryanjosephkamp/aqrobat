import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readBarcodes } from "zxing-wasm/reader";
import { format } from "prettier";
import assert from "node:assert/strict";
import { sha } from "./capture.mjs";
const root = resolve("docs/research/prose-qr/phase-03");
const selections =
  process.argv[2] === "words"
    ? {
        "words-01": null,
        "plain-02": ["plain-001", "plain-005"],
        "refine-01": ["refine-008", "refine-010"],
      }
    : {
        "color-01": null,
        "plain-02": ["plain-002", "plain-004"],
        "refine-01": [
          "refine-001",
          "refine-002",
          "refine-003",
          "refine-004",
          "refine-009",
          "refine-011",
        ],
        "font-color-01": null,
      };
const inputs = [];
for (const [batch, ids] of Object.entries(selections)) {
  const rows = (await readFile(resolve(root, batch, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  for (const r of rows)
    if (!ids || ids.includes(r.id)) inputs.push({ ...r, batch });
}
const configs = [];
for (const threshold of [25, 75, 150])
  for (const factor of [2, 3, 4])
    configs.push({
      binarizer: "GlobalHistogram",
      downscaleThreshold: threshold,
      downscaleFactor: factor,
    });
configs.push({
  binarizer: "LocalAverage",
  downscaleThreshold: 50,
  downscaleFactor: 2,
});
const records = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage();
  for (const r of inputs) {
    const png = await readFile(resolve(root, r.batch, r.path));
    assert.equal(sha(png), r.pngSha256);
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
    for (const c of configs) {
      const options = {
        formats: ["QRCode"],
        tryHarder: true,
        maxNumberOfSymbols: 1,
        ...c,
      };
      const z = await readBarcodes(
        { data, width: p.width, height: p.height },
        options,
      );
      records.push({
        batch: r.batch,
        id: r.id,
        track: r.spec.track,
        inputPNGSha256: r.pngSha256,
        options,
        payloads: z.map((x) => x.text),
        exact: z.some((x) => x.text === r.spec.payload),
      });
    }
    console.log(
      JSON.stringify({
        id: r.id,
        exact: records.slice(-configs.length).filter((x) => x.exact).length,
      }),
    );
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, process.argv[3] || "reader-options.json"),
  await format(
    JSON.stringify({
      testedAt: new Date().toISOString(),
      inputFrames: inputs.length,
      configurations: configs.length,
      attempts: records.length,
      exactAttempts: records.filter((x) => x.exact).length,
      uniqueSuccessfulFrames: [
        ...new Set(
          records.filter((x) => x.exact).map((x) => x.batch + "/" + x.id),
        ),
      ],
      records,
      classification:
        "Additional standard reader settings on retained unchanged native PNGs. No input processing outside the reader. Selection targets all color-only cases and explicit more-varied/dictionary cases; not a repeat capture or phone evidence.",
      phone: "not tested",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
