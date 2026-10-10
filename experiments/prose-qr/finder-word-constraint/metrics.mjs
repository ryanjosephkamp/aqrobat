import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
const root = "docs/research/prose-qr/phase-17/",
  out = root + "metrics-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(out);
const words = {
  dark: "BOB BOBBY BEE BODE ODD DEED BED BUD BOO BOOM mom moon mood wood home minimum mammal".split(
    " ",
  ),
  light: "i ill it if lit till lilt".split(" "),
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
      viewport: { width: 1200, height: 400 },
      deviceScaleFactor: 1,
    }),
    fonts = {};
  for (const [font, size] of [
    ["Impact", 20],
    ["Monaco", 14],
  ]) {
    await page.setContent(
      `<p style="font:400 ${size}px/24px '${font}';color:black;background:white">${words.dark.join(" ")} ${words.light.join(" ")}</p>`,
    );
    await page.evaluate(() => document.fonts.ready);
    const glyphs = await page.evaluate(
      ({ font, words, size }) => {
        const c = document.createElement("canvas");
        c.width = 64;
        c.height = 64;
        const g = c.getContext("2d");
        g.font = `400 ${size}px '${font}'`;
        g.fontKerning = "none";
        return Object.fromEntries(
          [...new Set(Object.values(words).flat().join(" "))].map((char) => {
            g.clearRect(0, 0, 64, 64);
            g.fillStyle = "white";
            g.fillRect(0, 0, 64, 64);
            g.fillStyle = "black";
            g.fillText(char, 8, 40);
            const m = g.measureText(char),
              data = g.getImageData(0, 0, 64, 64).data;
            let inkMass = 0;
            for (let i = 0; i < data.length; i += 4)
              inkMass += (255 - data[i]) / 255;
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
      { font, words, size },
    );
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = await cdp.send("DOM.getDocument"),
      node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: "p",
      });
    const platformFonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    await cdp.detach();
    fonts[font] = { glyphs, platformFonts };
  }
  await writeFile(
    out + "metrics.json",
    await format(
      JSON.stringify({
        at: new Date().toISOString(),
        words,
        fonts,
        sources: Object.fromEntries(
          await Promise.all(
            [
              "experiments/prose-qr/finder-word-constraint/metrics.mjs",
              root + "PLAN.md",
            ].map(async (p) => [p, sha(await readFile(p))]),
          ),
        ),
      }),
      { parser: "json" },
    ),
    { flag: "wx" },
  );
} finally {
  await browser.close();
}
