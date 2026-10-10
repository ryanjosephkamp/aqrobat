import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  root,
  source,
  read,
  json,
  save,
  sha,
  sources,
  checkTime,
} from "./common.mjs";
checkTime();
const out = root + "/context-01";
const specs = [
  {
    id: "copperplate",
    resource: "copperplate-o",
    symbol: "O",
    word: "Only",
    dimension: 85,
    font: "Copperplate-Bold",
    texts: [
      [
        "nce a page is printed, its letters become small shapes of ink. We read those shapes as words, while a camera measures their light and dark edges. This study asks whether both readers can use the same honest page.",
        "",
      ],
      [
        "ur first duty is to keep the writing clear. A larger opening letter can mark a new paragraph, but the smaller body still needs room to breathe. Spaces, punctuation, and the rhythm of a sentence belong to the design.",
        "",
      ],
      [
        "ften a promising pattern fails when the whole page is examined. We save that failure because it tells us which assumption to question next. A useful result must preserve the message and survive an ordinary scan.",
        "",
      ],
    ],
  },
  {
    id: "arial-g",
    resource: "arial-g",
    symbol: "g",
    word: "gift",
    dimension: 97,
    font: "Arial-BoldMT",
    texts: [
      [
        "ive a reader a clear page and a little time. The letters carry a story through their shapes and spaces. Here the larger opening letter is a deliberate lowercase initial, and the rest of the sentence keeps its ordinary reading order.",
        "",
      ],
      [
        "ood evidence includes the attempts that did not work. A camera may find three promising marks and still read no message. Keeping the whole page unchanged lets another reader test exactly the same source.",
        "",
      ],
      [
        "rowth in this experiment means learning which constraint actually matters. The body needs enough freedom to carry a message, and every letter must remain visible. We will keep those two requirements together as the work continues.",
        "",
      ],
    ],
  },
];
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  specs,
  fullProposals: 4,
  repeats: 4,
  plannedPrimarySlots: 18,
  sources: await sources([
    source + "/context.mjs",
    source + "/common.mjs",
    out + "/PLAN.md",
    root + "/resources-01/results.json",
  ]),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const captures = [];
