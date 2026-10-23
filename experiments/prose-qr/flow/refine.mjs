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
import { build, documentHtml } from "./layout.mjs";
import { positiveControl } from "../layout.mjs";
import { decode, DECODER_PROVENANCE } from "../decoders.mjs";

const root = resolve("docs/research/prose-qr/phase-02");
const out = resolve(root, "batch-02");
await mkdir(out);
await mkdir(resolve(out, "raw"));
await mkdir(resolve(out, "diagnostics"));
const sha = (v) => createHash("sha256").update(v).digest("hex");
async function used() {
  let n = 0;
  async function walk(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = resolve(p, e.name);
      if (e.isDirectory()) await walk(q);
      else n += (await stat(q)).size;
    }
  }
  await walk(root);
  return n;
}
async function save(name, b) {
  assert(
    (await used()) + Buffer.byteLength(b) < 29_000_000,
    "Phase evidence reserve",
  );
  await writeFile(resolve(out, name), b, { flag: "wx" });
  return sha(b);
}
async function json(name, v) {
  return save(name, await format(JSON.stringify(v), { parser: "json" }));
}
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
);
const parameters = [];
for (const charsPerModule of [4, 6])
  for (const font of ["Menlo", "Courier New"])
    for (const content of ["dictionary", "story"])
      for (const gray of [0, 120, 180])
        parameters.push({
          id: `band-${String(parameters.length + 1).padStart(3, "0")}`,
          payload: "AQROBAT-TEST",
          font,
          content,
          charsPerModule,
          linesPerModule: charsPerModule / 2,
          fontSize: 20,
          quiet: 5,
          ecc: "M",
          boost: false,
          darkWeight: 700,
          lightWeight: 400,
          gray,
          track: gray ? "grayscale" : "weight",
        });
const hashes = {};
for (const name of ["layout.mjs", "refine.mjs"])
  hashes[name] = sha(await readFile(new URL(name, import.meta.url)));
