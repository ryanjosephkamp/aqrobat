import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { root, source, read, json, save, sha, sources } from "./common.mjs";
const out = root + "/dom-audit-01";
const captures = [
  ...(await read(root + "/context-01/captures.json")).filter((c) => !c.control),
  ...(await read(root + "/context-02/captures.json")).filter((c) => !c.control),
  ...(await read(root + "/coupling-01/results.json")).rows,
];
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  domReopens: captures.length,
  pngCaptures: 0,
  readerCalls: 0,
  sources: await sources([
    source + "/dom-audit.mjs",
    source + "/common.mjs",
    out + "/PLAN.md",
  ]),
});
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  rows = [];
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  page.setDefaultTimeout(30000);
  for (const c of captures) {
    const html = await readFile(c.dir + "/native.html", "utf8"),
      png = await readFile(c.pngPath);
    await page.setViewportSize({
      width: png.readUInt32BE(16),
      height: png.readUInt32BE(20),
    });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const d = await page.evaluate(() => {
      const artifact = document.querySelector("#artifact");
      const selection = window.getSelection();
      selection.selectAllChildren(artifact);
      const selectionText = selection.toString();
      selection.removeAllRanges();
      const walker = document.createTreeWalker(artifact, NodeFilter.SHOW_TEXT),
        canvas = document.createElement("canvas").getContext("2d"),
        glyphs = [];
      let node;
      while ((node = walker.nextNode())) {
        const style = getComputedStyle(node.parentElement);
        canvas.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const stroke = parseFloat(style.webkitTextStrokeWidth) || 0;
        for (let i = 0; i < node.length; i++) {
          const ch = node.textContent[i];
          if (/\s/.test(ch)) continue;
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const b = range.getBoundingClientRect(),
            m = canvas.measureText(ch),
            baseline = b.y + m.fontBoundingBoxAscent;
          glyphs.push({
            ch,
            rect: { x: b.x, y: b.y, width: b.width, height: b.height },
            ink: {
              left: b.x - m.actualBoundingBoxLeft - stroke / 2,
              right: b.x + m.actualBoundingBoxRight + stroke / 2,
              top: baseline - m.actualBoundingBoxAscent - stroke / 2,
              bottom: baseline + m.actualBoundingBoxDescent + stroke / 2,
            },
            font: canvas.font,
            stroke,
          });
        }
      }
      const pairs = [];
      for (let i = 0; i < glyphs.length; i++)
        for (let j = i + 1; j < glyphs.length; j++) {
          const a = glyphs[i],
            b = glyphs[j];
          if (
            Math.abs(a.rect.y - b.rect.y) > 0.1 ||
            Math.abs(a.rect.height - b.rect.height) > 0.1
          )
            continue;
          const [left, right] = a.rect.x < b.rect.x ? [a, b] : [b, a];
          if (
            right.rect.x - left.rect.x >
            Math.max(left.rect.width, right.rect.width) * 2 + 3
          )
            continue;
          const gap = right.ink.left - left.ink.right;
          if (gap < 0.25)
            pairs.push({
              a: left.ch,
              b: right.ch,
              gap,
              left: left.rect,
              right: right.rect,
            });
        }
      return {
        textContent: artifact.textContent,
        innerText: artifact.innerText,
        selectionText,
        glyphs,
        tightPairs: pairs,
      };
    });
    await save(out + "/" + c.id + "-raw.json.gz", gzipSync(JSON.stringify(d)));
    const savedText = await readFile(c.dir + "/native.txt", "utf8");
    const { glyphs, ...compact } = d;
    rows.push({
      id: c.id,
      source: c.dir + "/native.html",
      sourceSha256: sha(html),
      ...compact,
      sourceTextMatchesSaved: d.innerText === savedText,
      selectionMatchesSaved: d.selectionText === savedText,
      glyphsMeasured: glyphs.length,
      boundsMethodLimit:
        "Standalone glyph metric with DOM character ranges; conservative for shaping/ligatures/RTL. Not a pixel overlap or paste test.",
    });
  }
  await json(out + "/results.json", {
    at: new Date().toISOString(),
    domReopens: rows.length,
    pngCaptures: 0,
    readerCalls: 0,
    rows,
  });
  console.log(
    JSON.stringify(
      rows.map((r) => ({
        id: r.id,
        selectionMatchesSaved: r.selectionMatchesSaved,
        tightPairs: r.tightPairs.length,
        selectionPrefix: r.selectionText.slice(0, 110),
      })),
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
