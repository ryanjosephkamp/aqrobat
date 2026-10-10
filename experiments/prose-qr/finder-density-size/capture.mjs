import { chromium } from "playwright";
import {
  readFile,
  writeFile,
  appendFile,
  mkdir,
  readdir,
  stat,
} from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { format } from "prettier";
import assert from "node:assert/strict";
import { readBarcodes } from "zxing-wasm/reader";
import { decode, DECODER_PROVENANCE } from "../decoders.mjs";
import { documentHtml, positiveControl, escapeHtml } from "../layout.mjs";
import { solidTriplet, finderMatrix } from "../finder-native/layout.mjs";
import { probe, passiveHash } from "../finder-runs/probe.mjs";
const root = resolve("docs/research/prose-qr/phase-12"),
  source = resolve("experiments/prose-qr/finder-density-size");
const configPath = process.argv[2],
  config = JSON.parse(await readFile(configPath));
assert.match(config.batch, /^[a-z]+-[0-9]+$/);
const out = resolve(root, config.batch),
  hash = (b) => createHash("sha256").update(b).digest("hex");
async function bytes(p) {
  let n = 0;
  for (const e of await readdir(p, { withFileTypes: true })) {
    const q = resolve(p, e.name);
    n += e.isDirectory() ? await bytes(q) : (await stat(q)).size;
  }
  return n;
}
await mkdir(out);
await mkdir(resolve(out, "raw"));
async function save(p, b) {
  assert(
    (await bytes(root)) + (await bytes(source)) + Buffer.byteLength(b) <
      6500000,
    "Capture reserve reached",
  );
  await writeFile(resolve(out, p), b, { flag: "wx" });
  return hash(b);
}
const json = async (p, v) =>
  save(p, await format(JSON.stringify(v), { parser: "json" }));
const sources = {};
for (const p of [
  configPath,
  config.plan,
  "experiments/prose-qr/finder-density-size/capture.mjs",
  "experiments/prose-qr/finder-runs/probe.mjs",
  "experiments/prose-qr/finder-region/probe.mjs",
  "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  "experiments/prose-qr/decoders.mjs",
  "experiments/prose-qr/layout.mjs",
  "experiments/prose-qr/finder-native/layout.mjs",
])
  sources[p] = hash(await readFile(p));
