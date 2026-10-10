import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  root,
  source,
  json,
  save,
  sha,
  sources,
  checkTime,
} from "./common.mjs";
import { ordinaryBinarize } from "../glyph-geometry/diagnostic.mjs";
checkTime();
const out = root + "/coupling-01";
const baseline =
  "Readers can read a page and notice how each letter shares space with its neighbors. Small changes in a word can shift the rest of a line. The experiment keeps the paragraph visible while measuring which parts of the image actually change. Clear writing and an exact message must fit on the same page.";
const specs = [
  { id: "baseline", text: baseline },
  { id: "read-to-scan", text: baseline.replace("can read a", "can scan a") },
  {
    id: "small-to-minor",
    text: baseline.replace("Small changes", "Minor changes"),
  },
];
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  specs,
  fullNativeProposals: 3,
  repeats: 3,
  ordinaryReaderSlots: 0,
  binarizerDiagnostics: 3,
  sources: await sources([
    source + "/coupling.mjs",
    source + "/common.mjs",
    out + "/PLAN.md",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  ]),
});
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  rows = [];
let current;
try {
  const page = await browser.newPage({
    viewport: { width: 464, height: 464 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(30000);
  for (const spec of specs) {
    current = spec.id;
    const dir = out + "/" + spec.id;
    await mkdir(dir);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:Body;src:local('ArialMT')}html,body{margin:0;background:white;color:black}#artifact{width:464px;height:464px;position:relative}p{position:absolute;left:32px;top:32px;width:400px;margin:0;font:18px/27px Body}</style></head><body><article id="artifact"><p id="text">${spec.text}</p></article></body></html>`;
    await save(dir + "/native.html", html);
    await save(dir + "/native.txt", spec.text);
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const dom = await page.locator("#text").evaluate((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      const c = document.createElement("canvas").getContext("2d");
      c.font = "18px Body";
      const metrics = Object.fromEntries(
        [...new Set(e.textContent)].map((ch) => {
          const m = c.measureText(ch);
          return [
            ch,
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
      return {
        text: e.textContent,
        lines: [...range.getClientRects()].map((b) => ({
          x: b.x,
          y: b.y,
          width: b.width,
          height: b.height,
        })),
        metrics,
      };
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = await cdp.send("DOM.getDocument");
    const node = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "#text",
    });
    const fonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    await cdp.detach();
    const m = Object.values(dom.metrics),
      rowClearance =
        27 -
        Math.max(...m.map((a) => a.ascent)) -
        Math.max(...m.map((a) => a.descent)),
      reasons = [];
    if (!fonts.length || fonts.some((f) => f.postScriptName !== "ArialMT"))
      reasons.push("Font substitution");
    if (
      dom.lines.some(
        (b) =>
          b.x < 32 || b.y < 0 || b.x + b.width > 432.01 || b.y + b.height > 432,
      )
    )
      reasons.push("Clipping/overflow");
    if (rowClearance < 0.25) reasons.push("Row clearance");
    if (dom.text !== spec.text) reasons.push("Text identity");
    const png = await page.locator("#artifact").screenshot();
    await save(dir + "/native.png", png);
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const repeat = await page.locator("#artifact").screenshot();
    if (sha(repeat) !== sha(png)) {
      await save(dir + "/repeat.png", repeat);
      reasons.push("Repeat mismatch");
    }
    const row = {
      ...spec,
      dir,
      pngPath: dir + "/native.png",
      pngSha256: sha(png),
      repeatSha256: sha(repeat),
      repeatExact: sha(png) === sha(repeat),
      dom,
      fonts,
      rowClearance,
      reasons,
      rejected: reasons.length > 0,
      payload: null,
      classification:
        "Plain regular Latin native body-feasibility source; no finder, QR matrix or payload",
    };
    await json(dir + "/capture.json", row);
    rows.push(row);
  }
} catch (e) {
  await json(out + "/capture-error.json", { current, error: e.stack });
  throw e;
} finally {
  await browser.close();
}
const pictures = rows.map((c) => {
  const raw = execFileSync(
      "python3",
      [
        "-c",
        "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
        c.pngPath,
      ],
      { maxBuffer: 1000000, timeout: 10000 },
    ),
    p = { width: 464, height: 464, data: new Uint8ClampedArray(raw) };
  return { p, bin: ordinaryBinarize(p), rgbaSha256: sha(raw) };
});
const comparisons = [];
const pitch = 33 / 7;
for (let i = 1; i < rows.length; i++) {
  const changedRGBA = [],
    changedBinary = [],
    touched = new Set(),
    centerChanges = [];
  for (let y = 0; y < 464; y++)
    for (let x = 0; x < 464; x++) {
      const k = 4 * (y * 464 + x);
      if (pictures[0].p.data[k] !== pictures[i].p.data[k])
        changedRGBA.push([x, y]);
      if (pictures[0].bin.get(x, y) !== pictures[i].bin.get(x, y)) {
        changedBinary.push([x, y]);
        const gx = Math.floor((x - 32) / pitch),
          gy = Math.floor((y - 32) / pitch);
        if (gx >= 0 && gy >= 0 && gx < 85 && gy < 85)
          touched.add(gx + "," + gy);
      }
    }
  for (let gy = 0; gy < 85; gy++)
    for (let gx = 0; gx < 85; gx++) {
      const x = Math.floor(32 + (gx + 0.5) * pitch),
        y = Math.floor(32 + (gy + 0.5) * pitch);
      if (pictures[0].bin.get(x, y) !== pictures[i].bin.get(x, y))
        centerChanges.push([gx, gy]);
    }
  const bounds = (a) =>
    a.length
      ? {
          left: Math.min(...a.map((p) => p[0])),
          top: Math.min(...a.map((p) => p[1])),
          right: Math.max(...a.map((p) => p[0])),
          bottom: Math.max(...a.map((p) => p[1])),
        }
      : null;
  comparisons.push({
    id: rows[i].id,
    binaryLexicalChoiceBits: 1,
    changedGrayPixels: changedRGBA.length,
    changedGrayBounds: bounds(changedRGBA),
    changedBinaryPixels: changedBinary.length,
    changedBinaryBounds: bounds(changedBinary),
    sourceGridTouchedCells: touched.size,
    sourceGridCenterChanges: centerChanges.length,
    touchedCells: [...touched].map((s) => s.split(",").map(Number)),
    centerChanges,
    warning:
      "Touched samples move together under this one text edit. Counts are not independent controllable bits or decoded payload.",
  });
}
await json(out + "/results.json", {
  at: new Date().toISOString(),
  nativeProposals: 3,
  nativeRepeats: 3,
  ordinaryReaderSlots: 0,
  binarizerDiagnostics: 3,
  sourceGrid: { pitch, dimension: 85, origin: [32, 32] },
  rows: rows.map((r, i) => ({ ...r, rgbaSha256: pictures[i].rgbaSha256 })),
  comparisons,
});
console.log(
  JSON.stringify(
    comparisons.map(({ touchedCells, centerChanges, ...r }) => r),
    null,
    2,
  ),
);
