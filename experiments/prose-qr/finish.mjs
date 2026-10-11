import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  appendFile,
  readdir,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { format } from "prettier";
import { buildLayout, documentHtml, SCALES } from "./layout.mjs";
import { decode, DECODER_PROVENANCE } from "./decoders.mjs";
const out = resolve(process.argv[2] || "docs/research/prose-qr/pilot-02");
const root = resolve(out, ".."),
  cap = 50 * 1024 * 1024,
  start = Date.parse("2026-10-09T00:12:20Z");
const digest = (v) => createHash("sha256").update(v).digest("hex");
async function used() {
  let sum = 0;
  async function walk(p) {
    for (const e of await readdir(p, { withFileTypes: true })) {
      const q = resolve(p, e.name);
      if (e.isDirectory()) await walk(q);
      else sum += (await stat(q)).size;
    }
  }
  await walk(root);
  return sum;
}
function timeGuard() {
  assert(
    Date.now() - start < 60 * 60 * 1000,
    "Pilot time cap reached; do not start another decode",
  );
}
async function save(path, data) {
  const b = Buffer.from(data);
  assert(
    (await used()) + b.length < cap - 1024 * 1024,
    "Preserve 1 MB for the final board/report",
  );
  await writeFile(resolve(out, path), b, { flag: "wx" });
  return digest(b);
}
async function json(path, v) {
  await save(path, await format(JSON.stringify(v), { parser: "json" }));
}
const rows = (await readFile(resolve(out, "results.jsonl"), "utf8"))
  .trim()
  .split("\n")
  .map((s) => JSON.parse(s));
const metrics = JSON.parse(
  await readFile(resolve(out, "metrics.json"), "utf8"),
);
const controls = JSON.parse(
  await readFile(resolve(out, "controls.json"), "utf8"),
);
const complete = rows.filter((r) => r.complete);
const score = (r) => Math.max(...r.scales.map((s) => s.density.contrast));
const overlap = (r) =>
  Math.max(
    ...r.layout.darkWords.map((w) => {
      const m = metrics.words[`${r.spec.font}|${r.spec.weight}`][w];
      return (
        (((m.ascent + m.descent) / 40) * r.layout.fontSize) /
        r.layout.lineHeight
      );
    }),
  );
