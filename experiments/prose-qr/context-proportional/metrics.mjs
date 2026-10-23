import { chromium } from "playwright";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { format } from "prettier";
import assert from "node:assert/strict";
const root = "docs/research/prose-qr/phase-36/",
  source = "experiments/prose-qr/context-proportional/",
  out = root + "metrics-01/";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const words = {
  dark: ["BOB", "BOOM", "MUM", "MUMMY", "MMMM"],
  light: [
    "or",
    "us",
    "so",
    "as",
    "see",
    "sea",
    "one",
    "on",
    "area",
    "rare",
    "rue",
    "our",
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
    viewport: { width: 1100, height: 180 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<p id="sample" style="font:400 14px/14px 'Impact';margin:0;color:black;background:white">${Object.values(words).flat().join(" ")}</p>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const glyphs = await page.evaluate((words) => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    g.font = "400 14px 'Impact'";
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
  }, words);
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
  await writeFile(out + "letters.png", png, { flag: "wx" });
  const receipt = {
    at: new Date().toISOString(),
    font: "Impact",
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
    out + "metrics.json",
    await format(JSON.stringify(receipt), { parser: "json" }),
    { flag: "wx" },
  );
  assert(
    fonts.every((f) => f.familyName === "Impact"),
    "Font substitution",
  );
  console.log(
    JSON.stringify({
      font: "Impact",
      sample: 1,
      glyphs: Object.keys(glyphs).length,
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
