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
import { solidTriplet } from "../finder-native/layout.mjs";
import { proposal } from "./pitch-proposal.mjs";
import { probe, passiveHash } from "./probe.mjs";
const root = resolve("docs/research/prose-qr/phase-08"),
  out = resolve(root, "placement-01");
const hash = (b) => createHash("sha256").update(b).digest("hex");
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
    (await bytes(root)) +
      (await bytes("experiments/prose-qr/finder-region")) +
      Buffer.byteLength(b) <
      2800000,
    "Phase capture reserve",
  );
  await writeFile(resolve(out, p), b, { flag: "wx" });
  return hash(b);
}
const json = async (p, v) =>
  save(p, await format(JSON.stringify(v), { parser: "json" }));
const metrics = JSON.parse(
  await readFile("docs/research/prose-qr/phase-06/font-metrics.json", "utf8"),
);
const sources = {};
for (const p of [
  "experiments/prose-qr/finder-region/placement-capture.mjs",
  "experiments/prose-qr/finder-region/probe.mjs",
  "experiments/prose-qr/finder-region/pitch-proposal.mjs",
  "docs/research/prose-qr/phase-08/PLACEMENT-PLAN.md",
  "docs/research/prose-qr/phase-08/pitch-01/impact-pitch-6-layout.json",
  "docs/research/prose-qr/phase-08/PLAN.md",
  "docs/research/prose-qr/phase-06/font-metrics.json",
  "experiments/prose-qr/glyph-geometry/diagnostic.mjs",
  "experiments/prose-qr/decoders.mjs",
  "experiments/prose-qr/layout.mjs",
])
  sources[p] = hash(await readFile(p));
