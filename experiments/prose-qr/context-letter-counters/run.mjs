import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import { generate } from "../../../src/core.mjs";
import { escapeHtml, documentHtml } from "../layout.mjs";
import { root, source, sha, save, json, sources } from "./common.mjs";
import { passive, passiveHash } from "./passive.mjs";
const out = root + "run-01/";
const specs = [
  { id: "arial20", postscript: "ArialMT", size: 20 },
  { id: "arial24", postscript: "ArialMT", size: 24 },
  { id: "typewriter20", postscript: "AmericanTypewriter", size: 20 },
  { id: "typewriter24", postscript: "AmericanTypewriter", size: 24 },
];
await mkdir(out);
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  nativeSlots: 4,
  immediateNativeRepeats: 4,
  conventionalControls: 2,
  primaryOrdinaryReaderSlots: 18,
  passiveParityProfiles: 6,
  specs,
  passiveHash,
  sources: await sources([
    source + "run.mjs",
    source + "passive.mjs",
    source + "geometry.mjs",
    source + "common.mjs",
    source + "ordinary.py",
    root + "PLAN.md",
    "src/core.mjs",
    "vendor/qrcodegen.mjs",
    "experiments/prose-qr/layout.mjs",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
    "experiments/prose-qr/finder-runs/probe.mjs",
  ]),
});
const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  }),
  captures = [];
