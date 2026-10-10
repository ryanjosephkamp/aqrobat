import { chromium } from "playwright";
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { format } from "prettier";
const out = resolve(process.argv[2] || "docs/research/prose-qr/pilot-02");
const allLines = (await readFile(resolve(out, "results.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const records = [...new Map(allLines.map((r) => [r.id, r])).values()];
const prior = JSON.parse(await readFile(resolve(out, "analysis.json"), "utf8"));
const metrics = JSON.parse(
  await readFile(resolve(out, "metrics.json"), "utf8"),
);
const borderRecords = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage();
  for (const r of records)
    for (const s of r.scales) {
      const png = await readFile(resolve(out, s.path));
      if (createHash("sha256").update(png).digest("hex") !== s.pngSha256)
        throw Error("Raw screenshot hash changed");
      const bbox = await page.evaluate(async (base64) => {
        const image = new Image();
        image.src = "data:image/png;base64," + base64;
        await image.decode();
        const c = document.createElement("canvas");
        c.width = image.width;
        c.height = image.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(image, 0, 0);
        const p = ctx.getImageData(0, 0, c.width, c.height).data;
        let left = c.width,
          right = -1,
          top = c.height,
          bottom = -1;
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4;
            if ((p[i] + p[i + 1] + p[i + 2]) / 3 < 128) {
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        return { left, right, top, bottom, width: c.width, height: c.height };
      }, png.toString("base64"));
      const unit = s.size / r.layout.qr.totalModules;
      const margins = {
        left: bbox.left / unit,
        right: (bbox.width - 1 - bbox.right) / unit,
        top: bbox.top / unit,
        bottom: (bbox.height - 1 - bbox.bottom) / unit,
      };
      borderRecords.push({
        id: r.id,
        size: s.size,
        threshold: 128,
        inkBounds: bbox,
        clearMarginsInModules: margins,
        minimumClearMargin: Math.min(...Object.values(margins)),
        note: "Actual dark-pixel bounds; nominal CSS/text margin is four modules, but tightly packed glyphs can extend into it. Not a decoder guarantee.",
      });
    }
} finally {
  await browser.close();
}
await writeFile(
  resolve(out, "border-metrics.json"),
  await format(JSON.stringify(borderRecords), { parser: "json" }),
  { flag: "wx" },
);
const counts = {};
for (const track of ["strict", "styled"]) {
  const cases = records.filter((r) => r.spec.track === track);
  counts[track] = {
    candidates: cases.length,
    complete: cases.filter((r) => r.complete).length,
    rawRasters: cases.reduce((n, r) => n + r.scales.length, 0),
    rawRastersExactJsQR: cases.reduce(
      (n, r) => n + r.scales.filter((s) => s.decoders.jsQR.exact).length,
      0,
    ),
    rawRastersExactZXing: cases.reduce(
      (n, r) => n + r.scales.filter((s) => s.decoders.zxing.exact).length,
      0,
    ),
  };
}
const readingMetrics = records.map((r) => ({
  id: r.id,
  maximumOpticalInkHeightToLineHeight: Math.max(
    ...r.layout.darkWords.map((w) => {
      const m = metrics.words[`${r.spec.font}|${r.spec.weight}`][w];
      return (
        (((m.ascent + m.descent) / 40) * r.layout.fontSize) /
        r.layout.lineHeight
      );
    }),
  ),
  wordCount: r.layout.plainText.match(/[A-Za-z]+/g).length,
  readability: "real-word membership only; no human readability acceptance",
  semantics: "not grammatical prose",
}));
let storedBytes = 0;
async function walk(p) {
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    if (e.isDirectory()) await walk(q);
    else storedBytes += (await stat(q)).size;
  }
}
await walk(resolve(out, ".."));
const final = {
  schema: "aqrobat-prose-pilot-final-v1",
  baseline: "e32e4971b7d2eb50af0ddfa55939c2631b866ed9",
  startedAt: prior.startedAt,
  rawGridComplete: true,
  initialGrid: { strict: 48, styled: 108 },
  urlFollowups: 2,
  counts,
  caseCount: records.length,
  rawRasterCount: borderRecords.length,
  rawRastersExactJsQR: records.reduce(
    (n, r) => n + r.scales.filter((s) => s.decoders.jsQR.exact).length,
    0,
  ),
  rawRastersExactZXing: records.reduce(
    (n, r) => n + r.scales.filter((s) => s.decoders.zxing.exact).length,
    0,
  ),
  diagnostics: {
    rasters: prior.diagnostics.length,
    exactJsQR: prior.diagnosticRastersRecoveredByJsQR,
    exactZXing: prior.diagnosticRastersRecoveredByZXing,
    classification: "Processed images only, not raw-output scanning success",
    selection:
      "Eight font/track/light-policy cases selected at the first storage pause; no claim that they are the best of the final full grid",
  },
  controls: {
    positivePassedEachDecoder: 3,
    negativeNotRecognizedEachDecoder: 6,
    initialCalibrationFailure:
      "pilot-01 retains fractional-edge SVG control failure before integer-pixel correction",
  },
  decoders: prior.decoders,
  sourceReceiptLines: allLines.length,
  uniqueCases: records.length,
  continuation:
    "One partial candidate resumed only its previously untested 960-px scale; all other existing frames reused unchanged. Replays archived losslessly; compression manifest verifies original bytes.",
  actualBorder: {
    rastersBelowFourModulesAtThreshold128: borderRecords.filter(
      (b) => b.minimumClearMargin < 4,
    ).length,
    minimumAcrossGrid: Math.min(
      ...borderRecords.map((b) => b.minimumClearMargin),
    ),
    note: "Some original input labels say clear four-module border. That is the nominal layout intent, not the verified dark-pixel margin. Consult border-metrics.json.",
  },
  readingMetrics,
  conclusion:
    "No unchanged raw word raster decoded in either software reader. Some processed word layouts retain recoverable QR structure. Hidden, readable, ordinarily scannable prose is unproved.",
  phone: "not tested",
  physicalPrint: "not tested",
  coherentParagraph: "not attempted",
  newChatsAgents: "none",
  npm: "private/unpublished",
  pr: "draft #1",
  storedEvidenceBytesBeforeFinal: storedBytes,
  finalizedAt: new Date().toISOString(),
  elapsedSeconds: Math.round((Date.now() - Date.parse(prior.startedAt)) / 1000),
  gate: "Pause at pilot handback; next research phase needs owner selection",
};
await writeFile(
  resolve(out, "final-analysis.json"),
  await format(JSON.stringify(final), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    counts,
    rawRasters: borderRecords.length,
    belowNominalBorder: final.actualBorder,
    storedBytes,
    elapsedSeconds: final.elapsedSeconds,
  }),
);
