import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  root,
  source,
  sha,
  json,
  save,
  sources,
  checkTime,
} from "./common.mjs";
import { ordinaryBinarize } from "../glyph-geometry/diagnostic.mjs";
import { geometricRuns } from "../context-letter-counters/geometry.mjs";
import { runMetric } from "../finder-runs/probe.mjs";
checkTime();
const out = root + "/resources-02";
const specs = [
  ["silom-p", "Silom", "P"],
  ["hebrew-mem", "ArialHebrew-Bold", "ם"],
].map(([id, font, symbol]) => ({ id, font, symbol, size: 64, stroke: 4 }));
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  specs,
  resourceRenders: 4,
  sources: await sources([
    source + "/resources-02.mjs",
    source + "/stem-runs.py",
    source + "/common.mjs",
    out + "/PLAN.md",
    "experiments/prose-qr/outline-counter-appendages/holes.py",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
    "experiments/prose-qr/context-letter-counters/geometry.mjs",
    "experiments/prose-qr/finder-runs/probe.mjs",
  ]),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
let current = null;
const rows = [];
try {
  const page = await browser.newPage({
    viewport: { width: 256, height: 192 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(30000);
  for (const spec of specs) {
    current = spec.id;
    const dir = out + "/" + spec.id;
    await mkdir(dir);
    let filledHoles = null;
    const renders = [];
    for (const filled of [true, false]) {
      const name = filled ? "filled" : "outline";
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:Target;src:local('${spec.font}')}html,body{margin:0;background:white}#artifact{width:256px;height:192px;position:relative}#text{position:absolute;left:48px;top:32px;font:64px/96px Target;font-kerning:none;color:${filled ? "black" : "white"};-webkit-text-stroke:${filled ? 0 : spec.stroke}px black;margin:0}</style></head><body><div id="artifact"><span id="text">${spec.symbol}</span></div></body></html>`;
      await save(dir + "/" + name + ".html", html);
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const dom = await cdp.send("DOM.getDocument");
      const node = await cdp.send("DOM.querySelector", {
        nodeId: dom.root.nodeId,
        selector: "#text",
      });
      const fonts = (
        await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
      ).fonts;
      await cdp.detach();
      const native = await page.locator("#text").evaluate((e) => {
        const r = document.createRange();
        r.selectNodeContents(e);
        const b = r.getBoundingClientRect();
        const c = document.createElement("canvas").getContext("2d");
        c.font = "64px Target";
        const m = c.measureText(e.textContent);
        return {
          rect: { left: b.left, top: b.top, width: b.width, height: b.height },
          advance: m.width,
          ascent: m.actualBoundingBoxAscent,
          descent: m.actualBoundingBoxDescent,
          left: m.actualBoundingBoxLeft,
          right: m.actualBoundingBoxRight,
        };
      });
      const png = await page.locator("#artifact").screenshot();
      await save(dir + "/" + name + ".png", png);
      const args = [
        "experiments/prose-qr/outline-counter-appendages/holes.py",
        dir + "/" + name + ".png",
      ];
      if (!filled && filledHoles?.selected)
        args.push(JSON.stringify(filledHoles.selected.center));
      const holes = JSON.parse(
        execFileSync("python3", args, { encoding: "utf8", timeout: 10000 }),
      );
      if (filled) {
        filledHoles = holes;
        if (holes.selected) {
          spec.stemModel = JSON.parse(
            execFileSync(
              "python3",
              [
                source + "/stem-runs.py",
                dir + "/" + name + ".png",
                JSON.stringify(holes.selected.center),
              ],
              { encoding: "utf8", timeout: 10000 },
            ),
          );
          spec.stroke = spec.stemModel.stroke;
        }
      }
      const reasons = [];
      if (spec.stroke < 1 || spec.stroke > 12)
        reasons.push("Source outline outside declared range");
      if (!fonts.length || fonts.some((f) => f.postScriptName !== spec.font))
        reasons.push("Font substitution");
      if (!holes.selected) reasons.push("No enclosed counter");
      if (
        holes.inkBounds?.some((v, i) => v < 2 || v > (i % 2 === 0 ? 253 : 189))
      )
        reasons.push("Clipped glyph");
      let model = null;
      if (!filled && filledHoles?.selected && holes.selected) {
        const data = execFileSync(
          "python3",
          [
            "-c",
            "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
            dir + "/" + name + ".png",
          ],
          { maxBuffer: 1000000, timeout: 10000 },
        );
        const bin = ordinaryBinarize({
          data: new Uint8ClampedArray(data),
          width: 256,
          height: 192,
        });
        const inv = { width: 256, height: 192, get: (x, y) => !bin.get(x, y) };
        const point = {
          x: Math.round(holes.selected.center[0]),
          y: Math.round(holes.selected.center[1]),
        };
        const runs = geometricRuns(inv, point),
          metric = runMetric(runs);
        model = {
          point,
          runs,
          metric,
          completeRunPitch:
            (metric.axes.horizontal.scale + metric.axes.vertical.scale) / 2,
          counterOnlyPitch:
            (holes.selected.bounds[2] + holes.selected.bounds[3]) / 6,
          boundBalance:
            Math.min(...holes.selected.bounds.slice(2)) /
            Math.max(...holes.selected.bounds.slice(2)),
          offset: {
            x: holes.selected.center[0] - native.rect.left,
            y: holes.selected.center[1] - native.rect.top,
          },
          rgbaSha256: sha(data),
        };
      }
      renders.push({
        name,
        pngSha256: sha(png),
        fonts,
        native,
        holes,
        reasons,
        model,
      });
    }
    const row = { ...spec, renders };
    await json(dir + "/result.json", row);
    rows.push(row);
    console.log(JSON.stringify({ id: spec.id, outline: row.renders[1].model }));
  }
  await json(out + "/results.json", {
    at: new Date().toISOString(),
    resourceRenders: 4,
    rows,
  });
} catch (e) {
  await json(out + "/error.json", {
    current,
    error: e.stack,
    completedCases: rows.length,
  });
  throw e;
} finally {
  await browser.close();
}
