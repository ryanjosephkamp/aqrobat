import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-43/",
  source = "experiments/prose-qr/context-glyph-period/",
  out = root + "metrics-01/",
  modelOut = root + "model-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
const alphabet = [..."iIlLtTfFvVwWmMnNoOuU"];
assert.equal(alphabet.length, 20);
await mkdir(out);
await mkdir(modelOut);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
let completedResources = 0;
try {
  const page = await browser.newPage({
    viewport: { width: 422, height: 100 },
    deviceScaleFactor: 1,
  });
  const glyphs = await page.evaluate((alphabet) => {
    const g = document.createElement("canvas").getContext("2d");
    g.font = "400 16px Monaco";
    g.fontKerning = "none";
    return Object.fromEntries(
      [...alphabet, " "].map((c) => {
        const m = g.measureText(c);
        return [
          c,
          {
            advance: m.width,
            left: m.actualBoundingBoxLeft,
            right: m.actualBoundingBoxRight,
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
          },
        ];
      }),
    );
  }, alphabet);
  const rawAdvance = glyphs[" "].advance,
    tracking = 10 - rawAdvance,
    phase = ((10240 / 35) * 5) % 20;
  assert(tracking >= 0 && tracking <= 0.5);
  assert(
    Object.values(glyphs).every((g) => Math.abs(g.advance - rawAdvance) < 1e-6),
  );
  const envelope =
    Math.max(...Object.values(glyphs).map((g) => g.ascent)) +
    Math.max(...Object.values(glyphs).map((g) => g.descent));
  assert(20 - envelope >= 2);
  const resources = [],
    vectors = {};
  async function resource(word, id) {
    const line = Array(10).fill(word).join(" "),
      text = Array(4).fill(line).join("\n");
    await page.setContent(
      `<div id="tile" style="position:absolute;left:0;top:0;width:422px;height:100px;background:white"><pre id="letters" style="position:absolute;left:${phase}px;top:${phase}px;font:400 16px/20px Monaco;letter-spacing:${tracking}px;font-kerning:none;font-variant-ligatures:none;white-space:pre;margin:0;padding:0;color:black">${text}</pre></div>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const native = await page.locator("#letters").evaluate((e) => {
      const r = document.createRange();
      r.setStart(e.firstChild, 0);
      r.setEnd(e.firstChild, 4);
      const c = getComputedStyle(e);
      return {
        tokenWidth: r.getBoundingClientRect().width,
        size: c.fontSize,
        leading: c.lineHeight,
        tracking: c.letterSpacing,
      };
    });
    assert(Math.abs(native.tokenWidth - 40) <= 0.05);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = await cdp.send("DOM.getDocument"),
      node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: "#letters",
      }),
      platformFonts = (
        await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
      ).fonts;
    await cdp.detach();
    assert(
      platformFonts.length &&
        platformFonts.every((f) => f.familyName === "Monaco"),
    );
    const path = out + id + ".png",
      png = await page.locator("#tile").screenshot();
    await writeFile(path, png, { flag: "wx" });
    completedResources++;
    const grid = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          "import cv2,json,sys;g=cv2.imread(sys.argv[1],0);print(json.dumps([[float((255-g[y*20:(y+1)*20,x*20:(x+1)*20]).mean()/255) for x in range(2,18)] for y in range(1,4)]))",
          path,
        ],
        { encoding: "utf8" },
      ),
    );
    const densities = [0, 1].map(
        (p) =>
          grid
            .flatMap((r) => r.filter((v, i) => i % 2 === p))
            .reduce((n, v) => n + v, 0) / 24,
      ),
      r = {
        word,
        pngPath: path,
        pngSha256: sha(png),
        native,
        platformFonts,
        grid,
        densities,
      };
    resources.push(r);
    return r;
  }
  for (const [i, c] of alphabet.entries()) {
    vectors[c] = [];
    for (let j = 0; j < 3; j++) {
      const word = Array.from({ length: 3 }, (_, k) =>
        j === k ? c : " ",
      ).join("");
      vectors[c].push(
        (await resource(word, `glyph-${i + 1}-${j + 1}`)).densities,
      );
    }
  }
  const rows = ["word,density0,density1,spread,minGap,clearance,eligible"],
    eligible = [];
  let rejectedBounds = 0,
    sourceModels = 0;
  for (const a of alphabet)
    for (const b of alphabet)
      for (const c of alphabet) {
        const word = a + b + c,
          d = [0, 1].map(
            (k) => vectors[a][0][k] + vectors[b][1][k] + vectors[c][2][k],
          ),
          spread = Math.abs(d[0] - d[1]),
          minGap = Math.min(
            10 - glyphs[a].right - glyphs[b].left,
            10 - glyphs[b].right - glyphs[c].left,
          ),
          clearance =
            20 -
            Math.max(...[...word].map((c) => glyphs[c].ascent)) -
            Math.max(...[...word].map((c) => glyphs[c].descent)),
          bounds = minGap >= 0 && clearance >= 2,
          ok = bounds && spread <= 0.012;
        if (!bounds) rejectedBounds++;
        if (ok)
          eligible.push({
            word,
            index: sourceModels,
            densities: d,
            spread,
            minGap,
            clearance,
            minDensity: Math.min(...d),
            maxDensity: Math.max(...d),
          });
        rows.push([word, ...d, spread, minGap, clearance, ok].join(","));
        sourceModels++;
      }
  assert.equal(sourceModels, 8000);
  const csv = Buffer.from(rows.join("\n") + "\n"),
    archive = gzipSync(csv);
  await writeFile(modelOut + "all-models.csv.gz", archive, { flag: "wx" });
  const dark = [...eligible].sort(
      (a, b) => b.minDensity - a.minDensity || a.index - b.index,
    )[0],
    light = [...eligible].sort(
      (a, b) => a.maxDensity - b.maxDensity || a.index - b.index,
    )[0],
    score = dark && light ? dark.minDensity - light.maxDensity : null;
  let selected =
    score !== null && score >= 0.06 && dark.word !== light.word
      ? {
          dark: dark.word,
          light: light.word,
          score,
          darkModel: dark,
          lightModel: light,
        }
      : null;
  const validation = [];
  if (selected)
    for (const [role, m] of [
      ["dark", dark],
      ["light", light],
    ]) {
      const measured = await resource(m.word, "selected-" + role),
        errors = measured.densities.map((d, i) => Math.abs(d - m.densities[i]));
      validation.push({
        role,
        word: m.word,
        predicted: m.densities,
        measured: measured.densities,
        errors,
        pass: errors.every((e) => e <= 0.0001),
      });
    }
  const rejectionReason = selected
    ? "Selected native word validation failed"
    : "No pair reaches margin0.06 and spread0.012";
  const valid = selected && validation.every((v) => v.pass);
  if (!valid) selected = null;
  const model = {
    at: new Date().toISOString(),
    plannedGlyphResources: 60,
    completedGlyphResources: 60,
    conditionalWordValidationResources: validation.length,
    sourceModels,
    eligible: eligible.length,
    rejectedBounds,
    rejectedFlatness: sourceModels - rejectedBounds - eligible.length,
    modelCSVBytes: csv.length,
    modelCSVHash: sha(csv),
    modelArchiveSha256: sha(archive),
    bestDark: dark ?? null,
    bestLight: light ?? null,
    bestMargin: score,
    selected,
    validation,
    nativeSlotEligible: !!valid,
    classification:
      "Source-only native glyph additivity model, no QR/acceptance reader calls",
  };
  await json(modelOut + "summary.json", model);
  if (!valid)
    await json(modelOut + "rejection.json", {
      reason: rejectionReason,
      nativeSlotUnattempted: true,
      model,
    });
  await json(out + "metrics.json", {
    at: new Date().toISOString(),
    font: "Monaco",
    size: 16,
    leading: 20,
    tracking,
    rawAdvance,
    pitch: 10,
    phase,
    glyphs,
    alphabet,
    resources,
    vectors,
    selected,
    modelSummarySha256: sha(await readFile(modelOut + "summary.json")),
    sources: Object.fromEntries(
      await Promise.all(
        [source + "metrics.mjs", root + "PLAN.md"].map(async (p) => [
          p,
          sha(await readFile(p)),
        ]),
      ),
    ),
  });
  console.log(
    JSON.stringify({
      resources: completedResources,
      sourceModels,
      eligible: eligible.length,
      bestMargin: score,
      selected: selected
        ? { dark: selected.dark, light: selected.light, score: selected.score }
        : null,
      validation,
    }),
  );
} catch (e) {
  await json(out + "error.json", {
    at: new Date().toISOString(),
    completedResources,
    error: e.stack,
  });
  throw e;
} finally {
  await browser.close();
}
