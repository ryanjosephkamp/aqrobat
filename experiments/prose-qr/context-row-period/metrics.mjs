import { chromium } from "playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-38/",
  source = "experiments/prose-qr/context-row-period/",
  out = root + "metrics-01/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const words = {
  dark: ["BOB", "BOOM", "MUM", "MUMMY", "MMMM"],
  light: [
    "ill",
    "lit",
    "till",
    "lilt",
    "little",
    "it",
    "if",
    "tilt",
    "elite",
    "veil",
    "we",
    "vow",
    "wow",
    "owl",
    "cove",
    "owe",
    "ever",
  ],
};
await mkdir(out);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const resources = [];
try {
  for (const font of ["Monaco", "Impact"]) {
    const page = await browser.newPage({
      viewport: { width: 1100, height: 180 },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<p id="sample" style="font:400 14px/14px '${font}';margin:0;color:black;background:white">${Object.values(words).flat().join(" ")}</p>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const glyphs = await page.evaluate(
      ({ words, font }) => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d");
        g.font = `400 14px '${font}'`;
        g.fontKerning = "none";
        return Object.fromEntries(
          [...new Set(Object.values(words).flat().join(" "))].map((char) => {
            g.fillStyle = "white";
            g.fillRect(0, 0, 64, 64);
            g.fillStyle = "black";
            g.fillText(char, 8, 40);
            const m = g.measureText(char),
              d = g.getImageData(0, 0, 64, 64).data;
            let inkMass = 0;
            for (let i = 0; i < d.length; i += 4) inkMass += (255 - d[i]) / 255;
            return [
              char,
              {
                advance: m.width,
                left: m.actualBoundingBoxLeft,
                right: m.actualBoundingBoxRight,
                ascent: m.actualBoundingBoxAscent,
                descent: m.actualBoundingBoxDescent,
                inkMass,
              },
            ];
          }),
        );
      },
      { words, font },
    );
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = await cdp.send("DOM.getDocument"),
      node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: "#sample",
      });
    const fonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    await cdp.detach();
    const png = await page.locator("#sample").screenshot();
    await writeFile(out + font + "-letters.png", png, { flag: "wx" });
    const receipt = {
      at: new Date().toISOString(),
      font,
      size: 14,
      leading: 14,
      weight: 400,
      words,
      glyphs,
      platformFonts: fonts,
      pngSha256: sha(png),
      classification: "One native font resource sample, no QR geometry/payload",
      sources: Object.fromEntries(
        await Promise.all(
          [source + "metrics.mjs", root + "PLAN.md"].map(async (p) => [
            p,
            sha(await readFile(p)),
          ]),
        ),
      ),
    };
    await writeFile(
      out + font + "-metrics.json",
      await format(JSON.stringify(receipt), { parser: "json" }),
      { flag: "wx" },
    );
    assert(
      fonts.every((f) => f.familyName === font),
      "Font substitution",
    );
    resources.push(receipt);
    await page.close();
  }
  const ranking = [];
  for (const m of resources) {
    const rejected = [],
      banks = {};
    for (const [kind, items] of Object.entries(m.words)) {
      const ranked = [];
      for (const [index, word] of items.entries()) {
        let x = 0,
          right = null,
          gap = Infinity,
          mass = 0;
        for (const c of word) {
          const g = m.glyphs[c];
          if (right !== null) gap = Math.min(gap, x - g.left - right);
          right = x + g.right;
          x += g.advance;
          mass += g.inkMass;
        }
        if (gap < 0) {
          rejected.push({
            kind,
            word,
            reason: "native ink bounds overlap",
            gap,
          });
          continue;
        }
        ranked.push({
          word,
          index,
          density: mass / (x + m.glyphs[" "].advance) / 14,
        });
      }
      ranked.sort(
        (a, b) =>
          (kind === "dark" ? b.density - a.density : a.density - b.density) ||
          a.index - b.index,
      );
      banks[kind] = ranked.slice(0, kind === "dark" ? 3 : 6);
    }
    const chars = [
        ...new Set(
          Object.values(banks)
            .flat()
            .map((a) => a.word)
            .join(""),
        ),
      ],
      clearance =
        14 -
        Math.max(...chars.map((c) => m.glyphs[c].ascent)) -
        Math.max(...chars.map((c) => m.glyphs[c].descent));
    const reasons = [];
    if (clearance < 2) reasons.push("row clearance below 2px");
    if (banks.dark.length < 3 || banks.light.length < 6)
      reasons.push("insufficient usable words");
    const mean = (a) => a.reduce((n, r) => n + r.density, 0) / a.length;
    ranking.push({
      font: m.font,
      banks,
      rejected,
      clearance,
      reasons,
      score: mean(banks.dark) - mean(banks.light),
    });
  }
  const usable = ranking
    .filter((r) => !r.reasons.length)
    .sort(
      (a, b) =>
        b.score - a.score ||
        resources.findIndex((m) => m.font === a.font) -
          resources.findIndex((m) => m.font === b.font),
    );
  assert(usable.length, "No usable font");
  const selected = usable[0],
    metrics = resources.find((m) => m.font === selected.font);
  await writeFile(
    out + "selection.json",
    await format(
      JSON.stringify({
        ranking,
        selected: selected.font,
        classification:
          "Model-only selection before native geometry/reader returns",
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  await writeFile(
    out + "metrics.json",
    await format(
      JSON.stringify({
        ...metrics,
        words: Object.fromEntries(
          Object.entries(selected.banks).map(([k, v]) => [
            k,
            v.map((r) => r.word),
          ]),
        ),
        selectionSha256: sha(await readFile(out + "selection.json")),
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      resourceSamples: resources.length,
      selected: selected.font,
      score: selected.score,
      banks: selected.banks,
    }),
  );
} catch (e) {
  await writeFile(
    out + "error.json",
    await format(
      JSON.stringify({ at: new Date().toISOString(), error: e.stack }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
  throw e;
} finally {
  await browser.close();
}
