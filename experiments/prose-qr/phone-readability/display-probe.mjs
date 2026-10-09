import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { readBarcodes } from "zxing-wasm/reader";
import { decode, DECODER_PROVENANCE } from "../decoders.mjs";
import { documentHtml } from "../flow/layout.mjs";
import { positiveControl } from "../layout.mjs";
import { root, sha } from "./capture.mjs";
import assert from "node:assert/strict";
import { format } from "prettier";
const out = resolve(root, "display-01");
await mkdir(out);
await mkdir(resolve(out, "raw"));
const sources = [
  {
    id: "ascii-test",
    path: "docs/research/prose-qr/phase-03/plain-02/raw/plain-003-1494.png",
    payload: "AQROBAT-TEST",
  },
  {
    id: "ascii-url",
    path: "docs/research/prose-qr/phase-03/refine-01/raw/refine-005-1686.png",
    payload: "https://example.com/",
  },
];
for (const s of sources) s.sourcePNGSha256 = sha(await readFile(s.path));
const records = [],
  controls = [];
const save = async (p, b) => writeFile(resolve(out, p), b, { flag: "wx" });
const json = async (p, v) =>
  save(p, await format(JSON.stringify(v), { parser: "json" }));
await json("manifest.json", {
  startedAt: new Date().toISOString(),
  sources,
  widths: [35, 70, 140, 280],
  sourceScriptSha256: sha(await readFile(new URL(import.meta.url))),
  decoder: DECODER_PROVENANCE,
  ordinaryZXing: { formats: ["QRCode"] },
  classification:
    "Actual browser resampling of full retained native PNGs, not a new text rendering or native legibility pass. Source PNGs remain unchanged. No custom threshold/blur/filter/decoder tuning.",
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 800, height: 800 },
    deviceScaleFactor: 1,
  });
  const probe = async (png, expected) => {
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
    const data = new Uint8ClampedArray(Buffer.from(p.data, "base64"));
    const baseline = await decode(
      { data, width: p.width, height: p.height },
      expected,
    );
    const z = await readBarcodes(
      { data, width: p.width, height: p.height },
      { formats: ["QRCode"] },
    );
    return {
      width: p.width,
      height: p.height,
      rgbaSha256: sha(data),
      baseline,
      ordinaryZXing: {
        payloads: z.map((x) => x.text),
        exact: z.some((x) => x.text === expected),
      },
    };
  };
  for (const s of sources) {
    await page.setContent(documentHtml(positiveControl(s.payload, 656)));
    const png = await page.locator("#artifact").screenshot();
    const r = await probe(png, s.payload);
    assert(
      r.baseline.jsQR.exact && r.baseline.zxing.exact && r.ordinaryZXing.exact,
    );
    const path = `raw/control-${controls.length + 1}.png`;
    await save(path, png);
    controls.push({ payload: s.payload, path, pngSha256: sha(png), ...r });
    for (const width of [35, 70, 140, 280]) {
      const id = `${s.id}-${width}`;
      const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:white}#artifact{width:${width}px;height:${width}px}img{display:block;width:100%;height:100%}</style><div id="artifact"><img alt="Exact retained native text PNG, displayed smaller" src="../../phase-03/${s.path.split("/phase-03/")[1]}"></div>`;
      await save(id + ".html", html);
      await page.goto(pathToFileURL(resolve(out, id + ".html")).href);
      await page.locator("img").evaluate((e) => e.decode());
      const png = await page.locator("#artifact").screenshot();
      const path = `raw/${id}.png`;
      await save(path, png);
      const r = {
        id,
        source: s.path,
        sourcePNGSha256: s.sourcePNGSha256,
        payload: s.payload,
        path,
        pngSha256: sha(png),
        ...(await probe(png, s.payload)),
      };
      records.push(r);
      await json(id + ".json", r);
      console.log(
        JSON.stringify({
          id,
          jsQR: r.baseline.jsQR.exact,
          ordinaryZXing: r.ordinaryZXing.exact,
          baselineZXing: r.baseline.zxing.exact,
        }),
      );
    }
  }
} finally {
  await browser.close();
}
await json("controls.json", controls);
await json("results.json", records);
await json("summary.json", {
  completed: records.length,
  jsQRExact: records.filter((x) => x.baseline.jsQR.exact).length,
  ordinaryZXingExact: records.filter((x) => x.ordinaryZXing.exact).length,
  baselineZXingExact: records.filter((x) => x.baseline.zxing.exact).length,
  newPhoneObservations: "none",
});
