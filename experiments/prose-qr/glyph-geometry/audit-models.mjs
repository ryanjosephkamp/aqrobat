import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { format } from "prettier";
import assert from "node:assert/strict";
import { generate } from "../../../src/core.mjs";
import { ordinaryBinarize, diagnose } from "./diagnostic.mjs";
const root = "docs/research/prose-qr/phase-05/paragraph-02",
  sha = (b) => createHash("sha256").update(b).digest("hex");
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  records = [];
try {
  const page = await browser.newPage();
  async function pixels(path) {
    const png = await readFile(path),
      p = await page.evaluate(async (b) => {
        const img = new Image();
        img.src = "data:image/png;base64," + b;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let s = "";
        for (let i = 0; i < d.length; i += 32768)
          s += String.fromCharCode(...d.subarray(i, i + 32768));
        return { width: canvas.width, height: canvas.height, data: btoa(s) };
      }, png.toString("base64"));
    return {
      width: p.width,
      height: p.height,
      data: new Uint8ClampedArray(Buffer.from(p.data, "base64")),
    };
  }
  const rows = (await readFile(root + "/results.jsonl", "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse);
  for (const r of rows) {
    const t = JSON.parse(
        await readFile(root + "/" + r.id + "-model-trace.json", "utf8"),
      ),
      l = JSON.parse(
        await readFile(root + "/" + r.id + "-layout.json", "utf8"),
      ),
      qr = generate(r.spec.payload, { ecc: "Q", boost: false, stroke: 0 });
    l.matrix = qr.matrix;
    const actual = await pixels(root + "/" + r.path);
    assert.equal(sha(actual.data), r.rgbaSha256);
    const binActual = ordinaryBinarize(actual),
      modelRecords = [];
    for (const name of ["initial", "final"]) {
      const model = await pixels(
        root + "/raw/" + r.id + "-model-" + name + ".png",
      );
      assert.equal(
        sha(model.data),
        name === "initial" ? t.initialRgbaHash : t.finalRgbaHash,
      );
      assert.equal(model.width, actual.width);
      assert.equal(model.height, actual.height);
      const bm = ordinaryBinarize(model);
      let differentRgbaPixels = 0,
        differentBinaryPixels = 0;
      for (let y = 0; y < model.height; y++)
        for (let x = 0; x < model.width; x++) {
          const i = (y * model.width + x) * 4;
          if (
            [0, 1, 2, 3].some((k) => model.data[i + k] !== actual.data[i + k])
          )
            differentRgbaPixels++;
          if (bm.get(x, y) !== binActual.get(x, y)) differentBinaryPixels++;
        }
      modelRecords.push({
        name,
        width: model.width,
        height: model.height,
        differentRgbaPixels,
        differentBinaryPixels,
        comparedPixels: model.width * model.height,
        diagnostic: diagnose(model, l),
      });
    }
    records.push({
      id: r.id,
      model: r.model,
      actualDiagnostic: r.diagnostic,
      models: modelRecords,
    });
  }
} finally {
  await browser.close();
}
await writeFile(
  "docs/research/prose-qr/phase-05/model-audit-01.json",
  await format(
    JSON.stringify({
      at: new Date().toISOString(),
      classification:
        "Read-only retained-PNG RGBA custody and renderer diagnostic; no new capture or payload probe",
      sourceSha256: sha(await readFile(new URL(import.meta.url))),
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
      differences: r.models.map((m) => ({
        name: m.name,
        rgbaPixels: m.differentRgbaPixels,
        binaryPixels: m.differentBinaryPixels,
        total: m.comparedPixels,
      })),
    })),
  ),
);
