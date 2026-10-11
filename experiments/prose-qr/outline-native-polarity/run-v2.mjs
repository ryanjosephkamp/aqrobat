import { chromium } from "playwright";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gzipSync, gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import { root, source, sha, save, json, sources } from "./common.mjs";
import { passive, passiveHash } from "./passive.mjs";
const previous = "experiments/prose-qr/context-letter-counters/",
  out = root + "run-02/";
await mkdir(out);
const specs = [
  {
    id: "arial-outline-dark",
    base: "docs/research/prose-qr/phase-70/run-01/outline-4/",
  },
  {
    id: "phosphate-outline-dark",
    base: "docs/research/prose-qr/phase-71/run-01/phosphate-solid-outline/",
  },
];
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  specs,
  plannedNativeSources: 2,
  plannedPrimaryReaderSlots: 12,
  passiveProfiles: 4,
  passiveHash,
  sources: await sources([
    source + "run-v2.mjs",
    source + "common.mjs",
    source + "passive.mjs",
    root + "PLAN.md",
    previous + "ordinary.py",
    previous + "geometry.mjs",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
    "experiments/prose-qr/finder-runs/probe.mjs",
    ...specs.flatMap((s) =>
      ["native.html.gz", "native.txt", "capture.json", "recipe.json"].map(
        (n) => s.base + n,
      ),
    ),
  ]),
});
const captures = [];
let current = null;
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
try {
  const page = await browser.newPage({
    viewport: { width: 2600, height: 1400 },
    deviceScaleFactor: 1,
  });
  for (const spec of specs) {
    current = spec.id;
    const dir = out + spec.id + "/";
    await mkdir(dir);
    const prior = JSON.parse(await readFile(spec.base + "capture.json"));
    assert(!prior.rejected);
    const original = gunzipSync(
      await readFile(spec.base + "native.html.gz"),
    ).toString();
    assert.equal(original.split("background:white;width:2600px").length, 2);
    assert.equal(
      original.split("color:white;-webkit-text-stroke:4px black").length,
      2,
    );
    const html = original
      .replace("background:white;width:2600px", "background:black;width:2600px")
      .replace(
        "color:white;-webkit-text-stroke:4px black",
        "color:black;-webkit-text-stroke:4px white",
      );
    await save(dir + "native.html.gz", gzipSync(html));
    const text = await readFile(spec.base + "native.txt", "utf8");
    await save(dir + "native.txt", text);
    await json(dir + "recipe.json", {
      prior: spec.base,
      priorPNGSha256: prior.pngSha256,
      changes:
        "Uniform native page black and visible white outline with black fill only",
      unit: prior.unit,
      dimension: prior.dimension,
    });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const native = await page.locator("#text").evaluate((e) => {
      const b = e.getBoundingClientRect(),
        targetOrigins = [];
      for (let i = 0; i < e.textContent.length; i++)
        if (e.textContent[i] === "O") {
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
        }
      return {
        width: b.width,
        height: b.height,
        targetOrigins,
        text: e.textContent,
        textNodeOnly: e.children.length === 0,
        style: {
          size: getComputedStyle(e).fontSize,
          leading: getComputedStyle(e).lineHeight,
          stroke: getComputedStyle(e).webkitTextStrokeWidth,
          strokeColor: getComputedStyle(e).webkitTextStrokeColor,
          fill: getComputedStyle(e).color,
          background: getComputedStyle(e.parentElement).backgroundColor,
        },
      };
    });
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
    const reasons = [];
    if (native.text !== text || !native.textNodeOnly)
      reasons.push("Text/markup mismatch");
    if (
      native.width !== prior.native.width ||
      native.height !== prior.native.height
    )
      reasons.push("Dimensions drift");
    if (
      native.platformFonts.some((f) => f.postScriptName !== prior.postscript) ||
      !native.platformFonts.length
    )
      reasons.push("Font substitution");
    assert.equal(native.targetOrigins.length, 3);
    native.originDrifts = native.targetOrigins.map((o, i) =>
      Math.hypot(
        o.left - prior.native.targetOrigins[i].left,
        o.top - prior.native.targetOrigins[i].top,
      ),
    );
    if (native.originDrifts.some((d) => d > 0.2)) reasons.push("Origin drift");
    native.counters = prior.native.counters;
    native.allLineMinimumExpandedInkGap =
      prior.native.allLineMinimumExpandedInkGap;
    if (native.allLineMinimumExpandedInkGap < 0.25 || prior.clearance < 0.25)
      reasons.push("Ink clearance");
    const png = await page.locator("#artifact").screenshot();
    await save(dir + "native.png", png);
    const a = native.counters[0];
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
    const repeat = await page.locator("#artifact").screenshot();
    if (sha(png) !== sha(repeat)) {
      await save(dir + "repeat.png", repeat);
      reasons.push("Repeat mismatch");
    }
    const c = {
      ...prior,
      ...spec,
      dir,
      native,
      pngPath: dir + "native.png",
      pngSha256: sha(png),
      repeatSha256: sha(repeat),
      repeatExact: sha(png) === sha(repeat),
      reasons,
      rejected: !!reasons.length,
      lane: "styled-Latin-outline-dark-page",
      payload: null,
      phoneCandidate: false,
    };
    await json(dir + "capture.json", c);
    captures.push(c);
    console.log(JSON.stringify({ id: spec.id, reasons }));
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
    plannedPrimaryReaderSlots: 12,
    completedPrimaryReaderSlots: completedSlots,
    unattemptedPrimaryReaderSlots: 12 - completedSlots,
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
    plannedPrimaryReaderSlots: 12,
    completedPrimaryReaderSlots: completedSlots,
    completedPassiveProfiles: passiveProfiles,
  });
  throw e;
}
