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
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { format } from "prettier";
import { specs, build, documentHtml } from "./layout.mjs";
import { positiveControl } from "../layout.mjs";
import { decode, DECODER_PROVENANCE } from "../decoders.mjs";

const root = resolve("docs/research/prose-qr/phase-02");
const out = resolve(root, "batch-01");
const cap = 30_000_000;
const sha = (v) => createHash("sha256").update(v).digest("hex");
await mkdir(out);
await mkdir(resolve(out, "raw"));
async function used() {
  let bytes = 0;
  async function walk(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = resolve(p, e.name);
      if (e.isDirectory()) await walk(q);
      else bytes += (await stat(q)).size;
    }
  }
  await walk(root);
  return bytes;
}
async function save(name, data) {
  const b = Buffer.from(data);
  assert(
    (await used()) + b.length < cap - 1_000_000,
    "Preserve reporting reserve; batch storage cap reached",
  );
  await writeFile(resolve(out, name), b, { flag: "wx" });
  return sha(b);
}
async function json(name, value) {
  return save(name, await format(JSON.stringify(value), { parser: "json" }));
}
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/pilot-02/metrics.json", "utf8"),
);
const parameters = specs();
const manifest = {
  schema: "aqrobat-prose-flow-v1",
  startedAt: new Date().toISOString(),
  baseline: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  parameters,
  candidateCount: parameters.length,
  capBytes: cap,
  decoders: DECODER_PROVENANCE,
  metricSource:
    "pilot-02/metrics.json; same installed fonts; rechecked before capture",
  sourceHashes: {},
};
for (const file of ["layout.mjs", "run.mjs"])
  manifest.sourceHashes[file] = sha(
    await readFile(new URL(file, import.meta.url)),
  );
