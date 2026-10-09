import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  appendFile,
  mkdir,
  stat,
  readdir,
} from "node:fs/promises";
import { format } from "prettier";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { WORDS, NEGATIVE_TEXT } from "./vocabulary.mjs";
import {
  FONTS,
  SCALES,
  makeSpecifications,
  buildLayout,
  documentHtml,
  positiveControl,
  escapeHtml,
} from "./layout.mjs";
import { decode, DECODER_PROVENANCE } from "./decoders.mjs";
const out = resolve(process.argv[2] || "docs/research/prose-qr/pilot-01");
const startedAt =
  process.env.PROSE_PILOT_STARTED_AT || new Date().toISOString();
const start = Date.parse(startedAt),
  maxMs = 60 * 60 * 1000,
  maxBytes = 50 * 1024 * 1024,
  reserve = 4 * 1024 * 1024;
assert(Number.isFinite(start) && Date.now() >= start);
await mkdir(out, { recursive: false });
await mkdir(resolve(out, "raw"));
await mkdir(resolve(out, "diagnostics"));
async function directoryBytes(path) {
  let total = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = resolve(path, entry.name);
    total += entry.isDirectory()
      ? await directoryBytes(file)
      : (await stat(file)).size;
  }
  return total;
}
const earlierEvidenceBytes = await directoryBytes(resolve(out, ".."));
let bytes = earlierEvidenceBytes,
  halt = null,
  attempts = 0;
