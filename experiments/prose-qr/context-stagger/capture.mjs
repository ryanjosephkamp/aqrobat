import { mkdir, readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import jsQR from "jsqr";
import { readBarcodes } from "zxing-wasm/reader";
import { DECODER_PROVENANCE } from "../decoders.mjs";
import { documentHtml, escapeHtml } from "../layout.mjs";
import { probe, passiveHash } from "../finder-runs/probe.mjs";
import { auditSymbol } from "../finder-page/symbol-audit.mjs";
import { solidTriplet } from "../finder-native/layout.mjs";

const root = "docs/research/prose-qr/phase-33/",
  source = "experiments/prose-qr/context-stagger/";
const configPath = process.argv[2],
  config = JSON.parse(await readFile(configPath));
assert.equal(config.specs.length, 1);
assert.match(config.batch, /^run-0[1-2]$/);
const spec = config.specs[0],
  out = root + config.batch + "/",
  sha = (b) => createHash("sha256").update(b).digest("hex");
async function bytes(p) {
  let n = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = p + "/" + e.name;
    n += e.isDirectory() ? await bytes(q) : (await stat(q)).size;
  }
  return n;
}
async function save(p, b) {
  assert(
    (await bytes(root)) + (await bytes(source)) + Buffer.byteLength(b) <
      8500000,
    "Phase capture reserve reached",
  );
  await writeFile(out + p, b, { flag: "wx" });
  return sha(b);
}
const json = async (p, v) =>
  save(p, await format(JSON.stringify(v), { parser: "json" }));
await mkdir(out);
await json("manifest.json", {
  at: new Date().toISOString(),
  baseline: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  plannedNative: 1,
  plannedRepeat: 1,
  plannedFullControl: 1,
  plannedSolidControl: 1,
  cap: 10000000,
  decoder: DECODER_PROVENANCE,
  passiveHash,
  sources: Object.fromEntries(
    await Promise.all(
      [
        source + "capture.mjs",
        source + "proposal.mjs",
        "experiments/prose-qr/context-stability/capture.mjs",
        configPath,
        root + "PLAN.md",
        "experiments/prose-qr/finder-runs/probe.mjs",
        "experiments/prose-qr/finder-region/probe.mjs",
        "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
        "experiments/prose-qr/finder-page/symbol-audit.mjs",
        "experiments/prose-qr/layout.mjs",
        "experiments/prose-qr/decoders.mjs",
      ].map(async (p) => [p, sha(await readFile(p))]),
    ),
  ),
});
const pad = 5 * spec.unit,
  side = 35 * spec.unit;
const markup = `<article id="artifact" style="position:relative;width:${side}px;height:${side}px;background:white;overflow:visible"><pre id="text" style="position:absolute;left:${pad}px;top:${pad}px;width:${spec.textField}px;padding:0;margin:0;font:400 ${spec.size}px/${spec.leading}px 'Monaco',monospace;white-space:pre;text-align:left;letter-spacing:0;font-kerning:none;font-variant-ligatures:none;color:black">${escapeHtml(spec.lines.join("\n"))}</pre></article>`;
const html = await format(documentHtml(markup), { parser: "html" });
await save("native.html.gz", gzipSync(html));
await save("native.txt", spec.lines.join("\n"));
let browser,
  strictNativeStructure = null;
