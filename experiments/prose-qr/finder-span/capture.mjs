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
import { finderMatrix, solidTriplet } from "../finder-native/layout.mjs";
import { escapeHtml } from "../layout.mjs";
const root = resolve("docs/research/prose-qr/phase-07"),
  out = resolve(
    root,
    process.argv[2] === "guard-remaining"
      ? "guard-02"
      : process.argv[2] === "guard"
        ? "guard-01"
        : "native-01",
  ),
  hash = (b) => createHash("sha256").update(b).digest("hex"),
  specs = [24, 32].map((fontSize, i) => ({
    id: `span-${String(i + 1).padStart(2, "0")}`,
    font: "Impact",
    fontSize,
    leading: "Proportional native CSS from frozen seed",
    objective: "Native glyph span; unchanged text",
  }));
if (process.argv[2]) {
  assert(["guard", "guard-remaining"].includes(process.argv[2]));
  specs.length = 0;
  for (let guard = 1; guard <= 4; guard++)
    specs.push({
      id: `guard-${String(guard).padStart(2, "0")}`,
      font: "Impact",
      fontSize: 20,
      guard,
      leading: "Frozen 20-pixel seed",
      objective: "Whole-line source guard for ordinary finder formation",
    });
}
if (process.argv[2] === "guard-remaining") specs.splice(0, 2);
const sourceMetrics = JSON.parse(
  await readFile("docs/research/prose-qr/phase-06/font-metrics.json", "utf8"),
);
const seedPath = resolve("docs/research/prose-qr/phase-06/seam-02"),
  seed = JSON.parse(
    await readFile(resolve(seedPath, "seam-01-layout.json"), "utf8"),
  ),
  seedHtml = (await import("node:zlib"))
    .gunzipSync(await readFile(resolve(seedPath, "seam-01.html.gz")))
    .toString(),
  seedRecord = (await readFile(resolve(seedPath, "results.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse)
    .find((r) => r.id === "seam-01");
function layout(spec) {
  const factor = spec.fontSize / 20,
    l = {
      ...seed,
      spec,
      unit: seed.unit * factor,
      lineHeight: seed.lineHeight * factor,
      baseline: seed.baseline * factor,
      field: seed.field * factor,
      offset: seed.offset * factor,
      side: Math.ceil(seed.unit * 35 * factor),
      actualAdvances: seed.actualAdvances.map((w) => w * factor),
      unusedWidths: seed.unusedWidths.map((w) => w * factor),
      modelScores: [],
      matrix: finderMatrix(),
      structural: {
        ...seed.structural,
        fontSize: spec.fontSize,
        tracking: seed.structural.tracking * factor,
        globalInkEnvelope: seed.structural.globalInkEnvelope * factor,
        proportionalNativeCss: true,
        rasterScaling: false,
      },
    };
  if (spec.guard) {
    const lines = seed.plainText.split("\n"),
      iw = "I".repeat(14),
      istring = [iw, iw, iw].join(" ");
    lines[6] =
      spec.guard === 1
        ? lines[5]
        : spec.guard === 2
          ? "eeee me eeee me eeee me eeee"
          : istring;
    if (spec.guard === 4) lines[8] = istring;
    l.plainText = lines.join("\n");
    const g = sourceMetrics.fonts["Impact|400"].glyphs;
    l.actualAdvances = lines.map((s) =>
      [...s].reduce((n, c) => n + g[c].advance + l.structural.tracking, 0),
    );
    assert(
      l.actualAdvances.every((w) => w <= l.field),
      "Guard source advance overflow",
    );
    l.unusedWidths = l.actualAdvances.map((w) => l.field - w);
    l.structural.syntheticGuardWords = spec.guard > 1;
    l.structural.guardRows = spec.guard === 4 ? [6, 8] : [6];
  }
  const pad = l.unit * 5,
    pre = (i, x, y) =>
      `<pre id="corner-${i}" style="position:absolute;left:${pad + x * l.unit}px;top:${pad + y * l.unit + l.offset}px;width:${l.field}px;height:${15 * l.lineHeight}px;margin:0;padding:0;font:400 ${spec.fontSize}px/${l.lineHeight}px 'Impact',monospace;letter-spacing:${l.structural.tracking}px;font-kerning:none;font-variant-ligatures:none;color:black;overflow:visible">${escapeHtml(l.plainText)}</pre>`;
  l.markup = `<article id="artifact" style="position:relative;width:${l.unit * 35}px;height:${l.unit * 35}px;background:white;color:black;overflow:visible">${pre(0, 0, 0)}${pre(1, 18, 0)}${pre(2, 0, 18)}</article>`;
  return l;
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
        (await bytes(resolve("experiments/prose-qr/finder-span"))) +
        Buffer.byteLength(b) <
        1_100_000,
      "Evidence reserve",
    );
    await writeFile(resolve(out, p), b, { flag: "wx" });
    return hash(b);
  },
  json = async (p, v) =>
    save(p, await format(JSON.stringify(v), { parser: "json" }));
const sourceHashes = {};
for (const p of [
  "experiments/prose-qr/finder-span/capture.mjs",
  "experiments/prose-qr/finder-native/layout.mjs",
  "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  "experiments/prose-qr/layout.mjs",
  "experiments/prose-qr/decoders.mjs",
  "docs/research/prose-qr/phase-07/PLAN.md",
  "docs/research/prose-qr/phase-06/font-metrics.json",
  ...(process.argv[2] === "guard-remaining"
    ? ["docs/research/prose-qr/phase-07/GUARD-CONTINUATION.md"]
    : []),
  ...(process.argv[2] ? ["docs/research/prose-qr/phase-07/GUARD-PLAN.md"] : []),
  "docs/research/prose-qr/phase-06/custody.json",
  "docs/research/prose-qr/phase-06/seam-02/seam-01-layout.json",
  "docs/research/prose-qr/phase-06/seam-02/seam-01.html.gz",
  "docs/research/prose-qr/phase-06/seam-02/raw/seam-01.png",
  "docs/research/prose-qr/phase-06/seam-02/results.jsonl",
])
  sourceHashes[p] = hash(await readFile(p));
await json("manifest.json", {
  startedAt: new Date().toISOString(),
  baseline: "80f1b54a024cfb456f287078f2af7edb7e2579f8",
  specs,
  sourceHashes,
  diagnosticBundleSha256: bundleHash,
  controlsDecoder: DECODER_PROVENANCE,
  ordinaryZXing: { formats: ["QRCode"] },
  gate: "Finder-only ordinary locator diagnostic on unchanged native pixels. No payload in candidate layouts; no phone candidates.",
});
const metrics = null,
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
    viewport: { width: 2000, height: 2000 },
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
    seed: "phase-06 seam-01",
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
    assert(l.side <= 2000);
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
    const nativeGlyphMetrics = await page.locator("#corner-0").evaluate((e) => {
      const cs = getComputedStyle(e),
        ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `400 ${cs.fontSize} Impact`;
      return Object.fromEntries(
        [
          ...new Set(e.textContent.replaceAll("\n", "").replaceAll(" ", "")),
        ].map((c) => {
          const m = ctx.measureText(c);
          return [
            c,
            {
              width: m.width,
              ascent: m.actualBoundingBoxAscent,
              descent: m.actualBoundingBoxDescent,
            },
          ];
        }),
      );
    });
    const actualEnvelope =
      Math.max(...Object.values(nativeGlyphMetrics).map((g) => g.ascent)) +
      Math.max(...Object.values(nativeGlyphMetrics).map((g) => g.descent));
    assert(
      actualEnvelope <= l.lineHeight + 1 / 64,
      "Actual native glyph envelope overflow",
    );
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = await cdp.send("DOM.getDocument"),
      node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: "#corner-0",
      }),
      platform = await cdp.send("CSS.getPlatformFontsForNode", {
        nodeId: node.nodeId,
      });
    assert(
      platform.fonts.length > 0 &&
        platform.fonts.every((f) => f.familyName === "Impact"),
    );
    await cdp.detach();
    await json(s.id + "-native-metrics.json", {
      nativeGlyphMetrics,
      actualEnvelope,
      platformFonts: platform.fonts,
      computedStyle: fit,
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
