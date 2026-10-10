import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { root, source, sha, save, json, sources } from "./common.mjs";
import { ordinaryBinarize } from "../glyph-geometry/diagnostic.mjs";
const out = root + "metrics-01/";
const fonts = [
  { name: "Monaco", postscript: "Monaco", lane: "regular-body-font" },
  { name: "Impact", postscript: "Impact", lane: "intrinsically-heavy-font" },
  {
    name: "Phosphate Solid",
    postscript: "Phosphate-Solid",
    lane: "intrinsically-heavy-font",
  },
];
const words = [
  "MOM",
  "MUM",
  "MOWN",
  "HUM",
  "WHOM",
  "ill",
  "tilt",
  "lilt",
  "lit",
  "Ili",
];
const alphabet = [...new Set(words.join("") + " ")];
await mkdir(out);
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  plannedResources: 60,
  plannedImmediateRepeats: 60,
  fonts,
  words,
  clearances: [0.25, 2],
  size: 20,
  tracking: 0,
  sources: await sources([
    source + "resources.mjs",
    source + "common.mjs",
    root + "PLAN.md",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  ]),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const rows = [];
function nativeBinaryMetrics(bin) {
  const w = bin.width,
    h = bin.height,
    seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h);
  let ink = 0,
    area = 0,
    emptyRows = 0,
    components = 0,
    largest = null;
  for (let y = 25; y < h - 25; y++) {
    let rowInk = 0;
    for (let x = 25; x < w - 25; x++) {
      rowInk += bin.get(x, y) ? 1 : 0;
      area++;
    }
    ink += rowInk;
    if (!rowInk) emptyRows++;
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const pos = y * w + x;
      if (seen[pos] || !bin.get(x, y)) continue;
      let head = 0,
        tail = 1,
        minX = x,
        maxX = x,
        minY = y,
        maxY = y;
      seen[pos] = 1;
      queue[0] = pos;
      while (head < tail) {
        const p = queue[head++],
          px = p % w,
          py = Math.floor(p / w);
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = px + dx,
              yy = py + dy,
              pp = yy * w + xx;
            if (
              xx < 0 ||
              yy < 0 ||
              xx >= w ||
              yy >= h ||
              seen[pp] ||
              !bin.get(xx, yy)
            )
              continue;
            seen[pp] = 1;
            queue[tail++] = pp;
          }
      }
      components++;
      const c = {
        pixels: tail,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        bounds: [minX, minY, maxX, maxY],
      };
      c.minimumSpan = Math.min(c.width, c.height);
      c.balance = c.minimumSpan / Math.max(c.width, c.height);
      if (
        !largest ||
        c.minimumSpan > largest.minimumSpan ||
        (c.minimumSpan === largest.minimumSpan && c.pixels > largest.pixels)
      )
        largest = c;
    }
  return {
    occupancy: ink / area,
    ink,
    area,
    emptyRows,
    measuredRows: h - 50,
    components,
    largestBalancedSpanComponent: largest,
    classification:
      "Actual unchanged native jsQR binarization of a word resource; not a finder or reader recovery",
  };
}
try {
  const page = await browser.newPage({
    viewport: { width: 640, height: 260 },
    deviceScaleFactor: 1,
  });
  for (const [fi, f] of fonts.entries()) {
    await page.setContent(
      `<style>@font-face{font-family:ResourceFace;src:local('${f.postscript}');font-weight:400;font-style:normal}</style>`,
    );
    await page.evaluate(() => document.fonts.load("400 20px ResourceFace"));
    const glyphs = await page.evaluate((alphabet) => {
      const g = document.createElement("canvas").getContext("2d");
      g.font = "400 20px ResourceFace";
      g.fontKerning = "none";
      return Object.fromEntries(
        alphabet.map((c) => {
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
    }, alphabet);
    const envelope =
      Math.max(...Object.values(glyphs).map((g) => g.ascent)) +
      Math.max(...Object.values(glyphs).map((g) => g.descent));
    for (const clearance of [0.25, 2])
      for (const [wi, word] of words.entries()) {
        const id = `f${fi + 1}-c${clearance === 0.25 ? 1 : 2}-w${wi + 1}`;
        const leading = Math.ceil((envelope + clearance) * 64) / 64;
        const wordWidth = [...word].reduce((s, c) => s + glyphs[c].advance, 0),
          tokenWidth = wordWidth + glyphs[" "].advance;
        const line = Array(Math.floor(630 / tokenWidth))
            .fill(word)
            .join(" "),
          text = Array(10).fill(line).join("\n"),
          height = Math.ceil(10 * leading + 8);
        const html = `<style>@font-face{font-family:ResourceFace;src:local('${f.postscript}');font-weight:400;font-style:normal}html,body{margin:0;padding:0;background:white}</style><div id="tile" style="position:relative;width:640px;height:${height}px;background:white"><pre id="letters" style="position:absolute;left:2px;top:2px;margin:0;padding:0;font:400 20px/${leading}px ResourceFace;letter-spacing:0;font-kerning:none;font-variant-ligatures:none;white-space:pre;color:black">${text}</pre></div>`;
        await save(out + id + ".html.gz", gzipSync(html));
        await page.setContent(html);
        await page.evaluate(() => document.fonts.ready);
        const native = await page.locator("#letters").evaluate((e) => {
          const c = getComputedStyle(e),
            r = e.getBoundingClientRect();
          return {
            size: c.fontSize,
            leading: c.lineHeight,
            tracking: c.letterSpacing,
            weight: c.fontWeight,
            color: c.color,
            width: r.width,
            height: r.height,
            childElements: e.children.length,
          };
        });
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
        const png = await page.locator("#tile").screenshot(),
          path = out + id + ".png";
        await save(path, png);
        const repeat = await page.locator("#tile").screenshot(),
          repeatExact = sha(repeat) === sha(png);
        if (!repeatExact) await save(out + id + "-repeat.png", repeat);
        const rgba = execFileSync(
          "python3",
          [
            "-c",
            "import cv2,sys; a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
            path,
          ],
          { maxBuffer: 2000000 },
        );
        assert.equal(rgba.length, 640 * height * 4);
        const p = { data: new Uint8ClampedArray(rgba), width: 640, height },
          bin = ordinaryBinarize(p),
          binary = nativeBinaryMetrics(bin);
        const replica = JSON.parse(
          execFileSync(
            "python3",
            [
              "-c",
              "import cv2,json,sys;g=cv2.imread(sys.argv[1],0);b=cv2.adaptiveThreshold(g,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,83,2);print(json.dumps({'ink':float((255-g[25:-25,25:-25]).mean()/255),'binaryOccupancy':float((b[25:-25,25:-25]==0).mean()),'classification':'Separate full-resolution threshold replica; never reader input'}))",
              path,
            ],
            { encoding: "utf8" },
          ),
        );
        let minGap = Infinity;
        for (let i = 1; i < word.length; i++)
          minGap = Math.min(
            minGap,
            glyphs[word[i - 1]].advance -
              glyphs[word[i - 1]].right -
              glyphs[word[i]].left,
          );
        const reasons = [];
        if (
          !platformFonts.length ||
          platformFonts.some((g) => g.postScriptName !== f.postscript)
        )
          reasons.push("Font identity substitution");
        if (minGap < 0) reasons.push("Adjacent ink-bounds overlap");
        if (leading - envelope < clearance - 0.02)
          reasons.push("Row clearance below preregistered value");
        if (
          native.width > 638 ||
          native.height > height - 2 ||
          native.childElements ||
          !repeatExact
        )
          reasons.push("Native overflow/markup/repeat failure");
        const row = {
          id,
          font: f,
          word,
          pool: wi < 5 ? "dark" : "light",
          clearance,
          leading,
          envelope,
          wordWidth,
          tokenWidth,
          minGap,
          glyphs,
          native,
          platformFonts,
          pngPath: path,
          pngSha256: sha(png),
          rgbaSha256: sha(rgba),
          repeatSha256: sha(repeat),
          repeatExact,
          binary,
          replica,
          reasons,
          rejected: reasons.length > 0,
          sourceHTMLSha256: sha(gzipSync(html)),
        };
        await json(out + id + ".json", row);
        rows.push(row);
        console.log(
          JSON.stringify({
            resource: id,
            font: f.name,
            word,
            occupancy: binary.occupancy,
            minGap,
            rejected: row.rejected,
          }),
        );
      }
  }
  const candidates = [];
  for (const f of fonts)
    for (const d of rows.filter(
      (r) =>
        r.font.name === f.name &&
        r.clearance === 0.25 &&
        r.pool === "dark" &&
        !r.rejected,
    ))
      for (const l of rows.filter(
        (r) =>
          r.font.name === f.name &&
          r.clearance === 0.25 &&
          r.pool === "light" &&
          !r.rejected,
      ))
        candidates.push({
          font: f,
          dark: d.id,
          light: l.id,
          darkWord: d.word,
          lightWord: l.word,
          margin: d.binary.occupancy - l.binary.occupancy,
          darkOccupancy: d.binary.occupancy,
          lightOccupancy: l.binary.occupancy,
        });
  candidates.sort((a, b) => b.margin - a.margin);
  const best = candidates[0] ?? null,
    selected = best && best.margin >= 0.1 ? best : null;
  await json(out + "summary.json", {
    at: new Date().toISOString(),
    plannedResources: 60,
    completedResources: rows.length,
    immediateRepeats: rows.filter((r) => r.repeatExact).length,
    rejections: rows
      .filter((r) => r.rejected)
      .map((r) => ({ id: r.id, reasons: r.reasons })),
    candidates,
    best,
    selected,
    ownerLegibility: "untested",
    agentLegibility: "pending selected resource inspection",
    finderSlots: selected
      ? "conditional, pending agent legibility"
      : "both unattempted",
    sources: await sources([
      source + "resources.mjs",
      source + "common.mjs",
      root + "PLAN.md",
    ]),
  });
  console.log(JSON.stringify({ completed: rows.length, best, selected }));
} catch (e) {
  await json(out + "error.json", {
    error: e.stack,
    completed: rows.length,
    planned: 60,
    unattempted: 60 - rows.length,
  });
  throw e;
} finally {
  await browser.close();
}
