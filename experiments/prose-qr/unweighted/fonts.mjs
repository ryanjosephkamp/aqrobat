import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const paths = {
  Monaco: "/System/Library/Fonts/Monaco.ttf",
  Courier: "/System/Library/Fonts/Courier.ttc",
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
let metrics;
try {
  const page = await browser.newPage();
  metrics = await page.evaluate(async () => {
    await document.fonts.ready;
    const fonts = {},
      glyphs = {};
    for (const family of ["Monaco", "Courier"]) {
      const key = family + "|400";
      glyphs[key] = {};
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      const ctx = c.getContext("2d");
      const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,:;!?'- ";
      for (const ch of chars) {
        ctx.clearRect(0, 0, 160, 160);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 160, 160);
        ctx.fillStyle = "black";
        ctx.font = `400 40px '${family}',monospace`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(ch, 40, 90);
        const t = ctx.measureText(ch);
        const data = ctx.getImageData(0, 0, 160, 160).data;
        let inkMass = 0;
        for (let i = 0; i < data.length; i += 4)
          inkMass += (255 - data[i]) / 255;
        glyphs[key][ch] = {
          inkMass,
          advance: t.width,
          left: t.actualBoundingBoxLeft,
          right: t.actualBoundingBoxRight,
          ascent: t.actualBoundingBoxAscent,
          descent: t.actualBoundingBoxDescent,
        };
      }
      const widths = Object.values(glyphs[key]).map((g) => g.advance);
      fonts[key] = {
        advanceEm: glyphs[key].m.advance / 40,
        minAdvance: Math.min(...widths),
        maxAdvance: Math.max(...widths),
        fontSize: 40,
      };
    }
    return { fonts, glyphs, measurementFontSize: 40, measurementBaseline: 90 };
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const actual = [];
  for (const family of Object.keys(paths)) {
    await page.setContent(
      `<p id="sample" style="font:400 20px '${family}',monospace">Morning milk, little rain. WWW iii.</p>`,
    );
    const { root } = await cdp.send("DOM.getDocument");
    const { nodeId } = await cdp.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: "#sample",
    });
    const result = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    actual.push({ requested: family, fonts: result.fonts });
    assert(
      result.fonts.some((f) => f.familyName === family && f.glyphCount > 0),
      "Requested regular font must actually render",
    );
    assert(
      metrics.fonts[family + "|400"].maxAdvance -
        metrics.fonts[family + "|400"].minAdvance <
        0.001,
      "Natural monospaced advances",
    );
  }
  const files = [];
  for (const [family, path] of Object.entries(paths)) {
    const bytes = await readFile(path);
    files.push({
      family,
      path,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  metrics.environment = { browser: browser.version(), platformFonts: actual };
  metrics.fontFiles = files;
} finally {
  await browser.close();
}
await writeFile(
  "docs/research/prose-qr/phase-03/font-metrics.json",
  await format(JSON.stringify(metrics), { parser: "json" }),
  { flag: "wx" },
);
console.log(
  JSON.stringify({
    fonts: Object.keys(metrics.fonts),
    platformFonts: metrics.environment.platformFonts,
  }),
);
