import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import { root, source, sha, save, json, sources } from "./common.mjs";
import { documentHtml, escapeHtml } from "../layout.mjs";
import { probe, passiveHash } from "../finder-runs/probe.mjs";
import { packProbe } from "../context-probe-pack/probe-pack.mjs";
import { solidTriplet } from "../finder-native/layout.mjs";
import { DECODER_PROVENANCE } from "../decoders.mjs";
const configPath = process.argv[2];
const spec = JSON.parse(await readFile(configPath));
assert(["run-01", "run-02"].includes(spec.batch));
const out = root + spec.batch + "/";
await mkdir(out);
await json(out + "manifest.json", {
  at: new Date().toISOString(),
  decoder: DECODER_PROVENANCE,
  passiveHash,
  nativeSlots: 1,
  nativeImmediateRepeats: 1,
  conventionalControlSlots: spec.batch === "run-01" ? 3 : 0,
  ordinaryNativeSlots: 3,
  solidProbe: spec.batch === "run-01" ? 1 : 0,
  sources: await sources([
    source + "capture.mjs",
    source + "common.mjs",
    source + "ordinary.py",
    configPath,
    root + "PLAN.md",
    root + "proposal-01/manifest.json",
    "experiments/prose-qr/layout.mjs",
    "experiments/prose-qr/finder-runs/probe.mjs",
    "experiments/prose-qr/finder-region/probe.mjs",
    "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
    "experiments/prose-qr/context-probe-pack/probe-pack.mjs",
    "experiments/prose-qr/decoders.mjs",
    "experiments/prose-qr/finder-native/layout.mjs",
  ]),
});
const text = spec.lines.join("\n");
const html = documentHtml(
  `<style>@font-face{font-family:NativeFace;src:local('${spec.font.postscript}');font-weight:400;font-style:normal}</style><article id="artifact" style="position:relative;width:${spec.side}px;height:${spec.side}px;background:white;overflow:visible"><pre id="text" style="position:absolute;left:${spec.sourceLeft}px;top:${spec.sourceTop}px;margin:0;padding:0;font:400 ${spec.size}px/${spec.leading}px NativeFace;letter-spacing:0;font-kerning:none;font-variant-ligatures:none;white-space:pre;color:black">${escapeHtml(text)}</pre></article>`,
);
await save(out + "native.html.gz", gzipSync(html));
await save(out + "native.txt", text);
let browser;
async function pixels(path, expected) {
  const b = await readFile(path);
  assert.equal(sha(b), expected);
  const data = execFileSync(
    "python3",
    [
      "-c",
      "import cv2,sys;a=cv2.imread(sys.argv[1]);sys.stdout.buffer.write(cv2.cvtColor(a,cv2.COLOR_BGR2RGBA).tobytes())",
      path,
    ],
    { maxBuffer: 140000000 },
  );
  return data;
}
async function ordinary(id, path, pngSha256, width, height) {
  const raw = execFileSync("python3", [source + "ordinary.py", path], {
    encoding: "utf8",
    timeout: 90000,
    maxBuffer: 1000000,
  });
  await save(out + id + "-opencv.raw.json.gz", gzipSync(raw));
  const cv = JSON.parse(raw);
  await json(out + id + "-opencv.json", cv);
  const data = await pixels(path, pngSha256),
    p = { data: new Uint8ClampedArray(data), width, height };
  assert.equal(data.length, width * height * 4);
  await json(out + id + "-pixels.json", {
    path,
    pngSha256,
    rgbaSha256: sha(data),
    width,
    height,
  });
  const z = await readBarcodes(p, { formats: ["QRCode"] });
  await json(out + id + "-zxing.json", {
    options: { formats: ["QRCode"] },
    results: z.map((r) => ({
      isValid: r.isValid,
      text: r.text,
      bytes: Array.from(r.bytes ?? []),
      error: r.error,
      position: r.position,
    })),
    exactURL: z.some((r) => r.isValid && r.text === "https://example.com/"),
  });
  const j = jsQR(p.data, width, height, { inversionAttempts: "attemptBoth" });
  await json(out + id + "-jsqr.json", {
    options: { inversionAttempts: "attemptBoth" },
    found: !!j,
    text: j?.data ?? null,
    bytes: j?.binaryData ?? null,
    location: j?.location ?? null,
    exactURL: j?.data === "https://example.com/",
  });
  return p;
}
try {
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1200 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("#text").textContent(), text);
  assert.equal(await page.locator("#text *").count(), 0);
  const native = await page.locator("#text").evaluate((e) => {
    const c = getComputedStyle(e),
      r = e.getBoundingClientRect();
    return {
      width: r.width,
      height: r.height,
      scrollWidth: e.scrollWidth,
      style: {
        font: c.fontFamily,
        size: c.fontSize,
        weight: c.fontWeight,
        leading: c.lineHeight,
        tracking: c.letterSpacing,
        color: c.color,
        whiteSpace: c.whiteSpace,
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
  if (
    native.platformFonts.some((f) => f.postScriptName !== spec.font.postscript)
  )
    reasons.push("Font substitution");
  if (
    native.scrollWidth + spec.sourceLeft > spec.side ||
    native.width + spec.sourceLeft > spec.side ||
    native.height + spec.sourceTop > spec.side ||
    Math.abs(native.height - spec.lines.length * spec.leading) > 0.1
  )
    reasons.push("Native overflow/wrap");
  if (spec.leading - spec.envelope < spec.clearance - 0.02)
    reasons.push("Native row clearance rejection");
  const row = spec.lines[0];
  let minGap = Infinity;
  for (let i = 1; i < row.length; i++)
    if (row[i] !== " " && row[i - 1] !== " ")
      minGap = Math.min(
        minGap,
        spec.glyphs[row[i - 1]].advance -
          spec.glyphs[row[i - 1]].right -
          spec.glyphs[row[i]].left,
      );
  if (minGap < 0) reasons.push("Ink bounds overlap");
  await json(out + "native-metrics.json", {
    ...native,
    minGap,
    clearance: spec.leading - spec.envelope,
    reasons,
    automaticRejected: !!reasons.length,
    ownerLegibility: "untested",
    agent: "pending full-context excerpt inspection",
  });
  const png = await page.locator("#artifact").screenshot(),
    pngHash = await save(out + "native.png", png);
  await save(
    out + "letters.png",
    await page.screenshot({
      clip: { x: 800, y: 800, width: 720, height: 180 },
    }),
  );
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const repeat = await page.locator("#artifact").screenshot(),
    exact = sha(repeat) === pngHash;
  if (!exact) await save(out + "repeat.png", repeat);
  await json(out + "capture.json", {
    pngSha256: pngHash,
    repeatSha256: sha(repeat),
    repeatExact: exact,
    side: spec.side,
    reasons,
    payload: null,
    phoneCandidate: false,
  });
  await browser.close();
  browser = null;
  if (!exact || reasons.length) {
    await json(out + "rejection.json", {
      reasons: [...reasons, ...(!exact ? ["Native repeat mismatch"] : [])],
      ordinarySlotsUnattempted: 3,
    });
    process.exitCode = 2;
  } else {
    if (spec.batch === "run-01") {
      const p = "docs/research/prose-qr/phase-12/run-01/",
        c = JSON.parse(await readFile(p + "controls.json")).full;
      await ordinary("control", p + c.path, c.pngSha256, c.width, c.height);
    }
    const p = await ordinary(
      "native",
      out + "native.png",
      pngHash,
      spec.side,
      spec.side,
    );
    const l = {
      unit: spec.unit,
      quiet: 5,
      modules: 25,
      matrix: spec.matrix,
      lines: spec.lines,
      offset: 0,
      lineHeight: spec.leading,
    };
    const q = probe(p, l),
      packed = packProbe(q);
    await save(out + "native-stroke-core.json.gz", packed.coreGzip);
    await save(out + "native-stroke-geometry.f64.gz", packed.geometryGzip);
    await json(out + "native-stroke-pack.json", packed.descriptor);
    await json(out + "native-stroke-summary.json", {
      structurePass: q.structurePass,
      correctFinder: q.ordinary.correctFinder,
      locations: q.ordinary.locations,
      selected: q.selected,
      regionComponents: q.regionComponents,
      passiveReturnsMatch: q.passiveReturnsMatch,
      runs: q.allScoredRuns.length,
      quads: q.allQuads.length,
      classification:
        "Actual selected full-native ordinary jsQR binarization; not source-aligned samples or threshold replicas",
    });
    if (spec.batch === "run-01") {
      const base = "docs/research/prose-qr/phase-10/dense-02/",
        c = JSON.parse(await readFile(base + "controls.json")).solid;
      const b = await pixels(base + c.path, c.pngSha256);
      assert.equal(sha(b), c.rgbaSha256);
      const sq = probe(
        { data: new Uint8ClampedArray(b), width: c.width, height: c.height },
        { ...solidTriplet(), lines: [], offset: 0, lineHeight: 24 },
      );
      await save(
        out + "solid-stroke-probe.json.gz",
        gzipSync(JSON.stringify(sq)),
      );
      assert(sq.structurePass);
    }
    await json(out + "done.json", {
      native: 1,
      exactRepeat: 1,
      ordinaryNativeSlots: 3,
      nativeStructurePass: q.structurePass,
      encodedPayloads: 0,
      phoneCandidates: 0,
      goal: "unsolved",
    });
    console.log(
      JSON.stringify({
        batch: spec.batch,
        exactRepeat: exact,
        structurePass: q.structurePass,
      }),
    );
  }
} catch (e) {
  await json(out + "aborted.json", {
    error: e.stack,
    at: new Date().toISOString(),
  });
  throw e;
} finally {
  if (browser) await browser.close();
}
