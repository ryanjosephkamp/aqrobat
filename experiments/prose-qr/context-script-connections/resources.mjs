import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { root, source, sha, save, json, sources } from "./common.mjs";
import { nativeBinaryMetrics } from "./components.mjs";
import { ordinaryBinarize } from "../glyph-geometry/diagnostic.mjs";
const out = root + "metrics-01/",
  words = ["mum", "mow", "hum", "mummy", "ill", "lit", "lilt", "will"];
const fonts = [
  {
    name: "Snell Roundhand",
    postscript: "SnellRoundhand",
    lane: "regular-native-script",
  },
  {
    name: "Snell Roundhand Black",
    postscript: "SnellRoundhand-Black",
    lane: "intrinsically-heavy-native-script",
  },
];
await mkdir(out);
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  plannedMultirowResources: 32,
  plannedSingleRowResources: 32,
  plannedImmediateMultirowRepeats: 32,
  fonts,
  words,
  leadings: [24, 30],
  size: 24,
  sources: await sources([
    source + "resources.mjs",
    source + "components.mjs",
    source + "common.mjs",
    root + "PLAN.md",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  ]),
});
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  rows = [];
try {
  const page = await browser.newPage({
    viewport: { width: 640, height: 320 },
    deviceScaleFactor: 1,
  });
  for (const [fi, f] of fonts.entries())
    for (const leading of [24, 30])
      for (const [wi, word] of words.entries()) {
        const id = `f${fi + 1}-l${leading}-w${wi + 1}`,
          height = 8 * leading + 48;
        const css = `<style>@font-face{font-family:ScriptFace;src:local('${f.postscript}');font-weight:400;font-style:normal}html,body{margin:0;padding:0;background:white}</style>`;
        await page.setContent(css);
        await page.evaluate(() => document.fonts.load("400 24px ScriptFace"));
        const metrics = await page.evaluate((word) => {
          const c = document.createElement("canvas").getContext("2d");
          c.font = "400 24px ScriptFace";
          c.fontKerning = "normal";
          const measure = (s) => {
            const m = c.measureText(s);
            return {
              advance: m.width,
              left: m.actualBoundingBoxLeft,
              right: m.actualBoundingBoxRight,
              ascent: m.actualBoundingBoxAscent,
              descent: m.actualBoundingBoxDescent,
            };
          };
          return {
            word: measure(word),
            token: measure(word + " "),
            space: measure(" "),
            glyphs: Object.fromEntries(
              [...new Set(word)].map((c) => [c, measure(c)]),
            ),
          };
        }, word);
        const line = Array(Math.floor(590 / metrics.token.advance))
          .fill(word)
          .join(" ");
        const html = (text, h) =>
          `${css}<div id="tile" style="position:relative;background:white;width:640px;height:${h}px"><pre id="letters" style="position:absolute;left:24px;top:24px;margin:0;padding:0;font:400 24px/${leading}px ScriptFace;letter-spacing:0;font-kerning:normal;font-variant-ligatures:normal;white-space:pre;color:black">${text}</pre></div>`;
        const singleHTML = html(line, 128);
        await save(out + id + "-single.html.gz", gzipSync(singleHTML));
        await page.setContent(singleHTML);
        await page.evaluate(() => document.fonts.ready);
        const single = await page.locator("#tile").screenshot(),
          singlePath = out + id + "-single.png";
        await save(singlePath, single);
        const multiHTML = html(Array(8).fill(line).join("\n"), height);
        await save(out + id + "-multi.html.gz", gzipSync(multiHTML));
        await page.setContent(multiHTML);
        await page.evaluate(() => document.fonts.ready);
        const native = await page.locator("#letters").evaluate((e, length) => {
          const r = document.createRange();
          r.setStart(e.firstChild, 0);
          r.setEnd(e.firstChild, length);
          const c = getComputedStyle(e),
            b = e.getBoundingClientRect();
          return {
            tokenWidth: r.getBoundingClientRect().width,
            width: b.width,
            height: b.height,
            childElements: e.children.length,
            size: c.fontSize,
            weight: c.fontWeight,
            leading: c.lineHeight,
            tracking: c.letterSpacing,
            kerning: c.fontKerning,
            ligatures: c.fontVariantLigatures,
          };
        }, word.length + 1);
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
        const path = out + id + "-multi.png",
          png = await page.locator("#tile").screenshot();
        await save(path, png);
        const repeat = await page.locator("#tile").screenshot(),
          repeatExact = sha(repeat) === sha(png);
        if (!repeatExact) await save(out + id + "-repeat.png", repeat);
        const rgba = execFileSync(
          "python3",
          [
            "-c",
            "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
            path,
          ],
          { maxBuffer: 2000000 },
        );
        assert.equal(rgba.length, 640 * height * 4);
        const bin = ordinaryBinarize({
            data: new Uint8ClampedArray(rgba),
            width: 640,
            height,
          }),
          binary = nativeBinaryMetrics(bin);
        const overlap = JSON.parse(
          execFileSync(
            "python3",
            [
              "-c",
              "import cv2,numpy as np,json,sys;a=cv2.imread(sys.argv[1],0);g=cv2.imread(sys.argv[2],0);s=int(sys.argv[3]);m=a<128;ink=int(m.sum());hit=int(np.logical_and(m[:-s],m[s:]).sum());ys,xs=np.where(g<250);print(json.dumps({'singleRowInkPixels':ink,'interlineIntersectionPixels':hit,'intersectionFraction':hit/ink if ink else None,'multiInkBounds':[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())] if len(xs) else None,'classification':'Native single-row source overlap diagnostic only; never reader input'}))",
              singlePath,
              path,
              String(leading),
            ],
            { encoding: "utf8" },
          ),
        );
        const reasons = [];
        if (
          !platformFonts.length ||
          platformFonts.some((fnt) => fnt.postScriptName !== f.postscript)
        )
          reasons.push("Font substitution");
        if (
          overlap.intersectionFraction === null ||
          overlap.intersectionFraction > 0.01
        )
          reasons.push("Native adjacent-row ink intersection above 1%");
        const bounds = overlap.multiInkBounds;
        if (
          !bounds ||
          bounds[0] < 2 ||
          bounds[1] < 2 ||
          bounds[2] > 637 ||
          bounds[3] > height - 3
        )
          reasons.push("Native ink clipped at tile boundary");
        if (
          Math.abs(native.tokenWidth - metrics.token.advance) > 0.1 ||
          native.width > 616 ||
          native.childElements ||
          !repeatExact
        )
          reasons.push("Native advance/overflow/markup/repeat failure");
        const row = {
          id,
          font: f,
          word,
          pool: wi < 4 ? "dark" : "light",
          size: 24,
          leading,
          metrics,
          native,
          platformFonts,
          pngPath: path,
          pngSha256: sha(png),
          rgbaSha256: sha(rgba),
          singlePath,
          singleSha256: sha(single),
          repeatExact,
          repeatSha256: sha(repeat),
          overlap,
          binary,
          reasons,
          rejected: !!reasons.length,
        };
        await json(out + id + ".json", row);
        rows.push(row);
        console.log(
          JSON.stringify({
            id,
            occupancy: binary.occupancy,
            component: binary.largestBalancedSpanComponent,
            overlap: overlap.intersectionFraction,
            reasons,
          }),
        );
      }
  const candidates = [];
  for (const f of fonts)
    for (const d of rows.filter(
      (r) => r.font.name === f.name && r.leading === 24 && r.pool === "dark",
    ))
      for (const l of rows.filter(
        (r) => r.font.name === f.name && r.leading === 24 && r.pool === "light",
      )) {
        const c = d.binary.largestBalancedSpanComponent,
          margin = d.binary.occupancy - l.binary.occupancy;
        candidates.push({
          font: f,
          dark: d.id,
          light: l.id,
          darkWord: d.word,
          lightWord: l.word,
          margin,
          component: c,
          eligible:
            !d.rejected &&
            !l.rejected &&
            margin >= 0.08 &&
            !!c &&
            c.minimumSpan >= 48 &&
            c.balance >= 0.35,
          mechanicalRejections: [...d.reasons, ...l.reasons],
        });
      }
  const eligible = candidates
    .filter((c) => c.eligible)
    .sort(
      (a, b) =>
        b.component.minimumSpan - a.component.minimumSpan ||
        b.margin - a.margin,
    );
  const selected = eligible[0] ?? null;
  await json(out + "summary.json", {
    at: new Date().toISOString(),
    plannedMultirowResources: 32,
    completedMultirowResources: rows.length,
    completedSingleRowResources: rows.length,
    exactImmediateRepeats: rows.filter((r) => r.repeatExact).length,
    rejections: rows
      .filter((r) => r.rejected)
      .map((r) => ({ id: r.id, reasons: r.reasons })),
    candidates,
    eligiblePairs: eligible.length,
    selected,
    conditionalNativeSlots: selected
      ? "pending visual check and concrete recipe preregistration"
      : "both unattempted",
    largestMeasuredMinimumSpan: Math.max(
      ...rows.map(
        (r) => r.binary.largestBalancedSpanComponent?.minimumSpan ?? 0,
      ),
    ),
    goal: "unsolved",
    phoneCandidates: 0,
    sources: await sources([
      source + "resources.mjs",
      source + "components.mjs",
      source + "common.mjs",
      root + "PLAN.md",
    ]),
  });
  console.log(
    JSON.stringify({
      completed: rows.length,
      selected,
      largestMinimumSpan: Math.max(
        ...rows.map(
          (r) => r.binary.largestBalancedSpanComponent?.minimumSpan ?? 0,
        ),
      ),
    }),
  );
} catch (e) {
  await json(out + "error.json", {
    error: e.stack,
    completedMultirowResources: rows.length,
    plannedMultirowResources: 32,
    unattemptedMultirowResources: 32 - rows.length,
  });
  throw e;
} finally {
  await browser.close();
}
