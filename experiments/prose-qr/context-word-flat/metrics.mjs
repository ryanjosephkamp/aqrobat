import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-42/",
  source = "experiments/prose-qr/context-word-flat/",
  out = root + "metrics-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex"),
  json = async (p, v) =>
    writeFile(out + p, await format(JSON.stringify(v), { parser: "json" }), {
      flag: "wx",
    });
const words = {
  dark: ["wwW", "wwH", "wwN", "wwB", "mmW", "mmM", "ooH", "ooN"],
  light: [
    "iiL",
    "ilL",
    "liL",
    "iiT",
    "ilT",
    "liT",
    "iiI",
    "ilI",
    "liI",
    "iiF",
    "ilF",
    "liF",
  ],
};
await mkdir(out);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 422, height: 100 },
    deviceScaleFactor: 1,
  });
  const glyphs = await page.evaluate((words) => {
    const g = document.createElement("canvas").getContext("2d");
    g.font = "400 16px Monaco";
    g.fontKerning = "none";
    return Object.fromEntries(
      [...new Set(Object.values(words).flat().join(" "))].map((c) => {
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
  }, words);
  const rawAdvance = glyphs[" "].advance,
    tracking = 10 - rawAdvance;
  assert(
    tracking >= 0 && tracking <= 0.5,
    "Tracking out of native source bounds",
  );
  assert(
    Object.values(glyphs).every((g) => Math.abs(g.advance - rawAdvance) < 1e-6),
    "Font is not monospaced",
  );
  const phase = ((10240 / 35) * 5) % 20,
    resources = [],
    rejected = [];
  for (const [kind, bank] of Object.entries(words))
    for (const [index, word] of bank.entries()) {
      let right = null,
        x = 0,
        gap = Infinity;
      for (const c of word) {
        const g = glyphs[c];
        if (right !== null) gap = Math.min(gap, x - g.left - right);
        right = x + g.right;
        x += 10;
      }
      const envelope =
        Math.max(...[...word].map((c) => glyphs[c].ascent)) +
        Math.max(...[...word].map((c) => glyphs[c].descent));
      if (gap < 0 || 20 - envelope < 2) {
        rejected.push({ kind, word, gap, clearance: 20 - envelope });
        continue;
      }
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
          tracking: c.letterSpacing,
          leading: c.lineHeight,
        };
      });
      assert(
        Math.abs(native.tokenWidth - 40) <= 0.05,
        "Native word-period drift",
      );
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const doc = await cdp.send("DOM.getDocument"),
        node = await cdp.send("DOM.querySelector", {
          nodeId: doc.root.nodeId,
          selector: "#letters",
        });
      const platformFonts = (
        await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
      ).fonts;
      await cdp.detach();
      assert(
        platformFonts.length &&
          platformFonts.every((f) => f.familyName === "Monaco"),
        "Native font substitution",
      );
      const path = out + `${kind}-${index + 1}.png`,
        png = await page.locator("#tile").screenshot();
      await writeFile(path, png, { flag: "wx" });
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
            .flatMap((row) => row.filter((v, i) => i % 2 === p))
            .reduce((n, v) => n + v, 0) / 24,
      );
      resources.push({
        kind,
        index,
        word,
        pngPath: path,
        pngSha256: sha(png),
        native,
        platformFonts,
        gap,
        clearance: 20 - envelope,
        grid,
        densities,
        minDensity: Math.min(...grid.flat()),
        maxDensity: Math.max(...grid.flat()),
      });
    }
  assert(
    resources.some((r) => r.kind === "dark") &&
      resources.some((r) => r.kind === "light"),
    "No usable word banks",
  );
  const priorPath = "docs/research/prose-qr/phase-41/metrics-01/metrics.json",
    prior = JSON.parse(await readFile(priorPath));
  assert.equal(prior.tracking, tracking);
  assert.equal(prior.phase, phase);
  const allResources = [...prior.resources, ...resources];
  const eligible = allResources.filter(
    (r) => r.maxDensity - r.minDensity <= 0.012,
  );
  const pairs = eligible.flatMap((d, di) =>
    eligible
      .filter((l) => l.word !== d.word)
      .map((l, li) => ({
        dark: d.word,
        light: l.word,
        score: d.minDensity - l.maxDensity,
        darkIndex: allResources.indexOf(d),
        lightIndex: allResources.indexOf(l),
      })),
  );
  pairs.sort(
    (a, b) =>
      b.score - a.score ||
      a.darkIndex - b.darkIndex ||
      a.lightIndex - b.lightIndex,
  );
  if (!pairs.length || pairs[0].score <= 0) {
    await json("rejection.json", {
      at: new Date().toISOString(),
      reason: "No positive flat source-cell density pair",
      priorResources: prior.resources.length,
      newResources: resources.length,
      eligible: eligible.map((r) => r.word),
      resources,
      rejected,
      nativeSlotUnattempted: true,
    });
    throw new Error("No positive flat source density margin");
  }
  await json("metrics.json", {
    at: new Date().toISOString(),
    font: "Monaco",
    size: 16,
    leading: 20,
    tracking,
    rawAdvance,
    pitch: 10,
    phase,
    glyphs,
    words,
    resources,
    priorResources: prior.resources,
    eligible: eligible.map((r) => r.word),
    rejected,
    pairs,
    selected: pairs[0],
    classification:
      "Native source-only density resource objective; no QR or reader calls",
    sources: Object.fromEntries(
      await Promise.all(
        [source + "metrics.mjs", root + "PLAN.md", priorPath].map(async (p) => [
          p,
          sha(await readFile(p)),
        ]),
      ),
    ),
  });
  console.log(
    JSON.stringify({
      nativeWordResources: resources.length,
      rejected: rejected.length,
      tracking,
      selected: pairs[0],
    }),
  );
} catch (e) {
  await json("error.json", { at: new Date().toISOString(), error: e.stack });
  throw e;
} finally {
  await browser.close();
}
