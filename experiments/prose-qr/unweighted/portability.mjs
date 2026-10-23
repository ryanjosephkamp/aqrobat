import { chromium } from "playwright";
import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readBarcodes } from "zxing-wasm/reader";
import { format } from "prettier";
import assert from "node:assert/strict";
import { decode, DECODER_PROVENANCE } from "../decoders.mjs";
import { escapeHtml } from "../layout.mjs";
import { documentHtml } from "../flow/layout.mjs";
import { sha, READER_OPTIONS } from "./capture.mjs";
const root = resolve("docs/research/prose-qr/phase-03"),
  out = resolve(root, "portability");
await mkdir(out);
const configs = [
  READER_OPTIONS,
  { ...READER_OPTIONS, downscaleThreshold: 25, downscaleFactor: 3 },
  { ...READER_OPTIONS, binarizer: "LocalAverage" },
];
const inputs = [
  { id: "plain-003", path: "txt-proof/plain-003.txt", payload: "AQROBAT-TEST" },
  {
    id: "refine-005",
    path: "txt-url-proof/refine-005.txt",
    payload: "https://example.com/",
  },
];
const parameters = [];
for (const input of inputs)
  for (const font of ["Menlo", "Monaco", "Courier New", "Courier"])
    for (const size of [20, 24])
      parameters.push({ ...input, font, size, leading: 1.2 });
await writeFile(
  resolve(out, "manifest.json"),
  await format(
    JSON.stringify({
      startedAt: new Date().toISOString(),
      parameters,
      readerConfigs: configs,
      sourceScriptSha256: sha(
        await readFile(new URL("portability.mjs", import.meta.url)),
      ),
      method:
        "Same saved ASCII TXT, four requested regular fonts, two native type sizes, ordinary 1.2em line spacing. One pre element; no per-glyph/line styles or external input processing. Specified font/geometry test, not arbitrary paste or native app acceptance.",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
const records = [],
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
try {
  const page = await browser.newPage({
    viewport: { width: 2400, height: 2400 },
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  for (const spec of parameters) {
    const text = await readFile(resolve(root, spec.path), "utf8"),
      lines = text.split("\n");
    const advance = await page.evaluate(({ font, size }) => {
      const c = document.createElement("canvas"),
        ctx = c.getContext("2d");
      ctx.font = `400 ${size}px '${font}',monospace`;
      return ctx.measureText("m").width;
    }, spec);
    const width = Math.max(...lines.map((x) => x.length)) * advance,
      height = lines.length * spec.size * spec.leading,
      padX = advance * 4 * 5,
      padY = spec.size * spec.leading * 2 * 5;
    const html = documentHtml(
      `<article id="artifact" style="box-sizing:content-box;width:${width}px;height:${height}px;padding:${padY}px ${padX}px;background:white;color:black"><pre id="text-body" style="margin:0;padding:0;font:400 ${spec.size}px/${spec.leading} '${spec.font}',monospace;white-space:pre;letter-spacing:0;font-variant-ligatures:none;color:black">${escapeHtml(text)}</pre></article>`,
    );
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("#text-body").textContent(), text);
    assert.equal(await page.locator("#text-body span").count(), 0);
    const { root: dom } = await cdp.send("DOM.getDocument");
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: dom.nodeId,
      selector: "#text-body",
    });
    const platformFonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId })
    ).fonts;
    assert(
      platformFonts.some((x) => x.familyName === spec.font && x.glyphCount > 0),
      "Actual font family required",
    );
    const png = await page.locator("#artifact").screenshot();
    const name =
      spec.id + "-" + spec.font.replaceAll(" ", "-") + "-" + spec.size + ".png";
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
    const hash = sha(data);
    const baseline = await decode(
      { data, width: p.width, height: p.height },
      spec.payload,
    );
    const readers = [];
    for (const options of configs) {
      const z = await readBarcodes(
        { data, width: p.width, height: p.height },
        options,
      );
      readers.push({
        options,
        payloads: z.map((x) => x.text),
        exact: z.some((x) => x.text === spec.payload),
      });
    }
    assert.equal(sha(data), hash, "Decoder input stays unchanged");
    const r = {
      spec,
      path: name,
      TXTSourceSha256: sha(text),
      pngSha256: sha(png),
      width: p.width,
      height: p.height,
      fontWeight: 400,
      ink: "black",
      platformFonts,
      baseline,
      readers,
    };
    records.push(r);
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
    console.log(
      JSON.stringify({
        id: spec.id,
        font: spec.font,
        size: spec.size,
        baseline: [baseline.jsQR.exact, baseline.zxing.exact],
        configured: readers.map((x) => x.exact),
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
      inputFiles: 2,
      rawRenderings: records.length,
      baselineJsQRExact: records.filter((r) => r.baseline.jsQR.exact).length,
      baselineZXingExact: records.filter((r) => r.baseline.zxing.exact).length,
      configuredAttempts: records.length * configs.length,
      configuredExact: records.flatMap((r) => r.readers).filter((r) => r.exact)
        .length,
      uniqueConfiguredSuccessfulFrames: records.filter((r) =>
        r.readers.some((x) => x.exact),
      ).length,
      decoder: DECODER_PROVENANCE,
      phone: "not tested",
      nativeApps: "not tested",
    }),
    { parser: "json" },
  ),
  { flag: "wx" },
);
