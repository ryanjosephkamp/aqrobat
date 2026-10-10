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
const previous = "experiments/prose-qr/context-letter-counters/";
const out = root + "run-01/";
const specs = [
  {
    id: "pingfang24",
    postscript: "PingFangSC-Regular",
    size: 24,
    symbol: "回",
    tracking: 0,
    lane: "native-logographic-structural-control",
  },
  {
    id: "pingfang32",
    postscript: "PingFangSC-Regular",
    size: 32,
    symbol: "回",
    tracking: 0,
    lane: "native-logographic-structural-control",
  },
  {
    id: "songti24",
    postscript: "STSongti-SC-Regular",
    size: 24,
    symbol: "回",
    tracking: 0,
    lane: "native-logographic-structural-control",
  },
  {
    id: "songti32",
    postscript: "STSongti-SC-Regular",
    size: 32,
    symbol: "回",
    tracking: 0,
    lane: "native-logographic-structural-control",
  },
];
await mkdir(out);
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  nativeGlyphResources: 4,
  conditionalNativeSlots: 4,
  immediateNativeRepeats: 4,
  reusedConventionalControls: 2,
  plannedPrimaryOrdinaryReaderSlots: 18,
  conditionalPassiveParityProfiles: 6,
  specs,
  passiveHash,
  sources: await sources([
    source + "run.mjs",
    source + "fonts.swift",
    root + "installed-fonts.txt",
    "docs/research/prose-qr/phase-60/PLAN.md",
    source + "holes.py",
    source + "common.mjs",
    root + "PLAN.md",
    source + "passive.mjs",
    previous + "geometry.mjs",
    previous + "common.mjs",
    previous + "ordinary.py",
    "experiments/prose-qr/layout.mjs",
    "src/core.mjs",
    "vendor/qrcodegen.mjs",
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
try {
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1000 },
    deviceScaleFactor: 1,
  });
  for (const spec of specs) {
    current = spec.id;
    const dir = out + spec.id + "/";
    await mkdir(dir);
    const face = `<style>@font-face{font-family:SmallCounter;src:local('${spec.postscript}');font-weight:400;font-style:normal}</style>`;
    await page.setContent(face);
    await page.evaluate(
      (size) => document.fonts.load(`400 ${size}px SmallCounter`),
      spec.size,
    );
    const m = await page.evaluate((size) => {
      const c = document.createElement("canvas").getContext("2d");
      c.font = `400 ${size}px SmallCounter`;
      c.fontKerning = "none";
      const measure = (s) => {
        const t = c.measureText(s);
        return {
          advance: t.width,
          left: t.actualBoundingBoxLeft,
          right: t.actualBoundingBoxRight,
          ascent: t.actualBoundingBoxAscent,
          descent: t.actualBoundingBoxDescent,
        };
      };
      return {
        glyphs: Object.fromEntries([..."人回. "].map((s) => [s, measure(s)])),
      };
    }, spec.size);
    const distance =
        4 * m.glyphs["人"].advance +
        m.glyphs[spec.symbol].advance +
        m.glyphs[" "].advance +
        6 * spec.tracking,
      leading = Math.round((distance / 4) * 64) / 64;
    const style = `font:400 ${spec.size}px/${leading}px SmallCounter;letter-spacing:${spec.tracking}px;font-kerning:none;font-variant-ligatures:none;white-space:pre;color:black`;
    const resource = documentHtml(
      `${face}<article id="artifact" style="position:relative;background:white;width:96px;height:96px"><pre id="text" style="position:absolute;left:24px;top:24px;margin:0;padding:0;${style}">${spec.symbol}</pre></article>`,
    );
    await save(dir + "glyph.html.gz", gzipSync(resource));
    await page.setContent(resource);
    await page.evaluate(() => document.fonts.ready);
    const glyphRect = await page.locator("#text").evaluate((e) => {
      const r = document.createRange();
      r.selectNodeContents(e);
      const b = r.getBoundingClientRect();
      return { left: b.left, top: b.top, width: b.width, height: b.height };
    });
    const glyphPNG = await page.locator("#artifact").screenshot();
    await save(dir + "glyph.png", glyphPNG);
    const raw = execFileSync(
      "python3",
      [source + "holes.py", dir + "glyph.png"],
      { encoding: "utf8", timeout: 10000 },
    );
    await save(dir + "holes.raw.json.gz", gzipSync(raw));
    const holes = JSON.parse(raw);
    await json(dir + "holes.json", holes);
    if (!holes.selected) {
      const c = {
        ...spec,
        dir,
        glyphPNG: sha(glyphPNG),
        rejected: true,
        reasons: ["No native enclosed ideograph structure"],
        nativeUnattempted: true,
        payload: null,
        phoneCandidate: false,
      };
      await json(dir + "capture.json", c);
      captures.push(c);
      continue;
    }
    const offset = {
      x: holes.selected.center[0] - glyphRect.left,
      y: holes.selected.center[1] - glyphRect.top,
    };
    const dimension =
        21 +
        4 *
          Math.round(
            (distance /
              (Math.min(holes.selected.bounds[2], holes.selected.bounds[3]) /
                3) +
              7 -
              21) /
              4,
          ),
      unit = distance / (dimension - 7);
    if (dimension < 21 || dimension > 177) {
      const capture = {
        ...spec,
        dir,
        dimension,
        unit,
        leading,
        sourceMetrics: m,
        rejected: true,
        reasons: ["Resource-derived nominal dimension outside21..177"],
        nativeUnattempted: true,
        payload: null,
        phoneCandidate: false,
      };
      await json(dir + "capture.json", capture);
      captures.push(capture);
      continue;
    }
    const lines = Array.from(
      { length: 16 },
      (_, row) =>
        Array.from({ length: 8 }, (_, col) =>
          row === 4 && (col === 4 || col === 5)
            ? `人人${spec.symbol}人人`
            : row === 8 && col === 4
              ? `人人${spec.symbol}人人`
              : "人人人人人",
        ).join(" ") + (row % 4 === 3 ? "." : ""),
    );
    const text = lines.join("\n");
    const html = documentHtml(
      `${face}<article id="artifact" style="position:relative;background:white;width:1440px;height:800px"><pre id="text" style="position:absolute;left:24px;top:24px;margin:0;padding:0;${style}">${escapeHtml(text)}</pre></article>`,
    );
    await save(dir + "native.html.gz", gzipSync(html));
    await save(dir + "native.txt", text);
    await json(dir + "recipe.json", {
      ...spec,
      leading,
      unit,
      dimension,
      distance,
      lines,
      sourceMetrics: m,
      glyphRect,
      offset,
      source: "Three native ideograph structural controls; no encoded payload",
      classification:
        "Threshold128 counter centroid used for source rendering/post-return diagnostics only",
    });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const native = await page.locator("#text").evaluate(
      (e, { offset, symbol }) => {
        const bbox = e.getBoundingClientRect(),
          counters = [];
        for (let i = 0; i < e.textContent.length; i++)
          if (e.textContent[i] === symbol) {
            const r = document.createRange();
            r.setStart(e.firstChild, i);
            r.setEnd(e.firstChild, i + 1);
            const b = r.getBoundingClientRect();
            counters.push({ x: b.left + offset.x, y: b.top + offset.y });
          }
        return {
          width: bbox.width,
          height: bbox.height,
          counters,
          textNodeOnly: e.children.length === 0,
          style: {
            size: getComputedStyle(e).fontSize,
            leading: getComputedStyle(e).lineHeight,
            weight: getComputedStyle(e).fontWeight,
            tracking: getComputedStyle(e).letterSpacing,
          },
        };
      },
      { offset, symbol: spec.symbol },
    );
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
    const [a, b, c] = native.counters,
      dx = b.x - a.x,
      dy = c.y - a.y;
    let minGap = Infinity;
    for (const line of lines)
      for (let k = 1; k < line.length; k++)
        if (line[k - 1] !== " " && line[k] !== " ")
          minGap = Math.min(
            minGap,
            m.glyphs[line[k - 1]].advance +
              spec.tracking -
              m.glyphs[line[k - 1]].right -
              m.glyphs[line[k]].left,
          );
    native.allLineMinimumInkGap = minGap;
    if (minGap < 0.25) reasons.push("Adjacent source ink bounds below0.25");
    if (clearance < 0.25) reasons.push("Row ink-bounds clearance below0.25");
    if (Math.abs(dx - dy) > 0.2 || Math.abs(c.x - a.x) > 0.2)
      reasons.push("Native counter triangle spacing drift");
    if (
      native.width + 24 > 1440 ||
      native.height + 24 > 800 ||
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
          y: Math.floor(a.y - 50),
          width: 400,
          height: 170,
        },
      }),
    );
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const repeat = await page.locator("#artifact").screenshot(),
      repeatExact = sha(repeat) === sha(png);
    if (!repeatExact) {
      await save(dir + "repeat.png", repeat);
      reasons.push("Native repeat mismatch");
    }
    const capture = {
      ...spec,
      dir,
      native,
      unit,
      dimension,
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
      { maxBuffer: 6000000 },
    );
    const width = c.width ?? 1440,
      height = c.height ?? 800;
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
    plannedPrimaryReaderSlots: 18,
    completedPrimaryReaderSlots: completedSlots,
    unattemptedPrimaryReaderSlots: 18 - completedSlots,
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
    plannedPrimaryReaderSlots: 18,
    completedPrimaryReaderSlots: completedSlots,
    completedPassiveProfiles: passiveProfiles,
  });
  throw e;
}
