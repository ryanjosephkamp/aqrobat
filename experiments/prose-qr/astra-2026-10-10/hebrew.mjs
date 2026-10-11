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
const out = root + "/context-02",
  dir = out + "/hebrew-article";
await mkdir(dir);
const resource = await read(root + "/resources-02/hebrew-mem/result.json"),
  r = resource.renders.find((x) => x.name === "outline"),
  unit = r.model.completeRunPitch,
  dimension = 101,
  distance = (dimension - 7) * unit;
const texts = [
  "לכל מי שקורא את הדף הזה. אנחנו בודקים אם אותיות גלויות יכולות לשאת גם מסר למצלמה. המילים צריכות להישאר ברורות, והעמוד כולו צריך לשמור על סדר קריאה טבעי.",
  "גם לקורא שמביט דרך מצלמה. צורה מבטיחה אינה מבטיחה שהמסר ייקרא נכון. לכן אנו שומרים את המקור בשלמותו ובודקים את אותה תמונה בכמה קוראים רגילים.",
  "למי שינסה שוב. כל ניסיון מלמד אותנו איזה חלק של הרעיון דורש שינוי. אנו שומרים גם את הכישלונות, כדי שהצעד הבא יתבסס על ראיות ולא על רושם בלבד.",
];
const blocks = texts
  .map(
    (text, i) =>
      `<section class="block" id="block${i}" dir="rtl" style="left:${48 + (i === 1 ? distance : 0)}px;top:${100 + (i === 2 ? distance : 0)}px"><p><span class="initial" id="initial${i}">שלום</span> ${text}</p></section>`,
  )
  .join("");
const html = `<!doctype html><html lang="he"><head><meta charset="utf-8"><title>מילים ותמונה</title><style>@font-face{font-family:Target;src:local('ArialHebrew-Bold')}@font-face{font-family:Body;src:local('ArialHebrew')}*{box-sizing:border-box}html,body{margin:0;background:white;color:black}#artifact{position:relative;width:900px;height:900px}.block{position:absolute;width:330px}.block p{font:18px/27px Body;margin:0}.initial{float:right;font:64px/96px Target;letter-spacing:6px;font-kerning:none;color:white;-webkit-text-stroke:4.25px black;margin-left:12px}h1{position:absolute;left:48px;right:48px;top:28px;margin:0;text-align:right;font:28px/36px Body}footer{position:absolute;left:48px;right:48px;bottom:28px;text-align:right;font:14px/22px Body}</style></head><body><article id="artifact"><h1>מילים ותמונה</h1>${blocks}<footer>מחקר בטקסט גלוי — ללא מסר מקודד</footer></article></body></html>`;
await json(out + "/manifest.json", {
  at: new Date().toISOString(),
  nativeProposals: 1,
  repeats: 1,
  plannedPrimarySlots: 9,
  payload: null,
  texts,
  unit,
  dimension,
  distance,
  sources: await sources([
    source + "/hebrew.mjs",
    source + "/common.mjs",
    out + "/PLAN.md",
    root + "/resources-02/hebrew-mem/result.json",
  ]),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const captures = [];
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
      const initials = [...document.querySelectorAll(".initial")].map((e) => {
        const range = document.createRange();
        range.setStart(e.firstChild, 3);
        range.setEnd(e.firstChild, 4);
        const b = range.getBoundingClientRect();
        return {
          rect: { x: b.x, y: b.y, width: b.width, height: b.height },
          counter: { x: b.x + offset.x, y: b.y + offset.y },
          text: e.textContent,
        };
      });
      const blocks = [...document.querySelectorAll(".block")].map((e) => {
        const b = e.getBoundingClientRect();
        return {
          rect: { x: b.x, y: b.y, width: b.width, height: b.height },
          text: e.textContent,
        };
      });
      const c = document.createElement("canvas").getContext("2d");
      c.font = "64px Target";
      const targetMetrics = Object.fromEntries(
        [..."שלום"].map((ch) => {
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
        blocks,
        targetMetrics,
        bodyMetrics,
        text: document.querySelector("#artifact").innerText,
      };
    },
    { offset: r.model.offset },
  );
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const document = await cdp.send("DOM.getDocument");
  const fonts = {};
  for (const selector of ["#initial0", "#block0 p"]) {
    const node = await cdp.send("DOM.querySelector", {
      nodeId: document.root.nodeId,
      selector,
    });
    fonts[selector] = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
  }
  await cdp.detach();
  const reasons = [];
  if (
    !fonts["#initial0"].length ||
    fonts["#initial0"].some((f) => f.postScriptName !== "ArialHebrew-Bold")
  )
    reasons.push("Initial font substitution");
  if (!fonts["#block0 p"].some((f) => f.postScriptName === "ArialHebrew"))
    reasons.push("Body font missing");
  const counters = dom.initials.map((i) => i.counter),
    [a, b, c] = counters;
  if (
    Math.abs(b.x - a.x - distance) > 0.2 ||
    Math.abs(c.y - a.y - distance) > 0.2 ||
    Math.abs(a.x - c.x) > 0.2
  )
    reasons.push("Source triangle drift");
  if (
    dom.blocks.some(
      (b) =>
        b.rect.x < 0 ||
        b.rect.x + b.rect.width > 900 ||
        b.rect.y + b.rect.height > 850,
    )
  )
    reasons.push("Native overflow");
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++) {
      const a = dom.blocks[i].rect,
        b = dom.blocks[j].rect;
      if (
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height
      )
        reasons.push("Paragraph overlap");
    }
  const m = Object.values(dom.bodyMetrics),
    rowClearance =
      27 -
      Math.max(...m.map((x) => x.ascent)) -
      Math.max(...m.map((x) => x.descent));
  if (rowClearance < 0.25) reasons.push("Row ink clearance");
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
    id: "hebrew-article",
    dir,
    article: true,
    lane: "styled-Hebrew-outline-alphabetic",
    classification:
      "Three Hebrew paragraphs with outlined native initial words; not Latin/ASCII or logographic evidence",
    pngPath: dir + "/native.png",
    pngSha256: sha(png),
    repeatSha256: sha(repeat),
    repeatExact,
    reasons,
    rejected: reasons.length > 0,
    payload: null,
    geometry: { unit, dimension, counters },
    dom,
    fonts,
    rowClearance,
    bodyLeadingInModules: 27 / unit,
    normalPageCSSWidth: 900,
  };
  await json(dir + "/capture.json", capture);
  await json(dir + "/recipe.json", {
    font: "ArialHebrew-Bold",
    bodyFont: "ArialHebrew",
    size: 64,
    bodySize: 18,
    stroke: 4.25,
    tracking: 6,
    bodyLeading: 27,
    unit,
    dimension,
    distance,
    texts,
  });
  captures.push(capture);
  for (const id of ["control-normal", "control-inverted"]) {
    const cdir = out + "/" + id;
    await mkdir(cdir);
    const pix = await read(
      "docs/research/prose-qr/phase-53/run-01/" + id + "/pixels.json",
    );
    const cc = {
      id,
      dir: cdir,
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
    await json(cdir + "/capture.json", cc);
    captures.push(cc);
  }
  await json(out + "/captures.json", captures);
  console.log(JSON.stringify({ reasons, counters, fonts, rowClearance }));
} catch (e) {
  await json(out + "/capture-error.json", {
    error: e.stack,
    completed: captures.length,
  });
  throw e;
} finally {
  await browser.close();
}
