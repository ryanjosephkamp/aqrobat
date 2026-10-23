import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
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
const out = root + "/context-04",
  dir = out + "/continuous-article";
await mkdir(dir);
const res = await read(root + "/resources-01/copperplate-o/result.json"),
  resource = res.renders[1],
  unit = resource.model.completeRunPitch,
  dimension = 85,
  distance = (dimension - 7) * unit;
const texts = [
  "Once a page is printed, its letters become small shapes of ink. We read those shapes as words, while a camera measures their light and dark edges. This study asks whether both readers can use the same honest page.",
  "Our first duty is to keep the writing clear. A larger opening letter can mark a new paragraph, but the smaller body still needs room to breathe. Spaces, punctuation, and the rhythm of a sentence belong to the design.",
  "Often a promising pattern fails when the whole page is examined. We save that failure because it tells us which assumption to question next. A useful result must preserve the message and survive an ordinary scan.",
];
const paragraphs = texts
  .map(
    (t, i) =>
      `<p class="prose" id="p${i}" style="left:${48 + (i === 1 ? distance : 0)}px;top:${100 + (i === 2 ? distance : 0)}px"><span class="initial">${t[0]}</span>${t.slice(1)}</p>`,
  )
  .join("");
const html = `<!doctype html><html><head><meta charset="utf-8"><title>One page, two ways to read</title><style>@font-face{font-family:Target;src:local('Copperplate-Bold')}@font-face{font-family:Body;src:local('ArialMT')}html,body{margin:0;background:white;color:black}#artifact{position:relative;width:900px;height:900px}h1{position:absolute;left:48px;top:24px;margin:0;font:24px/32px Body}.prose{position:absolute;width:330px;margin:0;font:18px/27px Body;letter-spacing:1px;font-kerning:none;font-variant-ligatures:none}.initial{font:64px/96px Target;letter-spacing:0;color:white;-webkit-text-stroke:4px black}footer{position:absolute;left:48px;bottom:24px;font:14px/22px Body}</style></head><body><article id="artifact"><h1>One page, two ways to read</h1>${paragraphs}<footer>Native text study · no encoded payload</footer></article></body></html>`;
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  texts,
  unit,
  dimension,
  distance,
  newNativeProposals: 1,
  repeats: 1,
  plannedReaderSlots: 3,
  referenceControls: root + "/context-02/reader-results.json",
  sources: await sources([
    source + "/continuous-v2.mjs",
    source + "/common.mjs",
    out + "/PLAN.md",
    root + "/resources-01/copperplate-o/result.json",
  ]),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 900 },
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(30000);
  await save(dir + "/native.html", html);
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const dom = await page.evaluate(
    ({ offset }) => {
      const c = document.createElement("canvas").getContext("2d");
      const paragraphs = [...document.querySelectorAll(".prose")].map((e) => {
        const range = document.createRange();
        range.selectNodeContents(e);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        const selection = sel.toString();
        sel.removeAllRanges();
        const glyphs = [];
        const nodes = [e.firstChild.firstChild, e.lastChild];
        for (let i = 0; i < e.textContent.length; i++) {
          const node = i === 0 ? nodes[0] : nodes[1],
            index = i === 0 ? 0 : i - 1;
          const ch = e.textContent[i],
            style = getComputedStyle(node.parentElement);
          c.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const m = c.measureText(ch);
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          const b = range.getBoundingClientRect(),
            stroke = parseFloat(style.webkitTextStrokeWidth) || 0;
          glyphs.push({
            ch,
            rect: { x: b.x, y: b.y, width: b.width, height: b.height },
            font: c.font,
            stroke,
            ink: {
              left: b.x - m.actualBoundingBoxLeft - stroke / 2,
              right: b.x + m.actualBoundingBoxRight + stroke / 2,
            },
            ascent: m.actualBoundingBoxAscent,
            descent: m.actualBoundingBoxDescent,
          });
        }
        let minimumGap = Infinity;
        const pairs = [];
        for (let i = 1; i < glyphs.length; i++) {
          const a = glyphs[i - 1],
            b = glyphs[i];
          if (/\s/.test(a.ch + b.ch) || Math.abs(a.rect.y - b.rect.y) > 0.1)
            continue;
          const gap = b.ink.left - a.ink.right;
          minimumGap = Math.min(minimumGap, gap);
          if (gap < 0.25) pairs.push({ a: a.ch, b: b.ch, gap });
        }
        const b = e.getBoundingClientRect();
        return {
          text: e.textContent,
          selection,
          expectedTextStructure:
            e.childNodes.length === 2 && e.firstChild.tagName === "SPAN",
          initialNextGap: glyphs[1].ink.left - glyphs[0].ink.right,
          rect: { x: b.x, y: b.y, width: b.width, height: b.height },
          firstGlyph: glyphs[0],
          counter: {
            x: glyphs[0].rect.x + offset.x,
            y: glyphs[0].rect.y + offset.y,
          },
          minimumGap,
          tightPairs: pairs,
          rowClearance:
            27 -
            Math.max(...glyphs.slice(1).map((g) => g.ascent)) -
            Math.max(...glyphs.slice(1).map((g) => g.descent)),
          glyphs,
        };
      });
      return {
        paragraphs,
        text: document.querySelector("#artifact").innerText,
      };
    },
    { offset: resource.model.offset },
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const doc = await cdp.send("DOM.getDocument");
  const fonts = [];
  for (let i = 0; i < 3; i++) {
    const node = await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector: "#p" + i,
    });
    fonts.push(
      (await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId }))
        .fonts,
    );
  }
  await cdp.detach();
  const reasons = [];
  for (let i = 0; i < 3; i++) {
    const p = dom.paragraphs[i];
    if (
      p.selection !== texts[i] ||
      p.text !== texts[i] ||
      !p.expectedTextStructure
    )
      reasons.push("Paragraph selection/source identity");
    if (p.firstGlyph.stroke !== 4)
      reasons.push("Missing native outline stroke");
    if (p.initialNextGap < 0.25) reasons.push("Initial adjacent ink gap");
    if (p.minimumGap < 0.25) reasons.push("Adjacent ink gap");
    if (p.rowClearance < 0.25) reasons.push("Row clearance");
    if (p.rect.y + p.rect.height > 850 || p.rect.x + p.rect.width > 900)
      reasons.push("Overflow");
    if (
      !fonts[i].some((f) => f.postScriptName === "ArialMT") ||
      !fonts[i].some((f) => f.postScriptName === "Copperplate-Bold")
    )
      reasons.push("Font identity");
  }
  const counters = dom.paragraphs.map((p) => p.counter),
    [a, b, c] = counters;
  if (
    Math.abs(b.x - a.x - distance) > 0.2 ||
    Math.abs(c.y - a.y - distance) > 0.2 ||
    Math.abs(a.x - c.x) > 0.2
  )
    reasons.push("Source triangle drift");
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      const a = dom.paragraphs[i].rect,
        b = dom.paragraphs[j].rect;
      if (
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      )
        reasons.push("Paragraph overlap");
    }
  const png = await page.locator("#artifact").screenshot();
  await save(dir + "/native.png", png);
  await save(dir + "/native.txt", dom.text);
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const repeat = await page.locator("#artifact").screenshot(),
    repeatExact = sha(repeat) === sha(png);
  if (!repeatExact) {
    await save(dir + "/repeat.png", repeat);
    reasons.push("Repeat mismatch");
  }
  const capture = {
    id: "continuous-article",
    dir,
    article: true,
    classification: "Styled Latin continuous-text article; no payload",
    pngPath: dir + "/native.png",
    pngSha256: sha(png),
    repeatSha256: sha(repeat),
    repeatExact,
    dom,
    fonts,
    geometry: { unit, dimension, counters },
    payload: null,
    reasons: [...new Set(reasons)],
    rejected: reasons.length > 0,
    normalPageCSSWidth: 900,
  };
  await json(dir + "/capture.json", capture);
  await json(dir + "/recipe.json", {
    texts,
    unit,
    dimension,
    distance,
    font: "Copperplate-Bold",
    body: "ArialMT",
    bodySize: 18,
    bodyLeading: 27,
    bodyTracking: 1,
    firstLetterSize: 64,
    stroke: 4,
  });
  await json(out + "/captures.json", [capture]);
  console.log(
    JSON.stringify({
      reasons: capture.reasons,
      counters,
      paragraphs: dom.paragraphs.map((p) => ({
        selectionExact: p.selection === p.text,
        gap: p.minimumGap,
        first: p.firstGlyph,
        rect: p.rect,
      })),
      fonts,
    }),
  );
} catch (e) {
  await json(out + "/capture-error.json", { error: e.stack });
  throw e;
} finally {
  await browser.close();
}