async function pixels(path, expected) {
  const png = await readFile(path);
  assert.equal(sha(png), expected);
  const data = execFileSync(
    "python3",
    [
      "-c",
      "import cv2,sys; i=cv2.imread(sys.argv[1]); sys.stdout.buffer.write(cv2.cvtColor(i,cv2.COLOR_BGR2RGBA).tobytes())",
      path,
    ],
    { maxBuffer: 250000000 },
  );
  return data;
}
try {
  browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1600 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.locator("#text").textContent(),
    spec.lines.join("\n"),
  );
  assert.equal(await page.locator("#text *").count(), 0);
  const native = await page.locator("#text").evaluate((e) => {
    const cs = getComputedStyle(e),
      g = document.createElement("canvas").getContext("2d");
    g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.fontKerning = "none";
    const glyphs = Object.fromEntries(
      [...new Set(e.textContent.replaceAll("\n", ""))].map((c) => {
        const m = g.measureText(c);
        return [
          c,
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
    const lines = e.textContent.split("\n"),
      advances = lines.map((l) =>
        [...l].reduce((n, c) => n + glyphs[c].advance, 0),
      );
    let minGap = Infinity;
    for (const l of lines) {
      let x = 0,
        right = null;
      for (const c of l) {
        const a = glyphs[c];
        if (c !== " ") {
          if (right !== null) minGap = Math.min(minGap, x - a.left - right);
          right = x + a.right;
        }
        x += a.advance;
      }
    }
    const envelope =
        Math.max(...Object.values(glyphs).map((a) => a.ascent)) +
        Math.max(...Object.values(glyphs).map((a) => a.descent)),
      rect = e.getBoundingClientRect();
    return {
      glyphs,
      advances,
      minGap,
      envelope,
      clearance: parseFloat(cs.lineHeight) - envelope,
      width: rect.width,
      height: rect.height,
      scrollWidth: e.scrollWidth,
      rows: lines.length,
      style: {
        family: cs.fontFamily,
        size: cs.fontSize,
        leading: cs.lineHeight,
        weight: cs.fontWeight,
        tracking: cs.letterSpacing,
        color: cs.color,
        whiteSpace: cs.whiteSpace,
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
  if (native.clearance < 2) reasons.push("Row ink clearance below 2px");
  if (native.minGap < 0) reasons.push("Adjacent native ink overlap");
  if (
    native.advances.some((x) => x > spec.textField) ||
    native.scrollWidth > spec.textField + 1 ||
    native.height !== native.rows * spec.leading
  )
    reasons.push("Native wrap/overflow");
  if (native.platformFonts.some((f) => f.familyName !== spec.platformFamily))
    reasons.push("Native font substitution");
  if (parseFloat(native.style.size) < 14) reasons.push("Font size below 14px");
  await json("native-metrics.json", {
    ...native,
    reasons,
    automaticRejected: reasons.length > 0,
    owner: "untested",
    agent: "pending excerpt observation",
  });
  const png = await page.locator("#artifact").screenshot(),
    pngSha256 = await save("native.png", png);
  await save(
    "letters.png",
    await page.screenshot({
      clip: { x: pad, y: pad, width: 720, height: 168 },
    }),
  );
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const repeat = await page.locator("#artifact").screenshot(),
    repeatSha256 = sha(repeat);
  if (repeatSha256 !== pngSha256) await save("repeat.png", repeat);
  await json("capture.json", {
    pngSha256,
    repeatSha256,
    repeatExact: pngSha256 === repeatSha256,
    width: side,
    height: side,
    reasons,
    phoneCandidate: false,
  });
  await browser.close();
  browser = null;
  const controlBase = "docs/research/prose-qr/phase-12/run-01/",
    controls = JSON.parse(await readFile(controlBase + "controls.json"));
  for (const [id, path, expected, width] of [
    [
      "control",
      controlBase + controls.full.path,
      controls.full.pngSha256,
      controls.full.width,
    ],
    ["native", out + "native.png", pngSha256, side],
  ]) {
    const data = await pixels(path, expected),
      p = { data: new Uint8ClampedArray(data), width, height: width };
    assert.equal(data.length, width * width * 4);
    await json(id + "-pixels.json", {
      path,
      pngSha256: expected,
      rgbaSha256: sha(data),
      width,
      height: width,
    });
    const r = jsQR(p.data, width, width, { inversionAttempts: "attemptBoth" });
    await json(id + "-jsqr.json", {
      options: { inversionAttempts: "attemptBoth" },
      found: !!r,
      text: r?.data ?? null,
      bytes: r?.binaryData ?? null,
      exact: id === "control" && r?.data === "https://example.com/",
      location: r?.location ?? null,
    });
    for (const [name, options] of [
      ["zxing-default", { formats: ["QRCode"] }],
      ["zxing-errors-diagnostic", { formats: ["QRCode"], returnErrors: true }],
    ]) {
      const found = await readBarcodes(p, options),
        records = [];
      for (const [i, r] of found.entries()) {
        const record = {
          isValid: r.isValid,
          error: r.error,
          text: r.text,
          bytes: Array.from(r.bytes ?? []),
          position: r.position,
          width: r.symbol?.width,
          height: r.symbol?.height,
        };
        if (r.symbol?.data?.length) {
          record.symbolPath = `${id}-${name}-${i}.bin`;
          record.symbolSha256 = await save(
            record.symbolPath,
            Buffer.from(r.symbol.data),
          );
        }
        if (id === "native")
          record.finderAudit = auditSymbol(r, {
            unit: spec.unit,
            quiet: 5,
            modules: 25,
          });
        records.push(record);
      }
      await json(id + "-" + name + ".json", {
        options,
        results: records,
        classification: name.includes("diagnostic")
          ? "Error-reporting diagnostic; not ordinary acceptance"
          : "Ordinary unchanged profile",
        exact:
          id === "control" &&
          records.some((r) => r.isValid && r.text === "https://example.com/"),
      });
    }
    if (id === "native") {
      const l = {
        unit: spec.unit,
        quiet: 5,
        modules: 25,
        matrix: spec.matrix,
        lines: spec.lines,
        offset: 0,
        lineHeight: spec.leading,
      };
      const q = probe(p, l);
      strictNativeStructure = q.structurePass;
      await save("native-stroke-probe.json.gz", gzipSync(JSON.stringify(q)));
      await json("native-stroke-summary.json", {
        classification:
          "Post-return full-resolution ordinary jsQR binarization; separate from sampled-symbol diagnostics",
        structurePass: q.structurePass,
        correctFinder: q.ordinary.correctFinder,
        locations: q.ordinary.locations,
        selected: q.selected,
        regionComponents: q.regionComponents,
        scoredRunCount: q.allScoredRuns.length,
        quadCount: q.allQuads.length,
        passiveReturnsMatch: q.passiveReturnsMatch,
      });
    }
  }
  const sbase = "docs/research/prose-qr/phase-10/dense-02/",
    sc = JSON.parse(await readFile(sbase + "controls.json")).solid,
    sdata = await pixels(sbase + sc.path, sc.pngSha256);
  assert.equal(sha(sdata), sc.rgbaSha256);
  const solid = { ...solidTriplet(), lines: [], offset: 0, lineHeight: 24 };
  const sq = probe(
    { data: new Uint8ClampedArray(sdata), width: sc.width, height: sc.height },
    solid,
  );
  await save("solid-stroke-probe.json.gz", gzipSync(JSON.stringify(sq)));
  assert(sq.structurePass, "Solid structural control failed");
  await json("done.json", {
    native: 1,
    repeat: 1,
    fullControl: 1,
    solidControl: 1,
    strictNativeStructure,
    goal: "unsolved",
    phoneTests: 0,
  });
  console.log(
    JSON.stringify({
      batch: config.batch,
      repeatExact: pngSha256 === repeatSha256,
      mechanicalRejected: reasons.length > 0,
    }),
  );
} catch (e) {
  await json("aborted.json", { at: new Date().toISOString(), error: e.stack });
  throw e;
} finally {
  if (browser) await browser.close();
}
