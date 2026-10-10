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
import { diagnose, bundleHash } from "../glyph-geometry/diagnostic.mjs";
import { documentHtml, positiveControl } from "../layout.mjs";
import { finderMatrix, solidTriplet } from "./layout.mjs";
import { escapeHtml } from "../layout.mjs";
const root = resolve("docs/research/prose-qr/phase-06"),
  out = resolve(root, "seam-02"),
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  specs = [];
for (const inkGap of [0.234375, 0.375])
  for (const phaseAdjustment of [0, 0.25])
    specs.push({
      id: `seam-${String(specs.length + 1).padStart(2, "0")}`,
      font: "Impact",
      leading: "seam-boundary",
      inkGap,
      phaseAdjustment,
      objective: "Frozen text; native row-seam diagnostic",
    });
const seedPath = resolve(root, "feedback-02"),
  seed = JSON.parse(
    await readFile(resolve(seedPath, "feedback-11-layout.json"), "utf8"),
  ),
  seedHtml = (await import("node:zlib"))
    .gunzipSync(await readFile(resolve(seedPath, "feedback-11.html.gz")))
    .toString(),
  seedRecord = (await readFile(resolve(seedPath, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse)
    .find((r) => r.id === "feedback-11");
function layout(spec, metrics) {
  const glyphs = metrics.fonts["Impact|400"].glyphs,
    capAscent = Math.max(...[..."HEMW"].map((c) => glyphs[c].ascent)),
    lineHeight = capAscent + spec.inkGap,
    baseline = 20 + (lineHeight - 24) / 2,
    offset =
      seed.offset +
      7 * (seed.lineHeight - lineHeight) +
      (seed.baseline - baseline) +
      spec.phaseAdjustment,
    pad = seed.unit * 5;
  const actualGlyphs = [
      ...new Set(seed.plainText.replaceAll("\n", "").replaceAll(" ", "")),
    ],
    actualEnvelope =
      Math.max(...actualGlyphs.map((c) => glyphs[c].ascent)) +
      Math.max(...actualGlyphs.map((c) => glyphs[c].descent));
  assert(actualEnvelope <= lineHeight);
  const pre = (i, x, y) =>
    `<pre id="corner-${i}" style="position:absolute;left:${pad + x * seed.unit}px;top:${pad + y * seed.unit + offset}px;width:${seed.field}px;height:${15 * lineHeight}px;margin:0;padding:0;font:400 20px/${lineHeight}px 'Impact',monospace;letter-spacing:${seed.structural.tracking}px;font-kerning:none;font-variant-ligatures:none;color:black;overflow:visible">${escapeHtml(seed.plainText)}</pre>`;
  return {
    ...seed,
    spec,
    lineHeight,
    baseline,
    offset,
    modelScores: [],
    matrix: finderMatrix(),
    markup: `<article id="artifact" style="position:relative;width:${seed.unit * 35}px;height:${seed.unit * 35}px;background:white;color:black;overflow:visible">${pre(0, 0, 0)}${pre(1, 18, 0)}${pre(2, 0, 18)}</article>`,
    structural: {
      ...seed.structural,
      actualNativePixelFeedback: false,
      inheritedDictionaryEnvelope: seed.structural.globalInkEnvelope,
      globalInkEnvelope: actualEnvelope,
      allowedGlyphs: actualGlyphs.join(""),
      frozenTextBoundaryProbe: true,
      globalVerticalPhaseAdjustment: spec.phaseAdjustment,
      fixedModulePitch: seed.unit,
    },
  };
}
await mkdir(out);
await mkdir(resolve(out, "raw"));
async function bytes(p) {
  let total = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    total += e.isDirectory() ? await bytes(q) : (await stat(q)).size;
  }
  return total;
}
const save = async (p, b) => {
    assert(
      (await bytes(root)) +
        (await bytes(resolve("experiments/prose-qr/finder-native"))) +
        Buffer.byteLength(b) <
        5_250_000,
      "Evidence reserve",
    );
    await writeFile(resolve(out, p), b, { flag: "wx" });
    return hash(b);
  },
  json = async (p, v) =>
    save(p, await format(JSON.stringify(v), { parser: "json" }));
const sourceHashes = {};
for (const p of [
  "experiments/prose-qr/finder-native/seams.mjs",
  "experiments/prose-qr/finder-native/layout.mjs",
  "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  "experiments/prose-qr/layout.mjs",
  "experiments/prose-qr/decoders.mjs",
  "docs/research/prose-qr/phase-06/SEAM-PLAN.md",
  "docs/research/prose-qr/phase-06/SEAM-REPAIR.md",
  "docs/research/prose-qr/phase-06/font-metrics.json",
  "docs/research/prose-qr/phase-06/feedback-02/feedback-11-layout.json",
  "docs/research/prose-qr/phase-06/feedback-02/feedback-11.html.gz",
  "docs/research/prose-qr/phase-06/feedback-02/raw/feedback-11.png",
  "docs/research/prose-qr/phase-06/feedback-02/results.jsonl",
])
  sourceHashes[p] = hash(await readFile(p));
await json("manifest.json", {
  startedAt: new Date().toISOString(),
  baseline: "52fa086b970d585e8087db25503114ab55c65c8f",
  specs,
  sourceHashes,
  diagnosticBundleSha256: bundleHash,
  controlsDecoder: DECODER_PROVENANCE,
  ordinaryZXing: { formats: ["QRCode"] },
  gate: "Finder-only ordinary locator diagnostic on unchanged native pixels. No payload in candidate layouts; no phone candidates.",
});
const metrics = JSON.parse(
    await readFile(resolve(root, "font-metrics.json"), "utf8"),
  ),
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  records = [],
  errors = [];
let attempted = null;
try {
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1800 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const pixels = async (png) => {
    const p = await page.evaluate(async (b) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let s = "";
      for (let i = 0; i < d.length; i += 32768)
        s += String.fromCharCode(...d.subarray(i, i + 32768));
      return { width: c.width, height: c.height, data: btoa(s) };
    }, png.toString("base64"));
    return {
      width: p.width,
      height: p.height,
      data: new Uint8ClampedArray(Buffer.from(p.data, "base64")),
    };
  };
  await page.setContent(
    documentHtml(positiveControl("https://example.com/", 656)),
  );
  const fullPng = await page.locator("#artifact").screenshot(),
    fullPx = await pixels(fullPng),
    fullResult = await decode(fullPx, "https://example.com/"),
    ordinary = await readBarcodes(fullPx, { formats: ["QRCode"] });
  assert(
    fullResult.jsQR.exact &&
      fullResult.zxing.exact &&
      ordinary.some((r) => r.text === "https://example.com/"),
  );
  const solid = solidTriplet();
  await page.setContent(documentHtml(solid.markup));
  const solidPng = await page.locator("#artifact").screenshot(),
    solidPx = await pixels(solidPng),
    solidDiagnostic = diagnose(solidPx, solid);
  assert(solidDiagnostic.correctFinder, "Solid triplet locator control failed");
  await json("controls.json", {
    fullQR: {
      path: "raw/full-qr-control.png",
      pngSha256: await save("raw/full-qr-control.png", fullPng),
      rgbaSha256: hash(fullPx.data),
      width: fullPx.width,
      height: fullPx.height,
      baseline: fullResult,
      ordinaryZXing: {
        payloads: ordinary.map((x) => x.text),
        exact: ordinary.some((x) => x.text === "https://example.com/"),
      },
    },
    solidFinder: {
      path: "raw/solid-finder-control.png",
      pngSha256: await save("raw/solid-finder-control.png", solidPng),
      rgbaSha256: hash(solidPx.data),
      width: solidPx.width,
      height: solidPx.height,
      diagnostic: solidDiagnostic,
      encodedPayload: null,
    },
  });
  await page.setContent(seedHtml);
  await page.evaluate(() => document.fonts.ready);
  const seedReplay = await page.locator("#artifact").screenshot();
  await json("seed-replay.json", {
    seed: "feedback-11",
    expectedPNGHash: seedRecord.pngSha256,
    replayedPNGHash: hash(seedReplay),
    matches: hash(seedReplay) === seedRecord.pngSha256,
  });
  if (hash(seedReplay) !== seedRecord.pngSha256) {
    await save("raw/seed-replay-difference.png", seedReplay);
    throw Error("Seed native replay mismatch");
  }
  for (const s of specs) {
    attempted = s.id;
    const started = Date.now(),
      l = layout(s, metrics);
    assert(l.side <= 1800);
    const html = await format(documentHtml(l.markup), { parser: "html" }),
      gzipSha256 = await save(s.id + ".html.gz", gzipSync(html)),
      txtSha256 = await save(s.id + ".txt", l.plainText);
    await json(s.id + "-layout.json", {
      spec: s,
      plainText: l.plainText,
      structural: l.structural,
      unit: l.unit,
      lineHeight: l.lineHeight,
      baseline: l.baseline,
      field: l.field,
      offset: l.offset,
      actualAdvances: l.actualAdvances,
      unusedWidths: l.unusedWidths,
      modelScores: l.modelScores,
      side: l.side,
      modules: l.modules,
      quiet: l.quiet,
    });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const nodes = page.locator("pre");
    assert.equal(await nodes.count(), 3);
    for (let i = 0; i < 3; i++) {
      assert.equal(await nodes.nth(i).textContent(), l.plainText);
      assert.equal(await nodes.nth(i).locator("*").count(), 0);
    }
    const fit = await page.locator("#corner-0").evaluate((e) => {
      const cs = getComputedStyle(e);
      return {
        font: cs.fontFamily,
        weight: cs.fontWeight,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        tracking: cs.letterSpacing,
        width: e.clientWidth,
        scrollWidth: e.scrollWidth,
        childElements: e.children.length,
      };
    });
    assert(fit.scrollWidth <= Math.ceil(l.field) + 1, "Native field overflow");
    const png = await page.locator("#artifact").screenshot(),
      path = "raw/" + s.id + ".png",
      pngSha256 = await save(path, png),
      p = await pixels(png),
      diagnostic = diagnose(p, l);
    diagnostic.classification =
      "Finder-only ordinary binarizer/locator on unchanged native pixels; no encoded payload or phone candidate";
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const repeated = await page.locator("#artifact").screenshot(),
      repeatedPNGHash = hash(repeated),
      repeatMatches = repeatedPNGHash === pngSha256;
    if (!repeatMatches) await save("raw/" + s.id + "-repeat.png", repeated);
    const r = {
      id: s.id,
      spec: s,
      path,
      pngSha256,
      rgbaSha256: hash(p.data),
      gzipSha256,
      txtSha256,
      width: p.width,
      height: p.height,
      structural: l.structural,
      fit,
      diagnostic,
      replay: { repeatedPNGHash, repeatMatches },
      elapsedMs: Date.now() - started,
      encodedPayload: null,
      phone: "not a phone candidate",
      readability: "Native complete words; visual legibility not yet accepted",
    };
    records.push(r);
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
    console.log(
      JSON.stringify({
        id: s.id,
        font: s.font,
        leading: s.leading,
        objective: s.objective,
        finder: diagnostic.correctFinder,
        dimensions: diagnostic.locations.map((x) => x.dimension),
        runs: Object.values(diagnostic.corridors)
          .flatMap((x) => Object.values(x))
          .map((x) => x.runs.length),
        repeatMatches,
        ms: r.elapsedMs,
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
  completed: records.length,
  correctFinderGeometry: records
    .filter((r) => r.diagnostic.correctFinder)
    .map((r) => r.id),
  exactNativeRepeats: records.filter((r) => r.replay.repeatMatches).length,
  encodedPayloads: 0,
  phoneCandidates: 0,
});