await json("manifest.json", {
  startedAt: new Date().toISOString(),
  baseline: "3bead571699cc767d03d5f96e829c0c85f694dd4",
  sources,
  passiveHash,
  decoder: DECODER_PROVENANCE,
  maxNative: 3,
  cap: 3000000,
  noPayloads: true,
});
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const records = [],
  selections = [],
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
      const ctx = c.getContext("2d");
      ctx.drawImage(i, 0, 0);
      const a = ctx.getImageData(0, 0, c.width, c.height).data;
      let raw = "";
      for (let n = 0; n < a.length; n += 32768)
        raw += String.fromCharCode(...a.subarray(n, n + 32768));
      return { width: c.width, height: c.height, data: btoa(raw) };
    }, png.toString("base64"));
    return { ...p, data: new Uint8ClampedArray(Buffer.from(p.data, "base64")) };
  }
  await page.setContent(
    documentHtml(positiveControl("https://example.com/", 656)),
  );
  const full = await page.locator("#artifact").screenshot(),
    fp = await pixels(full),
    fdecode = await decode(fp, "https://example.com/"),
    fz = await readBarcodes(fp, { formats: ["QRCode"] });
  assert(
    fdecode.jsQR.exact &&
      fdecode.zxing.exact &&
      fz.some((x) => x.text === "https://example.com/"),
  );
  const solid = solidTriplet();
  solid.lines = [];
  solid.offset = 0;
  solid.lineHeight = 24;
  await page.setContent(documentHtml(solid.markup));
  const spng = await page.locator("#artifact").screenshot(),
    sp = await pixels(spng),
    sd = probe(sp, solid);
  assert(sd.ordinary.correctFinder);
  await json("controls.json", {
    full: {
      path: "raw/full.png",
      pngSha256: await save("raw/full.png", full),
      rgbaSha256: hash(fp.data),
      width: fp.width,
      height: fp.height,
      baseline: fdecode,
      defaultZXing: fz.map((r) => r.text),
    },
    solid: {
      path: "raw/solid.png",
      pngSha256: await save("raw/solid.png", spng),
      rgbaSha256: hash(sp.data),
      width: sp.width,
      height: sp.height,
      probe: sd,
    },
  });
  const seedBase = "docs/research/prose-qr/phase-06/seam-02/";
  const seed = (await readFile(seedBase + "results.jsonl", "utf8"))
    .trim()
    .split("\n")
    .map(JSON.parse)
    .find((x) => x.id === "seam-01");
  await page.setContent(
    gunzipSync(await readFile(seedBase + "seam-01.html.gz")).toString(),
  );
  await page.evaluate(() => document.fonts.ready);
  const seedPNG = await page.locator("#artifact").screenshot();
  await json("seed-replay.json", {
    expected: seed.pngSha256,
    actual: hash(seedPNG),
    exact: hash(seedPNG) === seed.pngSha256,
  });
  assert.equal(hash(seedPNG), seed.pngSha256);
  function rebuild(l) {
    const pad = l.unit * 5;
    const pre = (i, x, y) =>
      `<pre id="corner-${i}" style="position:absolute;left:${pad + x * l.unit}px;top:${pad + y * l.unit + l.offset}px;width:${l.field}px;margin:0;padding:0;font:400 20px/24px '${l.spec.font}',monospace;letter-spacing:0px;font-kerning:none;font-variant-ligatures:none;color:black;overflow:visible">${escapeHtml(l.lines.join("\n"))}</pre>`;
    l.plainText = l.lines.join("\n");
    l.markup = `<article id="artifact" style="position:relative;width:${l.unit * 35}px;height:${l.unit * 35}px;background:white;color:black;overflow:visible">${pre(0, 0, 0)}${pre(1, 18, 0)}${pre(2, 0, 18)}</article>`;
    return l;
  }
  async function capture(l) {
    const id = l.spec.id;
    attempted = id;
    const html = await format(documentHtml(l.markup), { parser: "html" });
    await json(id + "-layout.json", l);
    const htmlSha256 = await save(id + ".html.gz", gzipSync(html)),
      txtSha256 = await save(id + ".txt", l.plainText);
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    for (let i = 0; i < 3; i++) {
      assert.equal(
        await page.locator("#corner-" + i).textContent(),
        l.plainText,
      );
      assert.equal(await page.locator("#corner-" + i + " *").count(), 0);
    }
    const native = await page.locator("#corner-0").evaluate((e) => {
      const cs = getComputedStyle(e),
        ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `400 20px '${cs.fontFamily.split(",")[0].replaceAll('"', "").replaceAll("'", "")}'`;
      ctx.fontKerning = "none";
      const glyphs = Object.fromEntries(
        [...new Set(e.textContent.replaceAll("\n", ""))].map((c) => {
          const m = ctx.measureText(c);
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
        Math.max(...Object.values(glyphs).map((g) => g.ascent)) +
        Math.max(...Object.values(glyphs).map((g) => g.descent));
      let minGap = Infinity;
      const advances = [];
      for (const row of e.textContent.split("\n")) {
        let x = 0,
          lastRight = null;
        for (const c of row) {
          const g = glyphs[c];
          if (c !== " ") {
            if (lastRight !== null)
              minGap = Math.min(minGap, x - g.left - lastRight);
            lastRight = x + g.right;
          }
          x += g.width;
        }
        advances.push(x);
      }
      return {
        glyphs,
        envelope,
        clearance: parseFloat(cs.lineHeight) - envelope,
        minAdjacentInkGap: minGap,
        advances,
        style: {
          font: cs.fontFamily,
          size: cs.fontSize,
          leading: cs.lineHeight,
          tracking: cs.letterSpacing,
          weight: cs.fontWeight,
        },
        clientWidth: e.clientWidth,
        scrollWidth: e.scrollWidth,
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
      native.scrollWidth > Math.ceil(l.field) + 1 ||
      native.advances.some((w) => w > l.field)
    )
      reasons.push("Source line overflow");
    if (native.platformFonts.some((f) => f.familyName !== l.spec.font))
      reasons.push("Font substitution");
    await json(id + "-native.json", native);
    const png = await page.locator("#artifact").screenshot(),
      pngSha256 = await save("raw/" + id + ".png", png),
      p = await pixels(png),
      result = probe(p, l);
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const repeat = await page.locator("#artifact").screenshot();
    if (hash(repeat) !== pngSha256)
      await save("raw/" + id + "-repeat.png", repeat);
    const r = {
      id,
      spec: l.spec,
      path: "raw/" + id + ".png",
      pngSha256,
      rgbaSha256: hash(p.data),
      htmlSha256,
      txtSha256,
      width: p.width,
      height: p.height,
      probe: result,
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
    await appendFile(resolve(out, "results.jsonl"), JSON.stringify(r) + "\n");
    records.push(r);
    console.log(
      JSON.stringify({
        id,
        objective: result.objective,
        components: result.components,
        correctFinder: result.ordinary.correctFinder,
        reasons,
        repeat: r.repeatExact,
      }),
    );
    return { l, r };
  }
  const seedLayout = JSON.parse(
    await readFile(root + "/pitch-01/impact-pitch-6-layout.json", "utf8"),
  );
  for (const dx of [7, 8, 9]) {
    const l = structuredClone(seedLayout);
    l.spec = { ...l.spec, id: `impact-placement-${dx}`, sourceDx: dx };
    l.markup = l.markup.replace(
      /left:([\d.]+)px/g,
      (_, x) => `left:${Number(x) + dx}px`,
    );
    await capture(l);
  }
  await json("summary.json", {
    finishedAt: new Date().toISOString(),
    native: records.length,
    intendedFinder: records.filter((r) => r.probe.ordinary.correctFinder)
      .length,
    automaticLegibilityRejections: records.filter(
      (r) => r.legibility.automaticRejected,
    ).length,
    exactRepeats: records.filter((r) => r.repeatExact).length,
    selections,
    rejections,
    payloads: 0,
    phoneCandidates: 0,
  });
} catch (e) {
  await json("aborted.json", {
    at: new Date().toISOString(),
    attempted,
    completed: records.map((r) => r.id),
    error: e.stack,
  });
  throw e;
} finally {
  await browser.close();
}