const digest = (value) => createHash("sha256").update(value).digest("hex");
class Limit extends Error {}
function guard() {
  if (Date.now() - start >= maxMs) throw new Limit("60-minute execution limit");
  if (bytes >= maxBytes - reserve)
    throw new Limit("evidence storage reserve reached before 50-MB cap");
}
async function save(name, data, reporting = false) {
  const buffer =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  if (bytes + buffer.length > maxBytes - (reporting ? 0 : reserve))
    throw new Limit("next artifact would exceed evidence reserve");
  await writeFile(resolve(out, name), buffer, { flag: "wx" });
  bytes += buffer.length;
  return digest(buffer);
}
async function json(name, value, reporting = false) {
  return save(
    name,
    await format(JSON.stringify(value), { parser: "json" }),
    reporting,
  );
}
async function log(value) {
  const line = JSON.stringify(value) + "\n";
  await appendFile(resolve(out, "results.jsonl"), line);
  bytes += Buffer.byteLength(line);
}
const vocabulary = JSON.stringify(WORDS);
await json("manifest.json", {
  schema: "aqrobat-prose-pilot-v1",
  startedAt,
  baselineCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  limits: { minutes: 60, generatedEvidenceBytes: maxBytes, perTrack: 128 },
  scales: SCALES,
  fonts: FONTS,
  payload: "AQROBAT-TEST",
  vocabularySha256: digest(vocabulary),
  sourceSha256: Object.fromEntries(
    await Promise.all(
      ["layout.mjs", "run.mjs", "vocabulary.mjs", "decoders.mjs"].map(
        async (file) => [
          file,
          digest(await readFile(new URL(file, import.meta.url))),
        ],
      ),
    ),
  ),
  earlierEvidenceBytes,
  decoders: DECODER_PROVENANCE,
  sourceFacts: [
    {
      url: "https://github.com/Sec-ant/zxing-wasm",
      note: "Reader API, local WASM loading, and license layers verified",
    },
    {
      url: "https://github.com/cozmo/jsQR",
      note: "Independent raw-image JS decoder",
    },
    {
      url: "https://www.qrcode.com/en/howto/code.html",
      note: "Four-module clear margin",
    },
  ],
  selection:
    "Fixed initial specification grid; URL follow-ups allowed only after a raw or diagnostic structural result",
  generatedAt: new Date().toISOString(),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const controls = [],
  records = [],
  diagnostics = [],
  errors = [],
  requests = [];
let metrics;
try {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 1040 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => requests.push(r.url()));
  async function render(markup) {
    await page.setContent(
      await format(documentHtml(markup), { parser: "html" }),
    );
    await page.evaluate(() => document.fonts.ready);
    return page.locator("#artifact").screenshot({ animations: "disabled" });
  }
  async function pixels(png, processing = null) {
    return page.evaluate(
      async ({ base64, processing }) => {
        const image = new Image();
        image.src = "data:image/png;base64," + base64;
        await image.decode();
        let width = image.width,
          height = image.height;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        if (processing) ctx.filter = `blur(${processing.blur}px)`;
        ctx.drawImage(image, 0, 0);
        let target = canvas;
        if (processing?.downsample) {
          target = document.createElement("canvas");
          target.width = width = Math.round(width / processing.downsample);
          target.height = height = Math.round(height / processing.downsample);
          target.getContext("2d").drawImage(canvas, 0, 0, width, height);
        }
        const tctx = target.getContext("2d");
        const rgba = tctx.getImageData(0, 0, width, height);
        if (processing?.threshold != null) {
          for (let i = 0; i < rgba.data.length; i += 4) {
            const v =
              (rgba.data[i] + rgba.data[i + 1] + rgba.data[i + 2]) / 3 <
              processing.threshold
                ? 0
                : 255;
            rgba.data[i] = rgba.data[i + 1] = rgba.data[i + 2] = v;
          }
          tctx.putImageData(rgba, 0, 0);
        }
        let binary = "";
        for (let i = 0; i < rgba.data.length; i += 32768)
          binary += String.fromCharCode(...rgba.data.subarray(i, i + 32768));
        return {
          width,
          height,
          base64: btoa(binary),
          processedPng: processing
            ? target.toDataURL("image/png").split(",")[1]
            : null,
        };
      },
      { base64: png.toString("base64"), processing },
    );
  }
  async function probe(png, expected, processing = null) {
    const p = await pixels(png, processing);
    const data = Buffer.from(p.base64, "base64");
    return {
      width: p.width,
      height: p.height,
      pixels: { data, width: p.width, height: p.height },
      decoded: await decode(
        { data, width: p.width, height: p.height },
        expected,
      ),
      processedPng: p.processedPng
        ? Buffer.from(p.processedPng, "base64")
        : null,
      rgbaSha256: digest(data),
    };
  }
  for (const size of SCALES) {
    guard();
    const png = await render(positiveControl("AQROBAT-TEST", size));
    const result = await probe(png, "AQROBAT-TEST");
    const path = `raw/control-positive-${size}.png`;
    await save(path, png);
    controls.push({
      kind: "conventional QR positive",
      size,
      path,
      ...result.decoded,
      rgbaSha256: result.rgbaSha256,
    });
    assert(
      result.decoded.jsQR.exact && result.decoded.zxing.exact,
      "Independent positive control failed",
    );
  }
  for (const font of FONTS)
    for (const size of SCALES) {
      guard();
      const png = await render(
        `<div id="artifact" style="width:${size}px;height:${size}px;background:white;color:black;font:400 ${size / 25}px/1.5 '${font}',monospace;padding:${size / 10}px;">${escapeHtml(NEGATIVE_TEXT)}</div>`,
      );
      const result = await probe(png, "AQROBAT-TEST");
      const path = `raw/control-negative-${font.replaceAll(" ", "-")}-${size}.png`;
      await save(path, png);
      controls.push({
        kind: "ordinary text negative",
        font,
        size,
        path,
        ...result.decoded,
        rgbaSha256: result.rgbaSha256,
      });
      assert(
        !result.decoded.jsQR.found && !result.decoded.zxing.found,
        "Negative control unexpectedly recognized",
      );
    }
  await json("controls.json", controls);
  const allWords = [
    ...new Set(Object.values(WORDS).flatMap((g) => [...g.dark, ...g.light])),
  ];
  metrics = await page.evaluate(
    ({ fonts, words }) => {
      const result = {
        measurementFontSize: 40,
        measurementBaseline: 64,
        words: {},
        glyphs: {},
        fonts: {},
      };
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 100;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      for (const font of fonts)
        for (const weight of [400, 700]) {
          const key = font + "|" + weight;
          ctx.font = `${weight} 40px '${font}',monospace`;
          ctx.textBaseline = "alphabetic";
          result.fonts[key] = {
            requestedFont: font,
            weight,
            fontAvailable: document.fonts.check(`${weight} 40px '${font}'`),
            advanceEm: ctx.measureText("M").width / 40,
          };
          result.words[key] = {};
          result.glyphs[key] = {};
          function measure(text) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, 300, 100);
            ctx.fillStyle = "black";
            ctx.fillText(text, 8, 64);
            const m = ctx.measureText(text),
              p = ctx.getImageData(0, 0, 300, 100).data;
            let ink = 0,
              black = 0;
            for (let i = 0; i < p.length; i += 4) {
              ink += 1 - (p[i] + p[i + 1] + p[i + 2]) / (3 * 255);
              if (p[i] < 128) black++;
            }
            return {
              advance: m.width,
              ascent: m.actualBoundingBoxAscent,
              descent: m.actualBoundingBoxDescent,
              left: m.actualBoundingBoxLeft,
              right: m.actualBoundingBoxRight,
              inkMass: ink,
              blackPixels: black,
              cellInkFraction: ink / (m.width * 40),
              baseline: 64,
            };
          }
          for (const word of words) result.words[key][word] = measure(word);
          for (const glyph of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;")
            result.glyphs[key][glyph] = measure(glyph);
        }
      return result;
    },
    { fonts: FONTS, words: allWords },
  );
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  for (const font of FONTS)
    for (const weight of [400, 700]) {
      await page.setContent(
        `<p id="probe" style="font:${weight} 40px '${font}',monospace">${allWords.join(" ")}</p>`,
      );
      const root = await cdp.send("DOM.getDocument");
      const node = await cdp.send("DOM.querySelector", {
        nodeId: root.root.nodeId,
        selector: "#probe",
      });
      metrics.fonts[`${font}|${weight}`].platformFonts = (
        await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
      ).fonts;
    }
  metrics.environment = {
    os: execFileSync("sw_vers", ["-productVersion"], {
      encoding: "utf8",
    }).trim(),
    browser: await browser.version(),
    node: process.version,
    arch: process.arch,
    deviceScaleFactor: 1,
  };
  metrics.fontFiles = [];
  for (const file of [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Supplemental/Courier New.ttf",
    "/System/Library/Fonts/Supplemental/Courier New Bold.ttf",
  ]) {
    const data = await readFile(file);
    metrics.fontFiles.push({
      path: file,
      bytes: data.length,
      sha256: digest(data),
      fontVersion: "not queried; binary hash retained",
    });
  }
  await json("metrics.json", metrics);
  await json("vocabulary.json", WORDS);
  const specs = makeSpecifications();
  assert(
    specs.filter((s) => s.track === "strict").length <= 128 &&
      specs.filter((s) => s.track === "styled").length <= 128,
  );
  await json("specifications.json", specs);
  console.log(
    JSON.stringify({
      calibration: "positive 3/3 for both decoders; negative 6/6 for both",
      planned: specs.reduce(
        (a, s) => ((a[s.track] = (a[s.track] || 0) + 1), a),
        {},
      ),
      fontEvidence: metrics.fonts,
    }),
  );
  // Interleave tracks and fonts; a cap cannot silently erase an entire lane.
  const queues = FONTS.flatMap((font) =>
    ["strict", "styled"].map((track) =>
      specs.filter((s) => s.font === font && s.track === track),
    ),
  );
  const ordered = [];
  for (let i = 0; queues.some((q) => q.length > i); i++)
    for (const q of queues) if (q[i]) ordered.push(q[i]);
  async function attempt(spec) {
    guard();
    attempts++;
    const record = {
      id: spec.id,
      spec,
      startedAt: new Date().toISOString(),
      scales: [],
      complete: false,
    };
    records.push(record);
    try {
      for (const size of SCALES) {
        guard();
        const layout = buildLayout(spec, metrics, size);
        if (!record.layout) {
          const { markup, ...metadata } = layout;
          record.layout = metadata;
          await json(`${spec.id}-layout.json`, metadata);
          await save(
            `${spec.id}.html.gz`,
            gzipSync(await format(documentHtml(markup), { parser: "html" }), {
              mtime: 0,
            }),
          );
        }
        const png = await render(layout.markup);
        const path = `raw/${spec.id}-${size}.png`;
        const pngSha256 = await save(path, png);
        const result = await probe(png, spec.payload);
        const data = result.pixels.data,
          qr = layout.qr,
          unit = size / qr.totalModules;
        let di = 0,
          li = 0,
          dn = 0,
          ln = 0;
        for (let y = 0; y < result.height; y++)
          for (let x = 0; x < result.width; x++) {
            const qx = Math.floor(x / unit) - qr.quiet,
              qy = Math.floor(y / unit) - qr.quiet;
            if (qx < 0 || qy < 0 || qx >= qr.modules || qy >= qr.modules)
              continue;
            const i = (y * result.width + x) * 4;
            const ink = 1 - (data[i] + data[i + 1] + data[i + 2]) / (3 * 255);
            if (qr.matrix[qy][qx]) {
              di += ink;
              dn++;
            } else {
              li += ink;
              ln++;
            }
          }
        record.scales.push({
          size,
          path,
          pngSha256,
          rgbaSha256: result.rgbaSha256,
          width: result.width,
          height: result.height,
          decoders: result.decoded,
          density: {
            darkMeanInk: di / dn,
            lightMeanInk: li / ln,
            contrast: di / dn - li / ln,
          },
          input:
            "unchanged full DOM screenshot; nominal four-module margin, glyph overflow must be measured",
        });
      }
      record.complete = true;
    } catch (error) {
      record.stopReason = error.message;
      if (error instanceof Limit) throw error;
      record.error = String(error.stack || error);
      throw error;
    } finally {
      await log(record);
    }
    if (attempts % 8 === 0)
      console.log(
        JSON.stringify({
          attempted: attempts,
          exactRaw: records.filter((r) =>
            r.scales.some(
              (s) => s.decoders.jsQR.exact || s.decoders.zxing.exact,
            ),
          ).length,
          generatedMB: Math.round((bytes / 1048576) * 10) / 10,
          elapsedMinutes: Math.round((Date.now() - start) / 6000) / 10,
        }),
      );
  }
  for (const spec of ordered) await attempt(spec);
  const selected = ["strict", "styled"].flatMap((track) =>
    records
      .filter((r) => r.spec.track === track && r.complete)
      .sort(
        (a, b) =>
          Math.max(...b.scales.map((s) => s.density.contrast)) -
          Math.max(...a.scales.map((s) => s.density.contrast)),
      )
      .slice(0, 4),
  );
  for (const record of selected) {
    const sample = record.scales.find((s) => s.size === 640);
    const png = await readFile(resolve(out, sample.path));
    for (const mode of ["blur-downsample", "blur-threshold"]) {
      guard();
      const processing = {
        blur: (640 / record.layout.qr.totalModules) * 0.22,
        downsample: mode === "blur-downsample" ? 4 : 1,
        threshold: mode === "blur-threshold" ? 225 : null,
      };
      const result = await probe(png, record.spec.payload, processing);
      const path = `diagnostics/${record.id}-${mode}.png`;
      await save(path, result.processedPng);
      const diagnostic = {
        candidateId: record.id,
        sourcePath: sample.path,
        sourcePngSha256: sample.pngSha256,
        processing,
        path,
        width: result.width,
        height: result.height,
        rgbaSha256: result.rgbaSha256,
        decoders: result.decoded,
        classification: "processed diagnostic only; not raw-output acceptance",
      };
      diagnostics.push(diagnostic);
      await log({ diagnostic });
    }
  }
  // A URL follow-up uses the same layout only after some structural recovery.
  const promising = records.filter(
    (r) =>
      r.complete &&
      r.scales.some((s) => s.decoders.jsQR.exact || s.decoders.zxing.exact),
  );
  for (const d of diagnostics)
    if (d.decoders.jsQR.exact || d.decoders.zxing.exact) {
      const r = records.find((r) => r.id === d.candidateId);
      if (!promising.includes(r)) promising.push(r);
    }
  const urlSpecs = ["strict", "styled"].flatMap((track) =>
    promising
      .filter((r) => r.spec.track === track)
      .slice(0, 4)
      .map((r, i) => ({
        ...r.spec,
        id: `${track}-url-${i + 1}`,
        payload: "https://example.com",
        parent: r.id,
      })),
  );
  await json("url-followup-specifications.json", urlSpecs);
  for (const spec of urlSpecs) {
    const count = records.filter((r) => r.spec.track === spec.track).length;
    if (count >= 128) continue;
    await attempt(spec);
  }
} catch (error) {
  halt =
    error instanceof Limit
      ? { kind: "planned limit", reason: error.message }
      : { kind: "error", reason: error.message, stack: error.stack };
  console.log(JSON.stringify({ halt }));
} finally {
  await browser.close();
  const summary = {
    schema: "aqrobat-prose-pilot-results-v1",
    startedAt,
    finishedAt: new Date().toISOString(),
    elapsedSeconds: Math.round((Date.now() - start) / 1000),
    halt,
    generatedBytesBeforeSummary: bytes,
    controls,
    counts: Object.fromEntries(
      ["strict", "styled"].map((track) => {
        const cases = records.filter((r) => r.spec.track === track);
        return [
          track,
          {
            attempted: cases.length,
            complete: cases.filter((r) => r.complete).length,
            rawCasesRecoveredByJsQR: cases.filter((r) =>
              r.scales.some((s) => s.decoders.jsQR.exact),
            ).length,
            rawCasesRecoveredByZXing: cases.filter((r) =>
              r.scales.some((s) => s.decoders.zxing.exact),
            ).length,
            rawRasters: cases.reduce((n, r) => n + r.scales.length, 0),
          },
        ];
      }),
    ),
    records,
    diagnostics,
    errors,
    requests,
    phone: "not tested",
    physicalPrint: "not tested",
    semanticProse: "not attempted; real-word structural pilot only",
    hiding: "not independently reviewed",
  };
  await json("summary.json", summary, true);
  console.log(
    JSON.stringify({
      finished: true,
      elapsedSeconds: summary.elapsedSeconds,
      counts: summary.counts,
      diagnosticRecovered: diagnostics.filter(
        (d) => d.decoders.jsQR.exact || d.decoders.zxing.exact,
      ).length,
      bytes,
      halt,
    }),
  );
  if (halt?.kind === "error") process.exitCode = 1;
}