await json("manifest.json", {
  startedAt: new Date().toISOString(),
  baseline: "54bcd9ece88ffb995559a48f431026acdaefe2ff",
  sources,
  passiveHash,
  decoder: DECODER_PROVENANCE,
  planned: config.specs.length,
  cap: 8000000,
  payloads: 0,
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const records = [],
  rejections = [];
let attempted = null;
try {
  const page = await browser.newPage({
    viewport: { width: 2000, height: 2000 },
    deviceScaleFactor: 1,
  });
  async function pixels(png) {
    const p = await page.evaluate(async (b) => {
      const i = new Image();
      i.src = "data:image/png;base64," + b;
      await i.decode();
      const c = document.createElement("canvas");
      c.width = i.width;
      c.height = i.height;
      const g = c.getContext("2d");
      g.drawImage(i, 0, 0);
      const a = g.getImageData(0, 0, c.width, c.height).data;
      let s = "";
      for (let n = 0; n < a.length; n += 32768)
        s += String.fromCharCode(...a.subarray(n, n + 32768));
      return { width: c.width, height: c.height, data: btoa(s) };
    }, png.toString("base64"));
    return { ...p, data: new Uint8ClampedArray(Buffer.from(p.data, "base64")) };
  }
  await page.setContent(
    documentHtml(positiveControl("https://example.com/", 656)),
  );
  const full = await page.locator("#artifact").screenshot(),
    fp = await pixels(full),
    fd = await decode(fp, "https://example.com/"),
    fz = await readBarcodes(fp, { formats: ["QRCode"] });
  assert(
    fd.jsQR.exact &&
      fd.zxing.exact &&
      fz.some((x) => x.text === "https://example.com/"),
  );
  const solid = { ...solidTriplet(), lines: [], offset: 0, lineHeight: 24 };
  await page.setContent(documentHtml(solid.markup));
  const solidPNG = await page.locator("#artifact").screenshot(),
    sp = await pixels(solidPNG),
    sd = probe(sp, solid);
  assert(sd.structurePass, "Solid structural gate failed");
  const blank = {
    width: 210,
    height: 210,
    data: new Uint8ClampedArray(210 * 210 * 4).fill(255),
  };
  const bd = probe(blank, { ...solid, unit: 6, side: 210 });
  assert(!bd.structurePass && !bd.ordinary.locations.length);
  await json("controls.json", {
    full: {
      path: "raw/full.png",
      pngSha256: await save("raw/full.png", full),
      rgbaSha256: hash(fp.data),
      width: fp.width,
      height: fp.height,
      baseline: fd,
      defaultZXing: fz.map((x) => x.text),
    },
    solid: {
      path: "raw/solid.png",
      pngSha256: await save("raw/solid.png", solidPNG),
      rgbaSha256: hash(sp.data),
      width: sp.width,
      height: sp.height,
      probe: sd,
    },
    blank: { rgbaSha256: hash(blank.data), probe: bd },
  });
  const seedRoot = "docs/research/prose-qr/phase-08/placement-01/",
    seed = (await readFile(seedRoot + "results.jsonl", "utf8"))
      .trim()
      .split("\n")
      .map(JSON.parse)[0];
  await page.setContent(
    gunzipSync(await readFile(seedRoot + seed.id + ".html.gz")).toString(),
  );
  await page.evaluate(() => document.fonts.ready);
  const seedPNG = await page.locator("#artifact").screenshot();
  await json("seed-replay.json", {
    id: seed.id,
    expected: seed.pngSha256,
    actual: hash(seedPNG),
    exact: hash(seedPNG) === seed.pngSha256,
  });
  assert.equal(hash(seedPNG), seed.pngSha256);
  for (const spec of config.specs) {
    attempted = spec.id;
    assert.match(spec.id, /^[a-z0-9-]+$/);
    const size = spec.size || 20,
      leading = spec.leading || 24,
      unit = spec.unit || 6,
      modules = spec.modules || 25,
      quiet = spec.quiet || 5,
      pad = quiet * unit,
      field = spec.textField || 7 * unit,
      side = Math.ceil((modules + 2 * quiet) * unit),
      offset = spec.offset ?? -12,
      dx = spec.dx ?? 7,
      lines = spec.lines;
    const pre = (i, x, y) =>
      `<pre id="corner-${i}" style="position:absolute;left:${pad + x * unit + dx}px;top:${pad + y * unit + offset}px;width:${field}px;margin:0;padding:0;font:400 ${size}px/${leading}px '${spec.font}',monospace;text-align:${spec.align || "left"};text-align-last:${spec.align === "justify" ? "justify" : "auto"};white-space:pre-wrap;letter-spacing:0px;font-kerning:none;font-variant-ligatures:none;color:black;overflow:visible">${escapeHtml(lines.join("\n"))}</pre>`;
    const markup = `<article id="artifact" style="position:relative;width:${side}px;height:${side}px;background:white;color:black;overflow:visible">${pre(0, 0, 0)}${pre(1, modules - 7, 0)}${pre(2, 0, modules - 7)}</article>`;
    const l = {
      spec,
      lines,
      plainText: lines.join("\n"),
      unit,
      modules,
      quiet,
      field,
      side,
      offset,
      lineHeight: leading,
      markup,
      matrix: finderMatrix(modules),
    };
    await json(spec.id + "-layout.json", l);
    const html = await format(documentHtml(markup), { parser: "html" });
    const htmlSha256 = await save(spec.id + ".html.gz", gzipSync(html)),
      txtSha256 = await save(spec.id + ".txt", l.plainText);
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const native = await page.locator("#corner-0").evaluate((e) => {
      const s = getComputedStyle(e),
        g = document.createElement("canvas").getContext("2d");
      g.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      g.fontKerning = "none";
      const glyphs = Object.fromEntries(
        [...new Set(e.textContent.replaceAll("\n", ""))].map((c) => {
          const m = g.measureText(c);
          return [
            c,
            {
              width: m.width,
              left: m.actualBoundingBoxLeft,
              right: m.actualBoundingBoxRight,
              ascent: m.actualBoundingBoxAscent,
              descent: m.actualBoundingBoxDescent,
            },
          ];
        }),
      );
      const envelope =
        Math.max(...Object.values(glyphs).map((a) => a.ascent)) +
        Math.max(...Object.values(glyphs).map((a) => a.descent));
      let minGap = Infinity;
      const advances = e.textContent.split("\n").map((row) => {
        let x = 0,
          right = null;
        for (const c of row) {
          const a = glyphs[c];
          if (c !== " ") {
            if (right !== null) minGap = Math.min(minGap, x - a.left - right);
            right = x + a.right;
          }
          x += a.width;
        }
        return x;
      });
      return {
        glyphs,
        envelope,
        clearance: parseFloat(s.lineHeight) - envelope,
        minAdjacentInkGap: minGap,
        advances,
        style: {
          font: s.fontFamily,
          size: s.fontSize,
          leading: s.lineHeight,
          weight: s.fontWeight,
          tracking: s.letterSpacing,
        },
        clientWidth: e.clientWidth,
        scrollWidth: e.scrollWidth,
      };
    });
    native.sourcePositions = await page.locator("#corner-0").evaluate((e) => {
      const text = e.firstChild,
        lines = e.textContent.split("\n"),
        box = e.getBoundingClientRect(),
        rows = [];
      let offset = 0;
      for (let row = 0; row < lines.length; row++) {
        if ([0, 13, 26, 39, 52].includes(row)) {
          const chars = [];
          for (let i = 0; i < lines[row].length; i++) {
            const range = document.createRange();
            range.setStart(text, offset + i);
            range.setEnd(text, offset + i + 1);
            const r = range.getBoundingClientRect();
            chars.push({
              char: lines[row][i],
              x: r.x - box.x,
              y: r.y - box.y,
              width: r.width,
              height: r.height,
            });
          }
          rows.push({ row, chars });
        }
        offset += lines[row].length + 1;
      }
      const cs = getComputedStyle(e);
      return {
        rows,
        align: cs.textAlign,
        alignLast: cs.textAlignLast,
        whiteSpace: cs.whiteSpace,
      };
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = await cdp.send("DOM.getDocument"),
      node = await cdp.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: "#corner-0",
      });
    native.platformFonts = (
      await cdp.send("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })
    ).fonts;
    await cdp.detach();
    const reasons = [];
    if (native.clearance < 2) reasons.push("Row ink clearance below 2 px");
    if (native.minAdjacentInkGap < 0)
      reasons.push("Adjacent letter ink bounding boxes overlap");
    if (
      native.advances.some((w) => w > field) ||
      native.scrollWidth > Math.ceil(field) + 1
    )
      reasons.push("Source line overflow");
    if (
      native.platformFonts.some(
        (f) => f.familyName !== (spec.platformFamily || spec.font),
      )
    )
      reasons.push("Font substitution");
    await json(spec.id + "-native.json", native);
    if (native.advances.some((w) => w > field)) {
      const rejection = {
        id: spec.id,
        spec,
        reasons,
        nativeCaptured: false,
        htmlSha256,
        txtSha256,
      };
      rejections.push(rejection);
      await json(spec.id + "-rejection.json", rejection);
      console.log(JSON.stringify({ rejected: spec.id, reasons }));
      continue;
    }
    for (let i = 0; i < 3; i++) {
      assert.equal(
        await page.locator("#corner-" + i).textContent(),
        l.plainText,
      );
      assert.equal(await page.locator("#corner-" + i + " *").count(), 0);
    }
    const png = await page.locator("#artifact").screenshot(),
      pngSha256 = await save("raw/" + spec.id + ".png", png),
      p = await pixels(png),
      result = probe(p, l);
    const probeSha256 = await save(
      spec.id + "-probe.json.gz",
      gzipSync(JSON.stringify(result)),
    );
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const repeat = await page.locator("#artifact").screenshot();
    if (hash(repeat) !== pngSha256)
      await save("raw/" + spec.id + "-repeat.png", repeat);
    const selected = Object.fromEntries(
      Object.entries(result.selected).map(([k, a]) => [
        k,
        {
          ...a,
          quad: a.quad
            ? { top: a.quad.top, bottom: a.quad.bottom, height: a.quad.height }
            : null,
        },
      ]),
    );
    const r = {
      id: spec.id,
      spec,
      path: "raw/" + spec.id + ".png",
      pngSha256,
      rgbaSha256: hash(p.data),
      htmlSha256,
      txtSha256,
      probeSha256,
      width: p.width,
      height: p.height,
      ordinary: result.ordinary,
      selected,
      allScoredCount: result.allScoredRuns.length,
      completeFourAxisScoredCount: result.allScoredMetrics.filter(
        (a) => a.completeAxes === 4,
      ).length,
      structurePass: result.structurePass,
      legibility: {
        automaticRejected: reasons.length > 0,
        reasons,
        agentVisual: "pending",
        owner: "untested",
      },
      repeatExact: hash(repeat) === pngSha256,
      payload: null,
      phoneCandidate: false,
    };
    records.push(r);
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
    console.log(
      JSON.stringify({
        id: spec.id,
        locations: result.ordinary.locations.length,
        intended: result.ordinary.correctFinder,
        completeAllCandidates: r.completeFourAxisScoredCount,
        selected: Object.fromEntries(
          Object.entries(selected).map(([k, a]) => [
            k,
            {
              axes: a.records[0]?.metric.completeAxes ?? 0,
              rms: a.records[0]?.metric.worstRMS ?? null,
              quad: a.quad,
              balance: a.quadBalance,
              stable: a.stableWideRowFraction,
            },
          ]),
        ),
        structurePass: r.structurePass,
        reasons,
        repeat: r.repeatExact,
      }),
    );
  }
  await json("summary.json", {
    finishedAt: new Date().toISOString(),
    planned: config.specs.length,
    captured: records.length,
    rejections,
    exactRepeats: records.filter((a) => a.repeatExact).length,
    intended: records.filter((a) => a.ordinary.correctFinder).length,
    structuralPasses: records.filter(
      (a) => a.structurePass && !a.legibility.automaticRejected,
    ).length,
    payloads: 0,
    phoneCandidates: 0,
  });
} catch (e) {
  await json("aborted.json", {
    at: new Date().toISOString(),
    attempted,
    completed: records.map((a) => a.id),
    rejections,
    error: e.stack,
  });
  throw e;
} finally {
  await browser.close();
}