await json("manifest.json", manifest);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const rows = [],
  controls = [],
  errors = [],
  network = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const fonts = [];
  for (const font of ["Menlo", "Courier New"])
    for (const weight of [400, 700]) {
      await page.setContent(
        documentHtml(
          `<p id="artifact" style="font:${weight} 40px '${font}',monospace">MwmnoiIly black garden quiet</p>`,
        ),
      );
      const advance = await page.evaluate(() => {
        const c = document.createElement("canvas").getContext("2d");
        c.font = getComputedStyle(document.getElementById("artifact")).font;
        return c.measureText("M").width / 40;
      });
      assert.equal(advance, metrics.fonts[`${font}|${weight}`].advanceEm);
      const doc = await cdp.send("DOM.getDocument"),
        node = await cdp.send("DOM.querySelector", {
          nodeId: doc.root.nodeId,
          selector: "#artifact",
        });
      fonts.push({
        font,
        weight,
        advance,
        platformFonts: (
          await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
        ).fonts,
      });
    }
  await json("fonts.json", {
    fonts,
    browser: browser.version(),
    deviceScaleFactor: 1,
  });
  async function pixels(png, processing = null) {
    return page.evaluate(
      async ({ base64, processing }) => {
        const img = new Image();
        img.src = "data:image/png;base64," + base64;
        await img.decode();
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (processing) ctx.filter = `blur(${processing.blur}px)`;
        ctx.drawImage(img, 0, 0);
        if (processing?.downsample) {
          const target = document.createElement("canvas");
          target.width = Math.round(canvas.width / processing.downsample);
          target.height = Math.round(canvas.height / processing.downsample);
          target
            .getContext("2d")
            .drawImage(canvas, 0, 0, target.width, target.height);
          canvas = target;
        }
        const data = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        let str = "";
        for (let i = 0; i < data.length; i += 32768)
          str += String.fromCharCode(...data.subarray(i, i + 32768));
        return {
          data: btoa(str),
          width: canvas.width,
          height: canvas.height,
          png: processing ? canvas.toDataURL("image/png").split(",")[1] : null,
        };
      },
      { base64: png.toString("base64"), processing },
    );
  }
  async function probe(png, payload, processing = null) {
    const p = await pixels(png, processing),
      data = Buffer.from(p.data, "base64");
    return {
      width: p.width,
      height: p.height,
      rgbaSha256: sha(data),
      decoders: await decode(
        { data, width: p.width, height: p.height },
        payload,
      ),
      processedPng: p.png ? Buffer.from(p.png, "base64") : null,
    };
  }
  for (const size of [640, 960]) {
    await page.setContent(documentHtml(positiveControl("AQROBAT-TEST", size)));
    const png = await page.locator("#artifact").screenshot();
    const r = await probe(png, "AQROBAT-TEST");
    delete r.processedPng;
    assert(r.decoders.jsQR.exact && r.decoders.zxing.exact);
    controls.push({
      kind: "conventional positive",
      size,
      ...r,
      pngSha256: await save(`raw/control-${size}.png`, png),
    });
  }
  await json("controls.json", controls);
  for (const spec of parameters) {
    const layout = build(spec, metrics);
    assert.equal(layout.structural.emptyLines, 0);
    assert.equal(layout.structural.multipleInternalSpaces, 0);
    assert(
      layout.structural.lineHeightEm >= 1.2 &&
        layout.structural.maxOpticalHeightToLineHeight < 1,
    );
    assert(layout.structural.maximumAdvanceOverflowPx < 0.5);
    const nativeHtml = documentHtml(layout.markup);
    await save(
      `${spec.id}.html.gz`,
      gzipSync(await format(nativeHtml, { parser: "html" })),
    );
    await json(`${spec.id}-layout.json`, {
      spec,
      plainText: layout.plainText,
      structural: layout.structural,
      modules: layout.modules,
      columns: layout.columns,
      unit: layout.unit,
      pad: layout.pad,
      side: layout.side,
    });
    const record = {
      id: spec.id,
      spec,
      structural: layout.structural,
      side: layout.side,
      unit: layout.unit,
      raw: [],
      diagnostics: [],
    };
    for (const size of [layout.side, 640]) {
      await page.setContent(nativeHtml);
      await page.evaluate(
        ({ side, size }) => {
          const a = document.getElementById("artifact");
          a.style.zoom = size / side;
        },
        { side: layout.side, size },
      );
      const png = await page.locator("#artifact").screenshot();
      const r = await probe(png, spec.payload);
      delete r.processedPng;
      const path = `raw/${spec.id}-${size}.png`;
      record.raw.push({
        kind:
          size === layout.side
            ? "native readable type"
            : "uniform browser zoom",
        requestedSize: size,
        nativeFontSize: 20,
        visibleFontSize: (20 * size) / layout.side,
        ...r,
        path,
        pngSha256: await save(path, png),
      });
      if (size === layout.side) {
        // These remain processed diagnostics, never original-output acceptance.
        for (const blurRatio of [0.18, 0.3]) {
          const processing = { blur: layout.unit * blurRatio, downsample: 4 };
          const d = await probe(png, spec.payload, processing);
          delete d.processedPng;
          record.diagnostics.push({ processing, ...d });
        }
      }
    }
    await appendFile(
      resolve(out, "results.jsonl"),
      JSON.stringify(record) + "\n",
    );
    rows.push(record);
    console.log(
      JSON.stringify({
        id: spec.id,
        content: spec.content,
        style: spec.name,
        raw: record.raw.map((r) => [
          r.decoders.jsQR.exact,
          r.decoders.zxing.exact,
        ]),
        diagnostics: record.diagnostics.map((r) => [
          r.decoders.jsQR.exact,
          r.decoders.zxing.exact,
        ]),
        bytes: await used(),
      }),
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);
  await json("summary.json", {
    finishedAt: new Date().toISOString(),
    candidateCount: rows.length,
    rawCount: rows.reduce((s, r) => s + r.raw.length, 0),
    rawExactJsQR: rows
      .flatMap((r) => r.raw)
      .filter((r) => r.decoders.jsQR.exact).length,
    rawExactZXing: rows
      .flatMap((r) => r.raw)
      .filter((r) => r.decoders.zxing.exact).length,
    diagnosticCount: rows.flatMap((r) => r.diagnostics).length,
    diagnosticExactJsQR: rows
      .flatMap((r) => r.diagnostics)
      .filter((r) => r.decoders.jsQR.exact).length,
    diagnosticExactZXing: rows
      .flatMap((r) => r.diagnostics)
      .filter((r) => r.decoders.zxing.exact).length,
    errors,
    network,
    storedBytes: await used(),
    phone: "not tested",
    ownerReview:
      "first-pilot appearance rejection; new-phase phone/appearance acceptance pending",
  });
} finally {
  await browser.close();
}
