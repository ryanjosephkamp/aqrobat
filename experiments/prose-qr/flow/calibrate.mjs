import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
import { readBarcodes } from "zxing-wasm/reader";
import { DECODER_PROVENANCE } from "../decoders.mjs";
import { positiveControl } from "../layout.mjs";
import { build, documentHtml } from "./layout.mjs";
const root = resolve("docs/research/prose-qr/phase-02");
const out = resolve(root, "calibration");
await mkdir(out);
const sha = (b) => createHash("sha256").update(b).digest("hex");
const m = JSON.parse(
  await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
);
const rs = (await readFile(resolve(root, "batch-02/results.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map(JSON.parse);
const options = {
  formats: ["QRCode"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
  binarizer: "GlobalHistogram",
  downscaleThreshold: 50,
  downscaleFactor: 2,
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const receipts = [];
try {
  const page = await browser.newPage({
    viewport: { width: 2400, height: 2400 },
  });
  async function read(png) {
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
    return readBarcodes(
      {
        data: new Uint8ClampedArray(Buffer.from(p.data, "base64")),
        width: p.width,
        height: p.height,
      },
      options,
    );
  }
  for (const size of [640, 960]) {
    await page.setContent(documentHtml(positiveControl("AQROBAT-TEST", size)));
    const png = await page.locator("#artifact").screenshot();
    const results = await read(png);
    assert(results.some((r) => r.text === "AQROBAT-TEST"));
    receipts.push({
      kind: "conventional positive",
      size,
      pngSha256: sha(png),
      payloads: results.map((r) => r.text),
      exact: true,
    });
  }
  for (const id of [
    "band-003",
    "band-009",
    "band-015",
    "band-021",
    "band-023",
    "band-024",
  ]) {
    const row = rs.find((r) => r.id === id);
    const html = gunzipSync(
      await readFile(resolve(root, "batch-02", id + ".html.gz")),
    ).toString("utf8");
    await page.setContent(html);
    const text = await page.locator(".line").allTextContents();
    const layout = build(row.spec, m);
    assert.deepEqual(
      text,
      layout.lines,
      "Replay must preserve every letter/space",
    );
    const png = await page.locator("#artifact").screenshot();
    assert.equal(
      sha(png),
      row.raw[0].pngSha256,
      "Exported HTML must match retained raw native PNG",
    );
    const results = await read(png);
    assert(results.some((r) => r.text === "AQROBAT-TEST"));
    receipts.push({
      kind: "successful native HTML replay",
      id,
      pngSha256: sha(png),
      textLineCount: text.length,
      exact: true,
      payloads: results.map((r) => r.text),
    });
  }
  for (const font of ["Menlo", "Courier New"]) {
    const spec = { ...rs.find((r) => r.id === "band-023").spec, font };
    const l = build(spec, m);
    await page.setContent(documentHtml(l.markup));
    await page.locator("#text-body span").evaluateAll((nodes) => {
      for (const n of nodes) {
        n.style.fontWeight = "400";
        n.style.color = "black";
      }
    });
    const png = await page.locator("#artifact").screenshot();
    const results = await read(png);
    assert.equal(
      results.length,
      0,
      "Uniform unencoded paragraph must not decode",
    );
    receipts.push({
      kind: "uniform paragraph negative",
      font,
      pngSha256: sha(png),
      recognized: false,
      description:
        "Same readable story geometry; all glyphs regular black, QR-dependent ink styling removed",
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
      reader: DECODER_PROVENANCE,
      options,
      receipts,
      negativePngStorage:
        "Hashes retained; source recipe and deterministic styling removal recorded; no extra duplicate large negative PNGs stored",
      phone: "not tested",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    positiveControls: 2,
    nativeReplayHashesAndPayloads: 6,
    uniformTextNegatives: 2,
    status: "passed",
  }),
);
