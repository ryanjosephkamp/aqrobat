import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  mkdir,
  appendFile,
  readdir,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
import { readBarcodes } from "zxing-wasm/reader";
import { decode } from "../decoders.mjs";
import { rectangle } from "./rectangle.mjs";
import { documentHtml } from "./layout.mjs";
const root = resolve("docs/research/prose-qr/phase-02"),
  out = resolve(root, "rectangles");
await mkdir(out);
await mkdir(resolve(out, "raw"));
const sha = (v) => createHash("sha256").update(v).digest("hex");
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
);
const parameters = [];
for (const charsPerModule of [3, 4])
  for (const gray of [120, 180])
    parameters.push({
      id: `rect-${parameters.length + 1}`,
      payload: "AQROBAT-TEST",
      font: "Courier New",
      content: "story",
      charsPerModule,
      fontSize: 20,
      quiet: 5,
      ecc: "M",
      boost: false,
      darkWeight: 700,
      lightWeight: 400,
      gray,
      track: "grayscale-rectangle",
    });
const options = {
  formats: ["QRCode"],
  tryHarder: true,
  maxNumberOfSymbols: 1,
  binarizer: "GlobalHistogram",
  downscaleThreshold: 50,
  downscaleFactor: 2,
};
const hashes = {};
for (const name of ["layout.mjs", "rectangle.mjs", "rectangle-run.mjs"])
  hashes[name] = sha(await readFile(new URL(name, import.meta.url)));
await writeFile(
  resolve(out, "manifest.json"),
  await format(
    JSON.stringify({
      startedAt: new Date().toISOString(),
      parameters,
      sourceHashes: hashes,
      configuredReader: options,
      note: "Rectangular text-block geometry; ordinary 1.25em leading; unchanged letter shapes/advance. No square-marker substitution or QR underlay.",
    }),
    { parser: "json" },
  ),
);
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  records = [];
async function used() {
  let n = 0;
  async function w(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = resolve(p, e.name);
      if (e.isDirectory()) await w(q);
      else n += (await stat(q)).size;
    }
  }
  await w(root);
  return n;
}
try {
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1200 },
  });
  for (const spec of parameters) {
    const l = rectangle(spec, metrics);
    assert(
      l.structural.maxOpticalHeightToLineHeight < 1 &&
        l.structural.emptyLines === 0,
    );
    const html = documentHtml(l.markup);
    await writeFile(
      resolve(out, `${spec.id}.html.gz`),
      gzipSync(await format(html, { parser: "html" })),
      { flag: "wx" },
    );
    const r = {
      id: spec.id,
      spec,
      structural: l.structural,
      width: l.width,
      height: l.height,
      raw: [],
    };
    await writeFile(
      resolve(out, `${spec.id}-layout.json`),
      await format(
        JSON.stringify({
          spec,
          plainText: l.plainText,
          structural: l.structural,
          width: l.width,
          height: l.height,
        }),
        { parser: "json" },
      ),
      { flag: "wx" },
    );
    for (const width of [l.width, 640]) {
      await page.setContent(html);
      await page.evaluate(
        (z) => (document.getElementById("artifact").style.zoom = z),
        width / l.width,
      );
      const png = await page.locator("#artifact").screenshot();
      assert((await used()) + png.length < 29_000_000);
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
      const configured = await readBarcodes(
        { data, width: p.width, height: p.height },
        options,
      );
      const path = `raw/${spec.id}-${width}.png`;
      await writeFile(resolve(out, path), png, { flag: "wx" });
      r.raw.push({
        kind: width === l.width ? "native 20px text" : "browser zoom",
        width: p.width,
        height: p.height,
        visibleFontSize: (20 * width) / l.width,
        path,
        pngSha256: sha(png),
        rgbaSha256: sha(data),
        defaultReaders: await decode(
          { data, width: p.width, height: p.height },
          spec.payload,
        ),
        configuredZXing: {
          options,
          payloads: configured.map((r) => r.text),
          exact: configured.some((r) => r.text === spec.payload),
        },
      });
    }
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
    records.push(r);
    console.log(
      JSON.stringify({
        id: r.id,
        raw: r.raw.map((r) => ({
          defaults: [r.defaultReaders.jsQR.exact, r.defaultReaders.zxing.exact],
          configured: r.configuredZXing.exact,
        })),
        bytes: await used(),
      }),
    );
  }
  await writeFile(
    resolve(out, "summary.json"),
    await format(
      JSON.stringify({
        finishedAt: new Date().toISOString(),
        cases: records.length,
        rawViews: records.flatMap((r) => r.raw).length,
        defaultReaderExact: records
          .flatMap((r) => r.raw)
          .filter(
            (r) => r.defaultReaders.jsQR.exact || r.defaultReaders.zxing.exact,
          ).length,
        configuredZXingExact: records
          .flatMap((r) => r.raw)
          .filter((r) => r.configuredZXing.exact).length,
        phone: "not tested",
      }),
      { parser: "json" },
    ),
  );
} finally {
  await browser.close();
}