const ranked = (rs) => rs.sort((a, b) => score(b) - score(a));
const selected = [];
for (const track of ["strict", "styled"]) {
  const pool = complete.filter((r) => r.spec.track === track);
  for (const font of ["Menlo", "Courier New"]) {
    const candidates = pool.filter((r) => r.spec.font === font);
    // Prefer readable line spacing; keep a dense overlap case separately in the board.
    const usable = candidates.filter((r) => overlap(r) <= 1.05);
    const shortlist = usable.length ? usable : candidates;
    const blanks = shortlist.filter((r) =>
      track === "strict" ? r.spec.light === "blank" : r.spec.lightRatio === 0,
    );
    const words = shortlist.filter((r) =>
      track === "strict" ? r.spec.light === "words" : r.spec.lightRatio > 0,
    );
    for (const group of [blanks, words]) {
      const best = ranked(group)[0];
      if (best && !selected.includes(best)) selected.push(best);
    }
  }
}
const diagnostics = [],
  followups = [],
  errors = [];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 1040 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  async function pixels(png, processing) {
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
        const tctx = target.getContext("2d"),
          rgba = tctx.getImageData(0, 0, width, height);
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
          rgba: btoa(binary),
          png: target.toDataURL("image/png").split(",")[1],
        };
      },
      { base64: png.toString("base64"), processing },
    );
  }
  for (const r of selected) {
    const sample = r.scales.find((s) => s.size === 640);
    const raw = await readFile(resolve(out, sample.path));
    assert.equal(digest(raw), sample.pngSha256);
    for (const mode of ["blur-downsample", "blur-threshold"]) {
      timeGuard();
      const processing = {
        blur: (640 / r.layout.qr.totalModules) * 0.22,
        downsample: mode === "blur-downsample" ? 4 : 1,
        threshold: mode === "blur-threshold" ? 225 : null,
      };
      const p = await pixels(raw, processing);
      const data = Buffer.from(p.rgba, "base64");
      const decoded = await decode(
        { data, width: p.width, height: p.height },
        r.spec.payload,
      );
      const path = `diagnostics/${r.id}-${mode}.png`;
      const pngSha256 = await save(path, Buffer.from(p.png, "base64"));
      diagnostics.push({
        candidateId: r.id,
        sourcePath: sample.path,
        sourcePngSha256: sample.pngSha256,
        processing,
        path,
        pngSha256,
        rgbaSha256: digest(data),
        width: p.width,
        height: p.height,
        decoders: decoded,
        input:
          "Whole raw screenshot transformed by image operations only; no matrix-based reconstruction",
        classification: "processed diagnostic only, not a raw-output pass",
      });
    }
  }
  await json("diagnostic-results.json", diagnostics);
  // At most one follow-up per track, only if a diagnostic actually recovers.
  for (const track of ["strict", "styled"]) {
    const promising = selected.filter(
      (r) =>
        r.spec.track === track &&
        diagnostics.some(
          (d) =>
            d.candidateId === r.id &&
            (d.decoders.jsQR.exact || d.decoders.zxing.exact),
        ),
    );
    const parent = ranked(promising)[0];
    if (!parent) continue;
    if ((await used()) > cap - 2 * 1024 * 1024) break;
    const spec = {
      ...parent.spec,
      id: `${track}-url-1`,
      payload: "https://example.com",
      parent: parent.id,
    };
    const record = {
      id: spec.id,
      spec,
      startedAt: new Date().toISOString(),
      scales: [],
      complete: false,
      selection:
        "one URL follow-up after exact processed-diagnostic recovery; original raw cases did not recover",
    };
    for (const size of SCALES) {
      timeGuard();
      const layout = buildLayout(spec, metrics, size);
      if (!record.layout) {
        const { markup, ...metadata } = layout;
        record.layout = metadata;
        await json(`${spec.id}-layout.json`, metadata);
        const html = await format(documentHtml(markup), { parser: "html" });
        await save(`${spec.id}.html.gz`, gzipSync(html, { mtime: 0 }));
      }
      await page.setContent(
        await format(documentHtml(layout.markup), { parser: "html" }),
      );
      await page.evaluate(() => document.fonts.ready);
      const png = await page.locator("#artifact").screenshot();
      const path = `raw/${spec.id}-${size}.png`;
      const pngSha256 = await save(path, png);
      const p = await pixels(png, null);
      const data = Buffer.from(p.rgba, "base64");
      record.scales.push({
        size,
        path,
        pngSha256,
        rgbaSha256: digest(data),
        width: p.width,
        height: p.height,
        decoders: await decode(
          { data, width: p.width, height: p.height },
          spec.payload,
        ),
        input: "unchanged full DOM screenshot; four-module clear outer border",
      });
    }
    record.complete = true;
    followups.push(record);
    await appendFile(
      resolve(out, "results.jsonl"),
      JSON.stringify(record) + "\n",
    );
  }
} finally {
  await browser.close();
}
const all = [...rows, ...followups];
const counts = Object.fromEntries(
  ["strict", "styled"].map((track) => {
    const cases = all.filter((r) => r.spec.track === track);
    return [
      track,
      {
        attempted: cases.length,
        complete: cases.filter((r) => r.complete).length,
        rawRasters: cases.reduce((n, r) => n + r.scales.length, 0),
        rawCasesRecoveredByJsQR: cases.filter((r) =>
          r.scales.some((s) => s.decoders.jsQR.exact),
        ).length,
        rawCasesRecoveredByZXing: cases.filter((r) =>
          r.scales.some((s) => s.decoders.zxing.exact),
        ).length,
      },
    ];
  }),
);
const analysis = {
  schema: "aqrobat-prose-pilot-results-v1",
  startedAt: new Date(start).toISOString(),
  finishedAt: new Date().toISOString(),
  elapsedSeconds: Math.round((Date.now() - start) / 1000),
  counts,
  plannedInitial: { strict: 48, styled: 108 },
  stop: {
    reason:
      "large replay HTML triggered conservative storage reserve; incomplete case and all preceding receipts retained",
    case: rows.at(-1).id,
    reportingRepair:
      "Runner final summary incorrectly reused its conservative evidence reserve. This report was assembled from the flushed receipts without rerunning any case.",
  },
  decoders: DECODER_PROVENANCE,
  selectedForDiagnostic: selected.map((r) => ({
    id: r.id,
    opticalInkHeightToLineHeight: overlap(r),
    selection:
      "highest contrast within font/track/light policy, preferring no optical vertical overlap",
  })),
  diagnostics,
  followupIds: followups.map((r) => r.id),
  controls,
  candidateReceipts: "results.jsonl",
  rawRastersRecoveredByJsQR: all.reduce(
    (n, r) => n + r.scales.filter((s) => s.decoders.jsQR.exact).length,
    0,
  ),
  rawRastersRecoveredByZXing: all.reduce(
    (n, r) => n + r.scales.filter((s) => s.decoders.zxing.exact).length,
    0,
  ),
  diagnosticRastersRecoveredByJsQR: diagnostics.filter(
    (d) => d.decoders.jsQR.exact,
  ).length,
  diagnosticRastersRecoveredByZXing: diagnostics.filter(
    (d) => d.decoders.zxing.exact,
  ).length,
  errors,
  phone: "not tested",
  print: "not tested",
  semanticProse: "not attempted; only real-word structure",
  generatedEvidenceBytesBeforeFinal: await used(),
  nextGate: "Owner review before another research phase or coherent paragraphs",
};
await json("analysis.json", analysis);
console.log(
  JSON.stringify({
    counts,
    diagnostics: {
      tested: diagnostics.length,
      jsQR: analysis.diagnosticRastersRecoveredByJsQR,
      zxing: analysis.diagnosticRastersRecoveredByZXing,
    },
    urlFollowups: followups.length,
    evidenceBytes: await used(),
    elapsedSeconds: analysis.elapsedSeconds,
  }),
);
