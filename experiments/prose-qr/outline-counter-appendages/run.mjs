import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import { escapeHtml, documentHtml } from "../layout.mjs";
import { root, source, sha, save, json, sources } from "./common.mjs";
import { passive, passiveHash } from "./passive.mjs";
import { profile } from "./profile.mjs";
const previous = "experiments/prose-qr/context-letter-counters/";
const out = root + "run-01/";
const specs = [
  ["P", "PILL"],
  ["R", "RILL"],
  ["B", "BILL"],
].map(([symbol, word]) => ({
  id: word.toLowerCase(),
  postscript: "Arial-BoldMT",
  weight: 700,
  size: 64,
  symbol,
  word,
  tracking: 10,
  stroke: 4,
  lane: "styled-Latin-outline-bold-flat-bowl",
}));
await mkdir(out);
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  nativeResources: 6,
  plannedNativeSources: 3,
  immediateRepeats: 3,
  plannedPrimaryReaderSlots: 15,
  passiveProfiles: 5,
  specs,
  passiveHash,
  sources: await sources([
    source + "run.mjs",
    source + "common.mjs",
    source + "profile.mjs",
    source + "holes.py",
    source + "passive.mjs",
    root + "PLAN.md",
    "experiments/prose-qr/outline-flat-bowls/fonts.swift",
    "docs/research/prose-qr/phase-73/installed-fonts.txt",
    previous + "geometry.mjs",
    previous + "ordinary.py",
    "experiments/prose-qr/layout.mjs",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
    "experiments/prose-qr/finder-runs/probe.mjs",
  ]),
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const captures = [];
let current = null;
async function fonts(page) {
  const c = await page.context().newCDPSession(page);
  try {
    await c.send("DOM.enable");
    await c.send("CSS.enable");
    const d = await c.send("DOM.getDocument");
    const n = await c.send("DOM.querySelector", {
      nodeId: d.root.nodeId,
      selector: "#text",
    });
    return (await c.send("CSS.getPlatformFontsForNode", { nodeId: n.nodeId }))
      .fonts;
  } finally {
    await c.detach();
  }
}
try {
  const page = await browser.newPage({
    viewport: { width: 2600, height: 1400 },
    deviceScaleFactor: 1,
  });
  for (const spec of specs) {
    current = spec.id;
    const dir = out + spec.id + "/";
    await mkdir(dir);
    const face = `<style>@font-face{font-family:OutlineLatin;src:local('${spec.postscript}');font-weight:700;font-style:normal}</style>`;
    await page.setContent(face);
    await page.evaluate(() => document.fonts.load("700 64px OutlineLatin"));
    const m = await page.evaluate(() => {
      const c = document.createElement("canvas").getContext("2d");
      c.font = "700 64px OutlineLatin";
      c.fontKerning = "none";
      return Object.fromEntries(
        [..."WILLPRB. "].map((s) => {
          const t = c.measureText(s);
          return [
            s,
            {
              advance: t.width,
              left: t.actualBoundingBoxLeft,
              right: t.actualBoundingBoxRight,
              ascent: t.actualBoundingBoxAscent,
              descent: t.actualBoundingBoxDescent,
            },
          ];
        }),
      );
    });
    const advance = (s) =>
        [...s].reduce((sum, ch) => sum + m[ch].advance + spec.tracking, 0),
      distance = advance(spec.word + " WILL "),
      leading = distance / 4;
    const style = `font:700 64px/${leading}px OutlineLatin;letter-spacing:10px;font-kerning:none;font-variant-ligatures:none;white-space:pre;color:${spec.stroke ? "white" : "black"};-webkit-text-stroke:${spec.stroke}px black`;
    const resource = documentHtml(
      `${face}<article id="artifact" style="position:relative;background:white;width:192px;height:192px"><pre id="text" style="position:absolute;left:48px;top:32px;margin:0;padding:0;${style}">${spec.symbol}</pre></article>`,
    );
    const filled = resource.replace(
      "color:white;-webkit-text-stroke:4px black",
      "color:black;-webkit-text-stroke:0px black",
    );
    await save(dir + "filled-resource.html.gz", gzipSync(filled));
    await page.setContent(filled);
    await page.evaluate(() => document.fonts.ready);
    await json(dir + "filled-resource-fonts.json", {
      fonts: await fonts(page),
      requested: spec.postscript,
    });
    const filledPNG = await page.locator("#artifact").screenshot();
    await save(dir + "filled-resource.png", filledPNG);
    const filledRaw = execFileSync(
      "python3",
      [source + "holes.py", dir + "filled-resource.png"],
      { encoding: "utf8", timeout: 10000 },
    );
    await save(dir + "filled-holes.raw.json.gz", gzipSync(filledRaw));
    const filledHoles = JSON.parse(filledRaw);
    await json(dir + "filled-holes.json", filledHoles);
    if (!filledHoles.selected) {
      const c = {
        ...spec,
        dir,
        reasons: ["No filled resource enclosure"],
        rejected: true,
        nativeUnattempted: true,
        payload: null,
        phoneCandidate: false,
      };
      captures.push(c);
      await json(dir + "capture.json", c);
      continue;
    }
    await save(dir + "glyph.html.gz", gzipSync(resource));
    await page.setContent(resource);
    await page.evaluate(() => document.fonts.ready);
    const glyphRect = await page.locator("#text").evaluate((e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      const b = r.getBoundingClientRect();
      return { left: b.left, top: b.top, width: b.width, height: b.height };
    });
    const resourceFonts = await fonts(page);
    await json(dir + "resource-fonts.json", {
      requested: spec.postscript,
      fonts: resourceFonts,
    });
    const glyphPNG = await page.locator("#artifact").screenshot();
    await save(dir + "glyph.png", glyphPNG);
    const raw = execFileSync(
      "python3",
      [
        source + "holes.py",
        dir + "glyph.png",
        JSON.stringify(filledHoles.selected.center),
      ],
      { encoding: "utf8", timeout: 10000 },
    );
    await save(dir + "holes.raw.json.gz", gzipSync(raw));
    const holes = JSON.parse(raw);
    await json(dir + "holes.json", holes);
    const reject = [];
    if (
      !resourceFonts.length ||
      resourceFonts.some((f) => f.postScriptName !== spec.postscript)
    )
      reject.push("Resource font substitution");
    if (!holes.selected) reject.push("No central native enclosure");
    if (reject.length) {
      const c = {
        ...spec,
        dir,
        reasons: reject,
        rejected: true,
        nativeUnattempted: true,
        payload: null,
        phoneCandidate: false,
      };
      captures.push(c);
      await json(dir + "capture.json", c);
      continue;
    }
    const offset = {
      x: holes.selected.center[0] - glyphRect.left,
      y: holes.selected.center[1] - glyphRect.top,
    };
    const model = profile(dir + "glyph.png", holes.selected.center);
    await json(dir + "resource-profile.json", model);
    const modelUnit = (holes.selected.bounds[2] + holes.selected.bounds[3]) / 6,
      dimension = 21 + 4 * Math.round((distance / modelUnit + 7 - 21) / 4),
      unit = distance / (dimension - 7);
    if (dimension < 21 || dimension > 177) {
      const c = {
        ...spec,
        dir,
        reasons: ["Source dimension outside21..177"],
        dimension,
        rejected: true,
        nativeUnattempted: true,
        payload: null,
        phoneCandidate: false,
      };
      captures.push(c);
      await json(dir + "capture.json", c);
      continue;
    }
    const lines = Array.from(
      { length: 10 },
      (_, r) =>
        Array.from({ length: 5 }, (_, c) =>
          (r === 2 && (c === 1 || c === 3)) || (r === 6 && c === 1)
            ? spec.word
            : "WILL",
        ).join(" ") + ".",
    );
    const text = lines.join("\n");
    const html = documentHtml(
      `${face}<article id="artifact" style="position:relative;background:white;width:2600px;height:1400px"><pre id="text" style="position:absolute;left:24px;top:24px;margin:0;padding:0;${style}">${escapeHtml(text)}</pre></article>`,
    );
    await save(dir + "native.html.gz", gzipSync(html));
    await save(dir + "native.txt", text);
    await json(dir + "recipe.json", {
      ...spec,
      lines,
      leading,
      distance,
      dimension,
      unit,
      modelUnit,
      offset,
      glyphRect,
      sourceMetrics: m,
      classification:
        "Visible outlined Latin word structural control; no payload",
    });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const native = await page.locator("#text").evaluate(
      (e, { offset, symbol }) => {
        const b = e.getBoundingClientRect(),
          counters = [],
          targetOrigins = [];
        for (let i = 0; i < e.textContent.length; i++)
          if (e.textContent[i] === symbol) {
            const r = document.createRange();
            r.setStart(e.firstChild, i);
            r.setEnd(e.firstChild, i + 1);
            const t = r.getBoundingClientRect();
            targetOrigins.push({
              left: t.left,
              top: t.top,
              width: t.width,
              height: t.height,
            });
            counters.push({ x: t.left + offset.x, y: t.top + offset.y });
          }
        return {
          width: b.width,
          height: b.height,
          counters,
          targetOrigins,
          textNodeOnly: e.children.length === 0,
          style: {
            size: getComputedStyle(e).fontSize,
            leading: getComputedStyle(e).lineHeight,
            stroke: getComputedStyle(e).webkitTextStrokeWidth,
            fill: getComputedStyle(e).color,
          },
        };
      },
      { offset, symbol: spec.symbol },
    );
    native.platformFonts = await fonts(page);
    const reasons = [];
    const clearance =
      leading -
      Math.max(...Object.values(m).map((g) => g.ascent)) -
      Math.max(...Object.values(m).map((g) => g.descent)) -
      spec.stroke;
    let gap = Infinity;
    for (const line of lines)
      for (let k = 1; k < line.length; k++)
        if (line[k - 1] !== " " && line[k] !== " ")
          gap = Math.min(
            gap,
            m[line[k - 1]].advance +
              spec.tracking -
              m[line[k - 1]].right -
              m[line[k]].left -
              spec.stroke,
          );
    native.allLineMinimumExpandedInkGap = gap;
    const [a, b, c] = native.counters,
      dx = b.x - a.x,
      dy = c.y - a.y;
    if (gap < 0.25) reasons.push("Adjacent expanded ink gap below0.25");
    if (clearance < 0.25) reasons.push("Expanded row ink clearance below0.25");
    if (Math.abs(dx - dy) > 0.2 || Math.abs(c.x - a.x) > 0.2)
      reasons.push("Triangle drift");
    if (
      native.width + 24 + spec.stroke / 2 > 2600 ||
      native.height + 24 + spec.stroke / 2 > 1400 ||
      !native.textNodeOnly
    )
      reasons.push("Overflow/markup");
    if (
      !native.platformFonts.length ||
      native.platformFonts.some((f) => f.postScriptName !== spec.postscript)
    )
      reasons.push("Full font substitution");
    const png = await page.locator("#artifact").screenshot();
    await save(dir + "native.png", png);
    await save(
      dir + "letters.png",
      await page.screenshot({
        clip: {
          x: Math.floor(a.x - 40),
          y: Math.floor(a.y - 60),
          width: 500,
          height: 140,
        },
      }),
    );
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const repeat = await page.locator("#artifact").screenshot(),
      repeatExact = sha(repeat) === sha(png);
    if (!repeatExact) {
      await save(dir + "repeat.png", repeat);
      reasons.push("Repeat mismatch");
    }
    const capture = {
      ...spec,
      dir,
      native,
      unit,
      dimension,
      leading,
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
    console.log(
      JSON.stringify({
        id: spec.id,
        reasons,
        dimension,
        resourceRMS: model.metric.worstRMS,
      }),
    );
  }
  for (const inverted of [false, true]) {
    const id = inverted ? "control-inverted" : "control-normal",
      dir = out + id + "/",
      prior = `docs/research/prose-qr/phase-53/run-01/${id}/pixels.json`;
    await mkdir(dir);
    const p = JSON.parse(await readFile(prior));
    assert.equal(sha(await readFile(p.path)), p.pngSha256);
    captures.push({
      id,
      dir,
      pngPath: p.path,
      pngSha256: p.pngSha256,
      priorRGBA: p.rgbaSha256,
      control: true,
      inverted,
      width: p.width,
      height: p.height,
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
let completedSlots = 0,
  passiveProfiles = 0;
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
    const raw = execFileSync("python3", [previous + "ordinary.py", c.pngPath], {
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 1000000,
    });
    await save(c.dir + "opencv.raw.json.gz", gzipSync(raw));
    const cv = JSON.parse(raw);
    await json(c.dir + "opencv.json", cv);
    completedSlots++;
    const data = execFileSync(
      "python3",
      [
        "-c",
        "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
        c.pngPath,
      ],
      { maxBuffer: 16000000 },
    );
    const width = c.width ?? 2600,
      height = c.height ?? 1400;
    assert.equal(data.length, width * height * 4);
    if (c.control) assert.equal(sha(data), c.priorRGBA);
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
      c.control
        ? null
        : { unit: c.unit, counters: c.native.counters, dimension: c.dimension },
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
    passiveProfiles++;
    console.log(
      JSON.stringify({
        id: c.id,
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
    plannedPrimaryReaderSlots: 15,
    completedPrimaryReaderSlots: completedSlots,
    unattemptedPrimaryReaderSlots: 15 - completedSlots,
    completedPassiveProfiles: passiveProfiles,
    nativeCaptures: captures.filter((c) => !c.control && !c.nativeUnattempted)
      .length,
    nativeRejects: captures.filter((c) => !c.control && c.rejected).length,
    newPayloadSources: 0,
    reusedConventionalSources: 2,
    phoneCandidates: 0,
    goal: "unsolved",
  });
} catch (e) {
  await json(out + "reader-error.json", {
    current,
    error: e.stack,
    plannedPrimaryReaderSlots: 15,
    completedPrimaryReaderSlots: completedSlots,
    completedPassiveProfiles: passiveProfiles,
  });
  throw e;
}
