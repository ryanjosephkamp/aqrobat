import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";
import { createHash } from "node:crypto";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const families = ["Courier", "Monaco", "Impact"],
  alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,",
  configs = [];
for (const font of families)
  for (const weight of [400])
    configs.push({ font, weight, key: font + "|" + weight });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
let result;
try {
  const page = await browser.newPage();
  await page.setContent(
    configs
      .map(
        (c, i) =>
          `<p id="font-${i}" style="font:${c.weight} 20px/24px '${c.font}';font-kerning:none;font-variant-ligatures:none">${alphabet}<span id="baseline-${i}" style="display:inline-block;width:0;height:0;padding:0;margin:0"></span></p>`,
      )
      .join(""),
  );
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root: dom } = await cdp.send("DOM.getDocument");
  const platformFonts = {};
  for (let i = 0; i < configs.length; i++) {
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: dom.nodeId,
      selector: "#font-" + i,
    });
    platformFonts[configs[i].key] = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId })
    ).fonts;
  }
  const fonts = await page.evaluate(
    ({ configs, alphabet }) => {
      const out = {};
      for (let i = 0; i < configs.length; i++) {
        const c = configs[i],
          p = document.querySelector("#font-" + i),
          baseline24 =
            document.querySelector("#baseline-" + i).getBoundingClientRect()
              .top - p.getBoundingClientRect().top;
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.font = `${c.weight} 20px '${c.font}'`;
        ctx.fontKerning = "none";
        ctx.textBaseline = "alphabetic";
        const glyphs = {};
        for (const ch of alphabet) {
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, 32, 32);
          ctx.fillStyle = "black";
          ctx.fillText(ch, 2, 22);
          const m = ctx.measureText(ch),
            data = ctx.getImageData(0, 0, 32, 32).data;
          const ink = [];
          let mass = 0;
          for (let y = 0; y < 32; y++)
            for (let x = 0; x < 32; x++) {
              const alpha = (255 - data[(y * 32 + x) * 4]) / 255;
              if (alpha) {
                ink.push([x - 2, y - 22, Number(alpha.toFixed(5))]);
                mass += alpha;
              }
            }
          glyphs[ch] = {
            advance: m.width,
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
            left: m.actualBoundingBoxLeft,
            right: m.actualBoundingBoxRight,
            inkMass: mass,
            ink,
          };
        }
        out[c.key] = {
          font: c.font,
          weight: c.weight,
          size: 20,
          baseline24,
          glyphs,
        };
      }
      return out;
    },
    { configs, alphabet },
  );
  result = {
    measuredAt: new Date().toISOString(),
    sourceScriptSha256: hash(await readFile(new URL(import.meta.url))),
    browser: browser.version(),
    platformFonts,
    fonts,
    classification:
      "Native 20-pixel installed glyph pixels with DOM baseline; canvas model only. No font downloaded or distributed.",
  };
} finally {
  await browser.close();
}
await writeFile(
  "docs/research/prose-qr/phase-06/font-metrics.json",
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    platformFonts: result.platformFonts,
    baselines: Object.fromEntries(
      Object.entries(result.fonts).map(([k, v]) => [k, v.baseline24]),
    ),
  }),
);