let current = null;
try {
  const page = await browser.newPage({
    viewport: { width: 1300, height: 1000 },
    deviceScaleFactor: 1,
  });
  for (const spec of specs) {
    current = spec.id;
    const dir = out + spec.id + "/";
    await mkdir(dir);
    const face = `<style>@font-face{font-family:CounterFace;src:local('${spec.postscript}');font-weight:400;font-style:normal}</style>`;
    await page.setContent(face);
    await page.evaluate(
      (size) => document.fonts.load(`400 ${size}px CounterFace`),
      spec.size,
    );
    const m = await page.evaluate((size) => {
      const c = document.createElement("canvas").getContext("2d");
      c.font = `400 ${size}px CounterFace`;
      c.fontKerning = "none";
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
        mom: measure("MOM "),
        mum: measure("MUM "),
        o: measure("O"),
        glyphs: Object.fromEntries([..."MUO. "].map((c) => [c, measure(c)])),
      };
    }, spec.size);
    const leading = Math.round((m.mom.advance / 3) * 64) / 64,
      unit = m.mom.advance / 18;
    const lines = Array.from(
        { length: 24 },
        (_, row) =>
          Array.from({ length: 16 }, (_, col) =>
            (row === 6 && (col === 6 || col === 7)) || (row === 9 && col === 6)
              ? "MOM"
              : "MUM",
          ).join(" ") + (row % 4 === 3 ? "." : ""),
      ),
      text = lines.join("\n");
    const style = `font:400 ${spec.size}px/${leading}px CounterFace;letter-spacing:0;font-kerning:none;font-variant-ligatures:none;white-space:pre;color:black`;
    const html = documentHtml(
      `${face}<article id="artifact" style="position:relative;background:white;width:1200px;height:720px"><pre id="text" style="position:absolute;left:24px;top:24px;margin:0;padding:0;${style}">${escapeHtml(text)}</pre></article><p id="baseline" style="margin:0;padding:0;${style}">O<span id="baseline-mark" style="display:inline-block;width:0;height:0;padding:0;margin:0"></span></p>`,
    );
    await save(dir + "native.html.gz", gzipSync(html));
    await save(dir + "native.txt", text);
    await json(dir + "recipe.json", {
      ...spec,
      leading,
      unit,
      source: "Three native O counters; no encoded payload",
      lines,
      sourceMetrics: m,
      conditionalAcceptance:
        "post-render bounds/repeat/legibility, no reader geometry supplied",
    });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const native = await page.locator("#text").evaluate((e, m) => {
      const bbox = e.getBoundingClientRect(),
        base =
          document.querySelector("#baseline-mark").getBoundingClientRect().top -
          document.querySelector("#baseline").getBoundingClientRect().top;
      const counters = [];
      for (let i = 0; i < e.textContent.length; i++)
        if (e.textContent[i] === "O") {
          const r = document.createRange();
          r.setStart(e.firstChild, i);
          r.setEnd(e.firstChild, i + 1);
          const b = r.getBoundingClientRect(),
            row = e.textContent.slice(0, i).split("\n").length - 1;
          counters.push({
            x: b.left + (m.o.right - m.o.left) / 2,
            y:
              bbox.top +
              row * parseFloat(getComputedStyle(e).lineHeight) +
              base +
              (m.o.descent - m.o.ascent) / 2,
          });
        }
      return {
        width: bbox.width,
        height: bbox.height,
        base,
        counters,
        textNodeOnly: e.children.length === 0,
        style: {
          size: getComputedStyle(e).fontSize,
          leading: getComputedStyle(e).lineHeight,
          weight: getComputedStyle(e).fontWeight,
          tracking: getComputedStyle(e).letterSpacing,
        },
      };
    }, m);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = await cdp.send("DOM.getDocument"),
      node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: "#text",
      });
    native.platformFonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    await cdp.detach();
    const clearance =
        leading -
        Math.max(...Object.values(m.glyphs).map((g) => g.ascent)) -
        Math.max(...Object.values(m.glyphs).map((g) => g.descent)),
      reasons = [];
    const [a, b, c] = native.counters;
    const dx = b.x - a.x,
      dy = c.y - a.y;
    if (clearance < 0.25) reasons.push("Row ink-bounds clearance below0.25");
    if (Math.abs(dx - dy) > 0.2 || Math.abs(c.x - a.x) > 0.2)
      reasons.push("Native counter triangle spacing drift");
    if (
      native.width + 24 > 1200 ||
      native.height + 24 > 720 ||
      !native.textNodeOnly
    )
      reasons.push("Native overflow/markup");
    if (
      !native.platformFonts.length ||
      native.platformFonts.some((f) => f.postScriptName !== spec.postscript)
    )
      reasons.push("Font substitution");
    const png = await page.locator("#artifact").screenshot();
    await save(dir + "native.png", png);
    await save(
      dir + "letters.png",
      await page.screenshot({
        clip: {
          x: Math.floor(a.x - 100),
          y: Math.floor(a.y - 70),
          width: 400,
          height: 220,
        },
      }),
    );
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const repeat = await page.locator("#artifact").screenshot();
    const repeatExact = sha(repeat) === sha(png);
    if (!repeatExact) {
      await save(dir + "repeat.png", repeat);
      reasons.push("Native repeat mismatch");
    }
    const capture = {
      ...spec,
      dir,
      native,
      unit,
      clearance,
      dx,
      dy,
      pngPath: dir + "native.png",
      pngSha256: sha(png),
      repeatSha256: sha(repeat),
      repeatExact,
      reasons,
      rejected: !!reasons.length,
      payload: null,
      phoneCandidate: false,
    };
    await json(dir + "capture.json", capture);
    captures.push(capture);
  }
  const control = generate("https://example.com/", { ecc: "M", boost: false });
  const matrix = control.matrix,
    side = (matrix.length + 8) * 12;
  for (const inverted of [false, true]) {
    const id = inverted ? "control-inverted" : "control-normal",
      dir = out + id + "/";
    current = id;
    await mkdir(dir);
    const bg = inverted ? "black" : "white",
      fg = inverted ? "white" : "black";
    const svg = `<svg id="artifact" xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}"><rect width="100%" height="100%" fill="${bg}"/>${matrix.flatMap((r, y) => r.flatMap((bit, x) => (bit ? [`<rect x="${(x + 4) * 12}" y="${(y + 4) * 12}" width="12" height="12" fill="${fg}"/>`] : []))).join("")}</svg>`;
    await save(dir + "source.svg.gz", gzipSync(svg));
    await page.setContent(svg);
    const png = await page.locator("#artifact").screenshot();
    await save(dir + "control.png", png);
    captures.push({
      id,
      dir,
      pngPath: dir + "control.png",
      pngSha256: sha(png),
      control: true,
      inverted,
      width: side,
      height: side,
      rejected: false,
      payload: "https://example.com/",
      phoneCandidate: false,
    });
  }
  await json(out + "captures.json", captures);
} catch (e) {
  await json(out + "capture-error.json", {
    current,
    error: e.stack,
    completedCaptures: captures.length,
  });
  throw e;
} finally {
  await browser.close();
}
let completedSlots = 0;
try {
  for (const c of captures) {
    current = c.id;
    if (c.rejected) {
      await json(c.dir + "rejection.json", {
        reasons: c.reasons,
        primaryReaderSlotsUnattempted: 3,
        passiveUnattempted: 1,
      });
      continue;
    }
    assert.equal(sha(await readFile(c.pngPath)), c.pngSha256);
    const rawCV = execFileSync("python3", [source + "ordinary.py", c.pngPath], {
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 1000000,
    });
    await save(c.dir + "opencv.raw.json.gz", gzipSync(rawCV));
    const cv = JSON.parse(rawCV);
    await json(c.dir + "opencv.json", cv);
    completedSlots++;
    const data = execFileSync(
      "python3",
      [
        "-c",
        "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
        c.pngPath,
      ],
      { maxBuffer: 4000000 },
    );
    const width = c.width ?? 1200,
      height = c.height ?? 720;
    assert.equal(data.length, width * height * 4);
    const p = { data: new Uint8ClampedArray(data), width, height };
    await json(c.dir + "pixels.json", {
      path: c.pngPath,
      pngSha256: c.pngSha256,
      rgbaSha256: sha(data),
      width,
      height,
    });
    const z = await readBarcodes(p, { formats: ["QRCode"] });
    await json(c.dir + "zxing.json", {
      options: { formats: ["QRCode"] },
      results: z.map((r) => ({
        text: r.text,
        isValid: r.isValid,
        error: r.error,
        position: r.position,
      })),
      exactURL: z.some((r) => r.isValid && r.text === "https://example.com/"),
    });
    completedSlots++;
    const j = jsQR(p.data, width, height, { inversionAttempts: "attemptBoth" });
    await json(c.dir + "jsqr.json", {
      options: { inversionAttempts: "attemptBoth" },
      result: j,
      exactURL: j?.data === "https://example.com/",
    });
    completedSlots++;
    const trace = passive(
      p,
      j,
      c.control ? null : { unit: c.unit, counters: c.native.counters },
    );
    await save(c.dir + "passive-full.json.gz", gzipSync(JSON.stringify(trace)));
    await json(c.dir + "passive-summary.json", {
      ...trace,
      scans: trace.scans.map(({ allScoredRuns, allQuads, ...s }) => ({
        ...s,
        scoredRuns: allScoredRuns.length,
        quads: allQuads.length,
      })),
    });
    console.log(
      JSON.stringify({
        id: c.id,
        rejected: c.rejected,
        cvPoints: cv.points,
        primaryExact: {
          cv: cv.exactURL,
          zxing: z.some((r) => r.isValid && r.text === "https://example.com/"),
          jsqr: j?.data === "https://example.com/",
        },
        scans: trace.scans.map((s) => ({
          branch: s.branch,
          locations: s.locations,
          intended: s.postReturnIntendedGeometry.filter(
            (l) => l.intendedGeometry,
          ).length,
        })),
      }),
    );
  }
  await json(out + "done.json", {
    plannedPrimaryReaderSlots: 18,
    completedPrimaryReaderSlots: completedSlots,
    nativeCaptures: captures.filter((c) => !c.control).length,
    nativeRejects: captures.filter((c) => !c.control && c.rejected).length,
    newPayloadSources: 0,
    conventionalPayloadSources: 2,
    phoneCandidates: 0,
    goal: "unsolved",
  });
} catch (e) {
  await json(out + "reader-error.json", {
    current,
    error: e.stack,
    plannedPrimaryReaderSlots: 18,
    completedPrimaryReaderSlots: completedSlots,
  });
  throw e;
}
