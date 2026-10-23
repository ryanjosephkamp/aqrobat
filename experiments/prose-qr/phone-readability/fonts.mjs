import { chromium } from "playwright";
import { writeFile, readFile } from "node:fs/promises";
import { format } from "prettier";
import { sha, root } from "./capture.mjs";
import { resolve } from "node:path";
const families = ["Impact", "Arial Black", "Arial", "Georgia"];
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
let result;
try {
  const page = await browser.newPage();
  await page.setContent(
    families
      .map(
        (f, i) =>
          `<p id="font-${i}" style="font:400 40px '${f}';font-kerning:none">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz</p>`,
      )
      .join(""),
  );
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root: dom } = await cdp.send("DOM.getDocument");
  const actual = {};
  for (let i = 0; i < families.length; i++) {
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: dom.nodeId,
      selector: "#font-" + i,
    });
    actual[families[i]] = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId })
    ).fonts;
  }
  const fonts = await page.evaluate((families) => {
    const out = {};
    for (const f of families) {
      const canvas = document.createElement("canvas");
      canvas.width = 80;
      canvas.height = 80;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.font = `400 40px '${f}'`;
      ctx.fontKerning = "none";
      ctx.textBaseline = "alphabetic";
      const glyphs = {};
      for (const c of "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,!") {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 80, 80);
        ctx.fillStyle = "black";
        ctx.fillText(c, 10, 55);
        const m = ctx.measureText(c),
          pixels = ctx.getImageData(0, 0, 80, 80).data;
        let inkMass = 0;
        for (let j = 0; j < pixels.length; j += 4)
          inkMass += (255 - pixels[j]) / 255;
        glyphs[c] = {
          advance: m.width,
          inkMass,
          ascent: m.actualBoundingBoxAscent,
          descent: m.actualBoundingBoxDescent,
          left: m.actualBoundingBoxLeft,
          right: m.actualBoundingBoxRight,
        };
      }
      out[f] = { glyphs, weight: 400, measurementSize: 40 };
    }
    return out;
  }, families);
  result = {
    measuredAt: new Date().toISOString(),
    fonts,
    platformFonts: actual,
    browser: browser.version(),
    sourceScriptSha256: sha(
      await readFile(new URL("fonts.mjs", import.meta.url)),
    ),
    note: "Installed font faces only; no font downloaded or redistributed. Heavy face shape differs from weight modulation; natural proportional advances retained.",
  };
} finally {
  await browser.close();
}
await writeFile(
  resolve(root, "font-metrics.json"),
  await format(JSON.stringify(result), { parser: "json" }),
  { flag: "wx" },
);
console.log(JSON.stringify(result.platformFonts));
