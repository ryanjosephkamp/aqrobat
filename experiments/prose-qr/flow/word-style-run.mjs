import { chromium } from "playwright";
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { readBarcodes } from "zxing-wasm/reader";
import { decode, DECODER_PROVENANCE } from "../decoders.mjs";
import { wordStyle } from "./word-style.mjs";
import { documentHtml } from "./layout.mjs";

const out = resolve("docs/research/prose-qr/phase-02/word-style");
await mkdir(out);
await mkdir(resolve(out, "raw"));
const sha = (x) => createHash("sha256").update(x).digest("hex");
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
);
const options = {
  formats: ["QRCode"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
  binarizer: "GlobalHistogram",
  downscaleThreshold: 50,
  downscaleFactor: 2,
};
const parameters = [];
for (const gray of [120, 180])
  for (const preserveFinders of [false, true])
    parameters.push({
      id: `word-${parameters.length + 1}`,
      payload: "AQROBAT-TEST",
      font: "Courier New",
      content: "story",
      charsPerModule: 4,
      linesPerModule: 2,
      fontSize: 20,
      quiet: 5,
      ecc: "Q",
      boost: false,
      darkWeight: 700,
      lightWeight: 400,
      gray,
      preserveFinders,
      track: "whole-word-grayscale",
    });
const hashes = {};
for (const name of ["layout.mjs", "word-style.mjs", "word-style-run.mjs"])
  hashes[name] = sha(await readFile(new URL(name, import.meta.url)));
await writeFile(
  resolve(out, "manifest.json"),
  await format(
    JSON.stringify({
      startedAt: new Date().toISOString(),
      parameters,
      sourceHashes: hashes,
      configuredReader: options,
      decoders: DECODER_PROVENANCE,
      method:
        "Same ordinary word spacing and natural 20px letters. Whole-word majority ink; separate variant preserves per-letter corner finder/separator regions. Q error correction requested. No QR underlay.",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const records = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1700, height: 1700 },
  });
  for (const spec of parameters) {
    const l = wordStyle(spec, metrics);
    const html = await format(documentHtml(l.markup), { parser: "html" });
    await writeFile(resolve(out, `${spec.id}.html.gz`), gzipSync(html), {
      flag: "wx",
    });
    await writeFile(
      resolve(out, `${spec.id}-layout.json`),
      await format(
        JSON.stringify({
          spec,
          plainText: l.plainText,
          structural: l.structural,
          side: l.side,
          modules: l.modules,
        }),
        { parser: "json" },
      ),
      { flag: "wx" },
    );
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await page.locator(".line").allTextContents(), l.lines);
    const png = await page.locator("#artifact").screenshot();
    const name = `raw/${spec.id}-${l.side}.png`;
    await writeFile(resolve(out, name), png, { flag: "wx" });
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
    const baseline = await decode(
      { data, width: p.width, height: p.height },
      spec.payload,
    );
    const z = await readBarcodes(
      { data, width: p.width, height: p.height },
      options,
    );
    const r = {
      id: spec.id,
      spec,
      width: p.width,
      height: p.height,
      fontSize: 20,
      structural: l.structural,
      path: name,
      pngSha256: sha(png),
      baseline,
      configured: {
        options,
        payloads: z.map((r) => r.text),
        exact: z.some((r) => r.text === spec.payload),
      },
    };
    records.push(r);
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
    console.log(
      JSON.stringify({
        id: r.id,
        baseline: [baseline.jsQR.exact, baseline.zxing.exact],
        configured: r.configured.exact,
      }),
    );
  }
} finally {
  await browser.close();
}
await writeFile(
  resolve(out, "summary.json"),
  await format(
    JSON.stringify({
      finishedAt: new Date().toISOString(),
      cases: records.length,
      rawFrames: records.length,
      baselineJsQR: records.filter((r) => r.baseline.jsQR.exact).length,
      baselineZXing: records.filter((r) => r.baseline.zxing.exact).length,
      configuredZXing: records.filter((r) => r.configured.exact).length,
      phone: "not tested",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