let current = null;
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 850 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(30000);
  for (const spec of specs)
    for (const article of [false, true]) {
      const id = spec.id + (article ? "-article" : "-sparse");
      current = id;
      const dir = out + "/" + id;
      await mkdir(dir);
      const res = await read(
          root + "/resources-01/" + spec.resource + "/result.json",
        ),
        r = res.renders.find((r) => r.name === "outline"),
        unit = r.model.completeRunPitch,
        distance = (spec.dimension - 7) * unit;
      const counters = [
        { x: 76, y: 130 },
        { x: 76 + distance, y: 130 },
        { x: 76, y: 130 + distance },
      ];
      const cssOffset = {
        x: r.holes.selected.center[0] - 48,
        y: r.holes.selected.center[1] - 32,
      };
      const blocks = counters
        .map((c, i) => {
          const text = article ? spec.texts[i][0] : spec.word.slice(1);
          return `<section class="block" style="left:${c.x - cssOffset.x}px;top:${c.y - cssOffset.y}px"><span class="initial" id="initial${i}">${spec.symbol}</span><p class="body" id="body${i}" style="padding-left:${r.native.advance + 8}px">${text}</p></section>`;
        })
        .join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Native prose structure study</title><style>@font-face{font-family:Target;src:local('${spec.font}')}@font-face{font-family:Body;src:local('ArialMT')}*{box-sizing:border-box}html,body{margin:0;background:white;color:black}#artifact{width:900px;height:850px;position:relative;background:white}.block{position:absolute;width:330px;height:320px}.initial{position:absolute;left:0;top:0;font:64px/96px Target;font-kerning:none;color:white;-webkit-text-stroke:4px black}.body{font:18px/27px Body;margin:0;padding-top:32px;white-space:normal}header{position:absolute;left:48px;top:30px;font:24px/32px Body}footer{position:absolute;left:48px;bottom:26px;font:14px/22px Body}</style></head><body><article id="artifact">${article ? "<header>One page, two ways to read</header>" : ""}${blocks}${article ? "<footer>Native text study · no encoded payload</footer>" : ""}</article></body></html>`;
      await save(dir + "/native.html", html);
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      const dom = await page.evaluate(
        ({ offset }) => {
          const initials = [...document.querySelectorAll(".initial")].map(
            (e) => {
              const range = document.createRange();
              range.selectNodeContents(e);
              const b = range.getBoundingClientRect();
              return {
                rect: { x: b.x, y: b.y, width: b.width, height: b.height },
                counter: { x: b.x + offset.x, y: b.y + offset.y },
                text: e.textContent,
              };
            },
          );
          const bodies = [...document.querySelectorAll(".body")].map((e) => {
            const range = document.createRange();
            range.selectNodeContents(e);
            return {
              text: e.textContent,
              rects: [...range.getClientRects()].map((b) => ({
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
              })),
            };
          });
          const c = document.createElement("canvas").getContext("2d");
          c.font = "18px Body";
          const bodyMetrics = Object.fromEntries(
            [...new Set(document.querySelector("#artifact").textContent)].map(
              (ch) => {
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
              },
            ),
          );
          return {
            initials,
            bodies,
            bodyMetrics,
            text: document.querySelector("#artifact").innerText,
            viewport: { width: 900, height: 850 },
          };
        },
        { offset: r.model.offset },
      );
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("DOM.enable");
      await cdp.send("CSS.enable");
      const doc = await cdp.send("DOM.getDocument");
      const fonts = {};
      for (const selector of ["#initial0", "#body0"]) {
        const node = await cdp.send("DOM.querySelector", {
          nodeId: doc.root.nodeId,
          selector,
        });
        fonts[selector] = (
          await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
        ).fonts;
      }
      await cdp.detach();
      const reasons = [];
      if (
        fonts["#initial0"].some((f) => f.postScriptName !== spec.font) ||
        !fonts["#initial0"].length
      )
        reasons.push("Initial font substitution");
      if (
        fonts["#body0"].some((f) => f.postScriptName !== "ArialMT") ||
        !fonts["#body0"].length
      )
        reasons.push("Body font substitution");
      if (
        dom.initials.some(
          (v, i) =>
            Math.hypot(
              v.counter.x - counters[i].x,
              v.counter.y - counters[i].y,
            ) > 0.2,
        )
      )
        reasons.push("Source origin drift above0.2px");
      const bodyRects = dom.bodies.flatMap((b) => b.rects);
      if (
        bodyRects.some(
          (b) =>
            b.x < 0 || b.y < 0 || b.x + b.width > 900 || b.y + b.height > 820,
        )
      )
        reasons.push("Body overflow");
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++)
          if (
            dom.bodies[i].rects.some((a) =>
              dom.bodies[j].rects.some(
                (b) =>
                  a.x < b.x + b.width &&
                  b.x < a.x + a.width &&
                  a.y < b.y + b.height &&
                  b.y < a.y + a.height,
              ),
            )
          )
            reasons.push("Body blocks overlap");
      const metrics = Object.values(dom.bodyMetrics),
        rowClearance =
          27 -
          Math.max(...metrics.map((m) => m.ascent)) -
          Math.max(...metrics.map((m) => m.descent));
      if (rowClearance < 0.25) reasons.push("Body row clearance below0.25px");
      const png = await page.locator("#artifact").screenshot();
      await save(dir + "/native.png", png);
      await save(dir + "/native.txt", dom.text);
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      const repeat = await page.locator("#artifact").screenshot(),
        repeatExact = sha(repeat) === sha(png);
      if (!repeatExact) {
        await save(dir + "/repeat.png", repeat);
        reasons.push("Native repeat mismatch");
      }
      const geometry = {
        unit,
        dimension: spec.dimension,
        counters: dom.initials.map((v) => v.counter),
      };
      const capture = {
        id,
        dir,
        article,
        classification: article
          ? "Styled native outline Latin article; no payload"
          : "Sparse word structural control; not prose",
        font: spec.font,
        pngPath: dir + "/native.png",
        pngSha256: sha(png),
        repeatSha256: sha(repeat),
        repeatExact,
        payload: null,
        geometry,
        sourcePlannedCounters: counters,
        dom,
        fonts,
        reasons,
        rejected: reasons.length > 0,
        rowClearance,
        bodyLeadingInModules: 27 / unit,
        bodyXHeightInModules: dom.bodyMetrics.x?.ascent / unit,
        resource: root + "/resources-01/" + spec.resource + "/result.json",
        normalPageCSSWidth: 900,
      };
      await json(dir + "/capture.json", capture);
      await json(dir + "/recipe.json", {
        spec,
        article,
        unit,
        distance,
        geometry,
        cssOffset,
        bodySize: 18,
        bodyLeading: 27,
        width: 900,
        height: 850,
      });
      captures.push(capture);
      console.log(
        JSON.stringify({
          id,
          reasons,
          unit,
          dimension: spec.dimension,
          bodyLeadingInModules: 27 / unit,
        }),
      );
    }
  for (const id of ["control-normal", "control-inverted"]) {
    const dir = out + "/" + id;
    await mkdir(dir);
    const pix = await read(
      "docs/research/prose-qr/phase-53/run-01/" + id + "/pixels.json",
    );
    const c = {
      id,
      dir,
      control: true,
      pngPath: pix.path,
      pngSha256: pix.pngSha256,
      rejected: false,
      reasons: [],
      payload: "https://example.com/",
      geometry: {
        unit: 12,
        dimension: 25,
        counters: [
          { x: 90, y: 90 },
          { x: 306, y: 90 },
          { x: 90, y: 306 },
        ],
      },
    };
    await json(dir + "/capture.json", c);
    captures.push(c);
  }
  await json(out + "/captures.json", captures);
} catch (e) {
  await json(out + "/capture-error.json", {
    current,
    error: e.stack,
    completedCaptures: captures.length,
  });
  throw e;
} finally {
  await browser.close();
}
