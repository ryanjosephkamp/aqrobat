import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { format } from "prettier";
import { documentHtml, escapeHtml } from "../layout.mjs";
const root = "docs/research/prose-qr/phase-09/fonts-01/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
await mkdir(root);
const fonts = [
  "Impact",
  "Monaco",
  "Arial Black",
  "Gill Sans Ultra Bold",
  "Gill Sans",
  "Cooper Black",
  "Futura",
  "Helvetica Neue",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "PingFang SC",
];
const html = await format(
  documentHtml(
    `<article id="artifact" style="background:white;color:black;width:600px;padding:16px">${fonts.map((f, i) => `<div style="margin-bottom:12px"><div style="font:12px Arial">${escapeHtml(f)}</div><pre id="f${i}" style="margin:0;font:400 20px/26px '${f}',monospace;font-kerning:none;font-variant-ligatures:none">RUM MUM @ 8</pre></div>`).join("")}</article>`,
  ),
  { parser: "html" },
);
await writeFile(root + "source.html.gz", gzipSync(html), { flag: "wx" });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 800, height: 1200 },
  });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument"),
    rows = [];
  for (let i = 0; i < fonts.length; i++) {
    const node = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "#f" + i,
    });
    const platform = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    const metrics = await page.locator("#f" + i).evaluate((e) => {
      const s = getComputedStyle(e),
        c = document.createElement("canvas").getContext("2d");
      c.font = `400 20px ${s.fontFamily}`;
      c.fontKerning = "none";
      return Object.fromEntries(
        [...new Set(e.textContent)].map((ch) => {
          const m = c.measureText(ch);
          return [
            ch,
            {
              width: m.width,
              left: m.actualBoundingBoxLeft,
              right: m.actualBoundingBoxRight,
              ascent: m.actualBoundingBoxAscent,
              descent: m.actualBoundingBoxDescent,
            },
          ];
        }),
      );
    });
    rows.push({ requested: fonts[i], platform, metrics });
  }
  const png = await page.locator("#artifact").screenshot();
  await writeFile(root + "inventory.png", png, { flag: "wx" });
  const receipt = {
    at: new Date().toISOString(),
    sources: Object.fromEntries(
      await Promise.all(
        [
          "experiments/prose-qr/finder-runs/fonts.mjs",
          "docs/research/prose-qr/phase-09/PLAN-02.md",
        ].map(async (p) => [p, sha(await readFile(p))]),
      ),
    ),
    htmlSha256: sha(gzipSync(html)),
    pngSha256: sha(png),
    rows,
    nativeFinderCaptures: 0,
  };
  await writeFile(
    root + "inventory.json",
    await format(JSON.stringify(receipt), { parser: "json" }),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify(
      rows.map((r) => ({ requested: r.requested, platform: r.platform })),
    ),
  );
} catch (e) {
  await writeFile(root + "aborted.json", JSON.stringify({ error: e.stack }), {
    flag: "wx",
  });
  throw e;
} finally {
  await browser.close();
}