await json("manifest.json", {
  startedAt: new Date().toISOString(),
  parameters,
  sourceHashes: hashes,
  decoders: DECODER_PROVENANCE,
  method:
    "Whole paragraph; normal single spaces and 1.2em line spacing. Two/three text lines per QR region. Uniform CSS zoom is separately recorded from native type. Raw/processed remain distinct.",
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const records = [],
  errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 2400, height: 2400 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  async function pixels(png, processing = null) {
    return page.evaluate(
      async ({ base64, processing }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + base64;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, c.width, c.height);
        if (processing) ctx.filter = `blur(${processing.blur}px)`;
        ctx.drawImage(img, 0, 0);
        let canvas = c;
        if (processing?.downsample) {
          canvas = document.createElement("canvas");
          canvas.width = Math.round(c.width / processing.downsample);
          canvas.height = Math.round(c.height / processing.downsample);
          canvas
            .getContext("2d")
            .drawImage(c, 0, 0, canvas.width, canvas.height);
        }
        const ct = canvas.getContext("2d");
        const im = ct.getImageData(0, 0, canvas.width, canvas.height);
        if (processing?.threshold) {
          for (let i = 0; i < im.data.length; i += 4) {
            const v = im.data[i] < processing.threshold ? 0 : 255;
            im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
          }
          ct.putImageData(im, 0, 0);
        }
        let str = "";
        for (let i = 0; i < im.data.length; i += 32768)
          str += String.fromCharCode(...im.data.subarray(i, i + 32768));
        let bounds = { x0: im.width, y0: im.height, x1: 0, y1: 0 };
        for (let y = 0; y < im.height; y++)
          for (let x = 0; x < im.width; x++) {
            if (im.data[(y * im.width + x) * 4] < 250) {
              bounds.x0 = Math.min(bounds.x0, x);
              bounds.x1 = Math.max(bounds.x1, x);
              bounds.y0 = Math.min(bounds.y0, y);
              bounds.y1 = Math.max(bounds.y1, y);
            }
          }
        return {
          data: btoa(str),
          width: im.width,
          height: im.height,
          bounds,
          png: processing ? canvas.toDataURL("image/png").split(",")[1] : null,
        };
      },
      { base64: png.toString("base64"), processing },
    );
  }
  async function probe(png, payload, processing = null) {
    const p = await pixels(png, processing);
    const data = Buffer.from(p.data, "base64");
    return {
      width: p.width,
      height: p.height,
      bounds: p.bounds,
      rgbaSha256: sha(data),
      decoders: await decode(
        { data, width: p.width, height: p.height },
        payload,
      ),
      png: p.png ? Buffer.from(p.png, "base64") : null,
    };
  }
  await page.setContent(documentHtml(positiveControl("AQROBAT-TEST", 640)));
  const controlPng = await page.locator("#artifact").screenshot();
  const control = await probe(controlPng, "AQROBAT-TEST");
  delete control.png;
  assert(control.decoders.jsQR.exact && control.decoders.zxing.exact);
  await json("control.json", {
    ...control,
    pngSha256: await save("raw/control-640.png", controlPng),
  });
  for (const spec of parameters) {
    const l = build(spec, metrics);
    assert.equal(l.structural.emptyLines, 0);
    assert.equal(l.structural.multipleInternalSpaces, 0);
    assert(
      l.structural.maxOpticalHeightToLineHeight < 1 &&
        l.structural.lineHeightEm >= 1.2,
    );
    await save(
      `${spec.id}.html.gz`,
      gzipSync(await format(documentHtml(l.markup), { parser: "html" })),
    );
    await json(`${spec.id}-layout.json`, {
      spec,
      plainText: l.plainText,
      structural: l.structural,
      unit: l.unit,
      side: l.side,
      modules: l.modules,
    });
    const r = {
      id: spec.id,
      spec,
      structural: l.structural,
      unit: l.unit,
      side: l.side,
      raw: [],
      diagnostics: [],
    };
    for (const size of [l.side, 640, 400]) {
      await page.setContent(documentHtml(l.markup));
      await page.evaluate(
        ({ side, size }) =>
          (document.getElementById("artifact").style.zoom = size / side),
        { side: l.side, size },
      );
      const png = await page.locator("#artifact").screenshot();
      const p = await probe(png, spec.payload);
      delete p.png;
      const unit = (l.unit * size) / l.side;
      const b = p.bounds;
      const border =
        Math.min(b.x0, b.y0, p.width - 1 - b.x1, p.height - 1 - b.y1) / unit;
      assert(border >= 4.8, "Measured clear border must exceed four modules");
      r.raw.push({
        kind: size === l.side ? "native 20px type" : "uniform browser zoom",
        size,
        visibleFontSize: (20 * size) / l.side,
        borderModules: border,
        ...p,
        path: `raw/${spec.id}-${size}.png`,
        pngSha256: await save(`raw/${spec.id}-${size}.png`, png),
      });
      if (size === 640)
        for (const threshold of [null, 235, 245]) {
          const processing = {
            blur: unit * 0.28,
            downsample: 2,
            ...(threshold ? { threshold } : {}),
          };
          const d = await probe(png, spec.payload, processing);
          const processed = d.png;
          delete d.png;
          const path = `diagnostics/${spec.id}-${threshold || "blur"}.png`;
          r.diagnostics.push({
            processing,
            ...d,
            path,
            pngSha256: await save(path, processed),
          });
        }
    }
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
    records.push(r);
    console.log(
      JSON.stringify({
        id: r.id,
        raw: r.raw.map((r) => [r.decoders.jsQR.exact, r.decoders.zxing.exact]),
        processed: r.diagnostics.map((r) => [
          r.decoders.jsQR.exact,
          r.decoders.zxing.exact,
        ]),
        bytes: await used(),
      }),
    );
  }
  assert.deepEqual(errors, []);
  await json("summary.json", {
    finishedAt: new Date().toISOString(),
    candidates: records.length,
    rawCount: records.flatMap((r) => r.raw).length,
    rawJsQRExact: records
      .flatMap((r) => r.raw)
      .filter((r) => r.decoders.jsQR.exact).length,
    rawZXingExact: records
      .flatMap((r) => r.raw)
      .filter((r) => r.decoders.zxing.exact).length,
    diagnostics: records.flatMap((r) => r.diagnostics).length,
    diagnosticJsQRExact: records
      .flatMap((r) => r.diagnostics)
      .filter((r) => r.decoders.jsQR.exact).length,
    diagnosticZXingExact: records
      .flatMap((r) => r.diagnostics)
      .filter((r) => r.decoders.zxing.exact).length,
    errors,
    bytes: await used(),
    phone: "not tested",
  });
} finally {
  await browser.close();
}
