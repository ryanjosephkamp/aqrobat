import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  appendFile,
  mkdir,
  readdir,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { readBarcodes } from "zxing-wasm/reader";
import { decode, DECODER_PROVENANCE } from "../decoders.mjs";
import { documentHtml } from "../flow/layout.mjs";
import { positiveControl } from "../layout.mjs";

export const root = resolve("docs/research/prose-qr/phase-04");
export const sha = (b) => createHash("sha256").update(b).digest("hex");
async function used(p = root) {
  let n = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    n += e.isDirectory() ? await used(q) : (await stat(q)).size;
  }
  return n;
}
export async function captureBatch(name, specs, builder, sourcePaths) {
  const out = resolve(root, name);
  await mkdir(out);
  await mkdir(resolve(out, "raw"));
  const save = async (path, b) => {
    assert(
      (await used()) + Buffer.byteLength(b) < 39_000_000,
      "Phase evidence reserve",
    );
    await writeFile(resolve(out, path), b, { flag: "wx" });
    return sha(b);
  };
  const json = async (path, v) =>
    save(path, await format(JSON.stringify(v), { parser: "json" }));
  const sourceHashes = {};
  for (const p of sourcePaths) sourceHashes[p] = sha(await readFile(p));
  const metrics = JSON.parse(
    await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
  );
  await json("manifest.json", {
    startedAt: new Date().toISOString(),
    specs,
    sourceHashes,
    metricsSha256: sha(
      await readFile("docs/research/prose-qr/pilot-02/metrics.json"),
    ),
    decoder: DECODER_PROVENANCE,
    ordinaryZXing: { formats: ["QRCode"] },
    gate: "jsQR and ZXing using their ordinary binarizer/downscaling; no tuned reader settings, no expected payload/matrix input",
  });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const records = [],
    controls = [],
    errors = [];
  let attempted = null;
  try {
    const page = await browser.newPage({
      viewport: { width: 2800, height: 2800 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    async function probe(png, expected) {
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
        let s = "";
        for (let i = 0; i < data.length; i += 32768)
          s += String.fromCharCode(...data.subarray(i, i + 32768));
        return { data: btoa(s), width: c.width, height: c.height };
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
    }
    for (const payload of [...new Set(specs.map((s) => s.payload))]) {
      await page.setContent(documentHtml(positiveControl(payload, 656)));
      const png = await page.locator("#artifact").screenshot();
      const r = await probe(png, payload);
      assert(
        r.baseline.jsQR.exact &&
          r.baseline.zxing.exact &&
          r.ordinaryZXing.exact,
        "Positive control failed",
      );
      const path = `raw/control-${controls.length + 1}.png`;
      controls.push({ payload, path, pngSha256: await save(path, png), ...r });
    }
    await json("controls.json", controls);
    for (const s of specs) {
      attempted = s.id;
      const start = Date.now();
      const l = await builder(s, metrics);
      assert(l.side <= 2700 && l.side > 0);
      assert(l.lines.every((x) => x.trim()));
      assert(!l.plainText.includes("  "));
      const target = s.outputSize || l.side,
        ratio = target / l.side;
      const html = await format(
        documentHtml(
          `<style>#text-body{filter:blur(${s.blur || 0}px)}#artifact{zoom:${ratio}}</style>${l.markup}`,
        ),
        { parser: "html" },
      );
      await json(s.id + "-layout.json", {
        spec: s,
        plainText: l.plainText,
        structural: l.structural,
        unit: l.unit,
        side: l.side,
        modules: l.modules,
        visibleFontSize: s.fontSize * ratio,
      });
      const htmlGzipSha256 = await save(s.id + ".html.gz", gzipSync(html));
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        sha((await page.locator(".line").allTextContents()).join("\n")),
        sha(l.plainText),
        "Source line fidelity failed before raster capture",
      );
      const style = await page.locator("#text-body").evaluate((e) => ({
        font: getComputedStyle(e).fontFamily,
        weight: getComputedStyle(e).fontWeight,
        filter: getComputedStyle(e).filter,
        spanWeights: [
          ...new Set(
            [...e.querySelectorAll("span")].map(
              (x) => getComputedStyle(x).fontWeight,
            ),
          ),
        ],
      }));
      const png = await page.locator("#artifact").screenshot();
      const path = `raw/${s.id}.png`,
        pngSha256 = await save(path, png);
      const results = await probe(png, s.payload);
      const r = {
        id: s.id,
        spec: s,
        path,
        pngSha256,
        htmlGzipSha256,
        ...results,
        style,
        structural: l.structural,
        visibleFontSize: s.fontSize * ratio,
        classification: s.blur
          ? "Explicitly filtered presentation; not sharp plain text"
          : ratio !== 1
            ? "Actual scaled browser text display; not native-size legibility evidence"
            : "Sharp native text",
        elapsedMs: Date.now() - start,
      };
      await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
      records.push(r);
      console.log(
        JSON.stringify({
          id: s.id,
          jsQR: r.baseline.jsQR.exact,
          ZXingOrdinary: r.ordinaryZXing.exact,
          ZXingBaseline: r.baseline.zxing.exact,
          visibleFontSize: r.visibleFontSize,
          blur: s.blur || 0,
        }),
      );
    }
    assert.deepEqual(errors, []);
  } catch (e) {
    await json("aborted.json", {
      at: new Date().toISOString(),
      attempted,
      completed: records.length,
      message: e.message,
    });
    throw e;
  } finally {
    await browser.close();
  }
  await json("summary.json", {
    finishedAt: new Date().toISOString(),
    completed: records.length,
    jsQRExact: records.filter((x) => x.baseline.jsQR.exact).length,
    ordinaryZXingExact: records.filter((x) => x.ordinaryZXing.exact).length,
    baselineZXingExact: records.filter((x) => x.baseline.zxing.exact).length,
    bothOrdinaryExact: records
      .filter((x) => x.baseline.jsQR.exact && x.ordinaryZXing.exact)
      .map((x) => x.id),
    bytes: await used(),
    newPhoneObservations: "none",
  });
  return records;
}
